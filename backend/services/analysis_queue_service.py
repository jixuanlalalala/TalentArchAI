from datetime import datetime

from pydantic import ValidationError

from models.job_match_analysis import CandidateMatchProfile, JobMatchAnalysis, JobMatchContext
from services.analysis_config import validate_match_score_weights
from services.analysis_worker_service import AnalysisTask, AnalysisTaskCancelled


CANDIDATE_ANALYSIS_FIELDS = (
    "education,hard_skills,soft_skills,work_experience"
)
JOB_ANALYSIS_FIELDS = (
    "title,description,required_skills,type,hard_skill_weight,"
    "work_experience_weight,education_weight,soft_skill_weight"
)


class AnalysisQueueError(RuntimeError):
    """A privacy-safe queue persistence error."""


def _response_data(response, default=None):
    data = getattr(response, "data", None)
    return default if data is None else data


class SupabaseAnalysisQueue:
    def __init__(self, supabase):
        self.supabase = supabase

    def expire_stale_tasks(self, cutoff: datetime) -> int:
        try:
            response = (
                self.supabase.table("match_results")
                .update(
                    {
                        "status": "failed",
                        "analysis_error": "Analysis timed out.",
                    }
                )
                .eq("status", "processing")
                .lt("processing_started_at", cutoff.isoformat())
                .execute()
            )
        except Exception as exc:
            raise AnalysisQueueError("Stale analysis tasks could not be updated.") from exc
        return len(_response_data(response, []))

    def claim_oldest_pending(self) -> str | None:
        try:
            response = self.supabase.rpc("claim_pending_match_result").execute()
            data = _response_data(response)
        except Exception as exc:
            raise AnalysisQueueError("An analysis task could not be claimed.") from exc

        if isinstance(data, list):
            data = data[0] if data else None
        if isinstance(data, dict):
            data = data.get("claim_pending_match_result")
        return str(data) if data else None

    def load_claimed_task(self, task_id: str) -> AnalysisTask:
        try:
            match_response = (
                self.supabase.table("match_results")
                .select("id,job_id,candidate_id,status")
                .eq("id", task_id)
                .eq("status", "processing")
                .maybe_single()
                .execute()
            )
            match = _response_data(match_response)
            if not match:
                raise AnalysisTaskCancelled(
                    "The claimed analysis task was deleted."
                )

            candidate_response = (
                self.supabase.table("candidates")
                .select(CANDIDATE_ANALYSIS_FIELDS)
                .eq("id", match["candidate_id"])
                .maybe_single()
                .execute()
            )
            candidate_data = _response_data(candidate_response)

            job_response = (
                self.supabase.table("job_postings")
                .select(JOB_ANALYSIS_FIELDS)
                .eq("id", match["job_id"])
                .maybe_single()
                .execute()
            )
            job_data = _response_data(job_response)
            if not candidate_data or not job_data:
                raise AnalysisTaskCancelled(
                    "The claimed analysis data was deleted."
                )

            return AnalysisTask(
                task_id=str(match["id"]),
                candidate=CandidateMatchProfile.model_validate(candidate_data),
                job=JobMatchContext(
                    title=job_data.get("title"),
                    description=job_data.get("description"),
                    required_skills=job_data.get("required_skills") or [],
                    job_type=job_data.get("type"),
                ),
                match_weights=validate_match_score_weights(
                    {
                        "hard_skills": job_data.get("hard_skill_weight"),
                        "work_experience": job_data.get(
                            "work_experience_weight"
                        ),
                        "education": job_data.get("education_weight"),
                        "soft_skills": job_data.get("soft_skill_weight"),
                    }
                ),
            )
        except AnalysisTaskCancelled:
            raise
        except AnalysisQueueError:
            raise
        except (KeyError, TypeError, ValidationError) as exc:
            raise AnalysisQueueError("Analysis data could not be loaded.") from exc
        except Exception as exc:
            raise AnalysisQueueError("Analysis data could not be loaded.") from exc

    def complete(
        self,
        task_id: str,
        analysis: JobMatchAnalysis,
        match_score: float | None,
    ) -> None:
        payload = {
            "status": "completed",
            "match_score": match_score,
            **analysis.model_dump(),
            "analysis_error": None,
        }
        try:
            response = (
                self.supabase.table("match_results")
                .update(payload)
                .eq("id", task_id)
                .eq("status", "processing")
                .execute()
            )
            if not _response_data(response, []):
                raise AnalysisTaskCancelled(
                    "The claimed analysis task was deleted."
                )
        except AnalysisTaskCancelled:
            raise
        except AnalysisQueueError:
            raise
        except Exception as exc:
            raise AnalysisQueueError(
                "The completed analysis could not be saved."
            ) from exc

    def fail(self, task_id: str, safe_error: str) -> None:
        error_message = (safe_error or "Analysis failed.").strip()[:500]
        try:
            response = (
                self.supabase.table("match_results")
                .update(
                    {
                        "status": "failed",
                        "analysis_error": error_message,
                    }
                )
                .eq("id", task_id)
                .eq("status", "processing")
                .execute()
            )
            if not _response_data(response, []):
                raise AnalysisTaskCancelled(
                    "The claimed analysis task was deleted."
                )
        except AnalysisTaskCancelled:
            raise
        except AnalysisQueueError:
            raise
        except Exception as exc:
            raise AnalysisQueueError(
                "The failed analysis state could not be saved."
            ) from exc
