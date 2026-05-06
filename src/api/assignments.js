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

export const cancelAssignment = async (id) => {
  return apiClient(`/api/assignments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'cancelled' }),
  });
};

export const assignWorker = async (assignmentDbId, workerId) => {
  return apiClient(`/api/assignments/${assignmentDbId}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ worker_id: workerId }),
  });
};

export const uploadAttachments = async (assignmentDbId, files) => {
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const token = localStorage.getItem('token');
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  try {
    const response = await fetch(`${baseURL}/api/assignments/${assignmentDbId}/attachments`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: false, message: data.message || `アップロードエラー: ${response.status}` };
    }
    return await response.json();
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const setMembers = async (assignmentDbId, memberIds) => {
  return apiClient(`/api/assignments/${assignmentDbId}/members`, {
    method: 'POST',
    body: JSON.stringify({ member_ids: memberIds }),
  });
};

export const getMembers = async (assignmentDbId) => {
  return apiClient(`/api/assignments/${assignmentDbId}/members`, { method: 'GET' });
};

export const getAttachments = async (assignmentDbId) => {
  return apiClient(`/api/assignments/${assignmentDbId}/attachments`, { method: 'GET' });
};

export const deleteAttachment = async (assignmentDbId, attachmentId) => {
  return apiClient(`/api/assignments/${assignmentDbId}/attachments/${attachmentId}`, { method: 'DELETE' });
};
