import api from './api';

export const analyticsApi = {
  getDashboardMetrics: async () => {
    const response = await api.get('/analytics/dashboard');
    return response.data;
  },
  
  getRecentActivity: async (limit = 5) => {
    const response = await api.get(`/analytics/recent-activity?limit=${limit}`);
    return response.data;
  },
  
  getKnowledgeGraph: async () => {
    const response = await api.get('/analytics/graph');
    return response.data;
  }
};
