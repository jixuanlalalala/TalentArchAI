import sys
import unittest
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models.job_match_analysis import JobMatchAnalysis  # noqa: E402
from services.analysis_queue_service import SupabaseAnalysisQueue  # noqa: E402
from services.analysis_worker_service import AnalysisTaskCancelled  # noqa: E402


class FakeQuery:
    def __init__(self, response, operations):
        self.response = response
        self.operations = operations

    def select(self, fields):
        self.operations.append(("select", fields))
        return self

    def update(self, payload):
        self.operations.append(("update", payload))
        return self

    def eq(self, field, value):
        self.operations.append(("eq", field, value))
        return self

    def lt(self, field, value):
        self.operations.append(("lt", field, value))
        return self

    def maybe_single(self):
        self.operations.append(("maybe_single",))
        return self

    def execute(self):
        return self.response


class FakeSupabase:
    def __init__(self, table_responses=None, rpc_response=None):
        self.table_responses = {
            name: list(responses)
            for name, responses in (table_responses or {}).items()
        }
        self.rpc_response = rpc_response
        self.operations = []

    def table(self, name):
        self.operations.append(("table", name))
        response = self.table_responses[name].pop(0)
        return FakeQuery(response, self.operations)

    def rpc(self, name):
        self.operations.append(("rpc", name))
        return FakeQuery(self.rpc_response, self.operations)


def analysis():
    return JobMatchAnalysis(
        education_score=80,
        hard_skill_score=90,
        soft_skill_score=None,
        work_experience_score=60,
        matched_skills=["Python"],
        missing_skills=["Docker"],
        summary="Strong alignment.",
        gap_analysis="Docker experience is missing.",
    )


class AnalysisQueueServiceTests(unittest.TestCase):
    def test_claim_uses_the_atomic_database_function(self):
        supabase = FakeSupabase(rpc_response=SimpleNamespace(data="match-1"))

        task_id = SupabaseAnalysisQueue(supabase).claim_oldest_pending()

        self.assertEqual(task_id, "match-1")
        self.assertIn(("rpc", "claim_pending_match_result"), supabase.operations)

    def test_load_requests_only_approved_candidate_and_job_fields(self):
        supabase = FakeSupabase(
            table_responses={
                "match_results": [
                    SimpleNamespace(
                        data={
                            "id": "match-1",
                            "job_id": "job-1",
                            "candidate_id": "candidate-1",
                            "status": "processing",
                        }
                    )
                ],
                "candidates": [
                    SimpleNamespace(
                        data={
                            "education": ["BSc"],
                            "hard_skills": ["Python"],
                            "soft_skills": [],
                            "work_experience": ["Intern"],
                        }
                    )
                ],
                "job_postings": [
                    SimpleNamespace(
                        data={
                            "title": "Engineer",
                            "description": "Build services.",
                            "required_skills": ["Python"],
                            "type": "full-time",
                            "hard_skill_weight": 55,
                            "work_experience_weight": 25,
                            "education_weight": 10,
                            "soft_skill_weight": 10,
                        }
                    )
                ],
            }
        )

        loaded = SupabaseAnalysisQueue(supabase).load_claimed_task("match-1")

        candidate_select = next(
            entry[1]
            for entry in supabase.operations
            if entry[0] == "select" and "education" in entry[1]
        )
        self.assertEqual(
            candidate_select,
            "education,hard_skills,soft_skills,work_experience",
        )
        for forbidden in ("name", "email", "phone", "location", "raw_text"):
            self.assertNotIn(forbidden, candidate_select)
        self.assertEqual(loaded.task_id, "match-1")
        self.assertEqual(loaded.job.title, "Engineer")
        self.assertEqual(loaded.match_weights["hard_skills"], 55)
        self.assertNotIn("hard_skill_weight", loaded.job.model_dump())

    def test_completion_persists_scores_and_completed_status(self):
        supabase = FakeSupabase(
            table_responses={
                "match_results": [SimpleNamespace(data=[{"id": "match-1"}])]
            }
        )

        SupabaseAnalysisQueue(supabase).complete("match-1", analysis(), None)

        update_payload = next(
            entry[1]
            for entry in supabase.operations
            if entry[0] == "update"
        )
        self.assertEqual(update_payload["status"], "completed")
        self.assertIsNone(update_payload["match_score"])
        self.assertEqual(update_payload["hard_skill_score"], 90)
        self.assertIsNone(update_payload["analysis_error"])
        self.assertIn(("eq", "status", "processing"), supabase.operations)

    def test_missing_claimed_task_is_reported_as_cancelled(self):
        supabase = FakeSupabase(
            table_responses={
                "match_results": [SimpleNamespace(data=None)],
            }
        )

        with self.assertRaises(AnalysisTaskCancelled):
            SupabaseAnalysisQueue(supabase).load_claimed_task("match-1")

    def test_candidate_deleted_after_claim_is_reported_as_cancelled(self):
        supabase = FakeSupabase(
            table_responses={
                "match_results": [
                    SimpleNamespace(
                        data={
                            "id": "match-1",
                            "job_id": "job-1",
                            "candidate_id": "candidate-1",
                            "status": "processing",
                        }
                    )
                ],
                "candidates": [SimpleNamespace(data=None)],
                "job_postings": [
                    SimpleNamespace(
                        data={
                            "title": "Engineer",
                            "description": "Build services.",
                            "required_skills": ["Python"],
                            "type": "full-time",
                            "hard_skill_weight": 45,
                            "work_experience_weight": 30,
                            "education_weight": 15,
                            "soft_skill_weight": 10,
                        }
                    )
                ],
            }
        )

        with self.assertRaises(AnalysisTaskCancelled):
            SupabaseAnalysisQueue(supabase).load_claimed_task("match-1")

    def test_zero_row_completion_is_reported_as_cancelled(self):
        supabase = FakeSupabase(
            table_responses={
                "match_results": [SimpleNamespace(data=[])],
            }
        )

        with self.assertRaises(AnalysisTaskCancelled):
            SupabaseAnalysisQueue(supabase).complete("match-1", analysis(), 78.25)

    def test_zero_row_failure_update_is_reported_as_cancelled(self):
        supabase = FakeSupabase(
            table_responses={
                "match_results": [SimpleNamespace(data=[])],
            }
        )

        with self.assertRaises(AnalysisTaskCancelled):
            SupabaseAnalysisQueue(supabase).fail("match-1", "Analysis failed.")

    def test_stale_processing_tasks_are_failed_after_three_minutes(self):
        supabase = FakeSupabase(
            table_responses={
                "match_results": [SimpleNamespace(data=[{"id": "stale-1"}])]
            }
        )
        cutoff = datetime(2026, 8, 4, 12, 0, tzinfo=UTC)

        count = SupabaseAnalysisQueue(supabase).expire_stale_tasks(cutoff)

        self.assertEqual(count, 1)
        self.assertIn(
            ("update", {"status": "failed", "analysis_error": "Analysis timed out."}),
            supabase.operations,
        )
        self.assertIn(("eq", "status", "processing"), supabase.operations)
        self.assertIn(
            ("lt", "processing_started_at", cutoff.isoformat()),
            supabase.operations,
        )


if __name__ == "__main__":
    unittest.main()
