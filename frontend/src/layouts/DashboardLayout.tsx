import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  LayoutDashboard, Bot, Search, Folder, FileText, Database, Network,
  Building2, Users, BarChart3, FilePieChart, Settings, LogOut, Hexagon
} from 'lucide-react';

export default function DashboardLayout() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const isCollapsed = false;

  const navigation = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'AI Copilot', href: '/dashboard/chat', icon: Bot },
  ];

  const knowledgeNav = [
    { name: 'Search', href: '/dashboard/search', icon: Search },
    { name: 'Collections', href: '/dashboard/collections', icon: Folder },
    { name: 'Documents', href: '/dashboard/documents', icon: FileText },
    { name: 'Data Sources', href: '/dashboard/sources', icon: Database },
    { name: 'Knowledge Graph', href: '/dashboard/graph', icon: Network },
  ];

  const orgNav = [
    { name: 'Workspaces', href: '/dashboard/workspaces', icon: Building2 },
    { name: 'Departments', href: '/dashboard/departments', icon: Network },
    { name: 'Users & Roles', href: '/dashboard/users', icon: Users },
  ];

  const systemNav = [
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Reports', href: '/dashboard/reports', icon: FilePieChart },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const NavItem = ({ item }: { item: any }) => {
    const isActive = location.pathname === item.href;
    return (
      <Link
        to={item.href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 translate-x-1'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`}
      >
        <item.icon size={18} className={isActive ? 'text-primary-foreground' : 'text-muted-foreground'} />
        {!isCollapsed && <span>{item.name}</span>}
      </Link>
    );
  };

  const NavGroup = ({ title, items }: { title: string, items: any[] }) => (
    <div className="mb-6">
      {!isCollapsed && (
        <h4 className="px-3 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
          {title}
        </h4>
      )}
      <div className="space-y-1">
        {items.map(item => <NavItem key={item.name} item={item} />)}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground selection:bg-accent/30 font-sans">
      {/* Sidebar */}
      <div className={`${isCollapsed ? 'w-20' : 'w-64'} border-r border-border bg-[#0B0F19] flex flex-col transition-all duration-300 z-10 shadow-xl`}>
        {/* Logo Area */}
        <div className="h-20 flex items-center px-5 border-b border-white/5">
          <Link to="/dashboard" className="flex items-center gap-3 cursor-pointer group">
            <div className="bg-primary/20 p-2 rounded-xl group-hover:bg-primary/30 transition-colors">
              <Hexagon className="text-primary fill-primary/20" size={24} />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-lg text-white tracking-tight leading-tight">IntelliCore</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Enterprise OS</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-3 scrollbar-hide">
          <div className="space-y-1 mb-8">
            {navigation.map(item => <NavItem key={item.name} item={item} />)}
          </div>
          <NavGroup title="Knowledge" items={knowledgeNav} />
          <NavGroup title="Organization" items={orgNav} />
          <NavGroup title="System" items={systemNav} />
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-white/5 bg-white/5">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group">
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'admin'}`} 
              alt="Avatar" 
              className="w-10 h-10 rounded-full bg-black/50 border border-white/10"
            />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{user?.full_name || 'Administrator'}</div>
                <div className="text-xs text-muted-foreground truncate">{user?.email || 'admin@acme.com'}</div>
              </div>
            )}
            {!isCollapsed && (
              <button onClick={logout} className="text-muted-foreground hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100" title="Logout">
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] dark:bg-[#0F172A] overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
