import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import { 
  User, Moon, Bot, Search as SearchIcon, Bell, FileText, Shield, 
  Save, AlertCircle, Key
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user, setUser } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [preferences, setPreferences] = useState<any>(null);
  const [profile, setProfile] = useState({ full_name: '' });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.get('/settings');
        setPreferences(res.data.preferences);
        setProfile({ full_name: res.data.user.full_name || '' });
      } catch {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const updatePreference = async (key: string, value: any) => {
    // Optimistic update
    const previous = { ...preferences };
    setPreferences({ ...preferences, [key]: value });
    
    try {
      await api.put('/settings', { [key]: value });
      toast.success('Setting saved', { id: 'settings-saved' });
    } catch {
      setPreferences(previous);
      toast.error('Failed to save setting');
    }
  };

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/settings/profile', { full_name: profile.full_name });
      setUser({ ...user, full_name: res.data.full_name });
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    if (passwords.new !== passwords.confirm) {
      return toast.error("Passwords do not match");
    }
    if (!passwords.current || !passwords.new) {
      return toast.error("Please fill all password fields");
    }

    setSaving(true);
    try {
      await api.post('/settings/password', { 
        current_password: passwords.current, 
        new_password: passwords.new 
      });
      toast.success("Password updated successfully");
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !preferences) {
    return (
      <div className="flex justify-center items-center h-full bg-[#0A0C10]">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', icon: <User size={16}/>, label: 'Profile' },
    { id: 'appearance', icon: <Moon size={16}/>, label: 'Appearance' },
    { id: 'ai', icon: <Bot size={16}/>, label: 'AI Copilot' },
    { id: 'search', icon: <SearchIcon size={16}/>, label: 'Search' },
    { id: 'notifications', icon: <Bell size={16}/>, label: 'Notifications' },
    { id: 'documents', icon: <FileText size={16}/>, label: 'Documents' },
    { id: 'security', icon: <Shield size={16}/>, label: 'Security' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0A0C10] overflow-y-auto scrollbar-thin text-slate-300">
      <div className="border-b border-slate-800 bg-[#0A0C10]/90 backdrop-blur-md sticky top-0 z-20 px-8 py-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Enterprise Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your platform preferences and defaults.</p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full p-8 gap-8">
        
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 shrink-0 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-indigo-600/10 text-indigo-400' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-[#13161F] border border-slate-800 rounded-xl shadow-sm min-h-[500px]">
          
          {/* PROFILE */}
          {activeTab === 'profile' && (
            <div className="p-8">
              <h2 className="text-lg font-semibold text-white mb-6">Profile Settings</h2>
              
              <div className="flex items-center gap-6 mb-8">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'admin'}&backgroundColor=c0aede`} className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700"/>
                <div>
                  <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors mb-2">Change Avatar</button>
                  <p className="text-xs text-slate-500">Square image, up to 2MB.</p>
                </div>
              </div>

              <div className="space-y-5 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Full Name</label>
                  <input 
                    type="text" 
                    value={profile.full_name}
                    onChange={e => setProfile({...profile, full_name: e.target.value})}
                    className="w-full bg-[#0A0C10] border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Email Address</label>
                  <input 
                    type="email" 
                    value={user?.email || ''}
                    disabled
                    className="w-full bg-[#0A0C10] border border-slate-800 rounded-lg px-4 py-2 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500 mt-1">Contact your administrator to change your email.</p>
                </div>
                <button 
                  onClick={handleProfileSave}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mt-4"
                >
                  <Save size={16}/> Save Profile
                </button>
              </div>
            </div>
          )}

          {/* APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="p-8 space-y-8">
              <h2 className="text-lg font-semibold text-white">Appearance & Region</h2>
              
              <div className="space-y-6 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Theme</label>
                  <div className="flex bg-[#0A0C10] border border-slate-700 rounded-lg p-1">
                    {['Light', 'Dark', 'System'].map(t => (
                      <button 
                        key={t}
                        onClick={() => updatePreference('theme', t)}
                        className={`flex-1 px-4 py-2 text-sm rounded-md transition-colors ${preferences.theme === t ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-800">
                  <div>
                    <div className="text-sm font-medium text-slate-300">Compact Mode</div>
                    <div className="text-xs text-slate-500">Reduce padding and condense data tables</div>
                  </div>
                  <button 
                    onClick={() => updatePreference('compact_mode', !preferences.compact_mode)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${preferences.compact_mode ? 'bg-indigo-500' : 'bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${preferences.compact_mode ? 'left-5.5 transform translate-x-5' : 'left-0.5'}`}></div>
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Language</label>
                  <select 
                    value={preferences.language || 'English (US)'}
                    onChange={(e) => updatePreference('language', e.target.value)}
                    className="w-full bg-[#0A0C10] border border-slate-700 text-slate-300 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="English (US)">English (US)</option>
                    <option value="English (UK)">English (UK)</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Time Zone</label>
                  <select 
                    value={preferences.timezone || '(GMT+00:00) UTC'}
                    onChange={(e) => updatePreference('timezone', e.target.value)}
                    className="w-full bg-[#0A0C10] border border-slate-700 text-slate-300 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="(GMT-08:00) Pacific Time">(GMT-08:00) Pacific Time</option>
                    <option value="(GMT-05:00) Eastern Time">(GMT-05:00) Eastern Time</option>
                    <option value="(GMT+00:00) UTC">(GMT+00:00) UTC</option>
                    <option value="(GMT+05:30) Asia/Kolkata">(GMT+05:30) Asia/Kolkata</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* AI COPILOT */}
          {activeTab === 'ai' && (
            <div className="p-8 space-y-8">
              <h2 className="text-lg font-semibold text-white">AI Copilot Settings</h2>
              
              <div className="space-y-6 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Default AI Model</label>
                  <select 
                    value={preferences.default_ai_model || 'gpt-4o'}
                    onChange={(e) => updatePreference('default_ai_model', e.target.value)}
                    className="w-full bg-[#0A0C10] border border-slate-700 text-slate-300 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="gpt-4o">GPT-4o (Default, High Performance)</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo (Advanced Reasoning)</option>
                    <option value="claude-3.5-sonnet">Claude 3.5 Sonnet (Balanced)</option>
                    <option value="claude-3-opus">Claude 3 Opus (Complex Analysis)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Response Length</label>
                  <select 
                    value={preferences.response_length || 'balanced'}
                    onChange={(e) => updatePreference('response_length', e.target.value)}
                    className="w-full bg-[#0A0C10] border border-slate-700 text-slate-300 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="concise">Concise (Direct answers)</option>
                    <option value="balanced">Balanced (Standard detail)</option>
                    <option value="comprehensive">Comprehensive (Extensive detail)</option>
                  </select>
                </div>

                <div className="pt-4 space-y-4">
                  {[
                    { id: 'citation_toggle', title: 'Include Inline Citations', desc: 'Show source documents used for answers' },
                    { id: 'show_confidence_score', title: 'Show Confidence Score', desc: 'Display AI confidence level for factual answers' },
                    { id: 'enable_follow_up', title: 'Enable Follow-up Suggestions', desc: 'Suggest related questions after answering' },
                  ].map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-300">{item.title}</div>
                        <div className="text-xs text-slate-500">{item.desc}</div>
                      </div>
                      <button 
                        onClick={() => updatePreference(item.id, !preferences[item.id])}
                        className={`w-10 h-5 rounded-full relative transition-colors ${preferences[item.id] ? 'bg-indigo-500' : 'bg-slate-700'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${preferences[item.id] ? 'left-5.5 transform translate-x-5' : 'left-0.5'}`}></div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SEARCH */}
          {activeTab === 'search' && (
            <div className="p-8 space-y-8">
              <h2 className="text-lg font-semibold text-white">Search Preferences</h2>
              
              <div className="space-y-6 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Default Search Scope</label>
                  <select 
                    value={preferences.default_search_scope || 'all'}
                    onChange={(e) => updatePreference('default_search_scope', e.target.value)}
                    className="w-full bg-[#0A0C10] border border-slate-700 text-slate-300 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">Entire Organization</option>
                    <option value="my_workspaces">My Workspaces Only</option>
                    <option value="documents_only">Documents Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Results per page</label>
                  <select 
                    value={preferences.search_results_count || 10}
                    onChange={(e) => updatePreference('search_results_count', parseInt(e.target.value))}
                    className="w-full bg-[#0A0C10] border border-slate-700 text-slate-300 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={10}>10 Results</option>
                    <option value={20}>20 Results</option>
                    <option value={50}>50 Results</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <div>
                    <div className="text-sm font-medium text-slate-300">Semantic Search</div>
                    <div className="text-xs text-slate-500">Understand intent instead of just keywords</div>
                  </div>
                  <button 
                    onClick={() => updatePreference('semantic_search', !preferences.semantic_search)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${preferences.semantic_search ? 'bg-indigo-500' : 'bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${preferences.semantic_search ? 'left-5.5 transform translate-x-5' : 'left-0.5'}`}></div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="p-8 space-y-8">
              <h2 className="text-lg font-semibold text-white">Notifications</h2>
              
              <div className="space-y-4 max-w-md">
                {[
                  { id: 'email_notifications', title: 'Email Notifications', desc: 'Receive daily digests and critical alerts' },
                  { id: 'push_notifications', title: 'Browser Push Notifications', desc: 'Get real-time alerts in your browser' },
                  { id: 'ai_processing_notifications', title: 'AI Processing Alerts', desc: 'Notify when large documents finish processing' },
                ].map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-[#0A0C10] border border-slate-800 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-slate-300">{item.title}</div>
                      <div className="text-xs text-slate-500">{item.desc}</div>
                    </div>
                    <button 
                      onClick={() => updatePreference(item.id, !preferences[item.id])}
                      className={`w-10 h-5 rounded-full relative transition-colors ${preferences[item.id] ? 'bg-indigo-500' : 'bg-slate-700'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${preferences[item.id] ? 'left-5.5 transform translate-x-5' : 'left-0.5'}`}></div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="p-8 space-y-8">
              <h2 className="text-lg font-semibold text-white">Document Processing</h2>
              
              <div className="space-y-6 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Default Upload Collection</label>
                  <div className="text-xs text-slate-500 mb-2">If unspecified, documents will be placed here.</div>
                  <select 
                    value={preferences.default_collection_id || ''}
                    onChange={(e) => updatePreference('default_collection_id', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full bg-[#0A0C10] border border-slate-700 text-slate-300 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">No Default Collection</option>
                    <option value="1">General Knowledge Base</option>
                    {/* Ideally populate this dynamically from user's collections */}
                  </select>
                </div>

                <div className="pt-4 space-y-4 border-t border-slate-800">
                  <h3 className="text-sm font-semibold text-white">Automatic Processing</h3>
                  {[
                    { id: 'auto_ocr', title: 'Auto OCR', desc: 'Automatically extract text from images and scanned PDFs' },
                    { id: 'auto_entity_extraction', title: 'Entity Extraction', desc: 'Identify people, dates, and organizations automatically' },
                    { id: 'auto_summarize', title: 'Auto Summarization', desc: 'Generate a short summary for new documents upon upload' },
                  ].map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-300">{item.title}</div>
                        <div className="text-xs text-slate-500">{item.desc}</div>
                      </div>
                      <button 
                        onClick={() => updatePreference(item.id, !preferences[item.id])}
                        className={`w-10 h-5 rounded-full relative transition-colors ${preferences[item.id] ? 'bg-indigo-500' : 'bg-slate-700'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${preferences[item.id] ? 'left-5.5 transform translate-x-5' : 'left-0.5'}`}></div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECURITY */}
          {activeTab === 'security' && (
            <div className="p-8 space-y-8">
              <h2 className="text-lg font-semibold text-white">Security Settings</h2>
              
              <div className="space-y-6 max-w-md">
                
                <div className="p-5 bg-[#0A0C10] border border-slate-800 rounded-lg">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Key size={16} className="text-indigo-400"/> Change Password
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <input 
                        type="password" 
                        placeholder="Current Password"
                        value={passwords.current}
                        onChange={e => setPasswords({...passwords, current: e.target.value})}
                        className="w-full bg-[#13161F] border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <input 
                        type="password" 
                        placeholder="New Password"
                        value={passwords.new}
                        onChange={e => setPasswords({...passwords, new: e.target.value})}
                        className="w-full bg-[#13161F] border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <input 
                        type="password" 
                        placeholder="Confirm New Password"
                        value={passwords.confirm}
                        onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                        className="w-full bg-[#13161F] border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button 
                      onClick={handlePasswordSave}
                      disabled={saving}
                      className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full"
                    >
                      Update Password
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-5 bg-[#0A0C10] border border-slate-800 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-slate-300">Two-Factor Authentication</div>
                    <div className="text-xs text-slate-500">Require an extra code upon login.</div>
                  </div>
                  <button 
                    onClick={() => updatePreference('two_factor_auth', !preferences.two_factor_auth)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${preferences.two_factor_auth ? 'bg-emerald-500' : 'bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${preferences.two_factor_auth ? 'left-5.5 transform translate-x-5' : 'left-0.5'}`}></div>
                  </button>
                </div>

                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-3 text-amber-400">
                  <AlertCircle size={18} className="shrink-0 mt-0.5"/>
                  <div className="text-xs leading-relaxed">
                    <strong>Note:</strong> API Key generation and Active Session management require administrative access. Please contact your IT administrator to provision a new service account key.
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
