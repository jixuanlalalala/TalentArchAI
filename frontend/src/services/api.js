import { supabase } from './supabaseClient';

const API_BASE_URL = 'http://localhost:5000/api';

const getAuthHeaders = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error('No Supabase session found. Sign in first.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
};

export const requestJson = async (path, options = {}) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }

  return payload;
};

export const testFlaskConnection = async () => {
  return requestJson('/jobs/me');
};

// export const fetchJobPostingsFromFlask = async () => {
//   const payload = await requestJson('/jobs/postings');
//   return payload.jobs || [];
// };

export default {
  get: (path) => requestJson(path),
  post: (path, body) => requestJson(path, { method: 'POST', body: JSON.stringify(body) }),
  delete: (path) => requestJson(path, { method: 'DELETE' }),
};
