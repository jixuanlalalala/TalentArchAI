import { requestJson } from './api';

export const createJob = async (jobData) => {
    return requestJson('/jobs/', {
        method: 'POST',
        body: JSON.stringify(jobData),
    });
};

export const getJobs = async () => {
    const payload = await requestJson('/jobs/', {
        method: 'GET'
    });

    if (Array.isArray(payload)) {
        return payload;
    }

    if (payload && Array.isArray(payload.jobs)) {
        return payload.jobs;
    }

    if (payload && Array.isArray(payload.data)) {
        return payload.data;
    }

    return [];
};

export const getJobById = async (jobId) => {
    return requestJson(`/jobs/${jobId}`, {
        method: 'GET',
    });
};

export const deleteJob = async (jobId) => {
    return requestJson(`/jobs/${jobId}`, {
        method: 'DELETE',
    });
};

export const getRediscoveryCandidates = async (jobId) => {
    const payload = await requestJson(
        `/jobs/${jobId}/rediscovery-candidates`,
        { method: 'GET' }
    );
    return Array.isArray(payload?.candidates) ? payload.candidates : [];
};

export const linkRediscoveryCandidates = async (jobId, candidateIds) => {
    return requestJson(`/jobs/${jobId}/candidates`, {
        method: 'POST',
        body: JSON.stringify({ candidate_ids: candidateIds }),
    });
};
