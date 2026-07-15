import { useState, useEffect } from 'react';
import { Shield, MoreVertical, Mail } from 'lucide-react';
import { useHierarchyStore } from '../store/hierarchyStore';
import api from '../lib/api';

export default function Users() {
  const { organizations, selectedOrgId } = useHierarchyStore();
  const currentOrg = organizations.find(o => o.id === selectedOrgId);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      if (!currentOrg) return;
      try {
        const res = await api.get(`/organizations/${currentOrg.id}/users`);
        setUsers(res.data);
      } catch (err) {
        console.error('Failed to fetch users', err);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [currentOrg]);

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-slate-50 dark:bg-[#0F172A]">
      <div className="max-w-6xl mx-auto w-full">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Users & Roles</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
              Manage team members and their access levels within {currentOrg?.name || 'the organization'}.
            </p>
          </div>
          <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium whitespace-nowrap">
            Invite User
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium hidden md:table-cell">Contact</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium hidden sm:table-cell">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {users.map(user => (
                  <tr 
                    key={user.id} 
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                          alt="Avatar" 
                          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800"
                        />
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">{user.full_name || 'Anonymous User'}</div>
                          <div className="text-xs text-slate-500 mt-0.5 md:hidden">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Mail size={14} />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Shield size={14} className={user.role === 'owner' ? 'text-amber-500' : 'text-slate-400'} />
                        <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                          {user.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1">
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
