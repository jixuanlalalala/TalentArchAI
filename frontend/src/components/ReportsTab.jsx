import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Download,
  FileText,
  Users,
} from 'lucide-react';
import { getJobCandidates } from '../services/candidateService';
import { getJobs } from '../services/jobService';
import { getJobExcelReport } from '../services/reportService';

const reportFieldOptions = [
  {
    key: 'email',
    label: 'Email',
    previewColumns: [{ key: 'email', label: 'Email Address' }],
  },
  {
    key: 'phone',
    label: 'Phone',
    previewColumns: [{ key: 'phone', label: 'Phone' }],
  },
  {
    key: 'match_score',
    label: 'Match Score',
    previewColumns: [{ key: 'match_score', label: 'Match Score' }],
  },
  {
    key: 'component_scores',
    label: 'Component Scores',
    previewColumns: [
      { key: 'education_score', label: 'Education Score' },
      { key: 'hard_skill_score', label: 'Hard Skill Score' },
      { key: 'soft_skill_score', label: 'Soft Skill Score' },
      { key: 'work_experience_score', label: 'Work Experience Score' },
    ],
  },
  {
    key: 'summary',
    label: 'Short Summary',
    previewColumns: [{ key: 'summary', label: 'Summary' }],
  },
  {
    key: 'matched_skills',
    label: 'Matched Skills',
    previewColumns: [{ key: 'matched_skills', label: 'Matched Skills' }],
  },
  {
    key: 'missing_skills',
    label: 'Missing Skills',
    previewColumns: [{ key: 'missing_skills', label: 'Missing Skills' }],
  },
  {
    key: 'gap_analysis',
    label: 'Gap Analysis',
    previewColumns: [{ key: 'gap_analysis', label: 'Gap Analysis' }],
  },
  {
    key: 'recruitment_status',
    label: 'Recruitment Status',
    previewColumns: [
      { key: 'recruitment_status', label: 'Recruitment Status' },
    ],
  },
];

const initialFields = new Set([
  'email',
  'phone',
  'match_score',
  'summary',
  'gap_analysis',
]);

const completedCandidates = (candidates) =>
  candidates
    .filter(
      (candidate) =>
        candidate.status === 'completed' &&
        typeof candidate.match_score === 'number' &&
        Number.isFinite(candidate.match_score)
    )
    .sort((left, right) => right.match_score - left.match_score);

const displayValue = (value) => {
  if (Array.isArray(value)) {
    const values = value.map((item) => String(item).trim()).filter(Boolean);
    return values.length > 0 ? values.join(', ') : '--';
  }
  if (value == null || String(value).trim() === '') return '--';
  return String(value);
};

const displayScore = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  const score = Math.min(100, Math.max(0, value));
  return `${Math.round(score * 100) / 100}%`;
};

export default function ReportsTab({ initialJobId = null }) {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(initialJobId);
  const [candidates, setCandidates] = useState([]);
  const [selectedFields, setSelectedFields] = useState(initialFields);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [downloadMessage, setDownloadMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadJobs = async () => {
      setLoadingJobs(true);
      setError('');
      try {
        const loadedJobs = await getJobs();
        if (cancelled) return;
        setJobs(loadedJobs);
        setSelectedJobId((current) => {
          const requested = initialJobId || current;
          return loadedJobs.some((job) => job.id === requested)
            ? requested
            : null;
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Could not load job postings.');
        }
      } finally {
        if (!cancelled) setLoadingJobs(false);
      }
    };

    loadJobs();
    return () => {
      cancelled = true;
    };
  }, [initialJobId]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedJobId) {
      return () => {
        cancelled = true;
      };
    }

    const loadCandidates = async () => {
      setLoadingCandidates(true);
      setError('');
      setDownloadMessage('');
      try {
        const loadedCandidates = await getJobCandidates(selectedJobId);
        if (!cancelled) setCandidates(loadedCandidates);
      } catch (loadError) {
        if (!cancelled) {
          setCandidates([]);
          setError(loadError.message || 'Could not load report candidates.');
        }
      } finally {
        if (!cancelled) setLoadingCandidates(false);
      }
    };

    loadCandidates();
    return () => {
      cancelled = true;
    };
  }, [selectedJobId]);

  const selectedJob = jobs.find((job) => job.id === selectedJobId) || null;
  const rankedCandidates = useMemo(
    () => completedCandidates(candidates),
    [candidates]
  );
  const excludedCounts = useMemo(
    () =>
      candidates.reduce(
        (counts, candidate) => {
          const status = candidate.status;
          if (status in counts) counts[status] += 1;
          return counts;
        },
        { pending: 0, processing: 0, failed: 0 }
      ),
    [candidates]
  );
  const previewColumns = useMemo(
    () => [
      { key: 'name', label: 'Candidate' },
      ...reportFieldOptions
        .filter((field) => selectedFields.has(field.key))
        .flatMap((field) => field.previewColumns),
    ],
    [selectedFields]
  );

  const toggleField = (field) => {
    setSelectedFields((current) => {
      const next = new Set(current);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  const handleDownload = async () => {
    if (!selectedJob || downloading) return;
    setDownloading(true);
    setError('');
    setDownloadMessage('');
    try {
      const { blob, filename } = await getJobExcelReport(
        selectedJob.id,
        Array.from(selectedFields)
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setDownloadMessage('Excel report downloaded successfully.');
    } catch (downloadError) {
      setError(downloadError.message || 'The report could not be downloaded.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

      {/** Sidebar Left Column */}
      <div className="lg:col-span-4 space-y-6">
        {/** Active Job Postings section */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
            Active Job Postings
          </h3>

          {loadingJobs ? (
            <div className="p-4 bg-slate-50 rounded-xl text-center text-xs font-medium text-slate-400">
              Loading job postings...
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl text-center text-xs font-medium text-slate-400">
              No active job postings. Create a job first to view matching candidates.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
              {jobs.map((job) => {
                const selected = job.id === selectedJobId;
                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => {
                      setCandidates([]);
                      setSelectedJobId(job.id);
                    }}
                    className={`w-full text-left p-4 rounded-xl transition-all border flex flex-col gap-1.5 cursor-pointer ${
                      selected
                        ? 'border-blue-200 bg-blue-50/60 text-[#1D5BF2]'
                        : 'border-slate-100 hover:border-blue-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="font-extrabold text-sm leading-snug">
                        {job.title}
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-400 font-semibold block">
                      {job.candidate_count || 0} Applicant
                      {job.candidate_count === 1 ? '' : 's'} ·{' '}
                      {job.location || 'Remote'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/** Include in Report Section (Checkboxes) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
            Include in Report
          </h3>

          {/** Candidate Name always include in the report */}
          <div className="space-y-3 font-medium">
            <label className="flex items-center gap-3 text-sm text-slate-500 opacity-80 cursor-not-allowed">
              <div className="w-5 h-5 bg-[#1D5BF2] text-white rounded flex items-center justify-center border border-[#1D5BF2]">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <span>Candidate Name</span>
            </label>

            {reportFieldOptions.map((field) => (
              <label
                key={field.key}
                className="flex items-center gap-3 text-sm text-slate-700 hover:text-[#1D5BF2] cursor-pointer"
              >
                <input
                  id={`checkbox-${field.key}`}
                  type="checkbox"
                  checked={selectedFields.has(field.key)}
                  onChange={() => toggleField(field.key)}
                  className="w-5 h-5 rounded border-slate-200 text-[#1D5BF2] focus:ring-[#1D5BF2]"
                />
                <span>{field.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/** Main Content Right Column */}
      <div className="lg:col-span-8 space-y-6">

        {/** Header Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col xl:flex-row xl:flex-wrap items-start xl:items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
              Report Focus
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5 break-words" id="report-focus-title">
              Candidate Comparison: {selectedJob?.title || 'No Job Selected'}
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 w-full xl:w-auto self-stretch xl:self-auto">
            <div
              className="flex items-center gap-1.5 text-xs font-semibold min-w-0"
              aria-label="Report ranking order"
            >
              <span className="text-slate-400 shrink-0">Sorted by:</span>
              <span className="text-slate-600">Match Score (Highest)</span>
            </div>

            <button
              id="download-report-btn"
              type="button"
              onClick={handleDownload}
              disabled={!selectedJob || downloading}
              className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-[#1D5BF2] hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>{downloading ? 'Generating...' : 'Download Report'}</span>
            </button>
          </div>
        </div>
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {downloadMessage ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {downloadMessage}
          </div>
        ) : null}

        {!selectedJob ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center" id="report-no-job-state">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-lg font-bold text-slate-700">
              No Job Posting Chosen
            </h4>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              Select a job posting to generate a candidate report.
            </p>
          </div>
        ) : loadingCandidates ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-pulse" />
            <p className="text-sm font-semibold text-slate-400">
              Loading report candidates...
            </p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center" id="report-empty-state">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-lg font-bold text-slate-700">
              No Candidates Assigned
            </h4>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              There are currently no candidates assigned to this job.
            </p>
          </div>
        ) : rankedCandidates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-lg font-bold text-slate-700">
              No Completed Analysis Yet
            </h4>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Pending, processing, and failed candidates are excluded from the ranked report.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="report-results-table">
            <div className="px-6 py-3 border-b border-slate-100 text-xs font-semibold text-slate-500">
              Ranked candidates: {rankedCandidates.length} · Excluded — Pending:{' '}
              {excludedCounts.pending}, Processing: {excludedCounts.processing}, Failed:{' '}
              {excludedCounts.failed}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                    {previewColumns.map((column) => (
                      <th key={column.key} className="px-6 py-4.5">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {rankedCandidates.map((candidate) => {
                    const initials = (candidate.name || 'Candidate')
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0].toUpperCase())
                      .join('');
                    return (
                      <tr key={candidate.id} className="hover:bg-slate-50/50 transition-colors">
                        {previewColumns.map((column) => {
                          if (column.key === 'name') {
                            return (
                              <td key={column.key} className="px-6 py-4.5">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-blue-50 text-[#1D5BF2] border border-blue-100 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                    {initials}
                                  </div>
                                  <h4 className="font-extrabold text-slate-900 leading-tight">
                                    {candidate.name || 'Unnamed Candidate'}
                                  </h4>
                                </div>
                              </td>
                            );
                          }

                          if (column.key === 'match_score') {
                            const score = Math.min(
                              100,
                              Math.max(0, candidate.match_score)
                            );
                            return (
                              <td key={column.key} className="px-6 py-4.5">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-12 bg-slate-100 h-2 rounded-full overflow-hidden shrink-0">
                                    <div
                                      className="h-full rounded-full bg-[#1D5BF2]"
                                      style={{ width: `${score}%` }}
                                    />
                                  </div>
                                  <span className="font-mono font-bold text-xs text-slate-600">
                                    {displayScore(candidate.match_score)}
                                  </span>
                                </div>
                              </td>
                            );
                          }

                          if (column.key === 'recruitment_status') {
                            return (
                              <td key={column.key} className="px-6 py-4.5">
                                <span className="inline-block px-2.5 py-1 rounded-full text-[9px] font-extrabold font-mono uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200">
                                  {(candidate.recruitment_status || 'new').replaceAll('_', ' ')}
                                </span>
                              </td>
                            );
                          }

                          const isScore = column.key.endsWith('_score');
                          return (
                            <td
                              key={column.key}
                              className="px-6 py-4.5 text-slate-500 font-medium max-w-xs"
                            >
                              <span className="block truncate">
                                {isScore
                                  ? displayScore(candidate[column.key])
                                  : displayValue(candidate[column.key])}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  
  )}
