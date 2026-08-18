import { Mail, MapPin, Phone, UserRound } from 'lucide-react';

const statusClasses = {
    pending: 'bg-blue-50 text-[#1D5BF2] border-blue-100',
    processing: 'bg-amber-50 text-amber-700 border-amber-100',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    failed: 'bg-rose-50 text-rose-700 border-rose-100',
};

const recruitmentStatuses = [
    ['new', 'New'],
    ['under_review', 'Under Review'],
    ['shortlisted', 'Shortlisted'],
    ['rejected', 'Rejected'],
    ['archived', 'Archived'],
];

const matchScoreLabel = (candidate, status) => {
    if (
        status === 'completed' &&
        typeof candidate.match_score === 'number' &&
        Number.isFinite(candidate.match_score)
    ) {
        return `${Math.round(candidate.match_score * 100) / 100}%`;
    }
    return '--';
};

const formatUploadDate = (value) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return new Intl.DateTimeFormat('en-MY', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
};

export default function CandidateTable({
    candidates,
    mode = 'job',
    onCandidateSelect,
    onRecruitmentStatusChange,
    updatingCandidateId,
    highlightedCandidateIds,
}) {
    const isDatabaseView = mode === 'database';
    const headings = isDatabaseView
        ? ['Candidate', 'Phone', 'Location', 'Upload Date', 'Extraction Status']
        : [
              'Candidate',
              'Phone',
              'Location',
              'Match Score',
              'Analysis Status',
              'Recruitment Status',
          ];

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100">
                        {headings.map((heading) => (
                            <th
                                key={heading}
                                className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400"
                            >
                                {heading}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {candidates.map((candidate) => {
                        const status = String(
                            isDatabaseView
                                ? candidate.extraction_status || 'pending'
                                : candidate.status || 'pending'
                        ).toLowerCase();
                        const statusClass =
                            statusClasses[status] ||
                            'bg-slate-50 text-slate-600 border-slate-200';
                        const candidateKey = String(
                            candidate.match_result_id || candidate.id || ''
                        );
                        const isNewlyCompleted =
                            !isDatabaseView &&
                            highlightedCandidateIds?.has(candidateKey);

                        return (
                            <tr
                                key={candidate.match_result_id || candidate.id}
                                tabIndex={0}
                                onClick={() => onCandidateSelect(candidate)}
                                onKeyDown={(event) => {
                                    if (
                                        event.key === 'Enter' ||
                                        event.key === ' '
                                    ) {
                                        event.preventDefault();
                                        onCandidateSelect(candidate);
                                    }
                                }}
                                className={`hover:bg-slate-50/70 transition-colors duration-700 cursor-pointer focus:outline-none focus:bg-blue-50/40 ${
                                    isNewlyCompleted
                                        ? 'bg-emerald-50/70'
                                        : ''
                                }`}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-[#1D5BF2] flex items-center justify-center shrink-0">
                                            <UserRound className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-extrabold text-slate-800 truncate">
                                                {candidate.name ||
                                                    'Unnamed Candidate'}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                                                <Mail className="w-3.5 h-3.5 shrink-0" />
                                                <span className="truncate">
                                                    {candidate.email || '--'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span>{candidate.phone || '--'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 max-w-52">
                                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate">
                                            {candidate.location || '--'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-xs font-bold text-slate-400">
                                        {isDatabaseView
                                            ? formatUploadDate(
                                                  candidate.created_at
                                              )
                                            : matchScoreLabel(
                                                  candidate,
                                                  status
                                              )}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span
                                        className={`inline-flex border text-[10px] font-bold px-2.5 py-1 rounded-full font-mono uppercase tracking-wider ${statusClass}`}
                                    >
                                        {status}
                                    </span>
                                </td>
                                {!isDatabaseView ? (
                                    <td className="px-6 py-4">
                                        <select
                                            value={
                                                candidate.recruitment_status ||
                                                'new'
                                            }
                                            disabled={
                                                updatingCandidateId ===
                                                candidate.id
                                            }
                                            onClick={(event) =>
                                                event.stopPropagation()
                                            }
                                            onKeyDown={(event) =>
                                                event.stopPropagation()
                                            }
                                            onChange={(event) => {
                                                event.stopPropagation();
                                                onRecruitmentStatusChange?.(
                                                    candidate,
                                                    event.target.value
                                                );
                                            }}
                                            aria-label={`Recruitment status for ${candidate.name || 'candidate'}`}
                                            className="border border-slate-200 bg-white text-xs font-semibold text-slate-600 px-2.5 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                                        >
                                            {recruitmentStatuses.map(
                                                ([value, label]) => (
                                                    <option
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </td>
                                ) : null}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
