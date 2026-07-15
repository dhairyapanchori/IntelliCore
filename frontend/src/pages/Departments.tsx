import { useState, useMemo } from 'react';
import { useHierarchyStore } from '../store/hierarchyStore';
import api from '../lib/api';
import { 
  Users, Plus, Search, Filter, MoreVertical, 
  Building2, FileText, HardDrive, List, LayoutGrid,
  MapPin, Settings, X, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function Departments() {
  const { departments, workspaces, selectedWorkspaceId, fetchDepartments, deleteDepartment } = useHierarchyStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newWorkspaceId, setNewWorkspaceId] = useState<number>(selectedWorkspaceId || (workspaces[0]?.id) || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default workspace if it becomes available
  useMemo(() => {
    if (workspaces.length > 0 && !newWorkspaceId) {
      setNewWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, newWorkspaceId]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Department name is required");
      return;
    }
    if (!newWorkspaceId && workspaces.length > 0) {
      toast.error("Workspace is not selected");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/departments/', {
        name: newName,
        description: newDesc,
        workspace_id: newWorkspaceId || null
      });
      if (newWorkspaceId) {
        await fetchDepartments(newWorkspaceId);
      } else {
        await fetchDepartments('all' as any); // Assuming all or handling gracefully
      }
      toast.success("Department created successfully");
      setIsModalOpen(false);
      setNewName('');
      setNewDesc('');
    } catch (err: any) {
      console.error("Failed to create department", err);
      toast.error(err.response?.data?.detail || "Failed to create department");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await deleteDepartment(id);
      toast.success("Department deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete department");
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDepartments = useMemo(() => {
    return departments.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [departments, searchQuery]);

  useMemo(() => {
    if (departments.length > 0 && !selectedDeptId) {
      setSelectedDeptId(departments[0].id);
    }
  }, [departments, selectedDeptId]);

  const selectedDept = departments.find(d => d.id === selectedDeptId) || departments[0];

  // Global KPIs
  const totalMembers = departments.reduce((acc, curr) => acc + (curr.members_count || 0), 0);
  const totalDocuments = departments.reduce((acc, curr) => acc + (curr.documents_count || 0), 0);
  const totalStorage = departments.reduce((acc, curr) => acc + (curr.storage_used || 0), 0);
  const activeDepartments = departments.filter(d => d.status === 'Active').length;

  // Mock data for pie chart
  const pieData = [
    { name: 'PDFs', value: 400 },
    { name: 'Word', value: 300 },
    { name: 'Excel', value: 300 },
    { name: 'Images', value: 200 },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0A0C10] overflow-y-auto scrollbar-thin text-slate-300">
      <div className="border-b border-slate-800 bg-[#0A0C10]/90 backdrop-blur-md sticky top-0 z-10 px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Departments</h1>
            <p className="text-slate-400 text-sm mt-1">Manage departmental divisions, teams, and their knowledge collections.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-pink-600 hover:bg-pink-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-pink-500/20"
            >
              <Plus size={16} /> New Department
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 flex flex-col xl:flex-row gap-8">
        
        {/* Main Grid Area */}
        <div className="flex-1 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Departments</div>
              <p className="text-2xl font-bold text-white">{departments.length}</p>
            </div>
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Members</div>
              <p className="text-2xl font-bold text-white">{totalMembers}</p>
            </div>
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Documents</div>
              <p className="text-2xl font-bold text-white">{totalDocuments.toLocaleString()}</p>
            </div>
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Storage</div>
              <p className="text-2xl font-bold text-white">{formatSize(totalStorage)}</p>
            </div>
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-4 shadow-sm border-l-4 border-l-emerald-500">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Active</div>
              <p className="text-2xl font-bold text-white">{activeDepartments}</p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search departments..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-[#13161F] border border-slate-800 text-sm rounded-lg pl-9 pr-4 py-2 w-full focus:outline-none focus:border-pink-500/50"
              />
            </div>
            <div className="flex items-center gap-3">
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

          {viewMode === 'list' ? (
            <div className="bg-[#13161F] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-[#0A0C10] border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Department Name</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Head</th>
                      <th className="px-6 py-4 text-center">Members</th>
                      <th className="px-6 py-4 text-center">Documents</th>
                      <th className="px-6 py-4">Storage</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredDepartments.map((dept) => (
                      <tr 
                        key={dept.id} 
                        onClick={() => setSelectedDeptId(dept.id)}
                        className={`hover:bg-[#1E2333]/50 transition-colors cursor-pointer group ${selectedDeptId === dept.id ? 'bg-[#1E2333]' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center font-bold text-xs uppercase border border-pink-500/20 shadow-[0_0_10px_rgba(236,72,153,0.1)]">
                              {dept.name.substring(0, 2)}
                            </div>
                            <div className="font-semibold text-white">{dept.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs truncate max-w-[200px]">
                          {dept.description || 'Departmental division'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-medium text-white">
                              {(dept.head_name || 'U')[0].toUpperCase()}
                            </div>
                            <span className="text-slate-300 text-xs">{dept.head_name || 'System'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-slate-300 font-medium">{dept.members_count}</td>
                        <td className="px-6 py-4 text-center text-slate-300 font-medium">{dept.documents_count.toLocaleString()}</td>
                        <td className="px-6 py-4 text-slate-300 font-medium">{formatSize(dept.storage_used)}</td>
                        <td className="px-6 py-4">
                          {dept.status === 'Active' ? (
                            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Active</span>
                          ) : (
                            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-500/10 border border-slate-500/20 text-slate-400">Archived</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={(e) => handleDelete(e, dept.id)}
                            className="text-slate-500 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
                            title="Delete Department"
                          >
                            <Trash2 size={16}/>
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
              {filteredDepartments.map(dept => (
                <div 
                  key={dept.id}
                  onClick={() => setSelectedDeptId(dept.id)}
                  className={`bg-[#13161F] border ${selectedDeptId === dept.id ? 'border-pink-500' : 'border-slate-800'} rounded-2xl p-6 shadow-sm hover:border-slate-600 transition-all cursor-pointer flex flex-col h-full`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center font-bold text-lg uppercase border border-pink-500/20">
                      {dept.name.substring(0, 2)}
                    </div>
                    <div className="flex items-center gap-2">
                      {dept.status === 'Active' ? (
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Active</span>
                      ) : (
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-500/10 border border-slate-500/20 text-slate-400">Archived</span>
                      )}
                      <button 
                        onClick={(e) => handleDelete(e, dept.id)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
                        title="Delete Department"
                      >
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2">{dept.name}</h3>
                  <p className="text-slate-400 text-sm flex-1 mb-6 line-clamp-2">
                    {dept.description || 'Departmental division'}
                  </p>
                  
                  <div className="flex items-center gap-4 py-4 border-t border-slate-800/60 mt-auto justify-between">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Users size={14} />
                      <span className="text-xs font-medium">{dept.members_count}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <FileText size={14} />
                      <span className="text-xs font-medium">{dept.documents_count.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <HardDrive size={14} />
                      <span className="text-xs font-medium">{formatSize(dept.storage_used)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar - Department Panel */}
        {selectedDept && (
          <div className="w-full xl:w-80 space-y-6 shrink-0">
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-pink-500/10 to-transparent"></div>
              
              <div className="flex items-center gap-4 relative z-10 mb-6">
                <div className="w-14 h-14 rounded-xl bg-pink-500 text-white flex items-center justify-center font-bold text-xl uppercase shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                  {selectedDept.name.substring(0, 2)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">{selectedDept.name}</h2>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider mt-1">
                    {selectedDept.status}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 border-b border-slate-800 mb-6 text-sm">
                <button className="pb-2 text-pink-400 border-b-2 border-pink-500 font-medium">Overview</button>
                <button className="pb-2 text-slate-500 hover:text-slate-300">Members</button>
                <button className="pb-2 text-slate-500 hover:text-slate-300">Docs</button>
                <button className="pb-2 text-slate-500 hover:text-slate-300">Activity</button>
              </div>

              <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                {selectedDept.description || 'Enterprise department division. Managing all relevant collections and resources.'}
              </p>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-500">Head</span>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-medium text-white">
                      {(selectedDept.head_name || 'U')[0].toUpperCase()}
                    </div>
                    <span className="text-white font-medium">{selectedDept.head_name || 'System'}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-500">Created</span>
                  <span className="text-slate-300">{new Date(selectedDept.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-500">Location</span>
                  <span className="text-slate-300 flex items-center gap-1.5"><MapPin size={12} className="text-slate-500"/> {selectedDept.location || 'HQ'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-500">Workspace</span>
                  <span className="text-slate-300 flex items-center gap-1.5 text-indigo-400"><Building2 size={12}/> {workspaces.find(w => w.id === selectedDept.workspace_id)?.name || 'Unknown'}</span>
                </div>

                <div className="pt-4 pb-2">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-slate-500 font-medium">Storage Used</span>
                    <span className="text-white font-medium">{formatSize(selectedDept.storage_used)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-pink-500 rounded-full shadow-[0_0_10px_rgba(236,72,153,0.5)]" style={{ width: `${Math.max(10, (selectedDept.storage_used / (50 * 1024 * 1024 * 1024)) * 100)}%` }}></div>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-500">Documents</span>
                  <span className="text-white font-medium">{selectedDept.documents_count.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-500">Collections</span>
                  <span className="text-white font-medium">{selectedDept.collections_count}</span>
                </div>
              </div>

              <div className="mt-8">
                <button className="w-full bg-pink-600/10 border border-pink-500/20 hover:bg-pink-600/20 text-pink-400 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                  <Settings size={14} /> Manage Department
                </button>
              </div>
            </div>

            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white">Documents by Type</h3>
              </div>
              <div className="h-40 flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '12px' }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {pieData.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                    <span className="text-slate-400">{entry.name}</span>
                  </div>
                ))}
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
              <h3 className="text-lg font-bold text-white">New Department</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Department Name</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Sales, Marketing, IT" 
                  className="w-full bg-[#0A0C10] border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Workspace</label>
                <select
                  value={newWorkspaceId}
                  onChange={e => setNewWorkspaceId(Number(e.target.value))}
                  className="w-full bg-[#0A0C10] border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all"
                >
                  <option value={0} disabled>Select a Workspace...</option>
                  {workspaces.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</label>
                <textarea 
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="What is this department for?" 
                  rows={3}
                  className="w-full bg-[#0A0C10] border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all resize-none"
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
                className="bg-pink-600 hover:bg-pink-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div> : null}
                Create Department
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
