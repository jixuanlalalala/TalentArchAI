import { requestJson } from './api';

export const getRecruiterProfile = async () => {
  const payload = await requestJson('/profile', { method: 'GET' });
  return payload?.profile || null;
};

export const updateRecruiterProfile = async (profile) => {
  const payload = await requestJson('/profile', {
    method: 'PATCH',
    body: JSON.stringify(profile),
  });
  return payload?.profile || null;
};

export const deactivateRecruiterAccount = async () => {
  return requestJson('/profile/deactivate', {
    method: 'POST',
    body: JSON.stringify({ confirm: true }),
  });
};
