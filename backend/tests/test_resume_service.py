import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models.candidate_extraction import CandidateExtraction  # noqa: E402
from services.candidate_service import (  # noqa: E402
    CandidatePersistenceError,
    CandidateQueueSaveResult,
)
from services.resume_file_service import ResumeFileError  # noqa: E402
from services.resume_service import (  # noqa: E402
    _extraction_interval_seconds,
    process_resumes,
)
from services.resume_storage_service import StoredResume  # noqa: E402


def extracted_candidate():
    return CandidateExtraction(
        name="Candidate",
        email="candidate@example.com",
        phone=None,
        location=None,
        education=[],
        hard_skills=[],
        soft_skills=[],
        work_experience=[],
    )


class ResumeServiceTests(unittest.TestCase):
    def test_extraction_interval_defaults_to_ten_seconds(self):
        with patch.dict("os.environ", {}, clear=True):
            self.assertEqual(_extraction_interval_seconds(), 10.0)

    @patch("services.resume_service.time.sleep")
    @patch("services.resume_service.persist_candidate_resume_and_queue_matches")
    @patch("services.resume_service.upload_resume")
    @patch("services.resume_service.extract_candidate_information")
    @patch("services.resume_service.extract_resume_text", return_value="Resume text")
    @patch("services.resume_service.validate_resume_file")
    def test_multiple_extractions_wait_between_openrouter_requests(
        self,
        validate,
        _extract_text,
        extract_candidate,
        upload,
        persist,
        sleep,
    ):
        validate.side_effect = lambda file: SimpleNamespace(
            original_filename=file.filename
        )
        extract_candidate.return_value = extracted_candidate()
        upload.side_effect = [
            StoredResume("resumes", "user/job/first.pdf"),
            StoredResume("resumes", "user/job/second.pdf"),
        ]
        persist.side_effect = [
            CandidateQueueSaveResult("candidate-1", "match-1", True),
            CandidateQueueSaveResult("candidate-2", "match-2", True),
        ]

        with patch.dict(
            "os.environ",
            {"OPENROUTER_EXTRACTION_INTERVAL_SECONDS": "12"},
        ):
            results = process_resumes(
                Mock(),
                "user",
                "job",
                [
                    SimpleNamespace(filename="first.pdf"),
                    SimpleNamespace(filename="second.pdf"),
                ],
            )

        self.assertEqual(
            [result["status"] for result in results],
            ["completed"] * 2,
        )
        sleep.assert_called_once_with(12.0)

    @patch("services.resume_service.persist_candidate_resume_and_queue_matches")
    @patch("services.resume_service.upload_resume")
    @patch("services.resume_service.extract_candidate_information")
    @patch("services.resume_service.extract_resume_text")
    @patch("services.resume_service.validate_resume_file")
    def test_multiple_files_return_partial_success(
        self,
        validate,
        extract_text,
        extract_candidate,
        upload,
        persist,
    ):
        files = [SimpleNamespace(filename="good.pdf"), SimpleNamespace(filename="bad.txt")]

        def validate_side_effect(file):
            if file.filename == "bad.txt":
                raise ResumeFileError("Only PDF and DOCX files are supported.")
            return SimpleNamespace(original_filename=file.filename)

        validate.side_effect = validate_side_effect
        extract_text.return_value = "Resume text"
        upload.return_value = StoredResume("resumes", "user/job/good.pdf")
        extract_candidate.return_value = extracted_candidate()
        persist.return_value = CandidateQueueSaveResult(
            candidate_id="candidate-1",
            match_result_id="match-1",
            candidate_created=True,
        )

        results = process_resumes(Mock(), "user", "job", files)

        self.assertEqual(results[0]["status"], "completed")
        self.assertEqual(results[1]["status"], "failed")

    @patch("services.resume_service.persist_candidate_resume_and_queue_matches")
    @patch("services.resume_service.upload_resume")
    @patch("services.resume_service.extract_candidate_information")
    @patch("services.resume_service.extract_resume_text")
    @patch("services.resume_service.validate_resume_file")
    def test_extracts_and_validates_before_uploading_and_persisting(
        self,
        validate,
        extract_text,
        extract_candidate,
        upload,
        persist,
    ):
        calls = []
        validated = SimpleNamespace(original_filename="candidate.pdf")
        validate.side_effect = lambda _file: calls.append("validate") or validated
        extract_text.side_effect = lambda _resume: calls.append("text") or "Resume text"
        extract_candidate.side_effect = (
            lambda _text: calls.append("profile") or extracted_candidate()
        )
        upload.side_effect = (
            lambda *_args: calls.append("upload")
            or StoredResume("resumes", "user/job/candidate.pdf")
        )
        persist.side_effect = (
            lambda *_args: calls.append("persist")
            or CandidateQueueSaveResult("candidate-1", "match-1", True)
        )

        result = process_resumes(
            Mock(), "user", "job", [SimpleNamespace(filename="candidate.pdf")]
        )[0]

        self.assertEqual(result["status"], "completed")
        self.assertEqual(calls, ["validate", "text", "profile", "upload", "persist"])

    @patch("services.resume_service.delete_resume")
    @patch("services.resume_service.persist_candidate_resume_and_queue_matches")
    @patch("services.resume_service.upload_resume")
    @patch("services.resume_service.extract_candidate_information")
    @patch("services.resume_service.extract_resume_text", return_value="Resume text")
    @patch("services.resume_service.validate_resume_file")
    def test_atomic_persistence_failure_cleans_up_only_the_new_uploaded_file(
        self,
        validate,
        _extract_text,
        extract_candidate,
        upload,
        persist,
        delete_resume,
    ):
        validate.return_value = SimpleNamespace(original_filename="candidate.pdf")
        upload.return_value = StoredResume("resumes", "user/job/candidate.pdf")
        extract_candidate.return_value = extracted_candidate()
        persist.side_effect = CandidatePersistenceError("Candidate could not be saved.")

        result = process_resumes(
            Mock(), "user", "job", [SimpleNamespace(filename="candidate.pdf")]
        )[0]

        self.assertEqual(result["status"], "failed")
        delete_resume.assert_called_once_with(
            unittest.mock.ANY, "user/job/candidate.pdf"
        )

    @patch("services.resume_service.delete_resume")
    @patch("services.resume_service.persist_candidate_resume_and_queue_matches")
    @patch("services.resume_service.upload_resume")
    @patch("services.resume_service.extract_candidate_information")
    @patch("services.resume_service.extract_resume_text", return_value="Resume text")
    @patch("services.resume_service.validate_resume_file")
    def test_success_removes_the_previous_resume_after_database_commit(
        self,
        validate,
        _extract_text,
        extract_candidate,
        upload,
        persist,
        delete_resume,
    ):
        validate.return_value = SimpleNamespace(original_filename="candidate.pdf")
        upload.return_value = StoredResume("resumes", "user/job/candidate.pdf")
        extract_candidate.return_value = extracted_candidate()
        persist.return_value = CandidateQueueSaveResult(
            candidate_id="candidate-1",
            match_result_id="match-1",
            candidate_created=False,
            previous_resume_file_url="user/other/old.pdf",
        )

        result = process_resumes(
            Mock(), "user", "job", [SimpleNamespace(filename="candidate.pdf")]
        )[0]

        self.assertEqual(result["status"], "completed")
        delete_resume.assert_called_once_with(
            unittest.mock.ANY, "user/other/old.pdf"
        )

    @patch("services.resume_service.upload_resume")
    @patch("services.resume_service.extract_candidate_information")
    @patch("services.resume_service.extract_resume_text", return_value="Resume text")
    @patch("services.resume_service.validate_resume_file")
    def test_extraction_failure_does_not_upload_or_change_candidate_state(
        self,
        validate,
        _extract_text,
        extract_candidate,
        upload,
    ):
        validate.return_value = SimpleNamespace(original_filename="candidate.pdf")
        extract_candidate.side_effect = CandidatePersistenceError(
            "Candidate profile is invalid."
        )

        result = process_resumes(
            Mock(), "user", "job", [SimpleNamespace(filename="candidate.pdf")]
        )[0]

        self.assertEqual(result["status"], "failed")
        upload.assert_not_called()


if __name__ == "__main__":
    unittest.main()
