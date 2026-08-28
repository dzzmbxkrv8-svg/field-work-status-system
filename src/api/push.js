import { apiClient } from './client';

export const getVapidPublicKey = async () => {
  return apiClient('/api/push/vapid-public-key', { method: 'GET' });
};

export const subscribePush = async (subscription) => {
  return apiClient('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
  });
};

export const unsubscribePush = async (endpoint) => {
  return apiClient('/api/push/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ endpoint }),
  });
};
