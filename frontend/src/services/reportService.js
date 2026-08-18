import { requestFile } from './api';

export const getJobExcelReport = async (jobId, fields) => {
  return requestFile(`/jobs/${jobId}/reports/excel`, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });
};
