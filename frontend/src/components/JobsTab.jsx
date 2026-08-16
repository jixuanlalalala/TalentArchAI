/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    ChevronRight,
    Download,
    PlusCircle,
} from 'lucide-react';
import CreateJobModal from './CreateJobModal';
import JobDetailsView from './JobDetailsView';
import JobPostingsList from './JobPostingsList';
import MatchingCandidatesModal from './MatchingCandidatesModal';
import UploadResumesModal from './UploadResumesModal';
import ToastContainer from './ToastContainer';
import {
    createJob,
    deleteJob,
    getJobs,
} from '../services/jobService';
import useCandidateRediscovery from '../hooks/useCandidateRediscovery';
import useJobAnalysisWorkflow from '../hooks/useJobAnalysisWorkflow';
import {
    createDefaultMatchingPriorities,
    matchingPrioritiesFromJob,
} from '../utils/matchingPriorities';

const createInitialJobForm = () => ({
    title: '',
    salaryMin: '',
    salaryMax: '',
    type: 'Full-time',
    location: '',
    skills: '',
    description: '',
    matchingPriorities: createDefaultMatchingPriorities(),
});

export default function JobsTab({
    onNavigateToJobList,
    onViewReport,
}) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [jobs, setJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [jobsError, setJobsError] = useState('');
    const [showCreateJobModal, setShowCreateJobModal] = useState(false);
    const selectedJobId = searchParams.get('job');
    const selectedJob = jobs.find((job) => job.id === selectedJobId);
    const selectedJobMatchingPriorities = useMemo(
        () => matchingPrioritiesFromJob(selectedJob),
        [selectedJob]
    );
    const [jobForm, setJobForm] = useState(createInitialJobForm);

    const setSelectedJobInUrl = useCallback(
        (jobId) => {
            setSearchParams(
                (currentParams) => {
                    const nextParams = new URLSearchParams(currentParams);
                    if (jobId) nextParams.set('job', jobId);
                    else nextParams.delete('job');
                    return nextParams;
                },
                { replace: true }
            );
        },
        [setSearchParams]
    );

    const updateCandidateCount = useCallback((jobId, candidateCount) => {
        setJobs((currentJobs) =>
            currentJobs.map((job) =>
                job.id === jobId
                    ? { ...job, candidate_count: candidateCount }
                    : job
            )
        );
    }, []);

    const jobAnalysis = useJobAnalysisWorkflow({
        selectedJobId,
        selectedJobTitle: selectedJob?.title,
        onCandidateCountChange: updateCandidateCount,
    });
    const jobCandidates = jobAnalysis.candidates.items;
    const loadingJobCandidates = jobAnalysis.candidates.isLoading;
    const jobCandidatesError = jobAnalysis.candidates.error;
    const highlightedCandidateIds = jobAnalysis.candidates.highlightedIds;
    const refreshSelectedJobCandidates = jobAnalysis.candidates.refresh;
    const loadLinkedCandidates = jobAnalysis.candidates.loadLinked;
    const pendingCount = jobAnalysis.analysis.pendingCount;
    const processingCount = jobAnalysis.analysis.processingCount;
    const activeAnalysisCount = jobAnalysis.analysis.activeCount;
    const hasActiveAnalysis = jobAnalysis.analysis.isActive;
    const analysisCompletionSummary =
        jobAnalysis.analysis.completionSummary;
    const uploadSuccessMessage = jobAnalysis.upload.successMessage;
    const toastNotifications = jobAnalysis.notifications.items;
    const openUploadModal = jobAnalysis.upload.open;

    const handleCandidatesLinked = useCallback(
        async (jobId) => {
            const refreshedJobs = await getJobs();
            setJobs(refreshedJobs || []);
            setSelectedJobInUrl(jobId);
            await loadLinkedCandidates(jobId);
        },
        [loadLinkedCandidates, setSelectedJobInUrl]
    );

    const rediscovery = useCandidateRediscovery({
        onCandidatesLinked: handleCandidatesLinked,
    });

    const openCreateJobModal = () => {
        setJobForm(createInitialJobForm());
        setShowCreateJobModal(true);
    };

    useEffect(() => {
        let isMounted = true;

        const loadJobs = async () => {
            try {
                const fetchedJobs = await getJobs();
                if (isMounted) {
                    setJobs(fetchedJobs || []);
                }
            } catch (err) {
                if (isMounted) {
                    setJobsError(err.message || 'Could not load job postings');
                }
            } finally {
                if (isMounted) {
                    setLoadingJobs(false);
                }
            }
        };

        loadJobs();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleCreateJob = async (e) => {
        e.preventDefault();

        const newJobData = {
            title: jobForm.title,
            salaryMin: jobForm.salaryMin,
            salaryMax: jobForm.salaryMax,
            type: jobForm.type,
            location: jobForm.location || 'Remote',
            skills: jobForm.skills ? jobForm.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
            description: jobForm.description,
            matchingPriorities: jobForm.matchingPriorities,
        };

        try {
            const createdJob = await createJob(newJobData);
            setShowCreateJobModal(false);
            setJobForm(createInitialJobForm());
            const refreshedJobs = await getJobs();
            setJobs(refreshedJobs || []);
            jobAnalysis.closeJob();
            setSelectedJobInUrl(null);
            await rediscovery.discoverForJob(createdJob);
        } catch (err) {
            console.error(err);
        }

    };

    const handleDeleteJob = async (id) => {
        if (window.confirm('Are you sure you want to delete this job postings?')) {
            try {
                await deleteJob(id);
                const refreshedJobs = await getJobs();
                setJobs(refreshedJobs || []);
                if (selectedJobId === id) {
                    jobAnalysis.closeJob();
                    setSelectedJobInUrl(null);
                }
            } catch (err) {
                console.error('Delete failed', err);
            }
        }
    };

    const handleJobCardClick = (jobId) => {
        jobAnalysis.openJob(jobId);
        setSelectedJobInUrl(jobId);
    };

    const handleBackToList = () => {
        jobAnalysis.closeJob();
        onNavigateToJobList();
    };

    const handleExportReport = () => {
        onViewReport(null);
    };

    return (
        <div className="space-y-6">
            {/**Heading */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 mb-2">
                        {selectedJob ? (
                            <>
                                <button
                                    type="button"
                                    onClick={handleBackToList}
                                    className="hover:text-[#1D5BF2] transition-colors cursor-pointer"
                                >
                                    Job Postings
                                </button>
                                <ChevronRight className="w-4 h-4" />
                                <span className="text-slate-700">{selectedJob.title}</span>
                            </>
                        ) : (
                            <span>Job Postings</span>
                        )}
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight" id="job-postings-title">
                        {selectedJob ? 'Job Details' : 'Job Postings'}
                    </h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                        {selectedJob ? 'Review the selected job posting details.' : 'Manage and track your active job postings'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {selectedJob ? (
                        <button
                            onClick={handleBackToList}
                            className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4 text-slate-500" />
                            <span>Back</span>
                        </button>
                    ) : (
                        <>
                            <button
                                id="export-report-btn"
                                onClick={handleExportReport}
                                className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                            >
                                <Download className="w-4 h-4 text-slate-500"></Download>
                                <span>Export Report</span>
                            </button>

                            <button
                                id="create-job-btn"
                                onClick={openCreateJobModal}
                                className="flex items-center gap-2 bg-[#1D5BF2] hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                            >
                                <PlusCircle className="w-4.5 h-4.5"></PlusCircle>
                                <span>Create Job</span>
                            </button>
                        </>
                    )}
                </div>
            </div>


            {/** Job Listings */}
            {jobsError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{jobsError}</div>
            ) : null}

            {uploadSuccessMessage ? (
                <div
                    role="status"
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                >
                    {uploadSuccessMessage}
                </div>
            ) : null}

            {selectedJob ? (
                <JobDetailsView
                    job={selectedJob}
                    matchingPriorities={selectedJobMatchingPriorities}
                    candidates={jobCandidates}
                    isLoadingCandidates={loadingJobCandidates}
                    candidateError={jobCandidatesError}
                    highlightedCandidateIds={highlightedCandidateIds}
                    onRefreshCandidates={refreshSelectedJobCandidates}
                    onUpload={openUploadModal}
                    onBack={handleBackToList}
                    onViewReport={onViewReport}
                    analysis={{
                        pendingCount,
                        processingCount,
                        activeCount: activeAnalysisCount,
                        isActive: hasActiveAnalysis,
                        completionSummary: analysisCompletionSummary,
                        dismissCompletion:
                            jobAnalysis.analysis.dismissCompletion,
                    }}
                />
            ) : (
                <JobPostingsList
                    jobs={jobs}
                    isLoading={loadingJobs}
                    onCreate={openCreateJobModal}
                    onSelect={handleJobCardClick}
                    onDelete={handleDeleteJob}
                />
            )}

            {showCreateJobModal ? (
                <CreateJobModal
                    isOpen
                    onClose={() => setShowCreateJobModal(false)}
                    onSubmit={handleCreateJob}
                    jobForm={jobForm}
                    setJobForm={setJobForm}
                />
            ) : null}

            {rediscovery.modal.isOpen ? (
                <MatchingCandidatesModal
                    isOpen
                    onClose={rediscovery.modal.close}
                    onAddCandidates={rediscovery.modal.addCandidates}
                    matchingCandidates={rediscovery.modal.candidates}
                    isAdding={rediscovery.modal.isAdding}
                    error={rediscovery.modal.error}
                />
            ) : null}

            <UploadResumesModal
                isOpen={jobAnalysis.upload.isOpen}
                onClose={jobAnalysis.upload.close}
                jobId={selectedJobId}
                onUploadComplete={jobAnalysis.upload.handleComplete}
                onUploadFailure={jobAnalysis.upload.handleFailure}
            />

            <ToastContainer
                notifications={toastNotifications}
                onDismiss={jobAnalysis.notifications.dismiss}
            />
        </div>
    );
}
