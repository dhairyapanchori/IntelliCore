import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHierarchyStore } from '../store/hierarchyStore';
import { documentApi, type Document } from '../lib/documents';
import api from '../lib/api';
import { 
  FileText, UploadCloud, File, FileArchive, CheckCircle2, 
  Clock, AlertCircle, ArrowLeft, Trash2, Search,
  Filter, HardDrive, Cpu, Activity, Download
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const collectionId = Number(id);
  
  const { collections } = useHierarchyStore();
  const collection = collections.find(c => c.id === collectionId);
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection State for Batch Actions
  const [selectedDocs, setSelectedDocs] = useState<Set<number>>(new Set());

  const fetchDocsAndAnalytics = useCallback(async () => {
    if (!collectionId) return;
    try {
      const [docs, analyticsRes] = await Promise.all([
        documentApi.getDocuments(collectionId),
        api.get('/analytics/collections')
      ]);
      setDocuments(docs);
      
      const thisCollectionStats = analyticsRes.data.find((c: any) => c.collection_id === collectionId);
      if (thisCollectionStats) {
        setAnalytics(thisCollectionStats);
      }
    } catch (err) {
      console.error("Failed to load collection data", err);
    }
  }, [collectionId]);

  useEffect(() => {
    fetchDocsAndAnalytics();
  }, [fetchDocsAndAnalytics]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const needsPolling = documents.some(d => d.status === 'pending' || d.status === 'processing');
    if (needsPolling) {
      interval = setInterval(() => {
        fetchDocsAndAnalytics();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [documents, fetchDocsAndAnalytics]);

  const handleDelete = async (docId: number) => {
    try {
      await documentApi.deleteDocument(docId);
      setDocuments(docs => docs.filter(d => d.id !== docId));
      fetchDocsAndAnalytics(); // Refresh stats
      toast.success('Document deleted');
    } catch (err) {
      console.error("Failed to delete document", err);
      toast.error('Failed to delete document');
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
      await fetchDocsAndAnalytics();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to upload file(s)");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedDocs);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedDocs(newSet);
  };

  const toggleAll = () => {
    if (selectedDocs.size === documents.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(documents.map(d => d.id)));
    }
  };

  if (!collection) return null;

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
          className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-white mb-4 transition-colors w-fit"
        >
          <ArrowLeft size={14} /> Back to Collections
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{collection.name}</h1>
            <p className="text-slate-400 text-sm mt-1">Manage documents and verify AI synchronization status.</p>
          </div>
          <div className="flex gap-3">
            {selectedDocs.size > 0 && (
              <button 
                onClick={() => toast('Batch actions coming soon!')}
                className="bg-[#1E2333] hover:bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                Delete Selected ({selectedDocs.size})
              </button>
            )}
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> {uploadProgress}%</>
              ) : (
                <><UploadCloud size={16} /> Upload Documents</>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="p-8">
        
        {/* Analytics Header Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Documents</p>
              <p className="text-2xl font-bold text-white">{analytics?.document_count || 0}</p>
            </div>
          </div>
          <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <HardDrive size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Storage Used</p>
              <p className="text-2xl font-bold text-white">{formatSize(analytics?.total_size_bytes)}</p>
            </div>
          </div>
          <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <Cpu size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">AI Processing</p>
              <p className="text-2xl font-bold text-white">{analytics?.status_counts?.completed || 0} Synced</p>
            </div>
          </div>
          <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pending Sync</p>
              <p className="text-2xl font-bold text-white">{analytics?.status_counts?.processing + analytics?.status_counts?.pending || 0}</p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
          <div className="relative w-full sm:w-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search documents..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-[#13161F] border border-slate-800 text-sm rounded-lg pl-9 pr-4 py-2 w-full sm:w-64 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors bg-[#13161F] border border-slate-800 px-3 py-2 rounded-lg">
              <Filter size={14} /> Filter
            </button>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-[#13161F] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-[#0A0C10] border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 w-10">
                    <input 
                      type="checkbox" 
                      checked={documents.length > 0 && selectedDocs.size === documents.length}
                      onChange={toggleAll}
                      className="rounded border-slate-700 bg-[#1E2333] text-indigo-500 focus:ring-offset-0 focus:ring-transparent"
                    />
                  </th>
                  <th className="px-6 py-4">Document Name</th>
                  <th className="px-6 py-4">Size</th>
                  <th className="px-6 py-4">Uploaded</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No documents found in this collection.
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map(doc => (
                    <tr 
                      key={doc.id} 
                      className={`hover:bg-[#1E2333]/50 transition-colors cursor-pointer ${selectedDocs.has(doc.id) ? 'bg-indigo-500/5' : ''}`}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).tagName !== 'INPUT' && !(e.target as HTMLElement).closest('button')) {
                          navigate(`/dashboard/documents/${doc.id}`);
                        }
                      }}
                    >
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedDocs.has(doc.id)}
                          onChange={() => toggleSelection(doc.id)}
                          className="rounded border-slate-700 bg-[#1E2333] text-indigo-500 focus:ring-offset-0 focus:ring-transparent"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-[#0A0C10] border border-slate-800 flex items-center justify-center shrink-0">
                            {getFileIcon(doc.file_type)}
                          </div>
                          <span className="font-semibold text-white truncate max-w-md">{doc.title}</span>
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
                          <button onClick={(e) => { e.stopPropagation(); api.post(`/documents/${doc.id}/log-download`); toast('Download starting soon'); }} className="p-1.5 text-slate-500 hover:text-white transition-colors rounded hover:bg-slate-800" title="Download">
                            <Download size={14} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
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
    </div>
  );
}
