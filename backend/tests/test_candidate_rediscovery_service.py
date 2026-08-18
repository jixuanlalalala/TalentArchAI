import unittest
from types import SimpleNamespace

from services.candidate_rediscovery_service import (
    calculate_preliminary_relevance,
    find_rediscovery_candidates,
    link_rediscovered_candidates,
)


class FakeQuery:
    def __init__(self, response, operations, table_name):
        self.response = response
        self.operations = operations
        self.table_name = table_name

    def select(self, fields):
        self.operations.append((self.table_name, "select", fields))
        return self

    def insert(self, payload):
        self.operations.append((self.table_name, "insert", payload))
        return self

    def eq(self, field, value):
        self.operations.append((self.table_name, "eq", field, value))
        return self

    def in_(self, field, values):
        self.operations.append((self.table_name, "in", field, values))
        return self

    def execute(self):
        return self.response


class FakeSupabase:
    def __init__(self, responses):
        self.responses = {
            table: list(table_responses)
            for table, table_responses in responses.items()
        }
        self.operations = []

    def table(self, table_name):
        return FakeQuery(
            self.responses[table_name].pop(0),
            self.operations,
            table_name,
        )


class CandidateRediscoveryScoringTests(unittest.TestCase):
    def test_combines_required_skill_and_job_context_coverage(self):
        job = {
            "title": "Backend Engineer",
            "description": "Backend engineer builds API",
            "required_skills": ["Python", "SQL"],
        }
        candidate = {
            "education": [],
            "hard_skills": ["Python"],
            "soft_skills": [],
            "work_experience": ["Backend API"],
        }

        result = calculate_preliminary_relevance(job, candidate)

        self.assertEqual(result.required_skill_coverage, 50.0)
        self.assertEqual(result.context_coverage, 50.0)
        self.assertEqual(result.preliminary_relevance, 50)

    def test_rediscovery_excludes_linked_candidates_and_caps_ranked_results(self):
        candidates = [
            {
                "id": f"candidate-{index}",
                "name": f"Candidate {index}",
                "education": [],
                "hard_skills": ["Python"],
                "soft_skills": [],
                "work_experience": ["Backend API"],
            }
            for index in range(1, 8)
        ]
        supabase = FakeSupabase(
            {
                "candidates": [SimpleNamespace(data=candidates)],
                "match_results": [
                    SimpleNamespace(data=[{"candidate_id": "candidate-1"}])
                ],
            }
        )
        job = {
            "id": "job-1",
            "title": "Backend Engineer",
            "description": "Backend engineer builds API",
            "required_skills": ["Python"],
        }

        results = find_rediscovery_candidates(
            supabase, "recruiter-1", job
        )

        self.assertEqual(len(results), 5)
        self.assertNotIn("candidate-1", {item["id"] for item in results})
        self.assertTrue(all(item["preliminary_relevance"] >= 20 for item in results))
        self.assertNotIn("required_skill_coverage", results[0])
        self.assertIn(
            ("candidates", "eq", "recruiter_id", "recruiter-1"),
            supabase.operations,
        )

    def test_bulk_link_sets_queue_fields_without_storing_relevance(self):
        candidate_ids = ["candidate-1", "candidate-2"]
        supabase = FakeSupabase(
            {
                "candidates": [
                    SimpleNamespace(data=[{"id": value} for value in candidate_ids])
                ],
                "match_results": [
                    SimpleNamespace(data=[]),
                    SimpleNamespace(
                        data=[
                            {"id": "match-1", "candidate_id": "candidate-1"},
                            {"id": "match-2", "candidate_id": "candidate-2"},
                        ]
                    ),
                ],
            }
        )

        linked = link_rediscovered_candidates(
            supabase,
            "recruiter-1",
            "job-1",
            candidate_ids,
        )

        insert = next(
            operation for operation in supabase.operations
            if operation[0:2] == ("match_results", "insert")
        )
        payloads = insert[2]
        self.assertEqual(len(linked), 2)
        self.assertTrue(all(row["status"] == "pending" for row in payloads))
        self.assertTrue(all(row["recruitment_status"] == "new" for row in payloads))
        self.assertTrue(all(row["match_score"] is None for row in payloads))
        self.assertTrue(all("preliminary_relevance" not in row for row in payloads))


if __name__ == "__main__":
    unittest.main()
