import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.openrouter_service import (  # noqa: E402
    OpenRouterError,
    extract_candidate_information,
)


def candidate_payload():
    return {
        "name": "Candidate One",
        "email": "CANDIDATE@example.com",
        "phone": None,
        "location": "Kuala Lumpur",
        "education": ["BSc Computer Science"],
        "hard_skills": ["Python"],
        "soft_skills": [],
        "work_experience": ["Software Intern"],
    }


def response_with_content(content, status=200):
    return httpx.Response(
        status,
        json={"choices": [{"message": {"content": content}}]},
    )


class OpenRouterServiceTests(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(
            os.environ,
            {"OPENROUTER_API_KEY": "test-key", "OPENROUTER_MODEL": "test-model"},
        )
        self.environment.start()

    def tearDown(self):
        self.environment.stop()

    def client_for(self, response):
        return httpx.Client(
            transport=httpx.MockTransport(lambda _: response),
        )

    def test_valid_json_is_normalized(self):
        response = response_with_content(json.dumps(candidate_payload()))
        with self.client_for(response) as client:
            result = extract_candidate_information("Resume text", client=client)

        self.assertEqual(result.email, "candidate@example.com")
        self.assertEqual(result.hard_skills, ["Python"])

    def test_request_does_not_require_unsupported_response_format(self):
        def inspect_request(request):
            payload = json.loads(request.content)
            self.assertNotIn("response_format", payload)
            return response_with_content(json.dumps(candidate_payload()))

        with httpx.Client(transport=httpx.MockTransport(inspect_request)) as client:
            extract_candidate_information("Resume text", client=client)

    def test_invalid_json_is_rejected(self):
        with self.client_for(response_with_content("not json")) as client:
            with self.assertRaisesRegex(OpenRouterError, "invalid JSON"):
                extract_candidate_information("Resume text", client=client)

    def test_missing_fields_are_rejected(self):
        payload = candidate_payload()
        payload.pop("education")
        with self.client_for(response_with_content(json.dumps(payload))) as client:
            with self.assertRaisesRegex(OpenRouterError, "invalid format"):
                extract_candidate_information("Resume text", client=client)

    def test_unexpected_fields_are_rejected(self):
        payload = candidate_payload()
        payload["job_score"] = 100
        with self.client_for(response_with_content(json.dumps(payload))) as client:
            with self.assertRaisesRegex(OpenRouterError, "invalid format"):
                extract_candidate_information("Resume text", client=client)

    def test_authentication_failure_is_safe(self):
        with self.client_for(httpx.Response(401)) as client:
            with self.assertRaisesRegex(OpenRouterError, "authentication failed"):
                extract_candidate_information("Resume text", client=client)

    def test_rate_limit_is_safe(self):
        with self.client_for(httpx.Response(429)) as client:
            with self.assertRaisesRegex(OpenRouterError, "rate limit"):
                extract_candidate_information("Resume text", client=client)

    def test_timeout_is_safe(self):
        def timeout(_):
            raise httpx.ReadTimeout("timeout")

        with httpx.Client(transport=httpx.MockTransport(timeout)) as client:
            with self.assertRaisesRegex(OpenRouterError, "timed out"):
                extract_candidate_information("Resume text", client=client)


if __name__ == "__main__":
    unittest.main()
