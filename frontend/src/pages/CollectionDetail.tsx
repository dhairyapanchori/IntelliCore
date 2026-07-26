import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { documentApi, type Document } from '../lib/documents';
import api from '../lib/api';
import { 
  FileText, UploadCloud, File, FileArchive, CheckCircle2, 
  Clock, AlertCircle, ArrowLeft, Trash2, Search,
  Filter, HardDrive, Cpu, Activity, Folder, RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const collectionId = Number(id);
  
  const [collection, setCollection] = useState<any>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDocsAndAnalytics = useCallback(async (isInitial = false) => {
    if (!collectionId || isNaN(collectionId)) {
      setError("Invalid Collection ID specified in URL.");
      if (isInitial) setLoading(false);
      return;
    }
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const [colRes, docsRes, analyticsRes] = await Promise.all([
        api.get(`/collections/${collectionId}`),
        documentApi.getDocuments(collectionId).catch(() => []),
        api.get('/analytics/collections').catch(() => ({ data: [] }))
      ]);
      
      setCollection(colRes.data);
      const loadedDocs = docsRes || [];
      setDocuments(loadedDocs);
      
      const thisCollectionStats = (analyticsRes.data || []).find((c: any) => c.collection_id === collectionId || c.id === collectionId);
      if (thisCollectionStats) {
        setAnalytics(thisCollectionStats);
      } else {
        const totalBytes = loadedDocs.reduce((sum: number, d: any) => sum + (d.file_size || 0), 0);
        const completedCount = loadedDocs.filter((d: any) => d.status === 'completed').length;
        const pendingCount = loadedDocs.filter((d: any) => d.status === 'pending' || d.status === 'processing').length;
        setAnalytics({
          document_count: loadedDocs.length,
          total_size_bytes: totalBytes,
          status_counts: {
            completed: completedCount,
            processing: pendingCount,
            pending: 0,
            error: 0
          }
        });
      }
    } catch (err: any) {
      console.error("Failed to load collection details:", err);
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || "Failed to retrieve collection details.";
      setError(msg);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    fetchDocsAndAnalytics(true);
  }, [fetchDocsAndAnalytics]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const needsPolling = documents.some(d => d.status === 'pending' || d.status === 'processing');
    if (needsPolling) {
      interval = setInterval(() => {
        fetchDocsAndAnalytics(false);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [documents, fetchDocsAndAnalytics]);

  const handleDelete = async (docId: number) => {
    if (!confirm('Are you sure you want to permanently delete this document?')) return;
    try {
      await documentApi.deleteDocument(docId);
      setDocuments(docs => docs.filter(d => d.id !== docId));
      fetchDocsAndAnalytics(false);
      toast.success('Document deleted successfully');
    } catch (err: any) {
      console.error("Failed to delete document:", err);
      toast.error(err.response?.data?.detail || 'Failed to delete document');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      for (let i = 0; i < files.length; i++) {
        await documentApi.uploadDocument(collectionId, files[i], (progress) => {
          setUploadProgress(Math.round((i * 100 + progress) / files.length));
        });
      }
      toast.success(`${files.length} document(s) uploaded successfully`);
      await fetchDocsAndAnalytics(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to upload file(s)");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatSize = (bytes: number | undefined) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    switch ((fileType || '').toLowerCase()) {
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
      case 'failed':
        return <span className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-red-500/10 border border-red-500/20 text-red-400"><AlertCircle size={10} /> Failed</span>;
      default:
        return <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-slate-800 text-slate-400">{status || 'Unknown'}</span>;
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#0A0C10] text-slate-300 items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-medium">Loading collection details and indexed documents...</p>
      </div>
    );
  }

  // Error State
  if (error || !collection) {
    return (
      <div className="flex flex-col h-full bg-[#0A0C10] text-slate-300 items-center justify-center p-8">
        <div className="bg-[#13161F] border border-red-500/20 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Failed to Load Collection</h3>
          <p className="text-slate-400 text-sm mb-6">{error || "The requested collection could not be located."}</p>
          <div className="flex justify-center gap-3">
            <button 
              onClick={() => navigate('/dashboard/collections')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Collections
            </button>
            <button 
              onClick={() => fetchDocsAndAnalytics(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
            >
              <RefreshCw size={16} /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredDocs = documents.filter(d => (d.title || '').toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-[#0A0C10] overflow-y-auto scrollbar-thin text-slate-300">
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        multiple 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept=".pdf,.docx,.txt" 
      />

      {/* Header */}
      <div className="border-b border-slate-800 bg-[#0A0C10]/90 backdrop-blur-md sticky top-0 z-10 px-8 py-6">
        <button 
          onClick={() => navigate('/dashboard/collections')} 
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-400 mb-4 transition-colors w-fit uppercase tracking-wider"
        >
          <ArrowLeft size={14} /> Back to Collections
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                <Folder size={20} fill="currentColor" className="opacity-80" />
              </div>
              <h1 title={collection.name} className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight break-words">{collection.name}</h1>
            </div>
            <p title={collection.description || undefined} className="text-slate-400 text-sm mt-1 break-words">{collection.description || 'Enterprise knowledge collection securely isolated via workspace policies.'}</p>
            {collection.workspace_name && collection.department_name && (
              <div className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500">
                <span className="bg-[#181C28] text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-500/20">{collection.workspace_name}</span>
                <span>/</span>
                <span className="bg-[#181C28] text-slate-300 px-2.5 py-1 rounded-md border border-slate-700/50">{collection.department_name}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3 shrink-0 mt-2 sm:mt-0">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              {isUploading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Uploading ({uploadProgress}%)</>
              ) : (
                <><UploadCloud size={18} /> Upload Documents</>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="p-8">
        
        {/* Analytics Header Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#13161F] border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:border-slate-700 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <FileText size={22} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Documents</p>
              <p className="text-2xl font-bold text-white">{analytics?.document_count || documents.length || 0}</p>
            </div>
          </div>
          <div className="bg-[#13161F] border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:border-slate-700 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <HardDrive size={22} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Storage Used</p>
              <p className="text-2xl font-bold text-white">{formatSize(analytics?.total_size_bytes || analytics?.total_size)}</p>
            </div>
          </div>
          <div className="bg-[#13161F] border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:border-slate-700 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Cpu size={22} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">AI Processing</p>
              <p className="text-2xl font-bold text-white">
                {analytics?.status_counts?.completed !== undefined ? `${analytics.status_counts.completed} Synced` : `${documents.filter(d => d.status === 'completed').length} Synced`}
              </p>
            </div>
          </div>
          <div className="bg-[#13161F] border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:border-slate-700 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <Activity size={22} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pending Sync</p>
              <p className="text-2xl font-bold text-white">
                {analytics?.status_counts 
                  ? (analytics.status_counts.processing || 0) + (analytics.status_counts.pending || 0)
                  : documents.filter(d => d.status === 'pending' || d.status === 'processing').length}
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Filter documents by title..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-[#13161F] border border-slate-800 text-sm text-slate-200 rounded-xl pl-10 pr-4 py-2.5 w-full focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder-slate-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => fetchDocsAndAnalytics(false)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-[#13161F] border border-slate-800 px-3.5 py-2.5 rounded-xl hover:bg-slate-800/50"
              title="Refresh document list"
            >
              <RefreshCw size={14} /> Refresh Table
            </button>
            <button className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-[#13161F] border border-slate-800 px-3.5 py-2.5 rounded-xl hover:bg-slate-800/50">
              <Filter size={14} /> Filter Options
            </button>
          </div>
        </div>

        {/* Documents Table / Empty State */}
        <div className="bg-[#13161F] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#0D0F17] border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Document Name</th>
                  <th className="px-6 py-4">Size</th>
                  <th className="px-6 py-4">Uploaded</th>
                  <th className="px-6 py-4">Sync Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
                          <FileText size={24} />
                        </div>
                        <h4 className="text-base font-bold text-white mb-1">No documents indexed</h4>
                        <p className="text-xs text-slate-500 mb-6">This collection has no documents matching your query. Upload files to initialize automated vector embedding and RAG capabilities.</p>
                        <button 
                          onClick={() => fileInputRef.current?.click()} 
                          disabled={isUploading}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                          <UploadCloud size={14} /> Upload First Document
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map(doc => (
                    <tr 
                      key={doc.id} 
                      className="hover:bg-[#1A1F2C]/60 transition-colors cursor-pointer group"
                      onClick={(e) => {
                        if (!(e.target as HTMLElement).closest('button')) {
                          navigate(`/dashboard/documents/${doc.id}`);
                        }
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#0A0C10] border border-slate-800 flex items-center justify-center shrink-0">
                            {getFileIcon(doc.file_type)}
                          </div>
                          <div>
                            <p title={doc.title} className="font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1 max-w-sm sm:max-w-md">{doc.title}</p>
                            <p className="text-[11px] text-slate-500 uppercase font-medium mt-0.5">{doc.file_type || 'Document'} File</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-medium text-xs whitespace-nowrap">
                        {formatSize(doc.file_size)}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap">
                        {doc.created_at ? formatDistanceToNow(new Date(doc.created_at), { addSuffix: true }) : 'Recently'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(doc.status)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex justify-end items-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                            className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800/80 opacity-60 group-hover:opacity-100"
                            title="Delete Document"
                          >
                            <Trash2 size={16} />
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
    </div>
  );
}
