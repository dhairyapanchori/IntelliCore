import api from './api';

export interface Document {
  id: number;
  collection_id: number;
  title: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  created_at: string;
}

export const documentApi = {
  getDocuments: (collectionId: number) => 
    api.get<Document[]>(`/documents/?collection_id=${collectionId}`).then(res => res.data),
    
  uploadDocument: (collectionId: number | null, file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    if (collectionId) {
      formData.append('collection_id', collectionId.toString());
    }
    formData.append('file', file);
    
    return api.post<Document>('/documents/upload', formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    }).then(res => res.data);
  },
  
  deleteDocument: (documentId: number) => 
    api.delete(`/documents/${documentId}`).then(res => res.data)
};
