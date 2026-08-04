import { useEffect } from 'react';
import {
    Archive,
    BriefcaseBusiness,
    Code2,
    FileText,
    GraduationCap,
    HeartHandshake,
    Mail,
    MapPin,
    Phone,
    Star,
    UserRound,
    X,
} from 'lucide-react';

const analysisItems = [
    {
        label: 'Match Score',
        field: 'match_score',
        icon: FileText,
    },
    {
        label: 'Education',
        field: 'education_score',
        icon: GraduationCap,
    },
    {
        label: 'Hard Skills',
        field: 'hard_skill_score',
        icon: Code2,
    },
    {
        label: 'Soft Skills',
        field: 'soft_skill_score',
        icon: HeartHandshake,
    },
    {
        label: 'Work Experience',
        field: 'work_experience_score',
        icon: BriefcaseBusiness,
    },
];

const statusClasses = {
    pending: 'bg-blue-50 text-[#1D5BF2] border-blue-100',
    processing: 'bg-amber-50 text-amber-700 border-amber-100',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    failed: 'bg-rose-50 text-rose-700 border-rose-100',
};

const displayValue = (value) => value || '--';

const scoreDisplay = (score, status) => {
    if (typeof score !== 'number' || !Number.isFinite(score)) {
        return {
            label:
                status === 'pending' || status === 'processing'
                    ? 'Pending Analysis'
                    : status === 'failed'
                      ? 'Failed'
                      : '--',
            width: 0,
        };
    }
    const boundedScore = Math.min(100, Math.max(0, score));
    return { label: `${score}%`, width: boundedScore };
};

export default function CandidateDetailsPanel({
    candidate,
    isLoading,
    error,
    onClose,
}) {
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!candidate) return null;

    const status = String(
        candidate.status || candidate.extraction_status || 'pending'
    ).toLowerCase();
    const statusClass =
        statusClasses[status] ||
        'bg-slate-50 text-slate-600 border-slate-200';
    const hasExtractedProfile = [
        'education',
        'hard_skills',
        'soft_skills',
        'work_experience',
    ].some((field) => Array.isArray(candidate[field]));
    const hasAppliedJobs = Array.isArray(candidate.applied_jobs);

    return (
        <div
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <aside
                role="dialog"
                aria-modal="true"
                aria-labelledby="candidate-details-title"
                className="h-full w-full max-w-xl bg-white shadow-2xl border-l border-slate-100 overflow-y-auto animate-slide-in-right"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4.5 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Candidate Details
                        </p>
                        <h2
                            id="candidate-details-title"
                            className="text-xl font-extrabold text-slate-900 mt-1"
                        >
                            {displayValue(candidate.name)}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
                        aria-label="Close candidate details"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {error ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {error}
                        </div>
                    ) : null}

                    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-[#1D5BF2] flex items-center justify-center">
                                    <UserRound className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-slate-900">
                                        Profile
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Candidate contact information
                                    </p>
                                </div>
                            </div>
                            <span
                                className={`border text-[10px] font-bold px-2.5 py-1 rounded-full font-mono uppercase tracking-wider ${statusClass}`}
                            >
                                {status}
                            </span>
                        </div>

                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-start gap-2.5">
                                <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Email
                                    </p>
                                    <p className="text-sm font-semibold text-slate-700 mt-1 break-words">
                                        {displayValue(candidate.email)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Phone
                                    </p>
                                    <p className="text-sm font-semibold text-slate-700 mt-1">
                                        {displayValue(candidate.phone)}
                                    </p>
                                </div>
                            </div>
                            <div className="sm:col-span-2 flex items-start gap-2.5">
                                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Location
                                    </p>
                                    <p className="text-sm font-semibold text-slate-700 mt-1">
                                        {displayValue(candidate.location)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {hasExtractedProfile ? (
                        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-slate-900">
                                        Extracted Resume Information
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Information extracted from the uploaded
                                        resume
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 space-y-5">
                                {[
                                    ['Education', 'education'],
                                    ['Work Experience', 'work_experience'],
                                ].map(([label, field]) => (
                                    <div key={field}>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            {label}
                                        </p>
                                        {candidate[field]?.length ? (
                                            <div className="mt-2 space-y-2">
                                                {candidate[field].map(
                                                    (item, index) => (
                                                        <p
                                                            key={`${field}-${index}`}
                                                            className="text-sm font-semibold text-slate-700 leading-6"
                                                        >
                                                            {item}
                                                        </p>
                                                    )
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-400 mt-2">
                                                --
                                            </p>
                                        )}
                                    </div>
                                ))}

                                {[
                                    ['Hard Skills', 'hard_skills'],
                                    ['Soft Skills', 'soft_skills'],
                                ].map(([label, field]) => (
                                    <div key={field}>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            {label}
                                        </p>
                                        {candidate[field]?.length ? (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {candidate[field].map(
                                                    (skill, index) => (
                                                        <span
                                                            key={`${field}-${index}`}
                                                            className="inline-flex border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 px-2.5 py-1 rounded-full"
                                                        >
                                                            {skill}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-400 mt-2">
                                                --
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    ) : null}

                    {hasAppliedJobs ? (
                        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center">
                                    <BriefcaseBusiness className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-slate-900">
                                        Applied Jobs
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Job postings linked to this candidate
                                    </p>
                                </div>
                            </div>

                            {candidate.applied_jobs.length ? (
                                <div className="mt-5 space-y-3">
                                    {candidate.applied_jobs.map((job) => {
                                        const jobStatus =
                                            job.status?.toLowerCase() ||
                                            'pending';
                                        const jobStatusClass =
                                            statusClasses[jobStatus] ||
                                            'bg-slate-50 text-slate-600 border-slate-200';
                                        return (
                                            <div
                                                key={job.id}
                                                className="flex items-center justify-between gap-3 border border-slate-100 rounded-xl px-4 py-3"
                                            >
                                                <p className="text-sm font-bold text-slate-700">
                                                    {displayValue(job.title)}
                                                </p>
                                                <span
                                                    className={`shrink-0 border text-[10px] font-bold px-2.5 py-1 rounded-full font-mono uppercase tracking-wider ${jobStatusClass}`}
                                                >
                                                    {jobStatus}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 mt-5">
                                    No linked job postings.
                                </p>
                            )}
                        </section>
                    ) : null}

                    {status === 'failed' && candidate.analysis_error ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {candidate.analysis_error}
                        </div>
                    ) : null}

                    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-slate-900">
                                    AI Analysis
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Job-specific candidate assessment
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 space-y-4">
                            {analysisItems.map(({ label, field, icon: Icon }) => {
                                const score = scoreDisplay(
                                    candidate[field],
                                    status
                                );
                                return (
                                    <div key={field}>
                                        <div className="flex items-center justify-between gap-3 mb-2">
                                            <div className="flex items-center gap-2">
                                                <Icon className="w-4 h-4 text-slate-400" />
                                                <span className="text-xs font-bold text-slate-600">
                                                    {label}
                                                </span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-400">
                                                {score.label}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[#1D5BF2] rounded-full transition-all"
                                                style={{ width: `${score.width}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <h3 className="font-extrabold text-slate-900">
                            Executive Summary
                        </h3>
                        <p className="text-sm text-slate-500 leading-6 mt-3">
                            {candidate.summary ||
                                'AI analysis has not been performed yet.'}
                        </p>
                    </section>

                    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <h3 className="font-extrabold text-slate-900">
                            Gap Analysis
                        </h3>
                        <p className="text-sm text-slate-500 leading-6 mt-3">
                            {typeof candidate.gap_analysis === 'string' &&
                            candidate.gap_analysis.trim()
                                ? candidate.gap_analysis
                                : 'AI analysis has not been performed yet.'}
                        </p>
                    </section>

                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            disabled
                            className="flex items-center gap-2 border border-slate-200 bg-white text-slate-400 text-sm font-bold px-4 py-2.5 rounded-xl cursor-not-allowed"
                        >
                            <Archive className="w-4 h-4" />
                            <span>Archive</span>
                        </button>
                        <button
                            type="button"
                            disabled
                            className="flex items-center gap-2 bg-slate-200 text-slate-400 text-sm font-bold px-4 py-2.5 rounded-xl cursor-not-allowed"
                        >
                            <Star className="w-4 h-4" />
                            <span>Shortlist</span>
                        </button>
                    </div>

                    {isLoading ? (
                        <p className="text-center text-xs font-semibold text-slate-400">
                            Loading candidate details...
                        </p>
                    ) : null}
                </div>
            </aside>
        </div>
    );
}
