from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal

from models.job_match_analysis import (
    CandidateMatchProfile,
    JobMatchAnalysis,
    JobMatchContext,
)
from services.job_analysis_service import JobAnalysisError
from services.match_scoring_service import MatchScoreError, calculate_match_score


STALE_TASK_AGE = timedelta(minutes=3)


@dataclass(frozen=True)
class AnalysisTask:
    task_id: str
    candidate: CandidateMatchProfile
    job: JobMatchContext


@dataclass(frozen=True)
class WorkerCycleResult:
    outcome: Literal["idle", "completed", "failed"]
    task_id: str | None = None
    failure_category: str | None = None


class AnalysisWorkerError(RuntimeError):
    """Raised when worker state cannot be persisted reliably."""


def process_next_analysis(
    queue,
    analyzer: Callable[
        [CandidateMatchProfile, JobMatchContext],
        JobMatchAnalysis,
    ],
    *,
    now: datetime | None = None,
) -> WorkerCycleResult:
    cycle_time = now or datetime.now(UTC)
    queue.expire_stale_tasks(cycle_time - STALE_TASK_AGE)

    task_id = queue.claim_oldest_pending()
    if not task_id:
        return WorkerCycleResult(outcome="idle")

    try:
        task = queue.load_claimed_task(task_id)
        analysis = analyzer(task.candidate, task.job)
        match_score = calculate_match_score(analysis)
        queue.complete(task_id, analysis, match_score)
        return WorkerCycleResult(outcome="completed", task_id=task_id)
    except JobAnalysisError as exc:
        safe_error = str(exc)
        failure_category = "analysis_service"
    except MatchScoreError:
        safe_error = "Analysis returned no applicable criteria."
        failure_category = "invalid_analysis"
    except Exception:
        safe_error = "Analysis failed."
        failure_category = "unexpected"

    try:
        queue.fail(task_id, safe_error)
    except Exception as exc:
        raise AnalysisWorkerError(
            "The failed analysis state could not be saved."
        ) from exc

    return WorkerCycleResult(
        outcome="failed",
        task_id=task_id,
        failure_category=failure_category,
    )
