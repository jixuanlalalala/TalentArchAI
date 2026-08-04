import sys
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models.job_match_analysis import (  # noqa: E402
    CandidateMatchProfile,
    JobMatchAnalysis,
    JobMatchContext,
)
from services.analysis_worker_service import (  # noqa: E402
    AnalysisTask,
    process_next_analysis,
)
from services.job_analysis_service import JobAnalysisError  # noqa: E402


def task():
    return AnalysisTask(
        task_id="match-1",
        candidate=CandidateMatchProfile(
            education=["BSc Computer Science"],
            hard_skills=["Python"],
            soft_skills=["Communication"],
            work_experience=["Software Intern"],
        ),
        job=JobMatchContext(
            title="Backend Engineer",
            description="Build Python services.",
            required_skills=["Python"],
            job_type="full-time",
        ),
    )


def analysis():
    return JobMatchAnalysis(
        education_score=80,
        hard_skill_score=90,
        soft_skill_score=70,
        work_experience_score=60,
        matched_skills=["Python"],
        missing_skills=[],
        summary="The candidate aligns with the core requirements.",
        gap_analysis="Additional production experience would help.",
    )


class FakeQueue:
    def __init__(self, claimed_task=None):
        self.claimed_task = claimed_task
        self.expired_before = None
        self.completed = []
        self.failed = []

    def expire_stale_tasks(self, cutoff):
        self.expired_before = cutoff
        return 0

    def claim_oldest_pending(self):
        return self.claimed_task.task_id if self.claimed_task else None

    def load_claimed_task(self, _task_id):
        return self.claimed_task

    def complete(self, task_id, result, match_score):
        self.completed.append((task_id, result, match_score))

    def fail(self, task_id, safe_error):
        self.failed.append((task_id, safe_error))


class AnalysisWorkerServiceTests(unittest.TestCase):
    def test_idle_cycle_expires_stale_tasks_without_claiming_work(self):
        queue = FakeQueue()
        now = datetime(2026, 8, 4, 12, 0, tzinfo=UTC)

        result = process_next_analysis(queue, lambda *_: analysis(), now=now)

        self.assertEqual(result.outcome, "idle")
        self.assertIsNone(result.task_id)
        self.assertEqual(queue.expired_before, now - timedelta(minutes=3))

    def test_claimed_task_is_analyzed_scored_and_completed(self):
        queue = FakeQueue(task())
        received = []

        def analyzer(candidate, job):
            received.append((candidate, job))
            return analysis()

        result = process_next_analysis(queue, analyzer)

        self.assertEqual(result.outcome, "completed")
        self.assertEqual(result.task_id, "match-1")
        self.assertEqual(queue.completed[0][0], "match-1")
        self.assertEqual(queue.completed[0][2], 77.5)
        self.assertEqual(received[0][0].model_dump(), task().candidate.model_dump())
        self.assertFalse(queue.failed)

    def test_safe_analysis_failure_marks_task_failed_without_retry(self):
        queue = FakeQueue(task())

        def analyzer(*_):
            raise JobAnalysisError("The analysis service rate limit was reached.")

        result = process_next_analysis(queue, analyzer)

        self.assertEqual(result.outcome, "failed")
        self.assertEqual(
            queue.failed,
            [("match-1", "The analysis service rate limit was reached.")],
        )
        self.assertFalse(queue.completed)

    def test_unexpected_failure_stores_only_a_generic_safe_message(self):
        queue = FakeQueue(task())

        def analyzer(*_):
            raise RuntimeError("private upstream diagnostic")

        result = process_next_analysis(queue, analyzer)

        self.assertEqual(result.outcome, "failed")
        self.assertEqual(queue.failed, [("match-1", "Analysis failed.")])


if __name__ == "__main__":
    unittest.main()
