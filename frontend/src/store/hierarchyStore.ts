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
  
  // Actions
  fetchOrganizations: () => Promise<void>;
  fetchWorkspaces: (orgId: number) => Promise<void>;
  fetchDepartments: (workspaceId: number) => Promise<void>;
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
  
  fetchOrganizations: async () => {
    set({ isLoading: true });
    try {
      const orgs = await hierarchyApi.getOrganizations();
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
  
  fetchDepartments: async (workspaceId) => {
    set({ isLoading: true });
    try {
      const departments = await hierarchyApi.getDepartments(workspaceId);
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
