import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.job_service import get_jobs  # noqa: E402


class FakeQuery:
    def __init__(self, response):
        self.response = response

    def select(self, *_):
        return self

    def eq(self, *_):
        return self

    def in_(self, *_):
        return self

    def order(self, *_args, **_kwargs):
        return self

    def execute(self):
        return self.response


class FakeSupabase:
    def __init__(self, responses):
        self.responses = {
            table_name: list(table_responses)
            for table_name, table_responses in responses.items()
        }

    def table(self, table_name):
        return FakeQuery(self.responses[table_name].pop(0))


class JobServiceTests(unittest.TestCase):
    def test_jobs_include_real_candidate_counts(self):
        supabase = FakeSupabase(
            {
                "job_postings": [
                    SimpleNamespace(
                        data=[
                            {"id": "job-1", "title": "First"},
                            {"id": "job-2", "title": "Second"},
                        ]
                    )
                ],
                "match_results": [
                    SimpleNamespace(
                        data=[
                            {"job_id": "job-1"},
                            {"job_id": "job-1"},
                            {"job_id": "job-2"},
                        ]
                    )
                ],
            }
        )

        jobs = get_jobs(supabase, "recruiter-1")

        self.assertEqual(jobs[0]["candidate_count"], 2)
        self.assertEqual(jobs[1]["candidate_count"], 1)

    def test_jobs_without_matches_have_zero_candidates(self):
        supabase = FakeSupabase(
            {
                "job_postings": [
                    SimpleNamespace(data=[{"id": "job-1", "title": "First"}])
                ],
                "match_results": [SimpleNamespace(data=[])],
            }
        )

        jobs = get_jobs(supabase, "recruiter-1")

        self.assertEqual(jobs[0]["candidate_count"], 0)


if __name__ == "__main__":
    unittest.main()
