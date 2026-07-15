import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsApi } from '../lib/analytics';
import { useAuthStore } from '../store/authStore';
import { 
  FileText, Folder, MessageSquare, HardDrive, 
  Upload, CheckCircle, Clock, Search as SearchIcon, 
  ChevronRight, Sparkles, MoreVertical, AlertCircle
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';


export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [metrics, setMetrics] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [popularQueries, setPopularQueries] = useState<any[]>([]);
  const [topCollections, setTopCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInput, setAiInput] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [dashData, activityData, queriesRes, colsRes] = await Promise.all([
          analyticsApi.getDashboardMetrics(),
          analyticsApi.getRecentActivity(5),
          analyticsApi.getPopularQueries(5),
          analyticsApi.getTopCollections(5)
        ]);
        setMetrics(dashData);
        setActivities(activityData);
        setPopularQueries(queriesRes);
        setTopCollections(colsRes);
      } catch (e) {
        console.error("Failed to load dashboard data", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0A0C10] p-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#6366F1] border-t-transparent"></div>
          <p className="text-sm text-slate-400 animate-pulse">Loading enterprise metrics...</p>
        </div>
      </div>
    );
  }

  const { metrics: topMetrics, processing_status, usage_chart } = metrics || {};
  const { total_documents, total_collections, storage_bytes, ai_queries } = topMetrics || {};

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const pieData = [
    { name: 'Processed', value: processing_status?.processed || 0, color: '#10B981' },
    { name: 'Processing', value: processing_status?.processing || 0, color: '#8B5CF6' },
    { name: 'Queued', value: processing_status?.queued || 0, color: '#F59E0B' },
    { name: 'Failed', value: processing_status?.failed || 0, color: '#EF4444' },
  ].filter(d => d.value > 0);
  
  const totalProcessing = pieData.reduce((acc, curr) => acc + curr.value, 0);

  const ActivityIcon = ({ action }: { action: string }) => {
    switch (action) {
      case 'document_uploaded': return <Upload size={14} className="text-emerald-400" />;
      case 'document_processed': return <CheckCircle size={14} className="text-emerald-400" />;
      case 'chat_started': return <MessageSquare size={14} className="text-[#8B5CF6]" />;
      default: return <Clock size={14} className="text-slate-400" />;
    }
  };
  
  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    navigate('/dashboard/chat', { state: { initialPrompt: aiInput } });
  };

  const handlePopularQueryClick = (query: string) => {
    navigate('/dashboard/chat', { state: { initialPrompt: query } });
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0C10] text-slate-300 relative overflow-hidden">
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-8 pb-32">
        <div className="max-w-[1400px] mx-auto w-full space-y-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
                Good morning, {user?.full_name?.split(' ')[0] || 'User'} 👋
              </h1>
              <p className="text-slate-400 text-sm">
                Here's what's happening in your enterprise today.
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div 
                onClick={() => navigate('/dashboard/search')}
                className="flex items-center gap-3 bg-[#13161F] border border-slate-800 rounded-lg px-4 py-2 cursor-pointer hover:border-slate-700 transition-colors w-[300px]"
              >
                <SearchIcon size={16} className="text-slate-500" />
                <span className="text-sm text-slate-500 flex-1">Search across your enterprise...</span>
                <div className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-medium text-slate-400">⌘K</div>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-[#13161F] rounded-xl p-5 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <FileText size={22} className="text-blue-500" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1">Total Documents</div>
                  <div className="text-2xl font-bold text-white flex items-center gap-2">
                    {total_documents || 0}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-[#13161F] rounded-xl p-5 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <Folder size={22} className="text-indigo-400" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1">Collections</div>
                  <div className="text-2xl font-bold text-white flex items-center gap-2">
                    {total_collections || 0}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-[#13161F] rounded-xl p-5 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <MessageSquare size={22} className="text-purple-400" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1">AI Queries</div>
                  <div className="text-2xl font-bold text-white flex items-center gap-2">
                    {ai_queries || 0}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-[#13161F] rounded-xl p-5 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <HardDrive size={22} className="text-emerald-400" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1">Storage Used</div>
                  <div className="text-2xl font-bold text-white flex items-center gap-2">
                    {formatBytes(storage_bytes || 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Row */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            
            {/* Document Processing Donut */}
            <div className="bg-[#13161F] rounded-xl p-5 border border-slate-800 col-span-1 flex flex-col h-[320px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-white text-sm">Document Processing</h3>
                <button onClick={() => navigate('/dashboard/documents')} className="text-xs text-slate-400 hover:text-white transition-colors flex items-center">
                  View All <ChevronRight size={14} />
                </button>
              </div>
              
              {pieData.length > 0 ? (
                <div className="flex-1 flex flex-col justify-center relative">
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#1E2333', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                          itemStyle={{ color: '#fff' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-10px]">
                    <span className="text-2xl font-bold text-white">{totalProcessing}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Total</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-4 px-2">
                    {pieData.map((entry, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.color }} />
                          <span className="text-xs text-slate-400">{entry.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-white">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <AlertCircle size={24} className="opacity-50" />
                  <span className="text-xs">No processing data</span>
                </div>
              )}
            </div>

            {/* AI Copilot Usage Chart */}
            <div className="bg-[#13161F] rounded-xl p-5 border border-slate-800 col-span-1 lg:col-span-2 flex flex-col h-[320px]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-white text-sm">AI Copilot Usage</h3>
                <div className="bg-[#1E2333] border border-slate-700 rounded text-xs px-2 py-1 text-slate-300 flex items-center gap-1 cursor-pointer">
                  This Month <ChevronRight size={12} className="rotate-90" />
                </div>
              </div>
              <div className="flex-1 min-h-0">
                {usage_chart && usage_chart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={usage_chart} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#1E2333', color: '#fff' }}
                        itemStyle={{ color: '#8B5CF6' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="queries" 
                        stroke="#8B5CF6" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorQueries)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-500 text-sm">No usage data available</div>
                )}
              </div>
            </div>

            {/* Recent Activity Timeline */}
            <div className="bg-[#13161F] rounded-xl p-5 border border-slate-800 col-span-1 flex flex-col h-[320px] overflow-hidden">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-semibold text-white text-sm">Recent Activity</h3>
                <button className="text-xs text-slate-400 hover:text-white transition-colors flex items-center">
                  View All <ChevronRight size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-none space-y-5 pr-2">
                {activities && activities.length > 0 ? activities.map((activity, i) => (
                  <div key={i} className="flex gap-3 relative">
                    {i !== activities.length - 1 && (
                      <div className="absolute left-[13px] top-7 bottom-[-20px] w-[1px] bg-slate-800" />
                    )}
                    <div className="w-7 h-7 rounded-full bg-[#1E2333] border border-slate-700 flex items-center justify-center z-10 shrink-0">
                      <ActivityIcon action={activity.action} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{activity.details}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(activity.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="flex h-full items-center justify-center text-slate-500 text-xs">No recent activity</div>
                )}
              </div>
            </div>

          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Top Collections */}
            <div className="bg-[#13161F] rounded-xl p-5 border border-slate-800 flex flex-col min-h-[260px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-white text-sm">Top Collections</h3>
                <button onClick={() => navigate('/dashboard/collections')} className="text-xs text-slate-400 hover:text-white transition-colors flex items-center">
                  View All <ChevronRight size={14} />
                </button>
              </div>
              <div className="flex-1 space-y-1">
                {topCollections && topCollections.length > 0 ? topCollections.map((col, i) => (
                  <div key={i} onClick={() => navigate(`/dashboard/collections/${col.id}`)} className="flex items-center justify-between p-2.5 hover:bg-slate-800/40 rounded-lg cursor-pointer transition-colors group">
                    <div className="flex items-center gap-3">
                      <Folder size={16} className="text-indigo-400" />
                      <span className="text-sm text-slate-300 font-medium group-hover:text-white transition-colors">{col.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">{col.document_count} documents</span>
                      <MoreVertical size={14} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                )) : (
                  <div className="flex h-full items-center justify-center text-slate-500 text-xs pb-4">No collections found</div>
                )}
              </div>
            </div>

            {/* Popular Queries */}
            <div className="bg-[#13161F] rounded-xl p-5 border border-slate-800 flex flex-col min-h-[260px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-white text-sm">Popular Queries</h3>
              </div>
              <div className="flex-1 space-y-1">
                {popularQueries && popularQueries.length > 0 ? popularQueries.map((q, i) => (
                  <div key={i} onClick={() => handlePopularQueryClick(q.query)} className="flex items-center justify-between p-2.5 hover:bg-[#1E2333] border border-transparent hover:border-slate-700/50 rounded-lg cursor-pointer transition-all group">
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                      <SearchIcon size={14} className="text-[#8B5CF6] shrink-0" />
                      <span className="text-sm text-slate-300 truncate group-hover:text-white transition-colors">{q.query}</span>
                    </div>
                    <span className="text-xs font-semibold text-[#8B5CF6] shrink-0">{q.count}</span>
                  </div>
                )) : (
                  <div className="flex h-full items-center justify-center text-slate-500 text-xs pb-4">No query data available</div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Sticky Bottom Copilot Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0A0C10] via-[#0A0C10] to-transparent pointer-events-none">
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <div className="bg-gradient-to-r from-[#1A1832] to-[#121422] rounded-2xl p-1 shadow-2xl border border-indigo-500/20">
            <div className="bg-[#13161F]/90 backdrop-blur-xl rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <Sparkles size={20} className="text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white leading-tight">IntelliCore AI Copilot</h4>
                  <p className="text-[11px] text-slate-400">Ask questions, get insights, and discover information.</p>
                </div>
              </div>
              <form onSubmit={handleAiSubmit} className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Ask anything about your knowledge..."
                  className="flex-1 bg-[#0A0C10] border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
                <button 
                  type="submit"
                  disabled={!aiInput.trim()}
                  className="bg-[#6366F1] hover:bg-[#5558DD] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                >
                  Start Chat <ChevronRight size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
