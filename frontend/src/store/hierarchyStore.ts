import { create } from 'zustand';
import type { Organization, Workspace, Department, Collection } from '../lib/hierarchy';
import { hierarchyApi } from '../lib/hierarchy';

interface HierarchyState {
  organizations: Organization[];
  workspaces: Workspace[];
  departments: Department[];
  collections: Collection[];
  
  selectedOrgId: number | null;
  selectedWorkspaceId: number | null;
  selectedDepartmentId: number | null;
  
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchOrganizations: () => Promise<void>;
  fetchWorkspaces: (orgId: number) => Promise<void>;
  createWorkspace: (name: string, description?: string) => Promise<void>;
  deleteWorkspace: (id: number) => Promise<void>;
  fetchDepartments: (workspaceId: number | 'all') => Promise<void>;
  deleteDepartment: (id: number) => Promise<void>;
  fetchCollections: (departmentId: number) => Promise<void>;
  
  setSelectedOrg: (id: number | null) => void;
  setSelectedWorkspace: (id: number | null) => void;
  setSelectedDepartment: (id: number | null) => void;
}

export const useHierarchyStore = create<HierarchyState>((set, get) => ({
  organizations: [],
  workspaces: [],
  departments: [],
  collections: [],
  
  selectedOrgId: null,
  selectedWorkspaceId: null,
  selectedDepartmentId: null,
  
  isLoading: false,
  error: null,
  
  fetchOrganizations: async () => {
    set({ isLoading: true });
    try {
      let orgs = await hierarchyApi.getOrganizations();
      
      // If user has no organizations, create a default one automatically
      if (orgs.length === 0) {
        try {
          const newOrg = await hierarchyApi.createOrganization({ name: "My Organization", description: "Default Organization" });
          orgs = [newOrg];
        } catch (createErr) {
          console.error("Failed to auto-create organization", createErr);
        }
      }

      set({ organizations: orgs });
      
      // Auto-select first org if none selected
      if (orgs.length > 0 && !get().selectedOrgId) {
        get().setSelectedOrg(orgs[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch organizations', error);
    } finally {
      set({ isLoading: false });
    }
  },
  
  fetchWorkspaces: async (orgId) => {
    set({ isLoading: true });
    try {
      const workspaces = await hierarchyApi.getWorkspaces(orgId);
      set({ workspaces });
      if (workspaces.length > 0 && !get().selectedWorkspaceId) {
        get().setSelectedWorkspace(workspaces[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch workspaces', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createWorkspace: async (_name, _description) => {
    // Implementation would go here
  },

  deleteWorkspace: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      await hierarchyApi.deleteWorkspace(id);
      set(state => ({
        workspaces: state.workspaces.filter(w => w.id !== id),
        selectedWorkspaceId: state.selectedWorkspaceId === id ? null : state.selectedWorkspaceId,
        departments: state.selectedWorkspaceId === id ? [] : state.departments,
        selectedDepartmentId: state.selectedWorkspaceId === id ? null : state.selectedDepartmentId,
        collections: state.selectedWorkspaceId === id ? [] : state.collections,
        isLoading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteDepartment: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      await hierarchyApi.deleteDepartment(id);
      set(state => ({
        departments: state.departments.filter(d => d.id !== id),
        selectedDepartmentId: state.selectedDepartmentId === id ? null : state.selectedDepartmentId,
        collections: state.selectedDepartmentId === id ? [] : state.collections,
        isLoading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },
  
  fetchDepartments: async (workspaceId) => {
    set({ isLoading: true });
    try {
      let departments = [];
      if (workspaceId === 'all') {
        departments = await api.get('/departments/all').then(res => res.data);
      } else {
        departments = await hierarchyApi.getDepartments(workspaceId);
      }
      set({ departments });
      if (departments.length > 0 && !get().selectedDepartmentId) {
        get().setSelectedDepartment(departments[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch departments', error);
    } finally {
      set({ isLoading: false });
    }
  },
  
  fetchCollections: async (departmentId) => {
    set({ isLoading: true });
    try {
      const collections = await hierarchyApi.getCollections(departmentId);
      set({ collections });
    } catch (error) {
      console.error('Failed to fetch collections', error);
    } finally {
      set({ isLoading: false });
    }
  },
  
  setSelectedOrg: (id) => {
    set({ 
      selectedOrgId: id, 
      selectedWorkspaceId: null, 
      selectedDepartmentId: null,
      workspaces: [],
      departments: [],
      collections: []
    });
    if (id) get().fetchWorkspaces(id);
  },
  
  setSelectedWorkspace: (id) => {
    set({ 
      selectedWorkspaceId: id,
      selectedDepartmentId: null,
      departments: [],
      collections: []
    });
    if (id) get().fetchDepartments(id);
  },
  
  setSelectedDepartment: (id) => {
    set({ selectedDepartmentId: id, collections: [] });
    if (id) get().fetchCollections(id);
  }
}));
