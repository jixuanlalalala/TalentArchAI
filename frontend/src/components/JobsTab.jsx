/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Briefcase, Download, PlusCircle, ChevronRight, Trash2, MapPin, Users, ArrowLeft, UploadCloud, Check } from 'lucide-react';
import CreateJobModal from './CreateJobModal';
import UploadResumesModal from './UploadResumesModal';
import JobCandidateAnalysis from './JobCandidateAnalysis';
import { getJobCandidates } from '../services/candidateService';
import { createJob, getJobs, deleteJob } from '../services/jobService';

export default function JobsTab({
    onViewReport,
}) {
    const [jobs, setJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [jobsError, setJobsError] = useState('');
    const [showCreateJobModal, setShowCreateJobModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [jobCandidates, setJobCandidates] = useState([]);
    const [loadingJobCandidates, setLoadingJobCandidates] = useState(false);
    const [jobCandidatesError, setJobCandidatesError] = useState('');
    const selectedJob = jobs.find((job) => job.id === selectedJobId);

    const [jobForm, setJobForm] = useState({
        title: '',
        salaryMin: '',
        salaryMax: '',
        type: 'Full-time',
        location: '',
        skills: '',
        description: ''
    });

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

    useEffect(() => {
        let isMounted = true;

        if (!selectedJobId) {
            return () => {
                isMounted = false;
            };
        }

        const loadCandidates = async () => {
            setLoadingJobCandidates(true);
            setJobCandidatesError('');
            try {
                const candidates = await getJobCandidates(selectedJobId);
                if (isMounted) {
                    setJobCandidates(candidates);
                    setJobs((currentJobs) =>
                        currentJobs.map((job) =>
                            job.id === selectedJobId
                                ? {
                                      ...job,
                                      candidate_count: candidates.length,
                                  }
                                : job
                        )
                    );
                }
            } catch (error) {
                if (isMounted) {
                    setJobCandidates([]);
                    setJobCandidatesError(
                        error.message ||
                            'Could not load candidates for this job.'
                    );
                }
            } finally {
                if (isMounted) setLoadingJobCandidates(false);
            }
        };

        loadCandidates();
        return () => {
            isMounted = false;
        };
    }, [selectedJobId]);

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
        };

        try {
            await createJob(newJobData);
            setShowCreateJobModal(false);
            setJobForm({
                title: '',
                salaryMin: '',
                salaryMax: '',
                type: 'Full-time',
                location: '',
                skills: '',
                description: ''
            });
            const refreshedJobs = await getJobs();
            setJobs(refreshedJobs || []);
            setSelectedJobId(null);
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
                    setSelectedJobId(null);
                }
            } catch (err) {
                console.error('Delete failed', err);
            }
        }
    };

    const handleJobCardClick = (jobId) => {
        setJobCandidates([]);
        setJobCandidatesError('');
        setSelectedJobId(jobId);
    };

    const handleBackToList = () => {
        setSelectedJobId(null);
        setJobCandidates([]);
        setJobCandidatesError('');
    };

    const handleExportReport = () => {
        onViewReport(null);
    };

    const refreshSelectedJobCandidates = async () => {
        if (!selectedJobId) return;
        try {
            const candidates = await getJobCandidates(selectedJobId);
            setJobCandidates(candidates);
            setJobs((currentJobs) =>
                currentJobs.map((job) =>
                    job.id === selectedJobId
                        ? {
                              ...job,
                              candidate_count: candidates.length,
                          }
                        : job
                )
            );
            setJobCandidatesError('');
        } catch (error) {
            setJobCandidatesError(
                error.message || 'Could not refresh candidates for this job.'
            );
        }
    };



    return (
        <div className="space-y-6">
            {/**Heading */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 mb-2">
                        <span>Job Postings</span>
                        {selectedJob ? (
                            <>
                                <ChevronRight className="w-4 h-4" />
                                <span className="text-slate-700">{selectedJob.title}</span>
                            </>
                        ) : null}
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
                                onClick={() => setShowCreateJobModal(true)}
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

            {selectedJob ? (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="bg-blue-50 text-[#1D5BF2] text-[10px] font-bold px-2.5 py-1 rounded-full font-mono uppercase tracking-wider">
                            {selectedJob.type}
                        </span>
                        <span className="text-sm text-slate-500">
                            {selectedJob.location || 'Remote'}
                        </span>
                        {(selectedJob.salary_min || selectedJob.salary_max) ? (
                            <span className="text-sm font-semibold text-slate-700">
                                RM {[(selectedJob.salary_min || ''), (selectedJob.salary_max || '')].filter(Boolean).join(' - ')}
                            </span>
                        ) : null}
                    </div>

                    <div>
                        <h3 className="text-2xl font-extrabold text-slate-900">{selectedJob.title}</h3>
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                            {selectedJob.description || 'No description provided.'}
                        </p>
                    </div>

                    {Array.isArray(selectedJob.required_skills) && selectedJob.required_skills.length > 0 ? (
                        <div>
                            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Required Skills</h4>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {selectedJob.required_skills.map((skill, idx) => (
                                    <span key={idx} className="bg-slate-50 border border-slate-200/60 rounded-md text-[10px] font-bold text-slate-600 px-2 py-0.5 font-mono">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {/**Stats Row leave this after complete lah*/}
                    <div>

                    </div>

                    {/**Work Area */}
                    {loadingJobCandidates ? (
                        <div className="py-16 text-center text-sm font-semibold text-slate-400">
                            Loading candidates...
                        </div>
                    ) : jobCandidatesError ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {jobCandidatesError}
                        </div>
                    ) : jobCandidates.length > 0 ? (
                        <JobCandidateAnalysis
                            jobId={selectedJob.id}
                            candidates={jobCandidates}
                            onUpload={() => setShowUploadModal(true)}
                        />
                    ) : (
                    <div className="space-y-4">
                        <div className="bg-white border-2 border-dashed rounded-3xl p-16 text-center flex flex-col items-center justify-center transition-all cursor-pointer border-slate-200 hover:border-blue-400 hover:bg-slate-50/30">
                            <div className="w-16 h-16 bg-blue-50 border border-blue-100 text-[#1D5BF2] rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                                <UploadCloud className="w-8 h-8"/>
                            </div>

                            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
                                No resume analysis
                            </h3>

                            <p className="text-sm text-slate-500 max-w-md leading-relaxed font-medium mb-8">
                                Start to upload resumes
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
                                <button
                                    onClick={(e) => {e.stopPropagation(); setShowUploadModal(true)}}
                                    className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 bg-[#1D5BF2] hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/10 cursor-pointer"
                                >
                                    <span>+ Select Resumes</span>
                                </button>

                                <button
                                    onClick={(e) => {e.stopPropagation(); setShowUploadModal(true)}}
                                    className="w-full sm:w-auto flex-1 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-6 rounded-xl transition-all cursor-pointer"
                                >
                                    <span>Drag & Drop Files</span>
                                </button>
                            </div>

                            <div className="flex items-center gap-6 mt-8 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                                <div className="flex items-center gap-1.5">
                                    <Check className="w-4 h-4 text-emerald-500 stroke-[3]"  />
                                    <span>PDF, DOCX SUPPORTED</span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <Check className="w-4 h-4 text-emerald-500 stroke-[3]"  />
                                    <span>
                                        MAX 20MB PER FILE
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    )}

                    <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
                        <button
                            onClick={handleBackToList}
                            className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back to job list</span>
                        </button>
                        <button
                            onClick={() => onViewReport?.(selectedJob.id)}
                            className="flex items-center gap-2 bg-[#1D5BF2] hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                        >
                            <span>View Report</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ) : loadingJobs ? (
                <div className="text-center text-sm text-slate-500 py-8">Loading job postings...</div>
            ) : jobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center bg-white border border-slate-100 shadow-sm rounded-3xl p-16 max-w-lg mx-auto my-12" id="job-empty-state">
                    <div className="relative w-20 h-20 bg-[#F4F7FF] rounded-2xl flex items-center justify-center border border-blue-100">
                        <Briefcase className="text-[#1D5BF2] w-10 h-10" />
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mt-6 mb-2">
                        No job postings created
                    </h3>
                    <p className="text-sm text-slate-500 text-center max-w-sm font-medium leading-relaxed mb-6">
                        Your workspace is quite. Start by creating your first job posting
                    </p>

                    <button
                        id="create-first-job-btn"
                        onClick={() => setShowCreateJobModal(true)}
                        className="flex items-center justify-center gap-2 bg-[#1D5BF2] hover:bg-blue-700 text-white text-sm font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/10 active:scale-[0.98] cursor-pointer"
                    >
                        <span>Create your first job</span>
                        <ChevronRight className="w-4 h-4" />
                    </button>

                    <div className="w-full border-t border-slate-100 my-6"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {jobs.map((job) => {
                        const salaryText = [job.salary_min, job.salary_max].filter(Boolean).join(' - ');
                        const skills = Array.isArray(job.required_skills) ? job.required_skills : [];
                        const candidateCount = job.candidate_count ?? 0;

                        return (
                            <div
                                key={job.id}
                                onClick={() => handleJobCardClick(job.id)}
                                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col justify-between cursor-pointer"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                        <span className="bg-blue-50 text-[#1D5BF2] text-[10px] font-bold px-2.5 py-1 rounded-full font-mono uppercase tracking-wider">
                                            {job.type}
                                        </span>
                                        <button
                                            id={`delete-job-${job.id}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteJob(job.id);
                                            }}
                                            className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                                            title="Delete Job"
                                        >
                                            <Trash2 className="w-4.5 h-4.5" />
                                        </button>
                                    </div>

                                    <div>
                                        <h4 className="font-extrabold text-lg text-slate-900 leading-tight">
                                            {job.title}
                                        </h4>
                                        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold mt-1.5">
                                            <MapPin className="w-3.5 h-3.5" />
                                            <span>{job.location || 'Remote'}</span>
                                            {salaryText ? <>
                                                <span className="text-slate-300">•</span>
                                                <span className="font-mono">RM {salaryText}</span>
                                            </> : null}
                                        </div>
                                    </div>

                                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 font-medium">
                                        {job.description || 'No description provided.'}
                                    </p>

                                    {skills.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {skills.map((skill, idx) => (
                                                <span key={idx} className="bg-slate-50 border border-slate-200/60 rounded-md text-[10px] font-bold text-slate-600 px-2 py-0.5 font-mono">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-slate-100 mt-5 pt-4 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Users className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-500">
                                            {candidateCount} Candidate{candidateCount === 1 ? '' : 's'}
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => handleJobCardClick(job.id)}
                                        className="text-[#1D5BF2] hover:text-blue-700 text-xs font-bold flex items-center gap-1"
                                    >
                                        <span>Upload Resumes</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <CreateJobModal
                isOpen={showCreateJobModal}
                onClose={() => setShowCreateJobModal(false)}
                onSubmit={handleCreateJob}
                jobForm={jobForm}
                setJobForm={setJobForm}
            />

            <UploadResumesModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                jobId={selectedJobId}
                onUploadComplete={refreshSelectedJobCandidates}
            />
        </div>
    );
}
