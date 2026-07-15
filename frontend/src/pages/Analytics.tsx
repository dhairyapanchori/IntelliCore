import { useState, useEffect } from 'react';
import { useHierarchyStore } from '../store/hierarchyStore';
import api from '../lib/api';
import { 
  FileText, Search, MessageSquare, Download, HardDrive, 
  Calendar as CalendarIcon, Filter, ArrowUpRight, ArrowDownRight,
  TrendingUp, TrendingDown
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';

const PIE_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
const DONUT_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#64748b'];

export default function Analytics() {
  const { organizations, selectedOrgId } = useHierarchyStore();
  const currentOrg = organizations.find(o => o.id === selectedOrgId);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');

  useEffect(() => {
    async function fetchAnalytics() {
      if (!currentOrg) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/analytics/dashboard').catch(() => null);
        if (res && res.data) {
          setData(res.data);
        } else {
          setData({
            kpis: {
              total_documents: { value: 0, growth: 0 },
              searches: { value: 0, growth: 0 },
              ai_queries: { value: 0, growth: 0 },
              downloads: { value: 0, growth: 0 },
              storage_used: { value: 0, growth: 0 }
            },
            activity_over_time: [],
            content_by_type: [],
            search_analytics: {
              total_searches: { value: 0, growth: 0 },
              unique_searchers: { value: 0, growth: 0 },
              no_results: { value: 0, growth: 0 },
              success_rate: { value: 0, growth: 0 }
            },
            top_collections: [],
            user_engagement: [],
            ai_copilot_usage: {
              total_queries: { value: 0, growth: 0 },
              avg_response_time: { value: 0, growth: 0 },
              chart_data: []
            },
            data_sources_overview: []
          });
        }
      } catch (err) {
        console.error('Failed to fetch analytics', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const GrowthBadge = ({ growth }: { growth: number }) => {
    if (growth === 0) return null;
    const isPositive = growth > 0;
    return (
      <div className={`flex items-center gap-1 text-[10px] font-bold mt-2 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isPositive ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
        {Math.abs(growth)}% vs last month
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full bg-[#0A0C10]">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center h-full bg-[#0A0C10] text-slate-400">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-500">
            <FileText size={24} />
          </div>
          <p>No analytics data available. Please create or select an organization.</p>
        </div>
      </div>
    );
  }

  const { kpis, activity_over_time, content_by_type, search_analytics, top_collections, user_engagement, ai_copilot_usage, data_sources_overview } = data;

  return (
    <div className="flex flex-col h-full bg-[#0A0C10] overflow-y-auto scrollbar-thin text-slate-300">
      
      {/* Header */}
      <div className="border-b border-slate-800 bg-[#0A0C10]/90 backdrop-blur-md sticky top-0 z-20 px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
            <p className="text-slate-400 text-sm mt-1">Track platform usage, content insights, and operational metrics.</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 text-sm text-slate-300 bg-[#13161F] border border-slate-700 hover:border-slate-500 px-4 py-2 rounded-lg transition-colors">
              <CalendarIcon size={14} /> Jun 14 - Jul 12, 2026
            </button>
            <button className="flex items-center gap-2 text-sm text-slate-300 bg-[#13161F] border border-slate-700 hover:border-slate-500 px-4 py-2 rounded-lg transition-colors">
              <Filter size={14} /> Filters
            </button>
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              <Download size={14} /> Export
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <FileText size={18} />
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Documents</div>
            </div>
            <p className="text-2xl font-bold text-white">{kpis.total_documents.value.toLocaleString()}</p>
            <GrowthBadge growth={kpis.total_documents.growth} />
          </div>

          <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Search size={18} />
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Searches</div>
            </div>
            <p className="text-2xl font-bold text-white">{kpis.searches.value.toLocaleString()}</p>
            <GrowthBadge growth={kpis.searches.growth} />
          </div>

          <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                <MessageSquare size={18} />
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Queries</div>
            </div>
            <p className="text-2xl font-bold text-white">{kpis.ai_queries.value.toLocaleString()}</p>
            <GrowthBadge growth={kpis.ai_queries.growth} />
          </div>

          <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Download size={18} />
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Downloads</div>
            </div>
            <p className="text-2xl font-bold text-white">{kpis.downloads.value.toLocaleString()}</p>
            <GrowthBadge growth={kpis.downloads.growth} />
          </div>

          <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <HardDrive size={18} />
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Storage Used</div>
            </div>
            <p className="text-2xl font-bold text-white">{formatSize(kpis.storage_used.value)}</p>
            <GrowthBadge growth={kpis.storage_used.growth} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-slate-800">
          {['Overview', 'Content', 'Users', 'AI Copilot', 'Performance', 'Data Sources'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Overview' && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-6">
              
              {/* Activity Line Chart */}
              <div className="flex-[2] bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-semibold text-white">Activity Over Time</h3>
                  <select className="bg-[#0A0C10] border border-slate-800 text-xs text-slate-400 rounded px-2 py-1 focus:outline-none">
                    <option>Daily</option>
                    <option>Weekly</option>
                  </select>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activity_over_time}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Line type="monotone" dataKey="documents" name="Documents" stroke="#6366f1" strokeWidth={2} dot={{ r: 2, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="searches" name="Searches" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="ai_queries" name="AI Queries" stroke="#a855f7" strokeWidth={2} dot={{ r: 2, fill: '#a855f7', strokeWidth: 0 }} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="downloads" name="Downloads" stroke="#10b981" strokeWidth={2} dot={{ r: 2, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Content by Type Pie Chart */}
              <div className="flex-1 bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-white mb-2">Content by Type</h3>
                <div className="h-48 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={content_by_type}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {content_by_type.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold text-white">{kpis.total_documents.value}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Total</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-y-2 mt-4">
                  {content_by_type.map((entry: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                      <span className="text-slate-400 flex-1 truncate">{entry.name}</span>
                      <span className="text-slate-300 font-medium">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Search Analytics */}
              <div className="flex-1 space-y-6">
                <div className="bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm h-full flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold text-white">Search Analytics</h3>
                    <span className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer">View all</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Total Searches</span>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium">{search_analytics.total_searches.value.toLocaleString()}</span>
                        <span className="text-xs text-emerald-400 flex items-center"><ArrowUpRight size={12}/>{search_analytics.total_searches.growth}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Unique Searchers</span>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium">{search_analytics.unique_searchers.value.toLocaleString()}</span>
                        <span className="text-xs text-emerald-400 flex items-center"><ArrowUpRight size={12}/>{search_analytics.unique_searchers.growth}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">No Result Searches</span>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium">{search_analytics.no_results.value.toLocaleString()}</span>
                        <span className="text-xs text-emerald-400 flex items-center"><ArrowDownRight size={12}/>{Math.abs(search_analytics.no_results.growth)}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Top Search Success Rate</span>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium">{search_analytics.success_rate.value}%</span>
                        <span className="text-xs text-emerald-400 flex items-center"><ArrowUpRight size={12}/>{search_analytics.success_rate.growth}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Top Active Collections */}
              <div className="bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-semibold text-white">Top Active Collections</h3>
                  <span className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer">View all</span>
                </div>
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-12 text-slate-500 font-bold uppercase tracking-wider mb-2">
                    <div className="col-span-6">Collection</div>
                    <div className="col-span-2 text-right">Docs</div>
                    <div className="col-span-2 text-right">Views</div>
                    <div className="col-span-2 text-right">AI</div>
                  </div>
                  {top_collections.map((c: any, i: number) => (
                    <div key={i} className="grid grid-cols-12 items-center text-slate-300 border-t border-slate-800/50 pt-3">
                      <div className="col-span-6 truncate font-medium flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                          <HardDrive size={10}/>
                        </div>
                        <span className="truncate">{c.name}</span>
                      </div>
                      <div className="col-span-2 text-right">{c.documents}</div>
                      <div className="col-span-2 text-right">{c.views}</div>
                      <div className="col-span-2 text-right">{c.ai_queries}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Engagement */}
              <div className="bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold text-white">User Engagement</h3>
                  <span className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer">View all</span>
                </div>
                <div className="h-40 relative flex items-center justify-center mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={user_engagement}
                        cx="40%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {user_engagement.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute left-[40%] -translate-x-1/2 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-bold text-white">128</span>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider">Total</span>
                  </div>
                  
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 space-y-2">
                    {user_engagement.map((entry: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}></span>
                        <span className="text-slate-400">{entry.name}</span>
                        <span className="text-white font-medium ml-auto">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Copilot Usage Area Chart */}
              <div className="bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-white">AI Copilot Usage</h3>
                  <select className="bg-[#0A0C10] border border-slate-800 text-xs text-slate-400 rounded px-2 py-1 focus:outline-none">
                    <option>This Month</option>
                  </select>
                </div>
                <div className="flex gap-4 text-xs mb-4">
                  <div>
                    <div className="text-slate-500 mb-0.5">Total AI Queries</div>
                    <div className="text-white font-bold text-lg">{ai_copilot_usage.total_queries.value}</div>
                    <div className={`flex items-center gap-0.5 ${ai_copilot_usage.total_queries.growth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {ai_copilot_usage.total_queries.growth >= 0 ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>} {Math.abs(ai_copilot_usage.total_queries.growth)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-0.5">Avg. Response Time</div>
                    <div className="text-white font-bold text-lg">{ai_copilot_usage.avg_response_time.value} sec</div>
                    <div className={`flex items-center gap-0.5 ${ai_copilot_usage.avg_response_time.growth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {ai_copilot_usage.avg_response_time.growth >= 0 ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>} {Math.abs(ai_copilot_usage.avg_response_time.growth)}%
                    </div>
                  </div>
                </div>
                <div className="h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ai_copilot_usage.chart_data}>
                      <defs>
                        <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <RechartsTooltip content={() => null} />
                      <Area type="monotone" dataKey="ai_queries" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorAi)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Data Sources Overview */}
              <div className="bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold text-white">Data Sources Overview</h3>
                  <span className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer">View all</span>
                </div>
                <div className="h-40 relative flex items-center justify-center mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data_sources_overview}
                        cx="40%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {data_sources_overview.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute left-[40%] -translate-x-1/2 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-bold text-white">18</span>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider">Total</span>
                  </div>
                  
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 space-y-2">
                    {data_sources_overview.map((entry: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                        <span className="text-slate-400 truncate w-20">{entry.name}</span>
                        <span className="text-white font-medium ml-auto">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
