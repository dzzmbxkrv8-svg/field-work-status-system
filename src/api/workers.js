import { apiClient } from './client';

export const getWorkers = async () => {
  return apiClient('/api/workers', {
    method: 'GET',
  });
};

export const getWorker = async (id) => {
  return apiClient(`/api/workers/${id}`, {
    method: 'GET',
  });
};
