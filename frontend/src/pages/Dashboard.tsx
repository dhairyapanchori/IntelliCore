import { useState, useEffect } from 'react';
import { analyticsApi } from '../lib/analytics';
import { FileText, Folder, MessageSquare, HardDrive, Network, Upload, CheckCircle, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [graphData, setGraphData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [dashData, activityData, graphResponse] = await Promise.all([
          analyticsApi.getDashboardMetrics(),
          analyticsApi.getRecentActivity(5),
          analyticsApi.getKnowledgeGraph()
        ]);
        setMetrics(dashData);
        setActivities(activityData);
        setGraphData(graphResponse);
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
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading enterprise metrics...</p>
        </div>
      </div>
    );
  }

  const { metrics: topMetrics, processing_status, usage_chart } = metrics || {};
  const { total_documents, total_collections, storage_bytes, ai_queries } = topMetrics || {};

  // Formatter for storage bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const pieData = [
    { name: 'Processed', value: processing_status?.processed || 0, color: '#10B981' },
    { name: 'Processing', value: processing_status?.processing || 0, color: '#8B5CF6' },
    { name: 'Queued', value: processing_status?.queued || 0, color: '#F59E0B' },
    { name: 'Failed', value: processing_status?.failed || 0, color: '#EF4444' },
  ].filter(d => d.value > 0);

  const ActivityIcon = ({ action }: { action: string }) => {
    switch (action) {
      case 'document_uploaded': return <Upload size={16} className="text-blue-400" />;
      case 'document_processed': return <CheckCircle size={16} className="text-emerald-400" />;
      case 'chat_started': return <MessageSquare size={16} className="text-purple-400" />;
      default: return <Clock size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Here's what's happening in your enterprise knowledge base today.</p>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Documents', value: total_documents || 0, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Collections', value: total_collections || 0, icon: Folder, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
          { label: 'AI Queries', value: ai_queries || 0, icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Storage Used', value: formatBytes(storage_bytes || 0), icon: HardDrive, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
            <div className={`w-14 h-14 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
              <stat.icon size={26} strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Processing Donut */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-6">Document Processing</h3>
          {pieData.length > 0 ? (
            <div className="flex-1 flex flex-col justify-center">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                {pieData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm text-slate-600 dark:text-slate-400">{entry.name}</span>
                    <span className="text-sm font-bold ml-auto dark:text-white">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 italic">No data available</div>
          )}
        </div>

        {/* AI Copilot Usage Chart */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm col-span-1 lg:col-span-2 flex flex-col">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-6">AI Copilot Usage (14 Days)</h3>
          <div className="flex-1 min-h-[250px]">
            {usage_chart && usage_chart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usage_chart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#1E293B', color: '#fff' }}
                    itemStyle={{ color: '#8B5CF6' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="queries" 
                    stroke="#8B5CF6" 
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: '#1E293B' }}
                    activeDot={{ r: 6, fill: '#8B5CF6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-500 italic">No data available</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Timeline */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-6">Recent Activity</h3>
          <div className="space-y-6">
            {activities && activities.length > 0 ? activities.map((activity, i) => (
              <div key={i} className="flex gap-4 relative">
                {i !== activities.length - 1 && (
                  <div className="absolute left-[15px] top-8 bottom-[-24px] w-[2px] bg-slate-100 dark:bg-slate-800" />
                )}
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center z-10 shrink-0">
                  <ActivityIcon action={activity.action} />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">{activity.details}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {new Date(activity.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-slate-500 italic text-center py-4">No data available</div>
            )}
          </div>
        </div>

        {/* Knowledge Graph Preview */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-slate-800 dark:text-white">Knowledge Graph Overview</h3>
          </div>
          <div className="flex-1 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center min-h-[300px] overflow-hidden relative group">
            {graphData?.nodes?.length > 1 ? (
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <Network size={48} className="text-indigo-400 opacity-50 mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                  {graphData.nodes.length} Nodes & {graphData.links.length} Connections
                </p>
                <div className="mt-4 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  Interactive graph disabled in preview
                </div>
              </div>
            ) : (
              <div className="text-slate-500 italic">No data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
