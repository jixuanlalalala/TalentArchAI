import { useMemo, useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import CandidateDetailsPanel from './CandidateDetailsPanel';
import CandidateTable from './CandidateTable';
import {
    getJobCandidate,
    retryCandidateAnalysis,
    unlinkCandidateFromJob,
    updateRecruitmentStatus,
} from '../services/candidateService';
import { rankJobCandidates } from '../utils/jobCandidateAnalysis';

export default function JobCandidateAnalysis({
    jobId,
    candidates,
    onUpload,
    onCandidatesChanged,
    highlightedCandidateIds,
}) {
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [detailError, setDetailError] = useState('');
    const [actionError, setActionError] = useState('');
    const [actionCandidateId, setActionCandidateId] = useState(null);
    const detailRequestId = useRef(0);
    const rankedCandidates = useMemo(
        () => rankJobCandidates(candidates),
        [candidates]
    );

    const handleCandidateSelect = async (candidate) => {
        const requestId = detailRequestId.current + 1;
        detailRequestId.current = requestId;
        setSelectedCandidate(candidate);
        setDetailError('');
        setLoadingDetails(true);

        try {
            const detail = await getJobCandidate(jobId, candidate.id);
            if (detailRequestId.current === requestId && detail) {
                setSelectedCandidate(detail);
            }
        } catch (error) {
            if (detailRequestId.current === requestId) {
                setDetailError(
                    error.message || 'Could not load candidate details.'
                );
            }
        } finally {
            if (detailRequestId.current === requestId) {
                setLoadingDetails(false);
            }
        }
    };

    const closeDetails = () => {
        detailRequestId.current += 1;
        setSelectedCandidate(null);
        setLoadingDetails(false);
        setDetailError('');
        setActionError('');
    };

    const refreshCandidates = async () => {
        if (onCandidatesChanged) await onCandidatesChanged();
    };

    const handleRecruitmentStatusChange = async (
        candidate,
        recruitmentStatus
    ) => {
        if (candidate.recruitment_status === recruitmentStatus) return;
        setActionCandidateId(candidate.id);
        setActionError('');
        try {
            const updated = await updateRecruitmentStatus(
                jobId,
                candidate.id,
                recruitmentStatus
            );
            if (updated && selectedCandidate?.id === candidate.id) {
                setSelectedCandidate((current) => ({
                    ...current,
                    recruitment_status: updated.recruitment_status,
                }));
            }
            await refreshCandidates();
        } catch (error) {
            setActionError(
                error.message || 'Could not update recruitment status.'
            );
        } finally {
            setActionCandidateId(null);
        }
    };

    const handleRetryAnalysis = async (candidate) => {
        setActionCandidateId(candidate.id);
        setActionError('');
        try {
            const updated = await retryCandidateAnalysis(jobId, candidate.id);
            if (updated) {
                setSelectedCandidate((current) => ({
                    ...current,
                    status: updated.status,
                    match_score: updated.match_score,
                    education_score: updated.education_score,
                    hard_skill_score: updated.hard_skill_score,
                    soft_skill_score: updated.soft_skill_score,
                    work_experience_score:
                        updated.work_experience_score,
                    gap_analysis: updated.gap_analysis,
                    matched_skills: updated.matched_skills,
                    missing_skills: updated.missing_skills,
                    summary: updated.summary,
                    processing_started_at:
                        updated.processing_started_at,
                    analysis_error: updated.analysis_error,
                }));
            }
            await refreshCandidates();
        } catch (error) {
            setActionError(error.message || 'Could not retry the analysis.');
        } finally {
            setActionCandidateId(null);
        }
    };

    const handleUnlinkCandidate = async (candidate) => {
        const confirmed = window.confirm(
            'Remove this candidate from the selected job? The candidate and resume will remain in the Candidate Database.'
        );
        if (!confirmed) return;

        setActionCandidateId(candidate.id);
        setActionError('');
        try {
            await unlinkCandidateFromJob(jobId, candidate.id);
            closeDetails();
            await refreshCandidates();
        } catch (error) {
            setActionError(
                error.message || 'Could not remove the candidate from this job.'
            );
        } finally {
            setActionCandidateId(null);
        }
    };

    return (
        <>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h3 className="font-extrabold text-slate-900">
                            Candidate Analysis
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            {candidates.length} candidate
                            {candidates.length === 1 ? '' : 's'} linked to this
                            job posting
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onUpload}
                        className="flex items-center justify-center gap-2 bg-[#1D5BF2] hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                    >
                        <UploadCloud className="w-4 h-4" />
                        <span>Upload Resume</span>
                    </button>
                </div>

                {actionError && !selectedCandidate ? (
                    <div className="mx-6 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {actionError}
                    </div>
                ) : null}

                <CandidateTable
                    candidates={rankedCandidates}
                    onCandidateSelect={handleCandidateSelect}
                    onRecruitmentStatusChange={handleRecruitmentStatusChange}
                    updatingCandidateId={actionCandidateId}
                    highlightedCandidateIds={highlightedCandidateIds}
                />
            </div>

            <CandidateDetailsPanel
                candidate={selectedCandidate}
                isLoading={loadingDetails}
                error={detailError || actionError}
                onClose={closeDetails}
                onRecruitmentStatusChange={(status) =>
                    handleRecruitmentStatusChange(selectedCandidate, status)
                }
                onRetryAnalysis={() =>
                    handleRetryAnalysis(selectedCandidate)
                }
                onUnlink={() => handleUnlinkCandidate(selectedCandidate)}
                isActionPending={
                    actionCandidateId === selectedCandidate?.id
                }
            />
        </>
    );
}
