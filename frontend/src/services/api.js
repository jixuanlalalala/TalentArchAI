import { supabase } from './supabaseClient';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';

const getAuthHeaders = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error('No Supabase session found. Sign in first.');
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
  };
};

export const requestJson = async (path, options = {}) => {
  const headers = await getAuthHeaders();
  const requestHeaders = {
    ...headers,
    ...(options.headers || {}),
  };

  if (
    options.body != null &&
    !(options.body instanceof FormData) &&
    !requestHeaders['Content-Type']
  ) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: requestHeaders,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error || 'Request failed');
    error.status = response.status;
    error.payload = payload;
    throw error;
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
