import { useState, useEffect } from 'react';
import { useHierarchyStore } from '../store/hierarchyStore';
import api from '../lib/api';
import { 
  FileText, CheckCircle2, Clock, Hourglass, Filter, Plus, 
  Search, MoreVertical, Calendar as CalendarIcon, Download,
  Activity, Settings, Database, FileBarChart, PieChart as PieChartIcon
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, AreaChart, Area } from 'recharts';
import { formatDistanceToNow } from 'date-fns';

const PIE_COLORS = ['#6366f1', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

interface Report {
  id: number;
  organization_id: number;
  owner_id: number;
  owner_name: string;
  name: string;
  type: string;
  status: string;
  frequency: string | null;
  downloads: number;
  last_run: string | null;
  created_at: string;
}

export default function Reports() {
  const { organizations, selectedOrgId } = useHierarchyStore();
  const currentOrg = organizations.find(o => o.id === selectedOrgId);
  const [reports, setReports] = useState<Report[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All Reports');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newReportForm, setNewReportForm] = useState({ name: '', type: 'Usage', frequency: 'Monthly', status: 'Scheduled' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentOrg]);

  async function fetchData() {
    if (!currentOrg) {
      setLoading(false);
      return;
    }
    try {
      const [reportsRes, analyticsRes] = await Promise.all([
        api.get(`/reports/?organization_id=${currentOrg.id}`),
        api.get(`/reports/analytics?organization_id=${currentOrg.id}`)
      ]);
      setReports(reportsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateReport = async () => {
    if (!currentOrg || !newReportForm.name) return;
    setCreating(true);
    try {
      await api.post(`/reports/?organization_id=${currentOrg.id}`, newReportForm);
      await fetchData();
      setShowNewDialog(false);
      setNewReportForm({ name: '', type: 'Usage', frequency: 'Monthly', status: 'Scheduled' });
    } catch (err) {
      console.error('Failed to create report', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (reportId: number, reportName: string) => {
    try {
      const response = await api.get(`/reports/${reportId}/export`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportName.replace(/ /g, '_')}_export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Refresh to update download count
      fetchData();
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'Scheduled': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'Draft': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Usage': return <Activity size={14} />;
      case 'Data': return <Database size={14} />;
      case 'Analytics': return <FileBarChart size={14} />;
      case 'AI': return <PieChartIcon size={14} />;
      case 'System': return <Settings size={14} />;
      default: return <FileText size={14} />;
    }
  };

  // Mock data for mini charts in right sidebar
  const miniChartData = [
    { name: 'Mon', uv: 4 }, { name: 'Tue', uv: 3 }, { name: 'Wed', uv: 7 }, 
    { name: 'Thu', uv: 5 }, { name: 'Fri', uv: 8 }, { name: 'Sat', uv: 3 }, { name: 'Sun', uv: 6 }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full bg-[#0A0C10]">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  const activeAnalytics = analytics || {
    kpis: {
      total_reports: 0,
      completed: 0,
      scheduled: 0,
      drafts: 0
    },
    downloads: 0,
    reports_by_type: [
      { name: 'Usage', value: 0 },
      { name: 'Data', value: 0 },
      { name: 'Analytics', value: 0 },
      { name: 'AI', value: 0 },
      { name: 'System', value: 0 }
    ]
  };

  const { kpis, downloads, reports_by_type } = activeAnalytics;

  return (
    <div className="flex flex-col h-full bg-[#0A0C10] overflow-y-auto scrollbar-thin text-slate-300">
      
      {/* Header */}
      <div className="border-b border-slate-800 bg-[#0A0C10]/90 backdrop-blur-md sticky top-0 z-20 px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Reports</h1>
            <p className="text-slate-400 text-sm mt-1">Create, schedule, and manage reports to gain actionable insights from your knowledge data.</p>
          </div>
          <div className="flex gap-3">
            <div className="relative w-64 hidden md:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search reports..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-[#13161F] border border-slate-800 text-sm rounded-lg pl-9 pr-4 py-2 w-full focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <button className="flex items-center gap-2 text-sm text-slate-300 bg-[#13161F] border border-slate-700 hover:border-slate-500 px-4 py-2 rounded-lg transition-colors">
              <Filter size={14} /> Filters
            </button>
            <button onClick={() => setShowNewDialog(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              <Plus size={16} /> New Report
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 flex flex-col xl:flex-row gap-8">
        
        {/* Main Area */}
        <div className="flex-1 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <FileText size={18} />
                </div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Reports</div>
              </div>
              <p className="text-2xl font-bold text-white">{kpis.total_reports}</p>
            </div>
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 size={18} />
                </div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed</div>
              </div>
              <p className="text-2xl font-bold text-white">{kpis.completed}</p>
            </div>
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Clock size={18} />
                </div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Scheduled</div>
              </div>
              <p className="text-2xl font-bold text-white">{kpis.scheduled}</p>
            </div>
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Hourglass size={18} />
                </div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Drafts</div>
              </div>
              <p className="text-2xl font-bold text-white">{kpis.drafts}</p>
            </div>
          </div>

          <div className="flex gap-6 border-b border-slate-800">
            {['All Reports', 'My Reports', 'Scheduled', 'Shared With Me'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center bg-[#13161F] p-2 rounded-lg border border-slate-800">
            <div className="flex items-center gap-4 px-2 text-sm">
               <span className="text-slate-400 cursor-pointer">All Status</span>
               <span className="text-slate-400 cursor-pointer">All Types</span>
            </div>
          </div>

          <div className="bg-[#13161F] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-[#0A0C10] border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Report Name</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Owner</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last Run</th>
                    <th className="px-6 py-4">Frequency</th>
                    <th className="px-6 py-4 text-center">Downloads</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {reports.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).map((report) => (
                    <tr 
                      key={report.id} 
                      className="hover:bg-[#1E2333]/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            report.type === 'Usage' ? 'bg-indigo-500/20 text-indigo-400' :
                            report.type === 'Data' ? 'bg-emerald-500/20 text-emerald-400' :
                            report.type === 'Analytics' ? 'bg-blue-500/20 text-blue-400' :
                            report.type === 'Compliance' ? 'bg-rose-500/20 text-rose-400' :
                            'bg-amber-500/20 text-amber-400'
                          }`}>
                            <FileText size={16} />
                          </div>
                          <div>
                            <div className="font-semibold text-white">{report.name}</div>
                            <div className="text-[10px] text-slate-400">Created {new Date(report.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-slate-700 bg-[#0A0C10] text-slate-300">
                          {getTypeIcon(report.type)} {report.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <img 
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${report.owner_name}&backgroundColor=c0aede`} 
                              alt="Avatar" 
                              className="w-6 h-6 rounded-full bg-slate-800"
                            />
                          <span className="text-slate-300 text-xs">{report.owner_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(report.status)}`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {report.last_run ? (
                          <div>
                            <div>{new Date(report.last_run).toLocaleDateString()}</div>
                            <div className="text-[10px]">{new Date(report.last_run).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5 text-xs text-slate-300">
                          <CalendarIcon size={12} className="text-slate-500"/> {report.frequency || 'One-time'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-slate-300 font-medium">
                        {report.downloads}
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        {report.status === 'Completed' && (
                          <button onClick={() => handleDownload(report.id, report.name)} className="text-indigo-400 hover:text-indigo-300 transition-colors p-1" title="Download CSV">
                            <Download size={16}/>
                          </button>
                        )}
                        <button className="text-slate-500 hover:text-white transition-colors p-1"><MoreVertical size={16}/></button>
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                        No reports found. Create one to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-full xl:w-80 space-y-6 shrink-0">
          
          <div className="bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Recent Reports</h3>
              <span className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer">View all</span>
            </div>
            <div className="space-y-4">
              {reports.slice(0,4).map(report => (
                <div key={report.id} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <FileText size={12} />
                    </div>
                    <div className="truncate pr-2">
                      <div className="text-slate-300 truncate font-medium">{report.name}</div>
                      <div className="text-slate-500 text-[10px]">{formatDistanceToNow(new Date(report.created_at), {addSuffix: true})}</div>
                    </div>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${getStatusColor(report.status)}`}>
                    {report.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Report Analytics</h3>
              <select className="bg-[#0A0C10] border border-slate-800 text-xs text-slate-400 rounded px-2 py-1 focus:outline-none">
                <option>This Month</option>
              </select>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="text-xs text-slate-500 mb-1">Reports Generated</div>
                <div className="text-xl font-bold text-white mb-2">{kpis.completed}</div>
                <div className="h-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={miniChartData}>
                      <Area type="monotone" dataKey="uv" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs text-slate-500 mb-1">Downloads</div>
                <div className="text-xl font-bold text-white mb-2">{downloads}</div>
                <div className="h-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={miniChartData}>
                      <Area type="monotone" dataKey="uv" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} strokeWidth={2}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-white mb-4">Reports by Type</h3>
            <div className="flex items-center justify-between">
              <div className="w-24 h-24 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={reports_by_type} cx="50%" cy="50%" innerRadius={25} outerRadius={45} paddingAngle={2} dataKey="value" stroke="none">
                      {reports_by_type.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px', fontSize: '12px' }}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm font-bold text-white">{kpis.total_reports}</span>
                </div>
              </div>
              <div className="flex-1 pl-4 space-y-1.5 text-xs">
                {reports_by_type.map((entry: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                    <span className="text-slate-400">{entry.name}</span>
                    <span className="text-white font-medium ml-auto">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* New Report Dialog Overlay */}
      {showNewDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#13161F] border border-slate-800 rounded-xl w-[500px] shadow-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Create New Report</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Report Name</label>
                <input 
                  type="text" 
                  value={newReportForm.name}
                  onChange={e => setNewReportForm({...newReportForm, name: e.target.value})}
                  className="w-full bg-[#0A0C10] border border-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Monthly Knowledge Usage"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Report Type</label>
                <select 
                  value={newReportForm.type}
                  onChange={e => setNewReportForm({...newReportForm, type: e.target.value})}
                  className="w-full bg-[#0A0C10] border border-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Usage">Usage</option>
                  <option value="Data">Data / Documents</option>
                  <option value="Analytics">Search Analytics</option>
                  <option value="AI">AI Copilot</option>
                  <option value="Compliance">Compliance & Audit</option>
                  <option value="System">System Health</option>
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Frequency</label>
                  <select 
                    value={newReportForm.frequency}
                    onChange={e => setNewReportForm({...newReportForm, frequency: e.target.value})}
                    className="w-full bg-[#0A0C10] border border-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="One-time">One-time</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Initial Status</label>
                  <select 
                    value={newReportForm.status}
                    onChange={e => setNewReportForm({...newReportForm, status: e.target.value})}
                    className="w-full bg-[#0A0C10] border border-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed (Run Now)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowNewDialog(false)} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                Cancel
              </button>
              <button 
                onClick={handleCreateReport} 
                disabled={creating || !newReportForm.name}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              >
                {creating ? 'Creating...' : (newReportForm.status === 'Completed' ? 'Run Report' : 'Save Report')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
