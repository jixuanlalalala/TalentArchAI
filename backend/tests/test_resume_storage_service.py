import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.resume_storage_service import (  # noqa: E402
    RESUME_SIGNED_URL_EXPIRY_SECONDS,
    ResumeUnavailableError,
    create_resume_signed_url,
)


class FakeBucket:
    def __init__(self, response=None):
        self.response = response or {
            "signedURL": "https://storage.example/signed",
            "signedUrl": "https://storage.example/signed",
        }
        self.calls = []

    def create_signed_url(self, path, expires_in):
        self.calls.append((path, expires_in))
        return self.response


class FakeStorage:
    def __init__(self, bucket):
        self.bucket = bucket
        self.requested_bucket = None

    def from_(self, bucket_name):
        self.requested_bucket = bucket_name
        return self.bucket


class FakeSupabase:
    def __init__(self, bucket):
        self.storage = FakeStorage(bucket)


class ResumeStorageServiceTests(unittest.TestCase):
    def test_signed_url_uses_private_bucket_path_and_five_minute_expiry(self):
        bucket = FakeBucket()
        supabase = FakeSupabase(bucket)

        url = create_resume_signed_url(
            supabase,
            "recruiter-1",
            "recruiter-1/job-1/resume.pdf",
        )

        self.assertEqual(url, "https://storage.example/signed")
        self.assertEqual(supabase.storage.requested_bucket, "resumes")
        self.assertEqual(
            bucket.calls,
            [("recruiter-1/job-1/resume.pdf", RESUME_SIGNED_URL_EXPIRY_SECONDS)],
        )
        self.assertEqual(RESUME_SIGNED_URL_EXPIRY_SECONDS, 300)

    def test_other_recruiter_or_traversal_path_is_rejected_before_storage(self):
        for path in (
            "recruiter-2/job-1/resume.pdf",
            "recruiter-1/../resume.pdf",
            "recruiter-1\\job-1\\resume.pdf",
        ):
            with self.subTest(path=path):
                bucket = FakeBucket()
                with self.assertRaisesRegex(
                    ResumeUnavailableError, "Resume file is unavailable"
                ):
                    create_resume_signed_url(
                        FakeSupabase(bucket), "recruiter-1", path
                    )
                self.assertEqual(bucket.calls, [])

    def test_empty_signed_url_response_is_unavailable(self):
        with self.assertRaisesRegex(
            ResumeUnavailableError, "Resume file is unavailable"
        ):
            create_resume_signed_url(
                FakeSupabase(FakeBucket({"signedURL": None})),
                "recruiter-1",
                "recruiter-1/job-1/resume.pdf",
            )


if __name__ == "__main__":
    unittest.main()
