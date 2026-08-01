import { requestJson } from './api';

export const getCandidates = async () => {
  const payload = await requestJson('/candidates', { method: 'GET' });
  return Array.isArray(payload?.candidates) ? payload.candidates : [];
};

export const getCandidate = async (candidateId) => {
  const payload = await requestJson(`/candidates/${candidateId}`, {
    method: 'GET',
  });
  return payload?.candidate || null;
};

export const getJobCandidates = async (jobId) => {
  const payload = await requestJson(`/jobs/${jobId}/candidates`, {
    method: 'GET',
  });
  return Array.isArray(payload?.candidates) ? payload.candidates : [];
};

export const getJobCandidate = async (jobId, candidateId) => {
  const payload = await requestJson(
    `/jobs/${jobId}/candidates/${candidateId}`,
    { method: 'GET' }
  );
  return payload?.candidate || null;
};
