import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models.candidate_extraction import CandidateExtraction  # noqa: E402
from services.candidate_service import (  # noqa: E402
    CandidatePersistenceError,
    CandidateSaveResult,
)
from services.match_result_service import (  # noqa: E402
    MatchResultPersistenceError,
    MatchResultSaveResult,
)
from services.resume_file_service import ResumeFileError  # noqa: E402
from services.resume_service import process_resumes  # noqa: E402
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
    @patch("services.resume_service.get_or_create_pending_match")
    @patch("services.resume_service.save_candidate")
    @patch("services.resume_service.extract_candidate_information")
    @patch("services.resume_service.upload_resume")
    @patch("services.resume_service.extract_resume_text")
    @patch("services.resume_service.validate_resume_file")
    def test_multiple_files_return_partial_success(
        self,
        validate,
        extract_text,
        upload,
        extract_candidate,
        save,
        save_match,
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
        save.return_value = CandidateSaveResult(
            candidate={"id": "candidate-1"},
            created=True,
        )
        save_match.return_value = MatchResultSaveResult(
            match_result={"id": "match-1"},
            created=True,
        )

        results = process_resumes(Mock(), "user", "job", files)

        self.assertEqual(results[0]["status"], "completed")
        self.assertEqual(results[1]["status"], "failed")

    @patch("services.resume_service.delete_resume")
    @patch("services.resume_service.save_candidate")
    @patch("services.resume_service.extract_candidate_information")
    @patch("services.resume_service.upload_resume")
    @patch("services.resume_service.extract_resume_text", return_value="Resume text")
    @patch("services.resume_service.validate_resume_file")
    def test_candidate_failure_cleans_up_uploaded_file(
        self,
        validate,
        _extract_text,
        upload,
        extract_candidate,
        save,
        delete_resume,
    ):
        validate.return_value = SimpleNamespace(original_filename="candidate.pdf")
        upload.return_value = StoredResume("resumes", "user/job/candidate.pdf")
        extract_candidate.return_value = extracted_candidate()
        save.side_effect = CandidatePersistenceError("Candidate could not be saved.")

        result = process_resumes(
            Mock(), "user", "job", [SimpleNamespace(filename="candidate.pdf")]
        )[0]

        self.assertEqual(result["status"], "failed")
        delete_resume.assert_called_once()

    @patch("services.resume_service.delete_resume")
    @patch("services.resume_service.rollback_candidate")
    @patch("services.resume_service.get_or_create_pending_match")
    @patch("services.resume_service.save_candidate")
    @patch("services.resume_service.extract_candidate_information")
    @patch("services.resume_service.upload_resume")
    @patch("services.resume_service.extract_resume_text", return_value="Resume text")
    @patch("services.resume_service.validate_resume_file")
    def test_match_failure_rolls_back_candidate_and_storage(
        self,
        validate,
        _extract_text,
        upload,
        extract_candidate,
        save,
        save_match,
        rollback,
        delete_resume,
    ):
        validate.return_value = SimpleNamespace(original_filename="candidate.pdf")
        upload.return_value = StoredResume("resumes", "user/job/candidate.pdf")
        extract_candidate.return_value = extracted_candidate()
        save.return_value = CandidateSaveResult(
            candidate={"id": "candidate-1"},
            created=True,
        )
        save_match.side_effect = MatchResultPersistenceError("Link failed.")

        result = process_resumes(
            Mock(), "user", "job", [SimpleNamespace(filename="candidate.pdf")]
        )[0]

        self.assertEqual(result["status"], "failed")
        rollback.assert_called_once()
        delete_resume.assert_called_once()


if __name__ == "__main__":
    unittest.main()
