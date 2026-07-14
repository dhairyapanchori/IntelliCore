import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useHierarchyStore } from '../store/hierarchyStore';
import { hierarchyApi } from '../lib/hierarchy';
import { Building2, Network, LogOut, Plus, MessageSquare } from 'lucide-react';
import CreateEntityModal from '../components/modals/CreateEntityModal';

export default function DashboardLayout() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { 
    organizations, workspaces, departments,
    selectedOrgId, selectedWorkspaceId, selectedDepartmentId,
    fetchOrganizations, fetchWorkspaces, fetchDepartments,
    setSelectedOrg, setSelectedWorkspace, setSelectedDepartment
  } = useHierarchyStore();

  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);
  const [isCreateDeptOpen, setIsCreateDeptOpen] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleCreateOrg = async (data: { name: string; description: string }) => {
    const newOrg = await hierarchyApi.createOrganization(data);
    await fetchOrganizations();
    setSelectedOrg(newOrg.id);
  };

  const handleCreateWorkspace = async (data: { name: string; description: string }) => {
    if (!selectedOrgId) return;
    const newWs = await hierarchyApi.createWorkspace({ ...data, organization_id: selectedOrgId });
    await fetchWorkspaces(selectedOrgId);
    setSelectedWorkspace(newWs.id);
  };

  const handleCreateDepartment = async (data: { name: string; description: string }) => {
    if (!selectedWorkspaceId) return;
    const newDept = await hierarchyApi.createDepartment({ ...data, workspace_id: selectedWorkspaceId });
    await fetchDepartments(selectedWorkspaceId);
    handleSelectDepartment(newDept.id);
  };

  const navigate = useNavigate();

  const handleSelectOrg = (id: number) => {
    setSelectedOrg(id);
    navigate('/dashboard');
  };

  const handleSelectWorkspace = (id: number) => {
    setSelectedWorkspace(id);
    navigate('/dashboard');
  };

  const handleSelectDepartment = (id: number) => {
    setSelectedDepartment(id);
    navigate('/dashboard');
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-accent/30 text-foreground">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col transition-all">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="font-bold text-lg text-primary tracking-tight">IntelliCore</div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          
          {/* Main Navigation */}
          <div className="space-y-1 mb-6">
            <Link
              to="/dashboard/chat"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                location.pathname === '/dashboard/chat'
                  ? 'bg-primary text-primary-foreground font-medium shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <MessageSquare size={18} />
              <span className="font-semibold tracking-wide">IntelliChat AI</span>
            </Link>
          </div>

          {/* Organization Selector */}
          <div>
            <div className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Organization</span>
              <button onClick={() => setIsCreateOrgOpen(true)} className="hover:text-primary transition-colors">
                <Plus size={14} />
              </button>
            </div>
            <select 
              value={selectedOrgId || ''}
              onChange={(e) => handleSelectOrg(Number(e.target.value))}
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {organizations.length === 0 && <option value="" disabled>No Organization</option>}
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          {/* Workspaces */}
          {selectedOrgId && (
            <div>
              <div className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Workspaces</span>
                <button onClick={() => setIsCreateWsOpen(true)} className="hover:text-primary transition-colors">
                  <Plus size={14} />
                </button>
              </div>
              <div className="space-y-1">
                {workspaces.map(ws => (
                  <button
                    key={ws.id}
                    onClick={() => handleSelectWorkspace(ws.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedWorkspaceId === ws.id 
                        ? 'bg-primary/10 text-primary font-medium' 
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <Building2 size={16} />
                    <span className="truncate">{ws.name}</span>
                  </button>
                ))}
                {workspaces.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground italic">No workspaces yet</div>
                )}
              </div>
            </div>
          )}

          {/* Departments */}
          {selectedWorkspaceId && (
            <div>
              <div className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Departments</span>
                <button onClick={() => setIsCreateDeptOpen(true)} className="hover:text-primary transition-colors">
                  <Plus size={14} />
                </button>
              </div>
              <div className="space-y-1">
                {departments.map(dept => (
                  <button
                    key={dept.id}
                    onClick={() => handleSelectDepartment(dept.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedDepartmentId === dept.id 
                        ? 'bg-primary/10 text-primary font-medium' 
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <Network size={16} />
                    <span className="truncate">{dept.name}</span>
                  </button>
                ))}
                {departments.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground italic">No departments yet</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent transition-colors">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.full_name || 'User'}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
            <button onClick={logout} className="text-muted-foreground hover:text-destructive transition-colors p-1" title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-background overflow-y-auto">
        <Outlet />
      </div>

      {/* Modals */}
      <CreateEntityModal 
        isOpen={isCreateOrgOpen} 
        onClose={() => setIsCreateOrgOpen(false)} 
        title="Create New Organization" 
        entityName="Organization" 
        onSubmit={handleCreateOrg} 
      />
      <CreateEntityModal 
        isOpen={isCreateWsOpen} 
        onClose={() => setIsCreateWsOpen(false)} 
        title="Create New Workspace" 
        entityName="Workspace" 
        onSubmit={handleCreateWorkspace} 
      />
      <CreateEntityModal 
        isOpen={isCreateDeptOpen} 
        onClose={() => setIsCreateDeptOpen(false)} 
        title="Create New Department" 
        entityName="Department" 
        onSubmit={handleCreateDepartment} 
      />
    </div>
  );
}
