import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { documentApi } from '../lib/documents';
import { 
  FileText, File, FileArchive, CheckCircle2, Clock, 
  AlertCircle, Trash2, Search, Filter, UploadCloud, X, Folder
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function Documents() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [allCollections, setAllCollections] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadColId, setUploadColId] = useState<number | ''>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchDocs = async () => {
    try {
      const res = await api.get('/documents/all');
      setDocuments(res.data);
    } catch (err) {
      console.error("Failed to load documents", err);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
    api.get('/analytics/collections').then(res => setAllCollections(res.data)).catch(console.error);
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    const handleUpload = async () => {
      if (!files || files.length === 0) return;
      if (uploadColId === '') {
        toast.error("Please select a collection");
        return;
      }
      
      setIsUploading(true);
      setUploadProgress(0);
      
      try {
        for (let i = 0; i < files.length; i++) {
          await documentApi.uploadDocument(Number(uploadColId), files[i], (progress) => {
            setUploadProgress(Math.round((i * 100 + progress) / files.length));
          });
        }
        toast.success(`${files.length} document(s) uploaded successfully`);
        await fetchDocs();
        setIsModalOpen(false);
      } catch (err: any) {
        toast.error(err.response?.data?.detail || "Failed to upload file(s)");
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    handleUpload();
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await api.delete(`/documents/${id}`);
      setDocuments(docs => docs.filter(d => d.id !== id));
      toast.success('Document deleted successfully');
    } catch (err) {
      console.error("Failed to delete document", err);
      toast.error("Failed to delete document");
    }
  };

  const getCollectionName = (colId: number) => {
    const col = allCollections.find(c => c.collection_id === colId);
    return col ? col.name : 'General (No Collection)';
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf': return <FileText className="text-red-400" size={18} />;
      case 'docx': return <FileText className="text-blue-400" size={18} />;
      case 'txt': return <File className="text-slate-400" size={18} />;
      default: return <FileArchive className="text-indigo-400" size={18} />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': 
        return <span className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-blue-500/10 border border-blue-500/20 text-blue-400"><Clock size={10} /> Queued</span>;
      case 'processing': 
        return <span className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-amber-500/10 border border-amber-500/20 text-amber-500"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div> Syncing</span>;
      case 'completed': 
        return <span className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"><CheckCircle2 size={10} /> Synced</span>;
      case 'error': 
        return <span className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-red-500/10 border border-red-500/20 text-red-400"><AlertCircle size={10} /> Failed</span>;
      default:
        return null;
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocs = documents.filter(d => d.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-[#0A0C10] overflow-y-auto scrollbar-thin text-slate-300">
      
      {/* Header */}
      <div className="border-b border-slate-800 bg-[#0A0C10]/90 backdrop-blur-md sticky top-0 z-10 px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Global Documents</h1>
            <p className="text-slate-400 text-sm mt-1">A unified view of all knowledge documents across your enterprise.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20"
            >
              <UploadCloud size={16} /> Upload Document
            </button>
            <button onClick={() => navigate('/dashboard/collections')} className="bg-[#1E2333] hover:bg-slate-800 border border-slate-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
              Go to Collections
            </button>
          </div>
        </div>
      </div>

      <div className="p-8">
        
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full sm:w-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search across all documents..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-[#13161F] border border-slate-800 text-sm rounded-lg pl-9 pr-4 py-2 w-full sm:w-80 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors bg-[#13161F] border border-slate-800 px-4 py-2 rounded-lg">
              <Filter size={14} /> Filters
            </button>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-[#13161F] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-[#0A0C10] border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Document Name</th>
                  <th className="px-6 py-4">Collection</th>
                  <th className="px-6 py-4">Size</th>
                  <th className="px-6 py-4">Uploaded</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                      <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      No documents found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map(doc => (
                    <tr 
                      key={doc.id} 
                      className="hover:bg-[#1E2333]/50 transition-colors cursor-pointer"
                      onClick={(e) => {
                        if (!(e.target as HTMLElement).closest('button')) {
                          navigate(`/dashboard/documents/${doc.id}`);
                        }
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-[#0A0C10] border border-slate-800 flex items-center justify-center shrink-0">
                            {getFileIcon(doc.file_type)}
                          </div>
                          <div>
                            <div className="font-semibold text-white truncate max-w-sm">{doc.title}</div>
                            <div className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">{doc.file_type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Folder size={14} className="text-slate-500" />
                          <span className="truncate max-w-[150px]">{getCollectionName(doc.collection_id)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {formatSize(doc.file_size)}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(doc.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <button 
                            onClick={(e) => handleDelete(e, doc.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded hover:bg-slate-800"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13161F] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Upload Document</h3>
              <button onClick={() => !isUploading && setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Collection <span className="text-rose-500">*</span></label>
                <select
                  value={uploadColId}
                  onChange={e => setUploadColId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="bg-[#0A0C10] border border-slate-700 text-sm rounded-lg block w-full p-2.5 text-white focus:border-indigo-500/50 outline-none"
                  required
                >
                  <option value="">Select a collection</option>
                  {allCollections.map(c => (
                    <option key={c.collection_id} value={c.collection_id}>
                      {c.workspace_name} / {c.name}
                    </option>
                  ))}
                </select>
                {allCollections.length === 0 && (
                  <p className="text-xs text-amber-400 mt-2">You must create a collection in the Collections tab first.</p>
                )}
              </div>
              
              <div className="pt-2">
                <input 
                  type="file" 
                  multiple 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden" 
                />
                
                {isUploading ? (
                  <div className="w-full bg-[#0A0C10] border border-slate-700 border-dashed rounded-xl p-8 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
                      <UploadCloud size={24} className="text-indigo-400 animate-bounce" />
                    </div>
                    <div className="text-white font-medium mb-2">Uploading... {uploadProgress}%</div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-[200px]">
                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full bg-[#0A0C10] border border-slate-700 border-dashed rounded-xl p-8 flex flex-col items-center justify-center group hover:bg-[#1E2333]/50 hover:border-indigo-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mb-3 group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all">
                      <UploadCloud size={24} className="text-indigo-400" />
                    </div>
                    <div className="text-sm font-medium text-white mb-1">Click to browse files</div>
                    <div className="text-xs text-slate-500">PDF, DOCX, TXT, MD up to 50MB</div>
                  </button>
                )}
              </div>
            </div>
            {!isUploading && (
              <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-[#0A0C10]/50">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
