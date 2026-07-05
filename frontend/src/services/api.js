import { supabase } from './supabaseClient';

const API_BASE_URL = 'http://localhost:5000/api';

export const testFlaskConnection = async () => {
  console.log('Interceptor running');

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error('No Supabase session found. Sign in first.');
  }

  // console.log('Supabase session access token:', session.access_token);

  const response = await fetch(`${API_BASE_URL}/jobs/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to reach Flask backend');
  }

  return payload;
};

// import axios from 'axios';
// import { supabase } from './supabaseClient';

// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_URL,
//   headers: {
//     'Content-Type': 'application/json',
//   }
// });

// api.interceptors.request.use(async (config) => {
//   console.log('Interceptor running');
//   console.log('API URL:', import.meta.env.VITE_API_URL);
//   const { data: { session }, error } = await supabase.auth.getSession();
//   console.log('Session:', session);

//   if (error || !session) {
//     return config;
//   }

//   config.headers.Authorization = `Bearer ${session.access_token}`;
//   return config;
// });

// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     if (error.response?.status === 401) {
//       await supabase.auth.signOut();
//       window.location.href = '/login';
//     }
//     return Promise.reject(error);
//   }
// );


// export default api;   // ← this line must be here
