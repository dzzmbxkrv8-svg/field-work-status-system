import { apiClient } from './client';

export const getMessages = async () => {
  return apiClient('/api/messages', {
    method: 'GET',
  });
};

export const sendMessage = async (messageData) => {
  return apiClient('/api/messages', {
    method: 'POST',
    body: JSON.stringify(messageData), // { receiver_id, team_id, content }
  });
};

export const markAsRead = async (id, receiverId) => {
  return apiClient(`/api/messages/${id}/read`, {
    method: 'PATCH',
    body: JSON.stringify({ receiver_id: receiverId }),
  });
};
