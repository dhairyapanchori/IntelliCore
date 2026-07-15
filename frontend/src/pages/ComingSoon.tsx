import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ComingSoon() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full p-8 bg-slate-50 dark:bg-[#0F172A]">
      <div className="max-w-md w-full bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center shadow-xl">
        <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Construction size={40} className="text-indigo-500" />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3 tracking-tight">
          Feature Coming Soon
        </h2>
        
        <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          This enterprise feature is currently in development and will be available in the upcoming IntelliCore V1.2 release.
        </p>
        
        <button 
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center justify-center gap-2 w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
