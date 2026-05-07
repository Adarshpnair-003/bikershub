/**
 * Bike API client — wraps the standard api utility for the garage feature.
 */

import { api } from './api.js';

export const bikeApi = {
  create(formData) {
    return api.upload('/api/bikes', formData);
  },
  listByUser(userId) {
    return api.get('/api/bikes/user/' + userId);
  },
  get(bikeId) {
    return api.get('/api/bikes/' + bikeId);
  },
  update(bikeId, formData) {
    return api.upload('/api/bikes/' + bikeId, formData, 'PUT');
  },
  setPrimary(bikeId) {
    return api.put('/api/bikes/' + bikeId + '/primary', {});
  },
  remove(bikeId) {
    return api.delete('/api/bikes/' + bikeId);
  },
  listPosts(bikeId, { page = 1, limit = 20 } = {}) {
    return api.get(`/api/bikes/${bikeId}/posts?page=${page}&limit=${limit}`);
  },
};
