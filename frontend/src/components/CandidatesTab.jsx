import { useEffect, useRef, useState } from 'react';
import { UserRound, Users } from 'lucide-react';
import CandidateDetailsPanel from './CandidateDetailsPanel';
import CandidateTable from './CandidateTable';
import { getCandidate, getCandidates } from '../services/candidateService';

export default function CandidatesTab() {
    const [candidates, setCandidates] = useState([]);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [loadingCandidates, setLoadingCandidates] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [pageError, setPageError] = useState('');
    const [detailError, setDetailError] = useState('');
    const detailRequestId = useRef(0);

    useEffect(() => {
        let isMounted = true;

        const loadCandidates = async () => {
            try {
                const fetchedCandidates = await getCandidates();
                if (isMounted) setCandidates(fetchedCandidates);
            } catch (error) {
                if (isMounted) {
                    setPageError(error.message || 'Could not load candidates.');
                }
            } finally {
                if (isMounted) setLoadingCandidates(false);
            }
        };

        loadCandidates();
        return () => {
            isMounted = false;
        };
    }, []);

    const handleCandidateSelect = async (candidate) => {
        const requestId = detailRequestId.current + 1;
        detailRequestId.current = requestId;
        setSelectedCandidate(candidate);
        setDetailError('');
        setLoadingDetails(true);

        try {
            const detail = await getCandidate(candidate.id);
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 mb-2">
                        <span>Candidates</span>
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        Candidate Database
                    </h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                        Review all candidates uploaded to your account.
                    </p>
                </div>
            </div>

            {pageError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {pageError}
                </div>
            ) : null}

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
                    <div>
                        <h3 className="font-extrabold text-slate-900">
                            Candidates
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            {candidates.length} candidate
                            {candidates.length === 1 ? '' : 's'} in your
                            database
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-[#1D5BF2] flex items-center justify-center">
                        <Users className="w-5 h-5" />
                    </div>
                </div>

                {loadingCandidates ? (
                    <div className="py-16 text-center text-sm font-semibold text-slate-400">
                        Loading candidates...
                    </div>
                ) : candidates.length === 0 ? (
                    <div className="py-16 px-6 text-center">
                        <div className="w-14 h-14 bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                            <UserRound className="w-7 h-7" />
                        </div>
                        <h4 className="font-bold text-slate-700 mt-4">
                            No candidates uploaded
                        </h4>
                        <p className="text-sm text-slate-400 mt-1">
                            Candidate records will appear here after a resume is
                            uploaded.
                        </p>
                    </div>
                ) : (
                    <CandidateTable
                        candidates={candidates}
                        mode="database"
                        onCandidateSelect={handleCandidateSelect}
                    />
                )}
            </div>

            <CandidateDetailsPanel
                candidate={selectedCandidate}
                isLoading={loadingDetails}
                error={detailError}
                onClose={() => {
                    detailRequestId.current += 1;
                    setSelectedCandidate(null);
                    setLoadingDetails(false);
                    setDetailError('');
                }}
            />
        </div>
    );
}
