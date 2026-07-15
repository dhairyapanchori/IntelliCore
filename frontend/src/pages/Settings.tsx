import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { 
  Settings as SettingsIcon, Globe, Moon, Clock, Calendar, Mail, Smartphone, Layout, Save
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user } = useAuthStore();
  
  const [preferences, setPreferences] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from local storage
    const saved = localStorage.getItem('intellicore_preferences');
    if (saved) {
      setPreferences(JSON.parse(saved));
    } else {
      setPreferences({
        language: 'English (US)',
        theme: 'System',
        timezone: '(GMT+00:00) UTC',
        date_format: 'DD MMM, YYYY • 24-Hour',
        email_notifications: true,
        push_notifications: false,
        compact_mode: false,
        auto_save: true
      });
    }
    setLoading(false);
  }, []);

  const updatePreference = (key: string, value: any) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    localStorage.setItem('intellicore_preferences', JSON.stringify(updated));
    toast.success('Settings saved', { id: 'settings-saved' }); // Use ID to prevent toast spam
  };

  if (loading || !preferences) {
    return (
      <div className="flex justify-center items-center h-full bg-[#0A0C10]">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0A0C10] overflow-y-auto scrollbar-thin text-slate-300">
      
      {/* Header */}
      <div className="border-b border-slate-800 bg-[#0A0C10]/90 backdrop-blur-md sticky top-0 z-20 px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
            <p className="text-slate-400 text-sm mt-1">Manage your platform preferences and defaults.</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 pl-2 pr-3">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.full_name || 'Admin'}&backgroundColor=c0aede`} alt="User" className="w-8 h-8 rounded-full bg-slate-800"/>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* General Settings */}
          <div className="bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <SettingsIcon size={16} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">General Settings</h3>
                <p className="text-xs text-slate-500">Configure basic platform preferences.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
                  <Globe size={14} className="text-indigo-400"/> Language & Region
                </div>
                <select 
                  value={preferences.language}
                  onChange={(e) => updatePreference('language', e.target.value)}
                  className="bg-[#0A0C10] border border-slate-700 text-slate-300 text-xs rounded px-3 py-2 focus:outline-none w-full"
                >
                  <option value="English (US)">English (US)</option>
                  <option value="English (UK)">English (UK)</option>
                  <option value="Spanish">Spanish</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
                  <Moon size={14} className="text-blue-400"/> Theme Appearance
                </div>
                <div className="flex bg-[#0A0C10] border border-slate-700 rounded p-1">
                  {['Light', 'Dark', 'System'].map(t => (
                    <button 
                      key={t}
                      onClick={() => updatePreference('theme', t)}
                      className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${preferences.theme === t ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-300'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
                  <Clock size={14} className="text-emerald-400"/> Time Zone
                </div>
                <select 
                  value={preferences.timezone}
                  onChange={(e) => updatePreference('timezone', e.target.value)}
                  className="bg-[#0A0C10] border border-slate-700 text-slate-300 text-xs rounded px-3 py-2 focus:outline-none w-full"
                >
                  <option value="(GMT-08:00) Pacific Time">(GMT-08:00) Pacific Time</option>
                  <option value="(GMT-05:00) Eastern Time">(GMT-05:00) Eastern Time</option>
                  <option value="(GMT+00:00) UTC">(GMT+00:00) UTC</option>
                  <option value="(GMT+05:30) Asia/Kolkata">(GMT+05:30) Asia/Kolkata</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
                  <Calendar size={14} className="text-amber-400"/> Date & Time Format
                </div>
                <select 
                  value={preferences.date_format}
                  onChange={(e) => updatePreference('date_format', e.target.value)}
                  className="bg-[#0A0C10] border border-slate-700 text-slate-300 text-xs rounded px-3 py-2 focus:outline-none w-full"
                >
                  <option value="DD MMM, YYYY • 24-Hour">DD MMM, YYYY • 24-Hour</option>
                  <option value="MM/DD/YYYY • 12-Hour">MM/DD/YYYY • 12-Hour</option>
                </select>
              </div>
            </div>
          </div>

          {/* Profile & Application Settings */}
          <div className="bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <SettingsIcon size={16} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Profile & App Settings</h3>
                <p className="text-xs text-slate-500">Manage your profile and UI experience.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-8">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.full_name || 'User'}&backgroundColor=c0aede`} className="w-12 h-12 rounded-full bg-slate-800"/>
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold text-white">{user?.full_name || 'User'}</div>
                </div>
                <div className="text-xs text-slate-400">{user?.email || ''}</div>
              </div>
            </div>

            <div className="space-y-6">
              {[
                { id: 'email_notifications', icon: <Mail size={16} className="text-slate-400"/>, title: 'Email Notifications', desc: 'Receive email for important updates' },
                { id: 'push_notifications', icon: <Smartphone size={16} className="text-slate-400"/>, title: 'Push Notifications', desc: 'Get real-time browser notifications' },
                { id: 'compact_mode', icon: <Layout size={16} className="text-slate-400"/>, title: 'Compact Mode', desc: 'Reduce spacing for more content' },
                { id: 'auto_save', icon: <Save size={16} className="text-slate-400"/>, title: 'Auto Save', desc: 'Automatically save your changes' }
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <div>
                      <div className="text-sm text-slate-300 font-medium">{item.title}</div>
                      <div className="text-xs text-slate-500">{item.desc}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => updatePreference(item.id, !preferences[item.id])}
                    className={`w-10 h-5 rounded-full relative transition-colors ${preferences[item.id] ? 'bg-purple-500' : 'bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${preferences[item.id] ? 'left-5.5 transform translate-x-5' : 'left-0.5'}`}></div>
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
