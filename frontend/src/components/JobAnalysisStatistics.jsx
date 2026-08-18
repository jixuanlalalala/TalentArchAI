import { useMemo } from 'react';
import { Gauge, Trophy, Users } from 'lucide-react';
import { calculateJobCandidateStatistics } from '../utils/jobCandidateAnalysis';


export default function JobAnalysisStatistics({
    candidates,
    isLoading,
    error,
}) {
    const statistics = useMemo(
        () => calculateJobCandidateStatistics(candidates),
        [candidates]
    );
    const unavailable = Boolean(error);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-[#1D5BF2] flex items-center justify-center">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Total Resumes
                        </p>
                        <p className="text-2xl font-extrabold text-slate-900 mt-1">
                            {isLoading || unavailable
                                ? '--'
                                : statistics.totalResumes}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-[#1D5BF2] flex items-center justify-center">
                        <Gauge className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Average Match Score
                        </p>
                        <p className="text-2xl font-extrabold text-slate-900 mt-1">
                            {isLoading || unavailable
                                ? '--'
                                : statistics.averageMatchScore === null
                                  ? '--'
                                  : `${statistics.averageMatchScore}%`}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-[#1D5BF2] flex items-center justify-center">
                        <Trophy className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Top Candidates
                    </p>
                </div>

                {isLoading ? (
                    <p className="text-xs font-semibold text-slate-400 mt-4">
                        Loading candidates...
                    </p>
                ) : unavailable ? (
                    <p className="text-xs font-semibold text-rose-600 mt-4">
                        Statistics unavailable.
                    </p>
                ) : statistics.topCandidates.length ? (
                    <div className="mt-4 space-y-2">
                        {statistics.topCandidates.map((candidate) => (
                            <div
                                key={candidate.match_result_id || candidate.id}
                                className="flex items-center justify-between gap-3"
                            >
                                <span className="text-xs font-bold text-slate-700 truncate">
                                    {candidate.name || 'Unnamed Candidate'}
                                </span>
                                <span className="text-xs font-bold text-[#1D5BF2] shrink-0">
                                    {Math.round(candidate.match_score * 100) /
                                        100}
                                    %
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs font-semibold text-slate-400 mt-4">
                        No completed analysis yet.
                    </p>
                )}
            </div>
        </div>
    );
}
