import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getJobCandidates } from '../services/candidateService';
import {
    calculateJobCandidateStatistics,
    detectCandidateAnalysisTransitions,
} from '../utils/jobCandidateAnalysis';

const POLLING_INTERVAL_MS = 5000;
const NEWLY_COMPLETED_HIGHLIGHT_MS = 4000;
const EXTRACTION_NOTICE_THROTTLE_MS = 6000;

const buildAnalysisToast = (transitions, jobTitle) => {
    const completed = transitions.newlyCompletedCandidates;
    const failed = transitions.newlyFailedCandidates;
    const settledCount = completed.length + failed.length;
    const jobContext = jobTitle ? ` for "${jobTitle}"` : '';

    if (settledCount === 0) return null;

    if (settledCount === 1 && completed.length === 1) {
        const candidateName = completed[0].name || 'A candidate';
        return {
            type: 'success',
            title: 'Analysis Completed',
            message: `${candidateName}'s resume analysis${jobContext} is ready.`,
        };
    }

    if (settledCount === 1 && failed.length === 1) {
        const candidateName = failed[0].name || 'A candidate';
        return {
            type: 'error',
            title: 'Analysis Failed',
            message: `${candidateName}'s resume analysis${jobContext} could not be completed.`,
        };
    }

    if (failed.length === 0) {
        return {
            type: 'success',
            title: 'Analysis Completed',
            message: `${completed.length} candidate analyses${jobContext} are now ready.`,
        };
    }

    if (completed.length === 0) {
        return {
            type: 'error',
            title: 'Analysis Failed',
            message: `${failed.length} candidate analyses${jobContext} could not be completed.`,
        };
    }

    return {
        type: 'mixed',
        title: 'Analysis Update',
        message: `${completed.length} ${
            completed.length === 1 ? 'analysis' : 'analyses'
        }${jobContext} completed and ${failed.length} failed.`,
    };
};

export default function useJobAnalysisWorkflow({
    isPageActive,
    selectedJobId,
    selectedJobTitle,
    onCandidateCountChange,
}) {
    const [candidates, setCandidates] = useState([]);
    const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
    const [candidateError, setCandidateError] = useState('');
    const [completionSummary, setCompletionSummary] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [highlightedCandidateIds, setHighlightedCandidateIds] = useState(
        new Set()
    );
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploadSuccessMessage, setUploadSuccessMessage] = useState('');
    const [activeUpload, setActiveUpload] = useState(null);

    const previousCandidateStatusesRef = useRef(new Map());
    const previousHadActiveAnalysisRef = useRef(false);
    const analysisJobIdRef = useRef(null);
    const toastSequenceRef = useRef(0);
    const highlightTimeoutsRef = useRef(new Map());
    const skipCandidateLoadJobIdRef = useRef(null);
    const selectedJobTitleRef = useRef(selectedJobTitle);
    const selectedJobIdRef = useRef(selectedJobId);
    const isPageActiveRef = useRef(isPageActive);
    const lastExtractionNoticeAtRef = useRef(0);
    const activeUploadJobIdRef = useRef(null);
    const deferredCompletionJobIdRef = useRef(null);

    useEffect(() => {
        selectedJobTitleRef.current = selectedJobTitle;
        selectedJobIdRef.current = selectedJobId;
        isPageActiveRef.current = isPageActive;
    }, [isPageActive, selectedJobId, selectedJobTitle]);

    const statistics = useMemo(
        () => calculateJobCandidateStatistics(candidates),
        [candidates]
    );
    const pendingCount = statistics.pendingCount;
    const processingCount = statistics.processingCount;
    const activeAnalysisCount = pendingCount + processingCount;
    const hasActiveAnalysis = activeAnalysisCount > 0;
    const isUploadingSelectedJob =
        activeUpload?.jobId === selectedJobId;

    const dismissNotification = useCallback((notificationId) => {
        setNotifications((currentNotifications) =>
            currentNotifications.filter(
                (notification) => notification.id !== notificationId
            )
        );
    }, []);

    const enqueueNotification = useCallback((scopeId, notification) => {
        if (!notification) return;

        toastSequenceRef.current += 1;
        setNotifications((currentNotifications) => [
            ...currentNotifications,
            {
                ...notification,
                id: `${scopeId}-${toastSequenceRef.current}`,
            },
        ]);
    }, []);

    const applyCandidates = useCallback(
        (jobId, nextCandidates) => {
            if (analysisJobIdRef.current !== jobId) {
                analysisJobIdRef.current = jobId;
                previousCandidateStatusesRef.current = new Map();
                previousHadActiveAnalysisRef.current = false;
                deferredCompletionJobIdRef.current = null;
                setNotifications([]);
            }

            const nextStatistics =
                calculateJobCandidateStatistics(nextCandidates);
            const nextHasActiveAnalysis =
                nextStatistics.pendingCount +
                    nextStatistics.processingCount >
                0;
            const transitions = detectCandidateAnalysisTransitions(
                previousCandidateStatusesRef.current,
                nextCandidates
            );
            enqueueNotification(
                jobId,
                buildAnalysisToast(
                    transitions,
                    selectedJobTitleRef.current
                )
            );

            if (nextHasActiveAnalysis) {
                setCompletionSummary(null);
            } else if (
                previousHadActiveAnalysisRef.current &&
                transitions.newlySettledCount > 0
            ) {
                if (activeUploadJobIdRef.current === jobId) {
                    deferredCompletionJobIdRef.current = jobId;
                    setCompletionSummary(null);
                } else {
                    deferredCompletionJobIdRef.current = null;
                    setCompletionSummary({
                        completedCount: nextStatistics.completedCount,
                        failedCount: nextStatistics.failedCount,
                    });
                    setUploadSuccessMessage('');
                }
            } else if (
                deferredCompletionJobIdRef.current === jobId &&
                activeUploadJobIdRef.current !== jobId
            ) {
                deferredCompletionJobIdRef.current = null;
                setCompletionSummary({
                    completedCount: nextStatistics.completedCount,
                    failedCount: nextStatistics.failedCount,
                });
                setUploadSuccessMessage('');
            }

            if (transitions.newlyCompletedIds.length > 0) {
                setHighlightedCandidateIds((currentIds) => {
                    const nextIds = new Set(currentIds);
                    transitions.newlyCompletedIds.forEach((candidateId) =>
                        nextIds.add(candidateId)
                    );
                    return nextIds;
                });

                transitions.newlyCompletedIds.forEach((candidateId) => {
                    const existingTimeout =
                        highlightTimeoutsRef.current.get(candidateId);
                    if (existingTimeout) window.clearTimeout(existingTimeout);

                    const timeoutId = window.setTimeout(() => {
                        setHighlightedCandidateIds((currentIds) => {
                            const nextIds = new Set(currentIds);
                            nextIds.delete(candidateId);
                            return nextIds;
                        });
                        highlightTimeoutsRef.current.delete(candidateId);
                    }, NEWLY_COMPLETED_HIGHLIGHT_MS);
                    highlightTimeoutsRef.current.set(candidateId, timeoutId);
                });
            }

            previousCandidateStatusesRef.current = transitions.currentStatuses;
            previousHadActiveAnalysisRef.current = nextHasActiveAnalysis;
            setCandidates(nextCandidates);
            onCandidateCountChange(jobId, nextCandidates.length);
        },
        [enqueueNotification, onCandidateCountChange]
    );

    const resetFeedback = useCallback((jobId = null) => {
        analysisJobIdRef.current = jobId;
        previousCandidateStatusesRef.current = new Map();
        previousHadActiveAnalysisRef.current = false;
        deferredCompletionJobIdRef.current = null;
        setCompletionSummary(null);
        setNotifications([]);
        setHighlightedCandidateIds(new Set());
        highlightTimeoutsRef.current.forEach((timeoutId) =>
            window.clearTimeout(timeoutId)
        );
        highlightTimeoutsRef.current.clear();
    }, []);

    const clearCandidateView = useCallback(
        (jobId = null) => {
            resetFeedback(jobId);
            setCandidates([]);
            setCandidateError('');
            setUploadSuccessMessage('');
        },
        [resetFeedback]
    );

    const loadCandidates = useCallback(
        async (jobId, errorMessage = 'Could not load candidates for this job.') => {
            if (!jobId) return false;

            setIsLoadingCandidates(true);
            setCandidateError('');
            try {
                const loadedCandidates = await getJobCandidates(jobId);
                applyCandidates(jobId, loadedCandidates);
                return true;
            } catch (error) {
                setCandidates([]);
                setCandidateError(error.message || errorMessage);
                return false;
            } finally {
                setIsLoadingCandidates(false);
            }
        },
        [applyCandidates]
    );

    const refreshCandidates = useCallback(
        async () => {
            if (!selectedJobId) return false;
            return loadCandidates(
                selectedJobId,
                'Could not refresh candidates for this job.'
            );
        },
        [loadCandidates, selectedJobId]
    );

    const loadLinkedCandidates = useCallback(
        async (jobId) => {
            if (selectedJobId !== jobId) {
                skipCandidateLoadJobIdRef.current = jobId;
            }
            clearCandidateView(jobId);
            return loadCandidates(
                jobId,
                'Candidates were added, but the candidate list could not refresh.'
            );
        },
        [clearCandidateView, loadCandidates, selectedJobId]
    );

    useEffect(
        () => () => {
            highlightTimeoutsRef.current.forEach((timeoutId) =>
                window.clearTimeout(timeoutId)
            );
            highlightTimeoutsRef.current.clear();
        },
        []
    );

    useEffect(() => {
        let isMounted = true;

        if (!selectedJobId) {
            return () => {
                isMounted = false;
            };
        }

        if (skipCandidateLoadJobIdRef.current === selectedJobId) {
            skipCandidateLoadJobIdRef.current = null;
            return () => {
                isMounted = false;
            };
        }

        const loadSelectedCandidates = async () => {
            setIsLoadingCandidates(true);
            setCandidateError('');
            try {
                const loadedCandidates =
                    await getJobCandidates(selectedJobId);
                if (isMounted) {
                    applyCandidates(selectedJobId, loadedCandidates);
                }
            } catch (error) {
                if (isMounted) {
                    setCandidates([]);
                    setCandidateError(
                        error.message ||
                            'Could not load candidates for this job.'
                    );
                }
            } finally {
                if (isMounted) setIsLoadingCandidates(false);
            }
        };

        loadSelectedCandidates();
        return () => {
            isMounted = false;
        };
    }, [applyCandidates, selectedJobId]);

    useEffect(() => {
        if (
            !selectedJobId ||
            (!hasActiveAnalysis && !isUploadingSelectedJob)
        ) {
            return undefined;
        }

        let cancelled = false;
        let requestInFlight = false;

        const poll = async () => {
            if (cancelled || document.hidden || requestInFlight) return;
            requestInFlight = true;
            try {
                const polledCandidates =
                    await getJobCandidates(selectedJobId);
                if (!cancelled) {
                    applyCandidates(selectedJobId, polledCandidates);
                    setCandidateError('');
                }
            } catch (error) {
                if (!cancelled) {
                    setCandidateError(
                        error.message ||
                            'Could not refresh candidates for this job.'
                    );
                }
            } finally {
                requestInFlight = false;
            }
        };

        const intervalId = window.setInterval(poll, POLLING_INTERVAL_MS);
        const handleVisibilityChange = () => {
            if (!document.hidden) poll();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange
            );
        };
    }, [
        applyCandidates,
        hasActiveAnalysis,
        isUploadingSelectedJob,
        selectedJobId,
    ]);

    const openUpload = useCallback(() => {
        if (activeUpload) {
            const now = Date.now();
            if (
                now - lastExtractionNoticeAtRef.current >=
                EXTRACTION_NOTICE_THROTTLE_MS
            ) {
                lastExtractionNoticeAtRef.current = now;
                enqueueNotification(activeUpload.jobId || 'resume-upload', {
                    type: 'info',
                    title: 'Resume extraction in progress',
                    message:
                        'Please wait until the current resumes finish extracting before starting another upload.',
                });
            }
            return;
        }
        setUploadSuccessMessage('');
        setIsUploadOpen(true);
    }, [activeUpload, enqueueNotification]);

    const closeUpload = useCallback(() => setIsUploadOpen(false), []);

    const handleUploadStarted = useCallback(({ jobId, fileCount }) => {
        lastExtractionNoticeAtRef.current = 0;
        activeUploadJobIdRef.current = jobId;
        deferredCompletionJobIdRef.current = null;
        setCompletionSummary(null);
        setUploadSuccessMessage('');
        setActiveUpload({
            jobId,
            fileCount,
        });
        setIsUploadOpen(false);
    }, []);

    const handleUploadComplete = useCallback(
        async (uploadResults, uploadedJobId) => {
            setIsUploadOpen(false);
            if (activeUploadJobIdRef.current === uploadedJobId) {
                activeUploadJobIdRef.current = null;
            }
            setActiveUpload((currentUpload) =>
                currentUpload?.jobId === uploadedJobId ? null : currentUpload
            );
            const completedCount = uploadResults.filter(
                (result) => result.status === 'completed'
            ).length;
            const failedCount = uploadResults.length - completedCount;
            const uploadMessage = failedCount
                ? `${completedCount} resume${completedCount === 1 ? '' : 's'} uploaded successfully and ${failedCount} could not be processed. Open Upload Resume to review and retry failed files.`
                : 'Resumes uploaded successfully. AI analysis will continue in the background.';

            enqueueNotification(uploadedJobId || 'resume-upload', {
                type: failedCount ? 'mixed' : 'success',
                title: failedCount
                    ? 'Resume Processing Update'
                    : 'Resumes Uploaded',
                message: uploadMessage,
            });

            if (uploadedJobId === selectedJobIdRef.current) {
                setUploadSuccessMessage(uploadMessage);
                await loadCandidates(
                    uploadedJobId,
                    'Resumes were extracted, but the candidate list could not refresh.'
                );
            }
        },
        [enqueueNotification, loadCandidates]
    );

    const handleUploadFailure = useCallback(
        (uploadedJobId) => {
            setUploadSuccessMessage('');
            if (activeUploadJobIdRef.current === uploadedJobId) {
                activeUploadJobIdRef.current = null;
            }
            setActiveUpload((currentUpload) =>
                currentUpload?.jobId === uploadedJobId ? null : currentUpload
            );
            if (
                isPageActiveRef.current &&
                uploadedJobId === selectedJobIdRef.current
            ) {
                setIsUploadOpen(true);
            }
            enqueueNotification(uploadedJobId || 'resume-upload', {
                type: 'error',
                title: 'Resume Processing Failed',
                message:
                    'One or more resumes could not be processed. Return to Job Details to review and retry.',
            });
        },
        [enqueueNotification]
    );

    const dismissCompletion = useCallback(
        () => setCompletionSummary(null),
        []
    );
    const closeJob = useCallback(
        () => clearCandidateView(),
        [clearCandidateView]
    );

    return {
        candidates: {
            items: candidates,
            isLoading: isLoadingCandidates,
            error: candidateError,
            highlightedIds: highlightedCandidateIds,
            refresh: refreshCandidates,
            loadLinked: loadLinkedCandidates,
        },
        analysis: {
            pendingCount,
            processingCount,
            activeCount: activeAnalysisCount,
            isActive: hasActiveAnalysis,
            completionSummary,
            dismissCompletion,
        },
        upload: {
            isOpen: isUploadOpen,
            successMessage: uploadSuccessMessage,
            isProcessingSelectedJob: isUploadingSelectedJob,
            fileCount: activeUpload?.fileCount || 0,
            open: openUpload,
            close: closeUpload,
            handleStarted: handleUploadStarted,
            handleComplete: handleUploadComplete,
            handleFailure: handleUploadFailure,
        },
        notifications: {
            items: notifications,
            dismiss: dismissNotification,
        },
        openJob: clearCandidateView,
        closeJob,
        resetFeedback,
    };
}
