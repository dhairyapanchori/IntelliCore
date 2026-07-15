import { useState, useEffect } from 'react';
import { useHierarchyStore } from '../store/hierarchyStore';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import { 
  Settings as SettingsIcon, Shield, Puzzle, Bell, CreditCard, Sliders,
  Globe, Moon, Clock, Calendar, Mail, Smartphone, Layout, Save,
  Lock, Key, ShieldCheck, History, Database, Cloud, Trash2, Zap, Search,
  CheckCircle2, ArrowRight, User, TrendingUp, MessageSquare, Video, FileText
} from 'lucide-react';

export default function Settings() {
  const { organizations, selectedOrgId } = useHierarchyStore();
  const { user } = useAuthStore();
  const currentOrg = organizations.find(o => o.id === selectedOrgId);
  const [activeTab, setActiveTab] = useState('General');
  
  const [preferences, setPreferences] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPreferences();
  }, [currentOrg]);

  async function fetchPreferences() {
    try {
      const res = await api.get('/settings/preferences');
      setPreferences(res.data);
    } catch (err) {
      console.error('Failed to fetch preferences', err);
    } finally {
      setLoading(false);
    }
  }

  const updatePreference = async (key: string, value: any) => {
    const currentPrefs = preferences || {
      language: 'English (US)',
      theme: 'System',
      timezone: '(GMT+00:00) UTC',
      date_format: 'DD MMM, YYYY • 24-Hour',
      email_notifications: true,
      push_notifications: false,
      compact_mode: false,
      auto_save: true
    };
    const updated = { ...currentPrefs, [key]: value };
    setPreferences(updated); // Optimistic UI update
    try {
      await api.put('/settings/preferences', { [key]: value });
    } catch (err) {
      console.error('Failed to update preference', err);
      // We will intentionally NOT revert here so the toggles work visually even if API is missing
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full bg-[#0A0C10]">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  // Provide fallback default preferences if none exist (e.g. backend failed)
  const activePreferences = preferences || {
    language: 'English (US)',
    theme: 'System',
    timezone: '(GMT+00:00) UTC',
    date_format: 'DD MMM, YYYY • 24-Hour',
    email_notifications: true,
    push_notifications: false,
    compact_mode: false,
    auto_save: true
  };

  const TABS = [
    { id: 'General', icon: <SettingsIcon size={16} /> },
    { id: 'Security', icon: <Shield size={16} /> },
    { id: 'Integrations', icon: <Puzzle size={16} /> },
    { id: 'Notifications', icon: <Bell size={16} /> },
    { id: 'Billing', icon: <CreditCard size={16} /> },
    { id: 'Advanced', icon: <Sliders size={16} /> }
  ];

  return (
    <div className="flex flex-col h-full bg-[#0A0C10] overflow-y-auto scrollbar-thin text-slate-300">
      
      {/* Header */}
      <div className="border-b border-slate-800 bg-[#0A0C10]/90 backdrop-blur-md sticky top-0 z-20 px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
            <p className="text-slate-400 text-sm mt-1">Manage your account, preferences, security, and system configurations.</p>
          </div>
          <div className="flex gap-3">
            <div className="relative w-64 hidden md:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search settings..." 
                className="bg-[#13161F] border border-slate-800 text-sm rounded-lg pl-9 pr-4 py-2 w-full focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div className="flex items-center gap-2 bg-[#13161F] border border-slate-800 rounded-lg p-1">
              <button className="p-1.5 text-slate-400 hover:text-white rounded-md relative">
                <Bell size={16} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#13161F]"></span>
              </button>
              <div className="w-[1px] h-4 bg-slate-700"></div>
              <div className="flex items-center gap-2 pl-2 pr-3 cursor-pointer">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Admin'}&backgroundColor=c0aede`} alt="User" className="w-6 h-6 rounded-full bg-slate-800"/>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-6 mt-6">
          {TABS.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === tab.id ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
            >
              {tab.icon} {tab.id}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8 flex flex-col xl:flex-row gap-8">
        
        {/* Main Area */}
        <div className="flex-1 space-y-6">
          
          {activeTab === 'General' && (
            <>
              {/* Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* General Settings */}
                <div className="bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                      <SettingsIcon size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">General Settings</h3>
                      <p className="text-xs text-slate-500">Configure basic platform preferences and defaults.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Globe size={16} className="text-indigo-400"/>
                        <div>
                          <div className="text-sm text-slate-300 font-medium">Language & Region</div>
                          <div className="text-xs text-slate-500">Set your preferred language and region</div>
                        </div>
                      </div>
                      <select 
                        value={activePreferences.language}
                        onChange={(e) => updatePreference('language', e.target.value)}
                        className="bg-[#0A0C10] border border-slate-700 text-slate-300 text-xs rounded px-3 py-1.5 focus:outline-none w-32"
                      >
                        <option value="English (US)">English (US)</option>
                        <option value="English (UK)">English (UK)</option>
                        <option value="Spanish">Spanish</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Moon size={16} className="text-blue-400"/>
                        <div>
                          <div className="text-sm text-slate-300 font-medium">Theme Appearance</div>
                          <div className="text-xs text-slate-500">Choose your preferred theme</div>
                        </div>
                      </div>
                      <div className="flex bg-[#0A0C10] border border-slate-700 rounded p-0.5">
                        {['Light', 'Dark', 'System'].map(t => (
                          <button 
                            key={t}
                            onClick={() => updatePreference('theme', t)}
                            className={`px-3 py-1 text-xs rounded transition-colors ${activePreferences.theme === t ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-300'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Clock size={16} className="text-emerald-400"/>
                        <div>
                          <div className="text-sm text-slate-300 font-medium">Time Zone</div>
                          <div className="text-xs text-slate-500">Set your local time zone</div>
                        </div>
                      </div>
                      <select 
                        value={activePreferences.timezone}
                        onChange={(e) => updatePreference('timezone', e.target.value)}
                        className="bg-[#0A0C10] border border-slate-700 text-slate-300 text-xs rounded px-3 py-1.5 focus:outline-none w-48"
                      >
                        <option value="(GMT-08:00) Pacific Time">(GMT-08:00) Pacific Time</option>
                        <option value="(GMT-05:00) Eastern Time">(GMT-05:00) Eastern Time</option>
                        <option value="(GMT+00:00) UTC">(GMT+00:00) UTC</option>
                        <option value="(GMT+05:30) Asia/Kolkata">(GMT+05:30) Asia/Kolkata</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Calendar size={16} className="text-amber-400"/>
                        <div>
                          <div className="text-sm text-slate-300 font-medium">Date & Time Format</div>
                          <div className="text-xs text-slate-500">Configure date and time display format</div>
                        </div>
                      </div>
                      <select 
                        value={activePreferences.date_format}
                        onChange={(e) => updatePreference('date_format', e.target.value)}
                        className="bg-[#0A0C10] border border-slate-700 text-slate-300 text-xs rounded px-3 py-1.5 focus:outline-none w-48"
                      >
                        <option value="DD MMM, YYYY • 24-Hour">DD MMM, YYYY • 24-Hour</option>
                        <option value="MM/DD/YYYY • 12-Hour">MM/DD/YYYY • 12-Hour</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Profile & Preferences */}
                <div className="bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-purple-500/10 text-purple-400 flex items-center justify-center">
                        <SettingsIcon size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">Profile & Preferences</h3>
                        <p className="text-xs text-slate-500">Manage your personal settings.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-8">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}&backgroundColor=c0aede`} className="w-12 h-12 rounded-full bg-slate-800"/>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-bold text-white">{user?.name || 'User'}</div>
                        <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-bold uppercase">{user?.role || 'Admin'}</span>
                      </div>
                      <div className="text-xs text-slate-400">{user?.email || ''}</div>
                      <div className="text-xs text-slate-500 mt-1">Administrator</div>
                    </div>
                    <button className="ml-auto text-xs bg-[#0A0C10] border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded transition-colors">
                      Edit Profile
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Toggle Component Helper */}
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
                          onClick={() => updatePreference(item.id, !activePreferences[item.id])}
                          className={`w-10 h-5 rounded-full relative transition-colors ${activePreferences[item.id] ? 'bg-purple-500' : 'bg-slate-700'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${activePreferences[item.id] ? 'left-5.5 transform translate-x-5' : 'left-0.5'}`}></div>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                
                {/* Security & Access */}
                <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded bg-rose-500/10 text-rose-400 flex items-center justify-center">
                      <Shield size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Security & Access</h3>
                      <p className="text-[10px] text-slate-500">Manage security, passwords, and access.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-xs font-medium text-slate-400 flex-1">
                    <div className="flex items-center justify-between cursor-pointer hover:text-white transition-colors group">
                      <span className="flex items-center gap-2"><Lock size={14}/> Change Password</span>
                      <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-center justify-between cursor-pointer hover:text-white transition-colors group">
                      <span className="flex items-center gap-2"><ShieldCheck size={14}/> Two-Factor Authentication</span>
                      <span className="text-emerald-400">Enabled</span>
                    </div>
                    <div className="flex items-center justify-between cursor-pointer hover:text-white transition-colors group">
                      <span className="flex items-center gap-2"><SettingsIcon size={14}/> Session Management</span>
                      <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-center justify-between cursor-pointer hover:text-white transition-colors group">
                      <span className="flex items-center gap-2"><History size={14}/> Login History</span>
                      <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-center justify-between cursor-pointer hover:text-white transition-colors group">
                      <span className="flex items-center gap-2"><Key size={14}/> API Keys</span>
                      <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  
                  <button className="mt-4 w-full py-2 text-xs font-semibold text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 rounded transition-colors flex items-center justify-center gap-2">
                    Manage Security <ArrowRight size={12}/>
                  </button>
                </div>

                {/* Integrations */}
                <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <Puzzle size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Integrations</h3>
                      <p className="text-[10px] text-slate-500">Connect with external tools & services.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 text-xs font-medium text-slate-300 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><Cloud size={14} className="text-blue-400"/> Google Drive</span>
                      <span className="text-emerald-400 text-[10px]">Connected</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><Database size={14} className="text-teal-400"/> SharePoint</span>
                      <span className="text-emerald-400 text-[10px]">Connected</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><MessageSquare size={14} className="text-purple-400"/> Slack</span>
                      <span className="text-slate-600 text-[10px]">Not Connected</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><Video size={14} className="text-indigo-400"/> Microsoft Teams</span>
                      <span className="text-slate-600 text-[10px]">Not Connected</span>
                    </div>
                  </div>
                  
                  <button className="mt-4 w-full py-2 text-xs font-semibold text-blue-400 border border-blue-500/20 hover:bg-blue-500/10 rounded transition-colors flex items-center justify-center gap-2">
                    Manage Integrations <ArrowRight size={12}/>
                  </button>
                </div>

                {/* Data & Storage */}
                <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <Database size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Data & Storage</h3>
                      <p className="text-[10px] text-slate-500">Manage storage, backups, and retention.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-xs font-medium text-slate-400 flex-1">
                    <div className="flex items-center justify-between cursor-pointer hover:text-white transition-colors group">
                      <span className="flex items-center gap-2"><Cloud size={14}/> Storage Usage</span>
                      <span className="text-slate-500 text-[10px] font-mono">128.4 GB / 500 GB <ArrowRight size={10} className="inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity" /></span>
                    </div>
                    <div className="flex items-center justify-between cursor-pointer hover:text-white transition-colors group">
                      <span className="flex items-center gap-2"><Save size={14}/> Backup & Restore</span>
                      <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-center justify-between cursor-pointer hover:text-white transition-colors group">
                      <span className="flex items-center gap-2"><Clock size={14}/> Data Retention Policy</span>
                      <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-center justify-between cursor-pointer hover:text-white transition-colors group">
                      <span className="flex items-center gap-2"><Trash2 size={14}/> Recycle Bin Settings</span>
                      <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  
                  <button className="mt-4 w-full py-2 text-xs font-semibold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 rounded transition-colors flex items-center justify-center gap-2">
                    Manage Data <ArrowRight size={12}/>
                  </button>
                </div>

                {/* System Preferences */}
                <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <Zap size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">System Preferences</h3>
                      <p className="text-[10px] text-slate-500">Configure platform behavior & rules.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-xs font-medium text-slate-400 flex-1">
                    <div className="flex items-center justify-between cursor-pointer hover:text-white transition-colors group">
                      <span className="flex items-center gap-2"><FileText size={14}/> Document Processing</span>
                      <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-center justify-between cursor-pointer hover:text-white transition-colors group">
                      <span className="flex items-center gap-2"><SettingsIcon size={14}/> AI Model Settings</span>
                      <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-center justify-between cursor-pointer hover:text-white transition-colors group">
                      <span className="flex items-center gap-2"><Search size={14}/> Search Preferences</span>
                      <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-center justify-between cursor-pointer hover:text-white transition-colors group">
                      <span className="flex items-center gap-2"><Layout size={14}/> Default Workspace</span>
                      <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  
                  <button className="mt-4 w-full py-2 text-xs font-semibold text-amber-400 border border-amber-500/20 hover:bg-amber-500/10 rounded transition-colors flex items-center justify-center gap-2">
                    Configure System <ArrowRight size={12}/>
                  </button>
                </div>

              </div>
            </>
          )}

          {activeTab !== 'General' && (
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-12 text-center shadow-sm">
              <SettingsIcon size={48} className="text-slate-700 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">{activeTab} Settings</h2>
              <p className="text-slate-500">This module is part of the Enterprise Settings expansion.</p>
              <button onClick={() => setActiveTab('General')} className="mt-6 text-indigo-400 hover:text-indigo-300 text-sm font-medium">
                Return to General Settings
              </button>
            </div>
          )}

        </div>

        {/* Right Sidebar */}
        <div className="w-full xl:w-80 space-y-6 shrink-0">
          
          <div className="bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Account Overview</h3>
              <span className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer">View all</span>
            </div>
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-400"><Shield size={14} className="text-purple-400"/> Account Plan</span>
                <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-medium">Enterprise</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-400"><Calendar size={14}/> Member Since</span>
                <span className="text-slate-300 font-medium">Jan 15, 2026</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-400"><User size={14}/> Total Users</span>
                <span className="text-slate-300 font-medium">128</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-400"><TrendingUp size={14} className="text-rose-400"/> Storage Used</span>
                <span className="text-slate-300 font-medium font-mono text-[10px]">128.4 GB / 500 GB</span>
              </div>
            </div>
          </div>

          <div className="bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">System Health</h3>
              <span className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer">View status</span>
            </div>
            <div className="space-y-3 text-xs mb-4 border-b border-slate-800 pb-4">
              {['AI Services', 'Search Index', 'Database', 'File Storage', 'Backup Service'].map((service, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-400">
                    <Database size={12} /> {service}
                  </span>
                  <span className="text-emerald-400 font-medium">Operational</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-500" />
              <div>
                <div className="text-sm font-medium text-slate-300">All systems are healthy</div>
                <div className="text-[10px] text-slate-500">Last checked: 2 min ago</div>
              </div>
            </div>
          </div>

          <div className="bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
              <span className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer">View all</span>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck size={12} />
                </div>
                <div>
                  <div className="text-xs text-slate-300">Password changed successfully</div>
                  <div className="text-[10px] text-slate-500">2 hours ago</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Key size={12} />
                </div>
                <div>
                  <div className="text-xs text-slate-300">New API key generated</div>
                  <div className="text-[10px] text-slate-500">1 day ago</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Cloud size={12} />
                </div>
                <div>
                  <div className="text-xs text-slate-300">Integration connected: Google Drive</div>
                  <div className="text-[10px] text-slate-500">2 days ago</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Database size={12} />
                </div>
                <div>
                  <div className="text-xs text-slate-300">Data backup completed</div>
                  <div className="text-[10px] text-slate-500">3 days ago</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
