import api from './api';

export const analyticsApi = {
  getDashboardMetrics: async () => {
    const response = await api.get('/analytics/overview');
    return response.data;
  },
  
  getRecentActivity: async (limit = 5) => {
    const response = await api.get(`/analytics/recent-activity?limit=${limit}`);
    return response.data;
  },
  
  getKnowledgeGraph: async () => {
    const response = await api.get('/analytics/graph');
    return response.data;
  },

  getPopularQueries: async (limit = 5) => {
    const response = await api.get(`/analytics/popular-queries?limit=${limit}`);
    return response.data;
  },

  getTopCollections: async (limit = 5) => {
    const response = await api.get(`/analytics/top-collections?limit=${limit}`);
    return response.data;
  }
};
