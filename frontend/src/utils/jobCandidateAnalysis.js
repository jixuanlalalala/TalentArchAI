const ANALYSIS_STATUS_ORDER = {
    completed: 0,
    processing: 1,
    pending: 2,
    failed: 3,
};

export const getCandidateAnalysisStatus = (candidate) =>
    String(candidate?.status || 'pending').toLowerCase();

export const getCandidateAnalysisKey = (candidate) =>
    String(candidate?.match_result_id || candidate?.id || '');

const isActiveStatus = (status) =>
    status === 'pending' || status === 'processing';

const validMatchScore = (candidate) =>
    typeof candidate?.match_score === 'number' &&
    Number.isFinite(candidate.match_score);

const createdAtValue = (candidate) => {
    const timestamp = Date.parse(candidate?.match_result_created_at || '');
    return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
};

export const rankJobCandidates = (candidates = []) =>
    [...candidates].sort((left, right) => {
        const leftStatus = getCandidateAnalysisStatus(left);
        const rightStatus = getCandidateAnalysisStatus(right);
        const statusDifference =
            (ANALYSIS_STATUS_ORDER[leftStatus] ?? 4) -
            (ANALYSIS_STATUS_ORDER[rightStatus] ?? 4);
        if (statusDifference !== 0) return statusDifference;

        if (
            leftStatus === 'completed' &&
            validMatchScore(left) &&
            validMatchScore(right) &&
            left.match_score !== right.match_score
        ) {
            return right.match_score - left.match_score;
        }

        const createdDifference = createdAtValue(left) - createdAtValue(right);
        if (createdDifference !== 0) return createdDifference;

        return String(left?.match_result_id || left?.id || '').localeCompare(
            String(right?.match_result_id || right?.id || '')
        );
    });

export const calculateJobCandidateStatistics = (candidates = []) => {
    const statusCounts = {
        completed: 0,
        pending: 0,
        processing: 0,
        failed: 0,
    };

    candidates.forEach((candidate) => {
        const status = getCandidateAnalysisStatus(candidate);
        if (Object.hasOwn(statusCounts, status)) statusCounts[status] += 1;
    });

    const rankedCompleted = rankJobCandidates(candidates).filter(
        (candidate) =>
            getCandidateAnalysisStatus(candidate) === 'completed' &&
            validMatchScore(candidate)
    );
    const averageMatchScore = rankedCompleted.length
        ? Math.round(
              (rankedCompleted.reduce(
                  (total, candidate) => total + candidate.match_score,
                  0
              ) /
                  rankedCompleted.length) *
                  10
          ) / 10
        : null;

    return {
        totalResumes: candidates.length,
        completedCount: statusCounts.completed,
        pendingCount: statusCounts.pending,
        processingCount: statusCounts.processing,
        failedCount: statusCounts.failed,
        averageMatchScore,
        topCandidates: rankedCompleted.slice(0, 3),
    };
};

export const hasActiveAnalysis = (candidates = []) =>
    candidates.some((candidate) => {
        const status = getCandidateAnalysisStatus(candidate);
        return isActiveStatus(status);
    });

export const detectCandidateAnalysisTransitions = (
    previousStatuses = new Map(),
    candidates = []
) => {
    const currentStatuses = new Map();
    const newlyCompletedIds = [];
    const newlyCompletedCandidates = [];
    const newlyFailedCandidates = [];
    let newlySettledCount = 0;

    candidates.forEach((candidate) => {
        const candidateKey = getCandidateAnalysisKey(candidate);
        if (!candidateKey) return;

        const currentStatus = getCandidateAnalysisStatus(candidate);
        const previousStatus = previousStatuses.get(candidateKey);
        currentStatuses.set(candidateKey, currentStatus);

        if (
            isActiveStatus(previousStatus) &&
            (currentStatus === 'completed' || currentStatus === 'failed')
        ) {
            newlySettledCount += 1;
            if (currentStatus === 'completed') {
                newlyCompletedIds.push(candidateKey);
                newlyCompletedCandidates.push({
                    id: candidateKey,
                    name: candidate?.name || '',
                });
            } else {
                newlyFailedCandidates.push({
                    id: candidateKey,
                    name: candidate?.name || '',
                });
            }
        }
    });

    return {
        currentStatuses,
        newlyCompletedIds,
        newlyCompletedCandidates,
        newlyFailedCandidates,
        newlySettledCount,
    };
};
