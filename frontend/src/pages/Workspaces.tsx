import { useState, useMemo, useEffect } from 'react';
import { useHierarchyStore } from '../store/hierarchyStore';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import { 
  Building2, Plus, Search, Filter, MoreVertical, 
  Users, FileText, HardDrive, LayoutGrid, List,
  Share2, Settings, Lock, X, FolderOpen, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

type TabId = 'all' | 'mine' | 'shared';

export default function Workspaces() {
  const { workspaces, selectedOrgId, fetchWorkspaces, fetchOrganizations, deleteWorkspace } = useHierarchyStore();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch organizations (which triggers workspace fetch) on mount
  useEffect(() => {
    const load = async () => {
      await fetchOrganizations();
    };
    load();
  }, []);

  // Once selectedOrgId is populated, fetch workspaces
  useEffect(() => {
    if (selectedOrgId) {
      fetchWorkspaces(selectedOrgId);
    }
  }, [selectedOrgId]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Workspace name is required");
      return;
    }
    if (!selectedOrgId) {
      toast.error("No organization selected. Please wait or refresh the page.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/workspaces/', {
        name: newName,
        description: newDesc,
        organization_id: selectedOrgId
      });
      await fetchWorkspaces(selectedOrgId);
      toast.success("Workspace created successfully");
      setIsModalOpen(false);
      setNewName('');
      setNewDesc('');
    } catch (err: any) {
      console.error("Failed to create workspace", err);
      toast.error(err.response?.data?.detail || "Failed to create workspace");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) return;
    try {
      await deleteWorkspace(id);
      toast.success("Workspace deleted successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || "Failed to delete workspace");
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const tabFilteredWorkspaces = useMemo(() => {
    let filtered = workspaces;
    if (activeTab === 'mine') {
      filtered = workspaces.filter(w => w.owner_id === user?.id);
    } else if (activeTab === 'shared') {
      filtered = workspaces.filter(w => w.owner_id !== user?.id);
    }
    return filtered;
  }, [workspaces, activeTab, user]);

  const filteredWorkspaces = useMemo(() => {
    return tabFilteredWorkspaces.filter(w =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tabFilteredWorkspaces, searchQuery]);

  // Set default selection when workspaces load
  useEffect(() => {
    if (workspaces.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [workspaces]);

  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId) || workspaces[0] || null;

  // Aggregates for KPIs
  const totalMembers = workspaces.reduce((acc, curr) => acc + (curr.members_count || 0), 0);
  const totalDocuments = workspaces.reduce((acc, curr) => acc + (curr.documents_count || 0), 0);
  const totalStorage = workspaces.reduce((acc, curr) => acc + (curr.storage_used || 0), 0);

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'all', label: 'All Workspaces', count: workspaces.length },
    { id: 'mine', label: 'My Workspaces', count: workspaces.filter(w => w.owner_id === user?.id).length },
    { id: 'shared', label: 'Shared With Me', count: workspaces.filter(w => w.owner_id !== user?.id).length },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0A0C10] overflow-y-auto scrollbar-thin text-slate-300">
      {/* Header */}
      <div className="border-b border-slate-800 bg-[#0A0C10]/90 backdrop-blur-md sticky top-0 z-10 px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Workspaces</h1>
            <p className="text-slate-400 text-sm mt-1">Organize teams, projects, and knowledge into dedicated workspaces.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20"
            >
              <Plus size={16} /> New Workspace
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 flex flex-col xl:flex-row gap-8">
        
        {/* Left Content */}
        <div className="flex-1 space-y-6">
          
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2 text-indigo-400">
                <div className="p-2 bg-indigo-500/10 rounded-lg"><Building2 size={16} /></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Workspaces</span>
              </div>
              <p className="text-2xl font-bold text-white">{workspaces.length}</p>
            </div>
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2 text-emerald-400">
                <div className="p-2 bg-emerald-500/10 rounded-lg"><Users size={16} /></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Members</span>
              </div>
              <p className="text-2xl font-bold text-white">{totalMembers}</p>
            </div>
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2 text-amber-400">
                <div className="p-2 bg-amber-500/10 rounded-lg"><FileText size={16} /></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Documents</span>
              </div>
              <p className="text-2xl font-bold text-white">{totalDocuments.toLocaleString()}</p>
            </div>
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2 text-blue-400">
                <div className="p-2 bg-blue-500/10 rounded-lg"><HardDrive size={16} /></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Storage Used</span>
              </div>
              <p className="text-2xl font-bold text-white">{formatSize(totalStorage)}</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-6">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'text-indigo-400 border-indigo-500'
                      : 'text-slate-400 hover:text-white border-transparent hover:border-slate-700'
                  }`}
                >
                  {tab.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === tab.id
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex justify-between items-center">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search workspaces..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-[#13161F] border border-slate-800 text-sm rounded-lg pl-9 pr-4 py-2 w-full focus:outline-none focus:border-indigo-500/50 text-slate-300"
              />
            </div>
            <div className="flex items-center gap-3">
              <select className="bg-[#13161F] border border-slate-800 text-sm text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500/50">
                <option>Status: All</option>
                <option>Active</option>
                <option>Archived</option>
              </select>
              <select className="bg-[#13161F] border border-slate-800 text-sm text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500/50">
                <option>Type: All</option>
                <option>Private</option>
                <option>Public</option>
              </select>
              <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors bg-[#13161F] border border-slate-800 px-4 py-2 rounded-lg">
                <Filter size={14} /> Filter
              </button>
              <div className="flex bg-[#13161F] border border-slate-800 rounded-lg p-1 ml-2">
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}>
                  <List size={14}/>
                </button>
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}>
                  <LayoutGrid size={14}/>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          {filteredWorkspaces.length === 0 ? (
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-16 text-center">
              <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
                <FolderOpen size={28} className="text-indigo-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">
                {searchQuery ? 'No workspaces found' : activeTab === 'shared' ? 'No shared workspaces' : 'No workspaces yet'}
              </h3>
              <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
                {searchQuery
                  ? `No workspaces match "${searchQuery}". Try a different search term.`
                  : activeTab === 'shared'
                  ? 'No workspaces have been shared with you yet.'
                  : 'Create your first workspace to organize your team\'s knowledge.'}
              </p>
              {!searchQuery && activeTab !== 'shared' && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors mx-auto"
                >
                  <Plus size={16} /> Create First Workspace
                </button>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <div className="bg-[#13161F] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-[#0A0C10] border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Workspace Name</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Owner</th>
                      <th className="px-6 py-4 text-center">Members</th>
                      <th className="px-6 py-4 text-center">Documents</th>
                      <th className="px-6 py-4">Storage</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredWorkspaces.map((workspace) => (
                      <tr 
                        key={workspace.id} 
                        onClick={() => setSelectedWorkspaceId(workspace.id)}
                        className={`hover:bg-[#1E2333]/50 transition-colors cursor-pointer group ${selectedWorkspaceId === workspace.id ? 'bg-[#1E2333]' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                              {workspace.name.substring(0, 2)}
                            </div>
                            <div className="font-semibold text-white">{workspace.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs truncate max-w-[200px]">
                          {workspace.description || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-medium text-white">
                              {(workspace.owner_name || 'U')[0].toUpperCase()}
                            </div>
                            <span className="text-slate-300 text-xs">{workspace.owner_name || 'System'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-slate-300 font-medium">{workspace.members_count ?? 0}</td>
                        <td className="px-6 py-4 text-center text-slate-300 font-medium">{(workspace.documents_count ?? 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-slate-300 font-medium">{formatSize(workspace.storage_used ?? 0)}</td>
                        <td className="px-6 py-4">
                          {workspace.status === 'Active' || !workspace.status ? (
                            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Active</span>
                          ) : (
                            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-500/10 border border-slate-500/20 text-slate-400">Archived</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(workspace.id); }}
                            className="text-slate-500 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
                            title="Delete Workspace"
                          >
                            <Trash2 size={16}/>
                          </button>
                          <button className="text-slate-500 hover:text-white transition-colors p-1 opacity-0 group-hover:opacity-100">
                            <MoreVertical size={16}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWorkspaces.map(workspace => (
                <div 
                  key={workspace.id}
                  onClick={() => setSelectedWorkspaceId(workspace.id)}
                  className={`bg-[#13161F] border ${selectedWorkspaceId === workspace.id ? 'border-indigo-500' : 'border-slate-800'} rounded-2xl p-6 shadow-sm hover:border-slate-600 transition-all cursor-pointer flex flex-col h-full`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-lg uppercase border border-indigo-500/20">
                      {workspace.name.substring(0, 2)}
                    </div>
                    <div className="flex items-center gap-2">
                      {workspace.status === 'Active' || !workspace.status ? (
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Active</span>
                      ) : (
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-500/10 border border-slate-500/20 text-slate-400">Archived</span>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(workspace.id); }}
                        className="text-slate-600 hover:text-red-400 transition-colors p-1"
                        title="Delete Workspace"
                      >
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2">{workspace.name}</h3>
                  <p className="text-slate-400 text-sm flex-1 mb-6 line-clamp-2">
                    {workspace.description || 'Enterprise knowledge workspace.'}
                  </p>
                  
                  <div className="flex items-center gap-4 py-4 border-t border-slate-800/60 mt-auto justify-between">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Users size={14} />
                      <span className="text-xs font-medium">{workspace.members_count ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <FileText size={14} />
                      <span className="text-xs font-medium">{(workspace.documents_count ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <HardDrive size={14} />
                      <span className="text-xs font-medium">{formatSize(workspace.storage_used ?? 0)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar - Workspace Panel */}
        {selectedWorkspace && (
          <div className="w-full xl:w-80 space-y-6 shrink-0">
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-indigo-500/10 to-transparent"></div>
              
              <div className="flex items-center gap-4 relative z-10 mb-6">
                <div className="w-14 h-14 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold text-xl uppercase shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                  {selectedWorkspace.name.substring(0, 2)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">{selectedWorkspace.name}</h2>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider mt-1">
                    {selectedWorkspace.status || 'Active'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-6 bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                <Lock size={12} className="text-slate-500" /> {selectedWorkspace.type || 'Private'} Workspace
              </div>

              <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                {selectedWorkspace.description || 'Central hub for policies, procedures, and guidelines.'}
              </p>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-500">Owner</span>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-medium text-white">
                      {(selectedWorkspace.owner_name || 'U')[0].toUpperCase()}
                    </div>
                    <span className="text-white font-medium">{selectedWorkspace.owner_name || 'System'}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-500">Created</span>
                  <span className="text-slate-300">{new Date(selectedWorkspace.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-500">Type</span>
                  <span className="text-slate-300">{selectedWorkspace.type || 'Private'}</span>
                </div>
                
                <div className="pt-4 pb-2">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-slate-500 font-medium">Storage Used</span>
                    <span className="text-white font-medium">{formatSize(selectedWorkspace.storage_used ?? 0)} of 100 GB</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${Math.max(2, ((selectedWorkspace.storage_used ?? 0) / (100 * 1024 * 1024 * 1024)) * 100)}%` }}></div>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-500">Documents</span>
                  <span className="text-white font-medium">{(selectedWorkspace.documents_count ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-500">Collections</span>
                  <span className="text-white font-medium">{selectedWorkspace.collections_count ?? 0}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500">Members</span>
                  <span className="text-white font-medium">{selectedWorkspace.members_count ?? 0}</span>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button className="flex-1 bg-transparent border border-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                  <Share2 size={14} /> Share
                </button>
                <button className="flex-1 bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 text-indigo-400 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                  <Settings size={14} /> Manage
                </button>
                <button 
                  onClick={() => handleDelete(selectedWorkspace.id)}
                  className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center transition-colors"
                  title="Delete Workspace"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13161F] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">New Workspace</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Workspace Name *</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Engineering, Marketing, HR" 
                  className="w-full bg-[#0A0C10] border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</label>
                <textarea 
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="What is this workspace for?" 
                  rows={3}
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
                Create Workspace
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
