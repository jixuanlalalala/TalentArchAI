import { useMemo, useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import CandidateDetailsPanel from './CandidateDetailsPanel';
import CandidateTable from './CandidateTable';
import { getJobCandidate } from '../services/candidateService';
import { rankJobCandidates } from '../utils/jobCandidateAnalysis';

export default function JobCandidateAnalysis({
    jobId,
    candidates,
    onUpload,
}) {
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [detailError, setDetailError] = useState('');
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

                <CandidateTable
                    candidates={rankedCandidates}
                    onCandidateSelect={handleCandidateSelect}
                />
            </div>

            <CandidateDetailsPanel
                candidate={selectedCandidate}
                isLoading={loadingDetails}
                error={detailError}
                onClose={closeDetails}
            />
        </>
    );
}
