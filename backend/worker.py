import os
import time

from services.analysis_queue_service import AnalysisQueueError, SupabaseAnalysisQueue
from services.analysis_worker_service import AnalysisWorkerError, process_next_analysis
from services.job_analysis_service import analyze_candidate_for_job
from services.supabase_client import create_service_client


DEFAULT_POLL_INTERVAL_SECONDS = 5.0
DEFAULT_ANALYSIS_INTERVAL_SECONDS = 10.0


def _poll_interval_seconds() -> float:
    raw_interval = os.getenv(
        "ANALYSIS_WORKER_POLL_SECONDS",
        str(DEFAULT_POLL_INTERVAL_SECONDS),
    )
    try:
        interval = float(raw_interval)
    except (TypeError, ValueError) as exc:
        raise RuntimeError("ANALYSIS_WORKER_POLL_SECONDS must be a number.") from exc
    if interval <= 0:
        raise RuntimeError("ANALYSIS_WORKER_POLL_SECONDS must be greater than zero.")
    return interval


def _analysis_interval_seconds() -> float:
    raw_interval = os.getenv(
        "OPENROUTER_ANALYSIS_INTERVAL_SECONDS",
        str(DEFAULT_ANALYSIS_INTERVAL_SECONDS),
    )
    try:
        interval = float(raw_interval)
    except (TypeError, ValueError) as exc:
        raise RuntimeError(
            "OPENROUTER_ANALYSIS_INTERVAL_SECONDS must be a number."
        ) from exc
    if interval <= 0:
        raise RuntimeError(
            "OPENROUTER_ANALYSIS_INTERVAL_SECONDS must be greater than zero."
        )
    return interval


def run_worker() -> None:
    queue = SupabaseAnalysisQueue(create_service_client())
    poll_interval = _poll_interval_seconds()
    analysis_interval = _analysis_interval_seconds()
    print(
        "[analysis-worker] started mode=sequential "
        f"request_interval_seconds={analysis_interval:g}"
    )

    while True:
        started_at = time.monotonic()
        try:
            result = process_next_analysis(queue, analyze_candidate_for_job)
        except (AnalysisQueueError, AnalysisWorkerError):
            print("[analysis-worker] status=error category=queue")
            time.sleep(poll_interval)
            continue
        except Exception:
            print("[analysis-worker] status=error category=unexpected")
            time.sleep(poll_interval)
            continue

        if result.outcome == "idle":
            time.sleep(poll_interval)
            continue

        elapsed = time.monotonic() - started_at
        log_line = (
            f"[analysis-worker] task={result.task_id} "
            f"status={result.outcome} elapsed_seconds={elapsed:.2f}"
        )
        if result.failure_category:
            log_line += f" category={result.failure_category}"
        print(log_line)
        time.sleep(analysis_interval)


if __name__ == "__main__":
    try:
        run_worker()
    except KeyboardInterrupt:
        print("[analysis-worker] stopped")
