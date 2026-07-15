import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Folder, Plus, Search, MoreVertical, LayoutGrid, List,
  Briefcase, Code, DollarSign, Users, Scale, FileText, CheckCircle2, Clock, X, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useHierarchyStore } from '../store/hierarchyStore';
import { formatDistanceToNow } from 'date-fns';

export default function Collections() {
  const [collectionsAnalytics, setCollectionsAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { workspaces } = useHierarchyStore();

  const [activeWorkspace, setActiveWorkspace] = useState<number | 'all'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [modalWorkspaceId, setModalWorkspaceId] = useState<number>(workspaces[0]?.id || 0);
  const [modalDepartments, setModalDepartments] = useState<any[]>([]);
  const [modalDepartmentId, setModalDepartmentId] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchModalDeps() {
      if (!modalWorkspaceId) return;
      try {
        const res = await api.get(`/departments?workspace_id=${modalWorkspaceId}`);
        setModalDepartments(res.data);
        if (res.data.length > 0) setModalDepartmentId(res.data[0].id);
      } catch (err) {}
    }
    fetchModalDeps();
  }, [modalWorkspaceId]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Collection name is required");
      return;
    }
    if (!modalDepartmentId && modalDepartments.length > 0) {
      toast.error("Department is not selected");
      return;
    }
    setIsSubmitting(true);
    let targetDepartmentId = modalDepartmentId;
    
    try {
      if (!targetDepartmentId || targetDepartmentId === 0) {
        if (!modalWorkspaceId) {
          toast.error("Workspace is required to create a default department.");
          setIsSubmitting(false);
          return;
        }
        // Auto-create a 'General' department
        const deptRes = await api.post('/departments/', {
          name: 'General',
          description: 'Default department',
          workspace_id: modalWorkspaceId
        });
        targetDepartmentId = deptRes.data.id;
      }

      await api.post('/collections/', {
        name: newName,
        description: newDesc,
        department_id: targetDepartmentId
      });
      // Refresh list
      const res = await api.get('/analytics/collections');
      setCollectionsAnalytics(res.data);
      
      toast.success("Collection created successfully");
      setIsModalOpen(false);
      setNewName('');
      setNewDesc('');
    } catch (err: any) {
      console.error("Failed to create collection", err);
      toast.error(err.response?.data?.detail || "Failed to create collection");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCollection = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this collection?')) return;
    try {
      await api.delete(`/collections/${id}`);
      setCollectionsAnalytics(prev => prev.filter(c => c.collection_id !== id));
      toast.success("Collection deleted successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || "Failed to delete collection");
    }
  };

  useEffect(() => {
    async function fetchAll() {
      try {
        const res = await api.get('/analytics/collections');
        setCollectionsAnalytics(res.data);
      } catch (err) {
        console.error('Failed to fetch collections analytics', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getWorkspaceIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('eng') || n.includes('dev')) return <Code size={16} />;
    if (n.includes('sale') || n.includes('finance')) return <DollarSign size={16} />;
    if (n.includes('hr') || n.includes('human')) return <Users size={16} />;
    if (n.includes('legal')) return <Scale size={16} />;
    return <Briefcase size={16} />;
  };

  const filteredCollections = collectionsAnalytics.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full w-full bg-[#0A0C10] overflow-hidden text-slate-300">
      
      {/* Left Sidebar - Workspaces */}
      <div className="w-64 shrink-0 bg-[#0F111A] border-r border-slate-800 flex flex-col h-full">
        <div className="p-6 pb-2">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Workspaces</h2>
          <div className="space-y-1">
            <button 
              onClick={() => setActiveWorkspace('all')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeWorkspace === 'all' 
                  ? 'bg-indigo-500/10 text-indigo-400' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E2333]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Briefcase size={16} className={activeWorkspace === 'all' ? 'text-indigo-400' : 'text-slate-500'} />
                Global (All)
              </div>
            </button>

            {workspaces.map(w => (
              <button 
                key={w.id}
                onClick={() => setActiveWorkspace(w.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeWorkspace === w.id 
                    ? 'bg-indigo-500/10 text-indigo-400' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E2333]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={activeWorkspace === w.id ? 'text-indigo-400' : 'text-slate-500'}>
                    {getWorkspaceIcon(w.name)}
                  </div>
                  {w.name}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative overflow-y-auto scrollbar-thin">
        
        {/* Top Header */}
        <div className="sticky top-0 z-10 bg-[#0A0C10]/90 backdrop-blur-md border-b border-slate-800 px-8 py-6 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Collections</h1>
              <p className="text-slate-400 text-sm">Manage grouped knowledge and document silos.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search collections..." 
                  className="bg-[#13161F] border border-slate-800 text-sm text-slate-300 rounded-lg pl-9 pr-4 py-2 w-64 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
              </div>
              <div className="flex items-center bg-[#13161F] border border-slate-800 rounded-lg overflow-hidden">
                <button className="p-2 bg-slate-800 text-white"><LayoutGrid size={16} /></button>
                <button className="p-2 text-slate-500 hover:text-white transition-colors"><List size={16} /></button>
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <Plus size={16} /> New Collection
              </button>
            </div>
          </div>
        </div>

        <div className="p-8">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
            </div>
          ) : filteredCollections.length === 0 ? (
            <div className="text-center py-20 bg-[#13161F] border border-slate-800 rounded-2xl">
              <Folder size={48} className="mx-auto text-slate-700 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No collections found</h3>
              <p className="text-slate-500">Create a collection to start grouping your documents.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCollections.map(c => (
                <div 
                  key={c.collection_id}
                  onClick={() => navigate(`/dashboard/collections/${c.collection_id}`)}
                  className="bg-[#13161F] border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.05)] transition-all cursor-pointer group flex flex-col h-full relative overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                      <Folder size={22} fill="currentColor" className="opacity-80" />
                    </div>
                    <button 
                      onClick={(e) => handleDeleteCollection(e, c.collection_id)} 
                      className="text-slate-500 hover:text-red-400 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete Collection"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors line-clamp-1">{c.name}</h3>
                  <p className="text-xs text-slate-500 mb-6 line-clamp-2">Enterprise knowledge collection securely isolated via workspace policies.</p>
                  
                  <div className="mt-auto grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Documents</div>
                      <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                        <FileText size={14} className="text-blue-400" /> {c.document_count}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Storage Size</div>
                      <div className="text-sm font-semibold text-white">
                        {formatSize(c.total_size_bytes)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Clock size={12} /> 
                      {c.last_updated ? `Updated ${formatDistanceToNow(new Date(c.last_updated))} ago` : 'Empty collection'}
                    </div>
                    
                    {c.status_counts.processing > 0 && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div> Syncing
                      </div>
                    )}
                    {c.status_counts.processing === 0 && c.document_count > 0 && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                        <CheckCircle2 size={10} /> Synced
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13161F] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">New Collection</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Collection Name</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Employee Handbook" 
                  className="w-full bg-[#0A0C10] border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Workspace</label>
                  <select
                    value={modalWorkspaceId}
                    onChange={e => setModalWorkspaceId(Number(e.target.value))}
                    className="w-full bg-[#0A0C10] border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500/50 transition-all text-sm"
                  >
                    <option value={0} disabled>Select...</option>
                    {workspaces.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Department</label>
                  <select
                    value={modalDepartmentId}
                    onChange={e => setModalDepartmentId(Number(e.target.value))}
                    disabled={modalDepartments.length === 0}
                    className="w-full bg-[#0A0C10] border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500/50 transition-all text-sm disabled:opacity-50"
                  >
                    <option value={0} disabled>{modalDepartments.length === 0 ? 'No departments' : 'Select...'}</option>
                    {modalDepartments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</label>
                <textarea 
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="What is this collection for?" 
                  rows={2}
                  className="w-full bg-[#0A0C10] border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none"
                ></textarea>
              </div>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-[#0A0C10]/50">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate}
                disabled={!newName.trim() || isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div> : null}
                Create Collection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
