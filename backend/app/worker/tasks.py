import os
import logging
from .celery_app import celery_app
from app.core.database import SessionLocal
from app.models.core import Document, DocumentChunk, DocumentMetadata, ActivityLog
import json
from app.core.config import settings

try:
    from groq import Groq
except ImportError:
    Groq = None

from langchain.text_splitter import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import pdfplumber
import docx
import pytesseract
from pdf2image import convert_from_path

logger = logging.getLogger(__name__)

# Load model globally in the worker process
model = SentenceTransformer('all-MiniLM-L6-v2')
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

def extract_text(file_path: str, file_type: str) -> str:
    text = ""
    if file_type == "pdf":
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
                    
        # OCR Fallback if standard extraction yields no text
        if not text.strip():
            logger.info(f"No text extracted via standard method for {file_path}. Falling back to OCR...")
            images = convert_from_path(file_path)
            for image in images:
                page_text = pytesseract.image_to_string(image)
                text += page_text + "\n"
                
    elif file_type == "docx":
        doc = docx.Document(file_path)
        for para in doc.paragraphs:
            text += para.text + "\n"
    elif file_type == "txt":
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()
    else:
        raise ValueError(f"Unsupported file type: {file_type}")
    return text

@celery_app.task(name="app.worker.tasks.process_document_task")
def process_document_task(document_id: int):
    db = SessionLocal()
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            logger.error(f"Document {document_id} not found.")
            return

        if document.status in ["processing", "completed"]:
            logger.info(f"Document {document_id} already processed.")
            return
            
        document.status = "processing"
        db.commit()

        # Extraction
        if not os.path.exists(document.storage_path):
            raise FileNotFoundError(f"File not found: {document.storage_path}")

        text = extract_text(document.storage_path, document.file_type)
        if not text.strip():
            raise ValueError("No text could be extracted from the document.")

        # Chunking
        chunks = text_splitter.split_text(text)
        
        # Embeddings & Storing
        for i, chunk_text in enumerate(chunks):
            embedding = model.encode(chunk_text).tolist()
            doc_chunk = DocumentChunk(
                document_id=document_id,
                text_content=chunk_text,
                embedding=embedding,
                chunk_index=i
            )
            db.add(doc_chunk)

        # AI Metadata Extraction
        summary, topics, questions = "", [], []
        groq_client = Groq(api_key=settings.GROQ_API_KEY) if Groq and settings.GROQ_API_KEY else None
        
        if groq_client:
            try:
                # Use the first 3000 chars for metadata extraction to save tokens/time
                prompt_text = text[:3000]
                system_prompt = """You are an AI document analyzer. You must respond ONLY with a valid JSON object matching this schema:
{
  "summary": "A 2-3 sentence summary of the document",
  "topics": ["topic1", "topic2", "topic3", "topic4"],
  "suggested_questions": ["Question 1?", "Question 2?", "Question 3?"]
}
Do not add any markdown formatting, just the raw JSON."""
                completion = groq_client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Analyze this document text:\\n{prompt_text}"}
                    ],
                    model="llama-3.3-70b-versatile",
                    response_format={"type": "json_object"}
                )
                response_content = completion.choices[0].message.content
                ai_data = json.loads(response_content)
                
                summary = ai_data.get("summary", "")
                topics = ai_data.get("topics", [])
                questions = ai_data.get("suggested_questions", [])
            except Exception as metadata_e:
                logger.error(f"Failed to generate metadata for doc {document_id}: {metadata_e}")
        
        doc_meta = DocumentMetadata(
            document_id=document_id,
            summary=summary,
            topics=topics,
            suggested_questions=questions
        )
        db.add(doc_meta)
        
        # Log activity
        activity = ActivityLog(
            user_id=None,
            action="document_processed",
            target_type="document",
            target_id=document_id,
            details=f"Processed '{document.title}' successfully."
        )
        db.add(activity)

        # Mark completed
        document.status = "completed"
        db.commit()
        logger.info(f"Successfully processed document {document_id}. Created {len(chunks)} chunks.")

    except Exception as e:
        logger.exception(f"Error processing document {document_id}: {e}")
        db.rollback()
        document = db.query(Document).filter(Document.id == document_id).first()
        if document:
            document.status = "error"
            db.commit()
    finally:
        db.close()
