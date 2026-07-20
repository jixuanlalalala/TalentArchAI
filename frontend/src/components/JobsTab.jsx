/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Briefcase, Download, PlusCircle, ChevronRight, Trash2, MapPin, Users } from 'lucide-react';
import CreateJobModal from './CreateJobModal';
import { useNavigate } from 'react-router-dom';
import { createJob, getJobs, getJobById, deleteJob } from '../services/jobService';

export default function JobsTab({
    onViewReport,
}) {
    const navigate = useNavigate();

    const [jobs, setJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [jobsError, setJobsError] = useState('');
    const [showCreateJobModal, setShowCreateJobModal] = useState(false);

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
                console.log('Fetched jobs from backend:', fetchedJobs);
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
        }

        try {
            const payload = {
                ...newJobData,
            };

            const result = await createJob(payload);
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
        } catch (err) {
            console.error(err);
        }
        
        
    };

    const handleDeleteJob = async (id) => {
        if (window.confirm('Are you sure you want to delete this job postings?')) {
            try {
                await deleteJob(id);
                window.location.reload();
                showToast('Job posting deleted');
            } catch (err) {
                showToast("Delete failed");
            }
        } else {

        }
    };

    const handleExportReport = () => {
        onViewReport(null);
    };


    
    return (
        <div className="space-y-6">
            {/**Heading */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight" id="job-postings-title">
                        Job Postings
                    </h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                        Manage and track your active job postings
                    </p>
                </div>

                <div className="flex items-center gap-3">
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
                </div>
            </div>


            {/** Job Listings */}
            {jobsError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{jobsError}</div>
            ) : null}

            {loadingJobs ? (
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

                        return (
                            <div
                                key={job.id}
                                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col justify-between"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                        <span className="bg-blue-50 text-[#1D5BF2] text-[10px] font-bold px-2.5 py-1 rounded-full font-mono uppercase tracking-wider">
                                            {job.type}
                                        </span>
                                        <button
                                            id={`delete-job-${job.id}`}
                                            onClick={() => handleDeleteJob(job.id)}
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
                                            0 Candidates
                                        </span>
                                    </div>

                                    <button
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
        </div>
        
    );
}
