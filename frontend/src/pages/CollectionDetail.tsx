import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useHierarchyStore } from '../store/hierarchyStore';
import type { Document } from '../lib/documents';
import { documentApi } from '../lib/documents';
import { FileText, UploadCloud, File, FileArchive, CheckCircle2, Clock, AlertCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const collectionId = Number(id);
  
  const { collections } = useHierarchyStore();
  const collection = collections.find(c => c.id === collectionId);
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    if (!collectionId) return;
    try {
      const docs = await documentApi.getDocuments(collectionId);
      setDocuments(docs);
    } catch (err) {
      console.error("Failed to load documents", err);
    }
  }, [collectionId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    const needsPolling = documents.some(d => d.status === 'pending' || d.status === 'processing');
    if (needsPolling) {
      interval = setInterval(() => {
        fetchDocs();
      }, 3000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [documents, fetchDocs]);

  const handleDelete = async (docId: number) => {
    try {
      await documentApi.deleteDocument(docId);
      setDocuments(docs => docs.filter(d => d.id !== docId));
    } catch (err) {
      console.error("Failed to delete document", err);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setError(null);
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // For MVP, upload files sequentially
      for (const file of acceptedFiles) {
        await documentApi.uploadDocument(collectionId, file, (progress) => {
          setUploadProgress(progress);
        });
      }
      await fetchDocs();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to upload file(s)");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [collectionId, fetchDocs]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  if (!collection) {
    return (
      <div className="flex-1 p-8">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <div className="text-center py-12">Collection not found.</div>
      </div>
    );
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf': return <FileText className="text-red-400" size={24} />;
      case 'docx': return <FileText className="text-blue-400" size={24} />;
      case 'txt': return <File className="text-gray-400" size={24} />;
      default: return <FileArchive className="text-primary" size={24} />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': 
        return <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-500"><Clock size={12} /> Pending</span>;
      case 'processing': 
        return <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-500/10 text-yellow-500 animate-pulse"><Clock size={12} /> Processing</span>;
      case 'completed': 
        return <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-green-500/10 text-green-500"><CheckCircle2 size={12} /> Ready</span>;
      case 'error': 
        return <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-red-500/10 text-red-500"><AlertCircle size={12} /> Error</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors w-fit"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold tracking-tight">{collection.name}</h1>
        <p className="text-muted-foreground mt-1">
          {collection.description || 'Manage documents for this collection.'}
        </p>
      </div>

      {/* Upload Zone */}
      <div 
        {...getRootProps()} 
        className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors mb-8
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-accent/50 hover:border-primary/50'}`}
      >
        <input {...getInputProps()} />
        
        {isUploading ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <UploadCloud size={48} className="text-primary animate-bounce" />
            <div className="text-lg font-medium">Uploading... {uploadProgress}%</div>
            <div className="w-full max-w-xs h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
              <UploadCloud size={32} />
            </div>
            <div>
              <p className="text-lg font-medium">Click or drag files to upload</p>
              <p className="text-sm text-muted-foreground mt-1">Supports PDF, DOCX, and TXT (Max 50MB)</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Document List */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Documents</h2>
        
        {documents.length === 0 ? (
          <div className="text-center py-12 border border-border rounded-xl bg-card/50">
            <p className="text-muted-foreground">No documents uploaded yet.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Document Name</th>
                  <th className="px-6 py-4 font-medium">Size</th>
                  <th className="px-6 py-4 font-medium">Uploaded</th>
                  <th className="px-6 py-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.file_type)}
                        <span className="font-medium">{doc.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-4">
                        {getStatusBadge(doc.status)}
                        <button 
                          onClick={() => handleDelete(doc.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          title="Delete document"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
