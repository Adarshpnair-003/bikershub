import { api } from './api.js';

export const storyApi = {
  create(formData) {
    return api.upload('/api/stories', formData);
  },
  feed() {
    return api.get('/api/stories');
  },
  byUser(userId) {
    return api.get(`/api/stories/user/${userId}`);
  },
  markViewed(storyId) {
    return api.post(`/api/stories/${storyId}/view`, {});
  },
  remove(storyId) {
    return api.delete(`/api/stories/${storyId}`);
  }
};
