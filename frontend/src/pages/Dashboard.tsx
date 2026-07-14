import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHierarchyStore } from '../store/hierarchyStore';
import { hierarchyApi } from '../lib/hierarchy';
import { FolderKanban, Plus } from 'lucide-react';
import CreateEntityModal from '../components/modals/CreateEntityModal';

export default function Dashboard() {
  const { 
    organizations, workspaces, departments, collections,
    selectedOrgId, selectedWorkspaceId, selectedDepartmentId,
    fetchCollections
  } = useHierarchyStore();

  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false);

  const activeOrg = organizations.find(o => o.id === selectedOrgId);
  const activeWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);
  const activeDepartment = departments.find(d => d.id === selectedDepartmentId);

  const navigate = useNavigate();

  useEffect(() => {
    if (selectedDepartmentId) {
      fetchCollections(selectedDepartmentId);
    }
  }, [selectedDepartmentId, fetchCollections]);

  const handleCreateCollection = async (data: { name: string; description: string }) => {
    if (!selectedDepartmentId) return;
    await hierarchyApi.createCollection({ ...data, department_id: selectedDepartmentId });
    await fetchCollections(selectedDepartmentId);
  };

  if (!selectedOrgId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-4">
          <h2 className="text-2xl font-bold">Welcome to IntelliCore</h2>
          <p className="text-muted-foreground">To get started, create your first Organization from the sidebar menu.</p>
        </div>
      </div>
    );
  }

  if (!selectedWorkspaceId || !selectedDepartmentId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-4">
          <h2 className="text-2xl font-bold">{activeOrg?.name}</h2>
          <p className="text-muted-foreground">
            Please select or create a Workspace and Department to view Collections.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span>{activeOrg?.name}</span>
          <span>/</span>
          <span>{activeWorkspace?.name}</span>
          <span>/</span>
          <span className="text-foreground font-medium">{activeDepartment?.name}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
            <p className="text-muted-foreground mt-1">
              Manage document collections within this department.
            </p>
          </div>
          <button 
            onClick={() => setIsCreateCollectionOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={18} />
            New Collection
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {collections.map(collection => (
          <div 
            key={collection.id}
            onClick={() => navigate(`/dashboard/collections/${collection.id}`)}
            className="group relative flex flex-col p-6 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all hover:border-primary/50 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
              <FolderKanban size={20} />
            </div>
            <h3 className="font-semibold text-lg mb-2">{collection.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {collection.description || 'No description provided.'}
            </p>
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Created {new Date(collection.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
        
        {collections.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-xl">
            <h3 className="text-lg font-medium mb-2">No collections found</h3>
            <p className="text-muted-foreground mb-4">Get started by creating your first collection.</p>
            <button 
              onClick={() => setIsCreateCollectionOpen(true)}
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              <Plus size={16} />
              Create Collection
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      <CreateEntityModal 
        isOpen={isCreateCollectionOpen} 
        onClose={() => setIsCreateCollectionOpen(false)} 
        title="Create New Collection" 
        entityName="Collection" 
        onSubmit={handleCreateCollection} 
      />
    </div>
  );
}
