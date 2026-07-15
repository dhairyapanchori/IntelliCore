import { useState, useEffect, useMemo } from 'react';
import { useHierarchyStore } from '../store/hierarchyStore';
import api from '../lib/api';
import { 
  Users as UsersIcon, Search, Filter, MoreVertical, 
  Shield, Mail, Building2, Calendar, ShieldCheck, UserCheck, 
  Clock, LogIn, FileEdit, X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface OrganizationUser {
  id: number;
  user_id: number;
  organization_id: number;
  full_name: string | null;
  email: string;
  role: string;
  department_id: number | null;
  department_name: string | null;
  workspaces_count: number;
  last_active: string | null;
  status: string;
  created_at: string;
}

export default function Users() {
  const { organizations, selectedOrgId } = useHierarchyStore();
  const currentOrg = organizations.find(o => o.id === selectedOrgId);
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('Member');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    if (!currentOrg) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get(`/users/?organization_id=${currentOrg.id}`);
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentOrg]);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !currentOrg) return;
    setIsSubmitting(true);
    try {
      await api.post('/users/invite', {
        email: inviteEmail,
        full_name: inviteName,
        role: inviteRole,
        organization_id: currentOrg.id
      });
      await fetchUsers();
      toast.success(`Invitation sent to ${inviteEmail}`);
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('Member');
    } catch (err: any) {
      console.error("Failed to invite user", err);
      toast.error(err.response?.data?.detail || "Failed to invite user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  useMemo(() => {
    if (users.length > 0 && !selectedUserId) {
      setSelectedUserId(users[0].id);
    }
  }, [users, selectedUserId]);

  const selectedUser = users.find(u => u.id === selectedUserId) || users[0];

  // KPIs
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'Active').length;
  const pendingInvites = users.filter(u => u.status === 'Pending').length;
  const uniqueRoles = new Set(users.map(u => u.role)).size;

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'manager': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'member': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'guest': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0C10] overflow-y-auto scrollbar-thin text-slate-300">
      <div className="border-b border-slate-800 bg-[#0A0C10]/90 backdrop-blur-md sticky top-0 z-10 px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Users & Roles</h1>
            <p className="text-slate-400 text-sm mt-1">Manage team members, roles, and fine-grained access controls.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsInviteModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20"
            >
              <Mail size={16} /> Invite User
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 flex flex-col xl:flex-row gap-8">
        
        {/* Main Grid Area */}
        <div className="flex-1 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-indigo-400">
                <UsersIcon size={14} />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Users</span>
              </div>
              <p className="text-2xl font-bold text-white">{totalUsers}</p>
            </div>
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-emerald-400">
                <UserCheck size={14} />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Users</span>
              </div>
              <p className="text-2xl font-bold text-white">{activeUsers}</p>
            </div>
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-amber-400">
                <Clock size={14} />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Invites</span>
              </div>
              <p className="text-2xl font-bold text-white">{pendingInvites}</p>
            </div>
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-purple-400">
                <ShieldCheck size={14} />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Roles</span>
              </div>
              <p className="text-2xl font-bold text-white">{uniqueRoles}</p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search users..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-[#13161F] border border-slate-800 text-sm rounded-lg pl-9 pr-4 py-2 w-full focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div className="flex items-center gap-3">
              <select className="bg-[#13161F] border border-slate-800 text-sm text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500/50">
                <option>Role: All</option>
                <option>Admin</option>
                <option>Member</option>
              </select>
              <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors bg-[#13161F] border border-slate-800 px-4 py-2 rounded-lg">
                <Filter size={14} /> Filter
              </button>
            </div>
          </div>

          {loading ? (
             <div className="flex justify-center items-center h-64">
               <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
             </div>
          ) : (
            <div className="bg-[#13161F] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-[#0A0C10] border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4 text-center">Workspaces</th>
                      <th className="px-6 py-4">Last Active</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredUsers.map((user) => (
                      <tr 
                        key={user.id} 
                        onClick={() => setSelectedUserId(user.id)}
                        className={`hover:bg-[#1E2333]/50 transition-colors cursor-pointer group ${selectedUserId === user.id ? 'bg-[#1E2333]' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}&backgroundColor=c0aede`} 
                              alt="Avatar" 
                              className="w-10 h-10 rounded-full border border-slate-700 bg-slate-800"
                            />
                            <div>
                              <div className="font-semibold text-white">{user.full_name || 'System Admin'}</div>
                              <div className="text-xs text-slate-400">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getRoleColor(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {user.department_name || 'Headquarters'}
                        </td>
                        <td className="px-6 py-4 text-center text-slate-300 font-medium">
                          {user.workspaces_count}
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs">
                          {user.last_active ? formatDistanceToNow(new Date(user.last_active), { addSuffix: true }) : 'Never'}
                        </td>
                        <td className="px-6 py-4">
                          {user.status === 'Active' ? (
                            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-slate-500 hover:text-white transition-colors p-1 opacity-0 group-hover:opacity-100"><MoreVertical size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - User Profile Panel */}
        {selectedUser && (
          <div className="w-full xl:w-80 space-y-6 shrink-0">
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-indigo-500/20 to-transparent border-b border-slate-800/50"></div>
              
              <div className="relative z-10 flex flex-col items-center text-center mt-4 mb-6">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.email}&backgroundColor=c0aede`} 
                  alt="Avatar" 
                  className="w-20 h-20 rounded-full border-4 border-[#13161F] bg-slate-800 shadow-xl mb-3"
                />
                <h2 className="text-xl font-bold text-white leading-tight">{selectedUser.full_name || 'System Admin'}</h2>
                <p className="text-slate-400 text-sm mt-0.5">{selectedUser.email}</p>
                
                <div className="mt-4 flex items-center justify-center gap-2">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getRoleColor(selectedUser.role)}`}>
                    {selectedUser.role}
                  </span>
                  {selectedUser.status === 'Active' && (
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                      Active
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-4 border-b border-slate-800 mb-6 text-sm">
                <button className="pb-2 text-indigo-400 border-b-2 border-indigo-500 font-medium">Profile</button>
                <button className="pb-2 text-slate-500 hover:text-slate-300">Activity</button>
                <button className="pb-2 text-slate-500 hover:text-slate-300">Permissions</button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-500">Department</span>
                  <span className="text-white font-medium flex items-center gap-1.5"><Building2 size={12} className="text-indigo-400"/> {selectedUser.department_name || 'Headquarters'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-500">Workspaces</span>
                  <span className="text-white font-medium">{selectedUser.workspaces_count}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-500">Joined</span>
                  <span className="text-slate-300 flex items-center gap-1.5"><Calendar size={12} className="text-slate-500"/> {new Date(selectedUser.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500">Last Active</span>
                  <span className="text-slate-300">
                    {selectedUser.last_active ? formatDistanceToNow(new Date(selectedUser.last_active), { addSuffix: true }) : 'Never'}
                  </span>
                </div>
              </div>

              <div className="mt-8">
                <button className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                  <Shield size={14} /> Edit Permissions
                </button>
              </div>
            </div>

            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
              </div>
              
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-800">
                <div className="relative flex items-start gap-4">
                  <div className="absolute left-0 h-6 w-6 rounded-full border-2 border-[#13161F] bg-indigo-500 flex items-center justify-center shrink-0 z-10">
                    <LogIn size={10} className="text-white" />
                  </div>
                  <div className="pl-10">
                    <p className="text-sm font-medium text-white">Logged In</p>
                    <p className="text-xs text-slate-500 mt-0.5">2 hours ago via Web</p>
                  </div>
                </div>
                <div className="relative flex items-start gap-4">
                  <div className="absolute left-0 h-6 w-6 rounded-full border-2 border-[#13161F] bg-slate-700 flex items-center justify-center shrink-0 z-10">
                    <FileEdit size={10} className="text-slate-300" />
                  </div>
                  <div className="pl-10">
                    <p className="text-sm font-medium text-white">Edited Document</p>
                    <p className="text-xs text-slate-400 mt-0.5">"Q3 Marketing Strategy"</p>
                    <p className="text-xs text-slate-500 mt-1">Yesterday at 4:30 PM</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invite User Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13161F] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Invite User</h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com" 
                  className="w-full bg-[#0A0C10] border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Full Name (Optional)</label>
                <input 
                  type="text" 
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="e.g. Jane Doe" 
                  className="w-full bg-[#0A0C10] border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="w-full bg-[#0A0C10] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                >
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Member">Member</option>
                  <option value="Guest">Guest</option>
                </select>
                <p className="text-xs text-slate-500 mt-2">Roles define permissions across the platform.</p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-[#0A0C10]/50">
              <button 
                onClick={() => setIsInviteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div> : null}
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
