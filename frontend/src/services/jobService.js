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