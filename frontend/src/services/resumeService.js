import { requestJson } from './api';

export const uploadResumes = async (jobId, files) => {
  if (!jobId) {
    throw new Error('Select a job posting before uploading resumes.');
  }

  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  return requestJson(`/jobs/${jobId}/resumes`, {
    method: 'POST',
    body: formData,
  });
};
