import { useHierarchyStore } from '../store/hierarchyStore';
import { Building2, Folders, FileText } from 'lucide-react';

export default function Workspaces() {
  const { organizations, selectedOrgId, workspaces, departments, collections } = useHierarchyStore();
  const currentOrg = organizations.find(o => o.id === selectedOrgId);

  // Helper to count departments and collections per workspace
  const getWorkspaceStats = (workspaceId: number) => {
    const depts = departments.filter(d => d.workspace_id === workspaceId);
    const cols = collections.filter(c => depts.some(d => d.id === c.department_id));
    return {
      departmentCount: depts.length,
      collectionCount: cols.length
    };
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-slate-50 dark:bg-[#0F172A]">
      <div className="max-w-6xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Workspaces</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            Manage your knowledge hubs within {currentOrg?.name || 'your organization'}.
          </p>
        </div>

        {workspaces.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <Building2 size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No workspaces found</h3>
            <p className="text-slate-500">Contact your organization administrator to set up a workspace.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map(workspace => {
              const stats = getWorkspaceStats(workspace.id);
              return (
                <div 
                  key={workspace.id}
                  className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group flex flex-col h-full"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 size={24} />
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{workspace.name}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm flex-1 mb-6">
                    {workspace.description || 'Enterprise knowledge workspace.'}
                  </p>
                  
                  <div className="flex items-center gap-4 py-4 border-t border-slate-100 dark:border-slate-800/60 mt-auto">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Folders size={16} className="text-slate-400" />
                      <span className="text-sm font-medium">{stats.departmentCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <FileText size={16} className="text-slate-400" />
                      <span className="text-sm font-medium">{stats.collectionCount}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
