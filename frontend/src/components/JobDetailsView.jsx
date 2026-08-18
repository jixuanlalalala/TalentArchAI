import { useRef } from 'react';
import {
    ArrowLeft,
    Check,
    CheckCircle2,
    ChevronRight,
    LoaderCircle,
    UploadCloud,
} from 'lucide-react';
import JobAnalysisStatistics from './JobAnalysisStatistics';
import JobCandidateAnalysis from './JobCandidateAnalysis';
import { MATCHING_PRIORITY_FIELDS } from '../utils/matchingPriorities';

export default function JobDetailsView({
    job,
    matchingPriorities,
    candidates,
    isLoadingCandidates,
    candidateError,
    highlightedCandidateIds,
    onRefreshCandidates,
    onUpload,
    onBack,
    onViewReport,
    upload,
    analysis,
}) {
    const candidateResultsRef = useRef(null);

    const handleViewAnalysisResults = () => {
        candidateResultsRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
        candidateResultsRef.current?.focus({ preventScroll: true });
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <span className="bg-blue-50 text-[#1D5BF2] text-[10px] font-bold px-2.5 py-1 rounded-full font-mono uppercase tracking-wider">
                    {job.type}
                </span>
                <span className="text-sm text-slate-500">
                    {job.location || 'Remote'}
                </span>
                {job.salary_min || job.salary_max ? (
                    <span className="text-sm font-semibold text-slate-700">
                        RM{' '}
                        {[job.salary_min || '', job.salary_max || '']
                            .filter(Boolean)
                            .join(' - ')}
                    </span>
                ) : null}
            </div>

            <div>
                <h3 className="text-2xl font-extrabold text-slate-900">
                    {job.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                    {job.description || 'No description provided.'}
                </p>
            </div>

            {Array.isArray(job.required_skills) &&
            job.required_skills.length > 0 ? (
                <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                        Required Skills
                    </h4>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {job.required_skills.map((skill, index) => (
                            <span
                                key={index}
                                className="bg-slate-50 border border-slate-200/60 rounded-md text-[10px] font-bold text-slate-600 px-2 py-0.5 font-mono"
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            ) : null}

            <JobAnalysisStatistics
                candidates={candidates}
                isLoading={isLoadingCandidates}
                error={candidateError}
            />

            {upload.isProcessing ? (
                <div
                    role="status"
                    aria-live="polite"
                    className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 flex items-start gap-3"
                >
                    <LoaderCircle className="w-5 h-5 text-[#1D5BF2] shrink-0 mt-0.5 animate-spin" />
                    <div>
                        <p className="text-sm font-extrabold text-slate-900">
                            Uploading and extracting {upload.fileCount} resume
                            {upload.fileCount === 1 ? '' : 's'}...
                        </p>
                        <p className="text-xs font-medium text-slate-500 mt-1">
                            Candidate profiles will appear here automatically as
                            extraction completes. Job-specific AI analysis runs
                            in the background.
                        </p>
                    </div>
                </div>
            ) : null}

            {analysis.isActive ? (
                <div
                    role="status"
                    aria-live="polite"
                    className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                    <div className="flex items-start gap-3">
                        <LoaderCircle className="w-5 h-5 text-[#1D5BF2] shrink-0 mt-0.5 animate-spin" />
                        <div>
                            <p className="text-sm font-extrabold text-slate-900">
                                Analysing {analysis.activeCount} resume
                                {analysis.activeCount === 1 ? '' : 's'}...
                            </p>
                            <p className="text-xs font-medium text-slate-500 mt-1">
                                You may continue using the system. Results will
                                update automatically. {analysis.processingCount}{' '}
                                processing, {analysis.pendingCount} pending.
                            </p>
                        </div>
                    </div>
                </div>
            ) : analysis.completionSummary ? (
                <div
                    role="status"
                    aria-live="polite"
                    className={`rounded-2xl border px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                        analysis.completionSummary.failedCount > 0
                            ? 'border-amber-200 bg-amber-50'
                            : 'border-emerald-200 bg-emerald-50'
                    }`}
                >
                    <div className="flex items-start gap-3">
                        <CheckCircle2
                            className={`w-5 h-5 shrink-0 mt-0.5 ${
                                analysis.completionSummary.failedCount > 0
                                    ? 'text-amber-600'
                                    : 'text-emerald-600'
                            }`}
                        />
                        <div>
                            <p className="text-sm font-extrabold text-slate-900">
                                Resume analysis completed
                            </p>
                            <p className="text-xs font-medium text-slate-600 mt-1">
                                {analysis.completionSummary.completedCount}{' '}
                                candidate
                                {analysis.completionSummary.completedCount === 1
                                    ? ' was'
                                    : 's were'}{' '}
                                analysed successfully.{' '}
                                {analysis.completionSummary.failedCount}{' '}
                                {analysis.completionSummary.failedCount === 1
                                    ? 'analysis'
                                    : 'analyses'}{' '}
                                failed.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={handleViewAnalysisResults}
                            className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                        >
                            View Results
                        </button>
                        <button
                            type="button"
                            onClick={analysis.dismissCompletion}
                            className="text-slate-500 hover:text-slate-700 text-xs font-bold px-2 py-2.5 transition-colors cursor-pointer"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            ) : null}

            <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    Matching Priorities
                </h4>
                <div className="mt-3 flex flex-wrap gap-2">
                    {MATCHING_PRIORITY_FIELDS.map(({ key, label }) => (
                        <span
                            key={key}
                            className="bg-slate-50 border border-slate-200/60 rounded-md text-[10px] font-bold text-slate-600 px-2 py-1"
                        >
                            {label}: {matchingPriorities[key]}%
                        </span>
                    ))}
                </div>
            </div>

            {isLoadingCandidates ? (
                <div className="py-16 text-center text-sm font-semibold text-slate-400">
                    Loading candidates...
                </div>
            ) : candidateError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {candidateError}
                </div>
            ) : candidates.length > 0 ? (
                <div
                    ref={candidateResultsRef}
                    tabIndex={-1}
                    className="scroll-mt-6 focus:outline-none"
                >
                    <JobCandidateAnalysis
                        jobId={job.id}
                        candidates={candidates}
                        onUpload={onUpload}
                        onCandidatesChanged={onRefreshCandidates}
                        highlightedCandidateIds={highlightedCandidateIds}
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-white border-2 border-dashed rounded-3xl p-16 text-center flex flex-col items-center justify-center transition-all cursor-pointer border-slate-200 hover:border-blue-400 hover:bg-slate-50/30">
                        <div className="w-16 h-16 bg-blue-50 border border-blue-100 text-[#1D5BF2] rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                            <UploadCloud className="w-8 h-8" />
                        </div>

                        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
                            No resume analysis
                        </h3>

                        <p className="text-sm text-slate-500 max-w-md leading-relaxed font-medium mb-8">
                            Start to upload resumes
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
                            <button
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onUpload();
                                }}
                                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 bg-[#1D5BF2] hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/10 cursor-pointer"
                            >
                                <span>+ Select Resumes</span>
                            </button>

                            <button
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onUpload();
                                }}
                                className="w-full sm:w-auto flex-1 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-6 rounded-xl transition-all cursor-pointer"
                            >
                                <span>Drag & Drop Files</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-6 mt-8 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                            <div className="flex items-center gap-1.5">
                                <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                                <span>PDF, DOCX SUPPORTED</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                                <span>MAX 20MB PER FILE</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to job list</span>
                </button>
                <button
                    onClick={() => onViewReport?.(job.id)}
                    className="flex items-center gap-2 bg-[#1D5BF2] hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                    <span>View Report</span>
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
