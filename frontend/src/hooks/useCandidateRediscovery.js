import { useCallback, useState } from 'react';
import {
    getRediscoveryCandidates,
    linkRediscoveryCandidates,
} from '../services/jobService';

export default function useCandidateRediscovery({ onCandidatesLinked }) {
    const [isOpen, setIsOpen] = useState(false);
    const [job, setJob] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState('');

    const discoverForJob = useCallback(async (createdJob) => {
        try {
            const suggestions = await getRediscoveryCandidates(createdJob.id);
            if (suggestions.length > 0) {
                setJob(createdJob);
                setCandidates(suggestions);
                setError('');
                setIsOpen(true);
            }
        } catch (rediscoveryError) {
            console.error('Candidate rediscovery failed', rediscoveryError);
        }
    }, []);

    const close = useCallback(() => {
        if (isAdding) return;
        setIsOpen(false);
        setJob(null);
        setCandidates([]);
        setError('');
    }, [isAdding]);

    const addCandidates = useCallback(
        async (selectedCandidates) => {
            if (isAdding || !job?.id) return;

            const candidateIds = selectedCandidates.map(
                (candidate) => candidate.id
            );
            if (candidateIds.length === 0) return;

            setIsAdding(true);
            setError('');
            try {
                await linkRediscoveryCandidates(job.id, candidateIds);
                await onCandidatesLinked(job.id);
                setIsOpen(false);
                setJob(null);
                setCandidates([]);
            } catch (linkError) {
                setError(
                    linkError.message ||
                        'Candidates could not be added to this job.'
                );
            } finally {
                setIsAdding(false);
            }
        },
        [isAdding, job, onCandidatesLinked]
    );

    return {
        discoverForJob,
        modal: {
            isOpen,
            candidates,
            isAdding,
            error,
            close,
            addCandidates,
        },
    };
}
