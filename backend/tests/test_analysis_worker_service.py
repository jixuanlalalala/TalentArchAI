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
    AnalysisTaskCancelled,
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
        match_weights={
            "hard_skills": 60,
            "work_experience": 20,
            "education": 10,
            "soft_skills": 10,
        },
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
        self.assertEqual(queue.completed[0][2], 81.0)
        self.assertEqual(received[0][0].model_dump(), task().candidate.model_dump())
        self.assertNotIn("match_weights", received[0][1].model_dump())
        self.assertFalse(queue.failed)

    def test_successful_analysis_with_no_positive_applicable_weight_completes(self):
        claimed_task = task()
        claimed_task = AnalysisTask(
            task_id=claimed_task.task_id,
            candidate=claimed_task.candidate,
            job=claimed_task.job,
            match_weights={
                "hard_skills": 0,
                "work_experience": 70,
                "education": 20,
                "soft_skills": 10,
            },
        )
        queue = FakeQueue(claimed_task)

        result = process_next_analysis(
            queue,
            lambda *_: JobMatchAnalysis(
                education_score=None,
                hard_skill_score=90,
                soft_skill_score=None,
                work_experience_score=None,
                matched_skills=["Python"],
                missing_skills=[],
                summary="Strong technical evidence.",
                gap_analysis="No positively weighted criteria were applicable.",
            ),
        )

        self.assertEqual(result.outcome, "completed")
        self.assertIsNone(queue.completed[0][2])
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

    def test_deleted_claimed_task_is_treated_as_cancelled(self):
        queue = FakeQueue(task())

        def load_cancelled(_task_id):
            raise AnalysisTaskCancelled("Task was deleted.")

        queue.load_claimed_task = load_cancelled
        result = process_next_analysis(queue, lambda *_: analysis())

        self.assertEqual(result.outcome, "cancelled")
        self.assertEqual(result.task_id, "match-1")
        self.assertFalse(queue.completed)
        self.assertFalse(queue.failed)

    def test_deletion_during_completion_is_treated_as_cancelled(self):
        queue = FakeQueue(task())

        def complete_cancelled(*_):
            raise AnalysisTaskCancelled("Task was deleted.")

        queue.complete = complete_cancelled
        result = process_next_analysis(queue, lambda *_: analysis())

        self.assertEqual(result.outcome, "cancelled")
        self.assertFalse(queue.failed)

    def test_deletion_before_failure_persistence_is_treated_as_cancelled(self):
        queue = FakeQueue(task())

        def analyzer(*_):
            raise JobAnalysisError("Analysis failed safely.")

        def fail_cancelled(*_):
            raise AnalysisTaskCancelled("Task was deleted.")

        queue.fail = fail_cancelled
        result = process_next_analysis(queue, analyzer)

        self.assertEqual(result.outcome, "cancelled")
        self.assertFalse(queue.completed)


if __name__ == "__main__":
    unittest.main()
