import { useState, useEffect } from 'react';
import { useHierarchyStore } from '../store/hierarchyStore';
import api from '../lib/api';
import { 
  Database, Plus, Cloud, FileText, 
  Search, Filter, MoreVertical, RefreshCw, AlertCircle, 
  CheckCircle2, Clock, Users, MessageSquare, HardDrive, Code2, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface DataSource {
  id: number;
  name: string;
  type: string;
  status: string;
  last_sync: string | null;
  document_count: number;
  size_bytes: number;
}

export default function DataSources() {
  const { selectedOrgId } = useHierarchyStore();
  const [sources, setSources] = useState<DataSource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('Cloud Storage');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSources = async () => {
    if (!selectedOrgId) return;
    try {
      const res = await api.get(`/data-sources?organization_id=${selectedOrgId}`);
      setSources(res.data);
    } catch (err) {
      console.error("Failed to load data sources", err);
    }
  };

  useEffect(() => {
    fetchSources();
  }, [selectedOrgId]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Data source name is required");
      return;
    }
    if (!selectedOrgId) {
      toast.error("No organization selected. Please wait or refresh the page.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/data-sources/', {
        name: newName,
        type: newType,
        organization_id: selectedOrgId
      });
      await fetchSources();
      toast.success("Data source connected successfully");
      setIsModalOpen(false);
      setNewName('');
      setNewType('Cloud Storage');
    } catch (err: any) {
      console.error("Failed to add data source", err);
      toast.error(err.response?.data?.detail || "Failed to add data source");
    } finally {
      setIsSubmitting(false);
    }
  };

  const comingSoonSources = [
    { name: 'Google Drive - Corporate', type: 'Cloud Storage', status: 'Coming Soon', icon: Cloud, email: 'john@acme.com' },
    { name: 'SharePoint - HR', type: 'Collaboration', status: 'Coming Soon', icon: Users, email: 'hr@acme.com' },
    { name: 'GitHub - Engineering', type: 'Code Repository', status: 'Coming Soon', icon: Code2, email: 'dev-ops' },
    { name: 'Slack - General', type: 'Communication', status: 'Coming Soon', icon: MessageSquare, email: '#general' },
    { name: 'Notion - Product', type: 'Workspace', status: 'Coming Soon', icon: FileText, email: 'product-team' },
  ];

  const activeSources = sources;

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'connected': 
        return <span className="flex w-fit items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"><CheckCircle2 size={10} /> Connected</span>;
      case 'syncing': 
        return <span className="flex w-fit items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"><RefreshCw size={10} className="animate-spin" /> Syncing</span>;
      case 'failed': 
        return <span className="flex w-fit items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-red-500/10 border border-red-500/20 text-red-400"><AlertCircle size={10} /> Failed</span>;
      case 'rate limited': 
        return <span className="flex w-fit items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-amber-500/10 border border-amber-500/20 text-amber-500"><AlertCircle size={10} /> Rate Limited</span>;
      case 'coming soon': 
        return <span className="flex w-fit items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-slate-500/10 border border-slate-500/20 text-slate-400"><Clock size={10} /> Coming Soon</span>;
      default:
        return <span className="flex w-fit items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-slate-500/10 border border-slate-500/20 text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0C10] overflow-y-auto scrollbar-thin text-slate-300">
      
      {/* Header */}
      <div className="border-b border-slate-800 bg-[#0A0C10]/90 backdrop-blur-md sticky top-0 z-10 px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Data Sources</h1>
            <p className="text-slate-400 text-sm mt-1">Connect, manage, and sync data from various sources across your organization.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Plus size={16} /> Add Data Source
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 flex flex-col xl:flex-row gap-8">
        
        {/* Left Content - Main Grid */}
        <div className="flex-1 space-y-6">
          
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2 text-indigo-400">
                <div className="p-2 bg-indigo-500/10 rounded-lg"><Database size={16} /></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sources</span>
              </div>
              <p className="text-2xl font-bold text-white">{sources.length}</p>
            </div>
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2 text-emerald-400">
                <div className="p-2 bg-emerald-500/10 rounded-lg"><CheckCircle2 size={16} /></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Connected</span>
              </div>
              <p className="text-2xl font-bold text-white">{sources.filter(s => s.status?.toLowerCase() === 'connected').length}</p>
            </div>
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2 text-blue-400">
                <div className="p-2 bg-blue-500/10 rounded-lg"><RefreshCw size={16} /></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Syncing</span>
              </div>
              <p className="text-2xl font-bold text-white">{sources.filter(s => s.status?.toLowerCase() === 'syncing').length}</p>
            </div>
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2 text-red-400">
                <div className="p-2 bg-red-500/10 rounded-lg"><AlertCircle size={16} /></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Failed</span>
              </div>
              <p className="text-2xl font-bold text-white">{sources.filter(s => s.status?.toLowerCase() === 'failed').length}</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-6 border-b border-slate-800">
            <button className="pb-3 text-sm font-medium text-indigo-400 border-b-2 border-indigo-500">All Sources</button>
            <button className="pb-3 text-sm font-medium text-slate-400 hover:text-white border-b-2 border-transparent hover:border-slate-700 transition-colors">Connected</button>
            <button className="pb-3 text-sm font-medium text-slate-400 hover:text-white border-b-2 border-transparent hover:border-slate-700 transition-colors">Cloud Storage</button>
            <button className="pb-3 text-sm font-medium text-slate-400 hover:text-white border-b-2 border-transparent hover:border-slate-700 transition-colors">Databases</button>
          </div>

          {/* Search Bar */}
          <div className="flex justify-between items-center">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search data sources..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-[#13161F] border border-slate-800 text-sm rounded-lg pl-9 pr-4 py-2 w-full focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors bg-[#13161F] border border-slate-800 px-4 py-2 rounded-lg">
              <Filter size={14} /> Filter
            </button>
          </div>

          {/* Main Table */}
          <div className="bg-[#13161F] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-[#0A0C10] border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Source Name</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last Sync</th>
                    <th className="px-6 py-4">Documents</th>
                    <th className="px-6 py-4">Size</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  
                  {/* Active Sources */}
                  {activeSources.map((source, i) => (
                    <tr key={`active-${i}`} className="hover:bg-[#1E2333]/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                            <HardDrive size={16} />
                          </div>
                          <div>
                            <div className="font-semibold text-white">{source.name}</div>
                            <div className="text-xs text-slate-500 mt-0.5">\\fileserver\shared</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-indigo-300 font-medium text-xs"><div className="flex items-center gap-1.5"><Cloud size={12}/> {source.type}</div></td>
                      <td className="px-6 py-4">{getStatusBadge(source.status)}</td>
                      <td className="px-6 py-4">
                        <div className="text-white text-xs">{formatDistanceToNow(new Date(source.last_sync || new Date()), { addSuffix: true })}</div>
                        <div className="text-[10px] text-emerald-400 font-bold mt-0.5">Success</div>
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-medium">{source.document_count.toLocaleString()}</td>
                      <td className="px-6 py-4 text-slate-300 font-medium">{formatSize(source.size_bytes)}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-500 hover:text-white transition-colors p-1"><MoreVertical size={16}/></button>
                      </td>
                    </tr>
                  ))}

                  {/* Coming Soon Sources */}
                  {sources.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        <Database size={32} className="mx-auto mb-3 opacity-20" />
                        <p>No data sources connected yet.</p>
                      </td>
                    </tr>
                  )}
                  {sources.length > 0 && comingSoonSources.map((source, i) => (
                    <tr key={`disabled-${i}`} className="hover:bg-[#1E2333]/50 transition-colors opacity-60 grayscale hover:grayscale-0 group cursor-not-allowed">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center">
                            <source.icon size={16} />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-300">{source.name}</div>
                            <div className="text-xs text-slate-600 mt-0.5">{source.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-medium text-xs"><div className="flex items-center gap-1.5"><Cloud size={12}/> {source.type}</div></td>
                      <td className="px-6 py-4">{getStatusBadge(source.status)}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs">-</td>
                      <td className="px-6 py-4 text-slate-500">-</td>
                      <td className="px-6 py-4 text-slate-500">-</td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-600 hover:text-slate-400 transition-colors p-1" disabled><MoreVertical size={16}/></button>
                      </td>
                    </tr>
                  ))}

                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Analytics Panel */}
        <div className="w-full xl:w-80 space-y-6 shrink-0">
          
          <div className="bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-white">Data Source Overview</h3>
            </div>
            
            <div className="flex justify-center mb-6">
              {/* Fake Donut Chart via CSS borders */}
              <div className="w-32 h-32 rounded-full border-[12px] border-t-blue-500 border-r-emerald-500 border-b-amber-500 border-l-indigo-500 opacity-90 relative flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                <div className="absolute inset-0 m-2 rounded-full bg-[#13161F]"></div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300"><div className="w-2 h-2 rounded bg-blue-500"></div> Cloud Storage</div>
                <div className="flex items-center gap-2"><span className="text-white">7</span> <span className="text-slate-500">(38.9%)</span></div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300"><div className="w-2 h-2 rounded bg-indigo-500"></div> Databases</div>
                <div className="flex items-center gap-2"><span className="text-white">4</span> <span className="text-slate-500">(22.2%)</span></div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300"><div className="w-2 h-2 rounded bg-emerald-500"></div> Collaboration</div>
                <div className="flex items-center gap-2"><span className="text-white">4</span> <span className="text-slate-500">(22.2%)</span></div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300"><div className="w-2 h-2 rounded bg-amber-500"></div> File Systems</div>
                <div className="flex items-center gap-2"><span className="text-white">2</span> <span className="text-slate-500">(11.1%)</span></div>
              </div>
            </div>
          </div>

          <div className="bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Sync Activity</h3>
              <button className="text-xs font-medium text-indigo-400 hover:text-indigo-300">View All</button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="mt-1"><CheckCircle2 size={14} className="text-emerald-500" /></div>
                  <div>
                    <div className="text-xs text-white font-medium">Google Drive - Corporate</div>
                    <div className="text-[10px] text-slate-500">Synced 120 documents</div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">10 min ago</div>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="mt-1"><RefreshCw size={14} className="text-blue-500 animate-spin" /></div>
                  <div>
                    <div className="text-xs text-white font-medium">AWS S3 - Project Docs</div>
                    <div className="text-[10px] text-blue-400">Sync in progress (60%)</div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Syncing...</div>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="mt-1"><AlertCircle size={14} className="text-amber-500" /></div>
                  <div>
                    <div className="text-xs text-white font-medium">Slack - Engineering</div>
                    <div className="text-[10px] text-slate-500">Rate limited, retrying...</div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">5 hours ago</div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13161F] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Add Data Source</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Connection Name</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Production DB, AWS S3 Buckets" 
                  className="w-full bg-[#0A0C10] border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Source Type</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  className="w-full bg-[#0A0C10] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                >
                  <option value="Cloud Storage">Cloud Storage (S3, GCS, Blob)</option>
                  <option value="Database">Database (PostgreSQL, MySQL)</option>
                  <option value="Collaboration">Collaboration (SharePoint, Google Drive)</option>
                  <option value="File System">File System / Local</option>
                  <option value="API">REST API / Webhook</option>
                </select>
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
                Connect Data Source
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
