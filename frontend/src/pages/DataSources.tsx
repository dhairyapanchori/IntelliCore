import { Database, Plus, RefreshCw, Cloud, FileText, Settings, ShieldCheck } from 'lucide-react';

export default function DataSources() {
  const integrations = [
    { name: 'Google Drive', icon: Cloud, status: 'Connected', type: 'Cloud Storage', sync: '2 hours ago', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { name: 'Confluence', icon: FileText, status: 'Not Connected', type: 'Wiki', sync: 'Never', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { name: 'Notion', icon: FileText, status: 'Not Connected', type: 'Workspace', sync: 'Never', color: 'text-slate-800 dark:text-slate-200', bg: 'bg-slate-100 dark:bg-slate-800' },
    { name: 'Slack', icon: Cloud, status: 'Connected', type: 'Communication', sync: '10 mins ago', color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-500/10' },
  ];

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-slate-50 dark:bg-[#0F172A]">
      <div className="max-w-6xl mx-auto w-full">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Data Sources</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
              Manage external integrations and auto-syncing connectors.
            </p>
          </div>
          <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
            <Plus size={18} /> Add Integration
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Active Local Storage */}
          <div className="bg-white dark:bg-[#1E293B] border-2 border-primary/20 rounded-2xl p-6 shadow-sm flex flex-col h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
              PRIMARY
            </div>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                <Database size={24} />
              </div>
            </div>
            
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Local Uploads</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm flex-1 mb-6">
              Directly uploaded files (PDFs, DOCX, TXT). Auto-indexed by IntelliCore.
            </p>
            
            <div className="flex items-center gap-4 py-4 border-t border-slate-100 dark:border-slate-800/60 mt-auto justify-between">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                <ShieldCheck size={16} /> Secure Storage
              </div>
              <button className="text-primary hover:text-primary/80 transition-colors">
                <Settings size={18} />
              </button>
            </div>
          </div>

          {/* External Integrations */}
          {integrations.map((int, idx) => (
            <div 
              key={idx}
              className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col h-full opacity-80 hover:opacity-100"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${int.bg} ${int.color}`}>
                  <int.icon size={24} />
                </div>
                {int.status === 'Connected' ? (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                    Connected
                  </span>
                ) : (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    Not Connected
                  </span>
                )}
              </div>
              
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">{int.name}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm flex-1 mb-6">
                {int.type} Connector
              </p>
              
              <div className="flex items-center gap-4 py-4 border-t border-slate-100 dark:border-slate-800/60 mt-auto justify-between">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                  <RefreshCw size={12} className={int.status === 'Connected' ? "text-primary" : ""} /> 
                  Last Sync: {int.sync}
                </div>
                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  <Settings size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
