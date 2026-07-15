import api from './api';

export interface Organization {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Workspace {
  id: number;
  organization_id: number;
  name: string;
  description: string | null;
  type: string;
  status: string;
  owner_id: number | null;
  owner_name: string | null;
  members_count: number;
  collections_count: number;
  documents_count: number;
  storage_used: number;
  created_at: string;
}

export interface Department {
  id: number;
  workspace_id: number;
  name: string;
  description: string | null;
  status: string;
  location: string | null;
  head_id: number | null;
  head_name: string | null;
  members_count: number;
  collections_count: number;
  documents_count: number;
  storage_used: number;
  created_at: string;
}

export interface Collection {
  id: number;
  department_id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export const hierarchyApi = {
  // Organizations
  getOrganizations: () => api.get<Organization[]>('/organizations/').then(res => res.data),
  createOrganization: (data: { name: string; description?: string }) => api.post<Organization>('/organizations/', data).then(res => res.data),
  
  // Workspaces
  getWorkspaces: (orgId: number) => api.get<Workspace[]>(`/workspaces/?organization_id=${orgId}`).then(res => res.data),
  createWorkspace: (data: { organization_id: number; name: string; description?: string }) => api.post<Workspace>('/workspaces/', data).then(res => res.data),
  deleteWorkspace: (id: number) => api.delete(`/workspaces/${id}`),
  
  // Departments
  getDepartments: (workspaceId: number) => api.get<Department[]>(`/departments/?workspace_id=${workspaceId}`).then(res => res.data),
  createDepartment: (data: { workspace_id: number; name: string; description?: string }) => api.post<Department>('/departments/', data).then(res => res.data),
  deleteDepartment: (id: number) => api.delete(`/departments/${id}`),
  
  // Collections
  getCollections: (departmentId: number) => api.get<Collection[]>(`/collections/?department_id=${departmentId}`).then(res => res.data),
  createCollection: (data: { department_id: number; name: string; description?: string }) => api.post<Collection>('/collections/', data).then(res => res.data),
};
