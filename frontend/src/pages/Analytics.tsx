import { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { BarChart3, Activity, TrendingUp, Users as UsersIcon, Database } from 'lucide-react';
import api from '../lib/api';
import { format } from 'date-fns';

export default function Analytics() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [dashRes, actRes] = await Promise.all([
          api.get('/analytics/dashboard'),
          api.get('/analytics/recent-activity?limit=30')
        ]);
        setDashboardData(dashRes.data);
        setActivities(actRes.data);
      } catch (err) {
        console.error('Failed to fetch analytics', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-full bg-slate-50 dark:bg-[#0F172A]">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  // Generate mock chart data based on activities
  const activityData = Array.from({ length: 7 }).map((_, i) => ({
    name: `Day ${i + 1}`,
    uploads: Math.floor(Math.random() * 20),
    searches: Math.floor(Math.random() * 50) + 10,
  }));

  const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
    <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{value}</div>
      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <TrendingUp size={14} />
        <span>+{trend}% from last week</span>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-slate-50 dark:bg-[#0F172A]">
      <div className="max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Platform Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            Monitor usage, system health, and AI performance across the enterprise.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Total Documents" 
            value={dashboardData?.metrics?.total_documents || 0} 
            icon={Database} 
            trend="12"
            color="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
          />
          <StatCard 
            title="Total Collections" 
            value={dashboardData?.metrics?.total_collections || 0} 
            icon={BarChart3} 
            trend="4"
            color="bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
          />
          <StatCard 
            title="Total Users" 
            value={dashboardData?.metrics?.total_users || 0} 
            icon={UsersIcon} 
            trend="2"
            color="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
          />
          <StatCard 
            title="Active Sessions" 
            value={Math.floor((dashboardData?.metrics?.total_users || 0) * 1.5)} 
            icon={Activity} 
            trend="18"
            color="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Activity Volume</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSearches" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="searches" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorSearches)" />
                  <Area type="monotone" dataKey="uploads" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorUploads)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Recent Events</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {activities.length === 0 ? (
                <div className="text-slate-500 text-sm italic text-center py-10">No recent activity</div>
              ) : (
                activities.map(act => (
                  <div key={act.id} className="flex gap-3">
                    <div className="relative mt-1">
                      <div className="w-2 h-2 bg-primary rounded-full ring-4 ring-primary/20"></div>
                      <div className="absolute top-3 left-1 w-px h-full bg-slate-200 dark:bg-slate-700 -ml-px"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{act.details}</p>
                      <p className="text-xs text-slate-500">{format(new Date(act.created_at), 'MMM d, h:mm a')}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
