import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder } from 'lucide-react';
import api from '../lib/api';

export default function Collections() {
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchAll() {
      try {
        const res = await api.get('/collections/all');
        setCollections(res.data);
      } catch (err) {
        console.error('Failed to fetch collections', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-slate-50 dark:bg-[#0F172A]">
      <div className="max-w-6xl mx-auto w-full">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Collections</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
              Manage your grouped knowledge assets across all departments.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <Folder size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No collections found</h3>
            <p className="text-slate-500">Create a collection inside a department first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map(collection => (
              <div 
                key={collection.id}
                onClick={() => navigate(`/dashboard/collections/${collection.id}`)}
                className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group flex flex-col h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                    <Folder size={24} />
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors">{collection.name}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm flex-1 mb-6">
                  Knowledge base collection.
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
