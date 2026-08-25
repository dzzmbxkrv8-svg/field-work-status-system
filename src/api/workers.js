import { apiClient } from './client';

export const getWorkers = async () => {
  return apiClient('/api/workers', { method: 'GET' });
};

export const getPendingWorkers = async () => {
  return apiClient('/api/workers/pending', { method: 'GET' });
};

export const approveWorker = async (id) => {
  return apiClient(`/api/workers/${id}/approve`, { method: 'PATCH' });
};

export const getWorker = async (id) => {
  return apiClient(`/api/workers/${id}`, {
    method: 'GET',
  });
};

export const createWorker = async (data) => {
  return apiClient('/api/workers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateWorker = async (id, data) => {
  return apiClient(`/api/workers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteWorker = async (id) => {
  return apiClient(`/api/workers/${id}`, { method: 'DELETE' });
};

export const recommendWorkers = async (location, count) => {
  return apiClient('/api/workers/recommend', {
    method: 'POST',
    body: JSON.stringify({ location, count }),
  });
};
