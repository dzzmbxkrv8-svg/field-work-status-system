import { apiClient } from './client';

export const getAssignments = async () => {
  return apiClient('/api/assignments', {
    method: 'GET',
  });
};

export const getAssignment = async (id) => {
  return apiClient(`/api/assignments/${id}`, {
    method: 'GET',
  });
};

export const createAssignment = async (assignmentData) => {
  return apiClient('/api/assignments', {
    method: 'POST',
    body: JSON.stringify(assignmentData),
  });
};

export const updateAssignmentStatus = async (id, status) => {
  return apiClient(`/api/assignments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
};
