import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.candidate_management_service import (  # noqa: E402
    delete_owned_candidate,
    get_owned_candidate_resume_reference,
)


class FakeQuery:
    def __init__(self, database, table_name):
        self.database = database
        self.table_name = table_name
        self.filters = []
        self.action = "select"
        self.single = False

    def select(self, *_):
        return self

    def delete(self):
        self.action = "delete"
        return self

    def eq(self, field, value):
        self.filters.append((field, value))
        return self

    def maybe_single(self):
        self.single = True
        return self

    def execute(self):
        rows = self.database[self.table_name]
        matching = [
            row
            for row in rows
            if all(str(row.get(field)) == str(value) for field, value in self.filters)
        ]
        if self.action == "delete":
            deleted_ids = {row["id"] for row in matching}
            self.database[self.table_name] = [
                row for row in rows if row["id"] not in deleted_ids
            ]
            if self.table_name == "candidates":
                self.database["match_results"] = [
                    row
                    for row in self.database["match_results"]
                    if row["candidate_id"] not in deleted_ids
                ]
        data = matching[0] if self.single and matching else matching
        if self.single and not matching:
            data = None
        return SimpleNamespace(data=data)


class FakeSupabase:
    def __init__(self):
        self.database = {
            "candidates": [
                {
                    "id": "candidate-1",
                    "recruiter_id": "recruiter-1",
                    "resume_file_url": "recruiter-1/job-1/resume.pdf",
                },
                {
                    "id": "candidate-2",
                    "recruiter_id": "recruiter-1",
                    "resume_file_url": None,
                },
                {
                    "id": "candidate-3",
                    "recruiter_id": "recruiter-2",
                    "resume_file_url": "recruiter-2/job-2/resume.pdf",
                },
            ],
            "match_results": [
                {"id": "match-1", "candidate_id": "candidate-1", "job_id": "job-1"},
                {"id": "match-2", "candidate_id": "candidate-1", "job_id": "job-2"},
                {"id": "match-3", "candidate_id": "candidate-3", "job_id": "job-2"},
            ],
            "job_postings": [{"id": "job-1"}, {"id": "job-2"}],
        }

    def table(self, table_name):
        return FakeQuery(self.database, table_name)


class CandidateManagementServiceTests(unittest.TestCase):
    def test_delete_returns_current_resume_and_cascades_all_candidate_matches(self):
        supabase = FakeSupabase()

        deleted = delete_owned_candidate(supabase, "recruiter-1", "candidate-1")

        self.assertEqual(deleted.storage_path, "recruiter-1/job-1/resume.pdf")
        self.assertEqual(
            [row["id"] for row in supabase.database["candidates"]],
            ["candidate-2", "candidate-3"],
        )
        self.assertEqual(
            [row["id"] for row in supabase.database["match_results"]],
            ["match-3"],
        )
        self.assertEqual(len(supabase.database["job_postings"]), 2)

    def test_delete_candidate_with_no_relationships_succeeds(self):
        supabase = FakeSupabase()

        deleted = delete_owned_candidate(supabase, "recruiter-1", "candidate-2")

        self.assertEqual(deleted.candidate_id, "candidate-2")
        self.assertIsNone(deleted.storage_path)
        self.assertEqual(len(supabase.database["match_results"]), 3)

    def test_other_recruiter_cannot_delete_or_read_candidate(self):
        supabase = FakeSupabase()

        reference = get_owned_candidate_resume_reference(
            supabase, "recruiter-2", "candidate-1"
        )
        deleted = delete_owned_candidate(supabase, "recruiter-2", "candidate-1")

        self.assertIsNone(reference)
        self.assertIsNone(deleted)
        self.assertEqual(len(supabase.database["candidates"]), 3)
        self.assertEqual(len(supabase.database["match_results"]), 3)


if __name__ == "__main__":
    unittest.main()
