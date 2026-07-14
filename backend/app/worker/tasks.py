import os
import logging
from .celery_app import celery_app
from app.core.database import SessionLocal
from app.models.core import Document, DocumentChunk

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
