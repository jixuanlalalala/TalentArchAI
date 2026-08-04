import sys
import unittest
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models.candidate_extraction import CandidateExtraction  # noqa: E402
from services.candidate_service import (  # noqa: E402
    persist_candidate_resume_and_queue_matches,
    save_candidate,
)
from services.match_result_service import get_or_create_pending_match  # noqa: E402


class FakeResponse:
    def __init__(self, data):
        self.data = data


class FakeTable:
    def __init__(self, database, table_name):
        self.database = database
        self.table_name = table_name
        self.action = "select"
        self.payload = None
        self.filters = []

    def select(self, *_):
        self.action = "select"
        return self

    def insert(self, payload):
        self.action = "insert"
        self.payload = payload
        return self

    def update(self, payload):
        self.action = "update"
        self.payload = payload
        return self

    def delete(self):
        self.action = "delete"
        return self

    def eq(self, field, value):
        self.filters.append((field, value))
        return self

    def maybe_single(self):
        return self

    def execute(self):
        records = self.database[self.table_name]
        matching = [
            record
            for record in records
            if all(str(record.get(field)) == str(value) for field, value in self.filters)
        ]

        if self.action == "select":
            if self.filters:
                return FakeResponse(matching[0]) if matching else None
            return FakeResponse(matching)
        if self.action == "insert":
            record = {"id": str(uuid4()), **self.payload}
            records.append(record)
            return FakeResponse([record])
        if self.action == "update":
            for record in matching:
                record.update(self.payload)
            return FakeResponse(matching)
        if self.action == "delete":
            for record in matching:
                records.remove(record)
            return FakeResponse(matching)
        raise AssertionError("Unsupported fake action")


class FakeSupabase:
    def __init__(self):
        self.database = {"candidates": [], "match_results": []}
        self.rpc_calls = []
        self.rpc_response = None

    def table(self, table_name):
        return FakeTable(self.database, table_name)

    def rpc(self, function_name, params):
        self.rpc_calls.append((function_name, params))
        return FakeRpcQuery(self.rpc_response)


class FakeRpcQuery:
    def __init__(self, response):
        self.response = response

    def execute(self):
        return self.response


def extraction(email="candidate@example.com"):
    return CandidateExtraction(
        name="Candidate",
        email=email,
        phone=None,
        location=None,
        education=[],
        hard_skills=["Python"],
        soft_skills=[],
        work_experience=[],
    )


class CandidateServiceTests(unittest.TestCase):
    def setUp(self):
        self.supabase = FakeSupabase()

    def test_existing_candidate_with_same_email_is_reused(self):
        first = save_candidate(
            self.supabase, "recruiter-1", extraction(), "first.pdf", "first text"
        )
        second = save_candidate(
            self.supabase, "recruiter-1", extraction(), "second.pdf", "second text"
        )

        self.assertTrue(first.created)
        self.assertFalse(second.created)
        self.assertEqual(first.candidate["id"], second.candidate["id"])
        self.assertEqual(len(self.supabase.database["candidates"]), 1)

    def test_missing_email_creates_separate_candidates(self):
        first = save_candidate(
            self.supabase, "recruiter-1", extraction(None), "first.pdf", "first"
        )
        second = save_candidate(
            self.supabase, "recruiter-1", extraction(None), "second.pdf", "second"
        )

        self.assertNotEqual(first.candidate["id"], second.candidate["id"])
        self.assertEqual(len(self.supabase.database["candidates"]), 2)

    def test_same_candidate_job_relationship_is_not_duplicated(self):
        candidate = save_candidate(
            self.supabase, "recruiter-1", extraction(), "resume.pdf", "text"
        ).candidate
        first = get_or_create_pending_match(
            self.supabase, "job-1", candidate["id"]
        )
        second = get_or_create_pending_match(
            self.supabase, "job-1", candidate["id"]
        )

        self.assertTrue(first.created)
        self.assertFalse(second.created)
        self.assertEqual(len(self.supabase.database["match_results"]), 1)
        for field in (
            "match_score",
            "education_score",
            "hard_skill_score",
            "soft_skill_score",
            "work_experience_score",
            "gap_analysis",
            "matched_skills",
            "missing_skills",
            "summary",
            "processing_started_at",
            "analysis_error",
        ):
            self.assertIsNone(first.match_result[field])
        self.assertEqual(first.match_result["status"], "pending")
        self.assertEqual(first.match_result["recruitment_status"], "new")

    def test_same_candidate_can_be_linked_to_different_jobs(self):
        candidate = save_candidate(
            self.supabase, "recruiter-1", extraction(), "resume.pdf", "text"
        ).candidate
        get_or_create_pending_match(self.supabase, "job-1", candidate["id"])
        get_or_create_pending_match(self.supabase, "job-2", candidate["id"])

        self.assertEqual(len(self.supabase.database["match_results"]), 2)

    def test_atomic_resume_persistence_uses_the_approved_rpc_contract(self):
        self.supabase.rpc_response = FakeResponse(
            {
                "candidate_id": "candidate-1",
                "match_result_id": "match-1",
                "candidate_created": False,
                "previous_resume_file_url": "old.pdf",
            }
        )

        result = persist_candidate_resume_and_queue_matches(
            self.supabase,
            "recruiter-1",
            "job-1",
            extraction(None),
            "new.pdf",
            "new resume text",
        )

        self.assertEqual(result.candidate_id, "candidate-1")
        self.assertEqual(result.match_result_id, "match-1")
        self.assertFalse(result.candidate_created)
        self.assertEqual(result.previous_resume_file_url, "old.pdf")
        function_name, params = self.supabase.rpc_calls[0]
        self.assertEqual(function_name, "persist_candidate_resume_and_queue_matches")
        self.assertEqual(params["p_recruiter_id"], "recruiter-1")
        self.assertEqual(params["p_job_id"], "job-1")
        self.assertIsNone(params["p_email"])
        self.assertEqual(params["p_hard_skills"], ["Python"])
        self.assertEqual(params["p_resume_file_url"], "new.pdf")
        self.assertEqual(params["p_raw_text"], "new resume text")


if __name__ == "__main__":
    unittest.main()
