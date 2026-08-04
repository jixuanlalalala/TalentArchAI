const ANALYSIS_STATUS_ORDER = {
    completed: 0,
    processing: 1,
    pending: 2,
    failed: 3,
};

const analysisStatus = (candidate) =>
    String(candidate?.status || 'pending').toLowerCase();

const validMatchScore = (candidate) =>
    typeof candidate?.match_score === 'number' &&
    Number.isFinite(candidate.match_score);

const createdAtValue = (candidate) => {
    const timestamp = Date.parse(candidate?.match_result_created_at || '');
    return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
};

export const rankJobCandidates = (candidates = []) =>
    [...candidates].sort((left, right) => {
        const leftStatus = analysisStatus(left);
        const rightStatus = analysisStatus(right);
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
        const status = analysisStatus(candidate);
        if (Object.hasOwn(statusCounts, status)) statusCounts[status] += 1;
    });

    const rankedCompleted = rankJobCandidates(candidates).filter(
        (candidate) =>
            analysisStatus(candidate) === 'completed' &&
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
        const status = analysisStatus(candidate);
        return status === 'pending' || status === 'processing';
    });
