import json
import os

import httpx
from pydantic import ValidationError

from models.job_match_analysis import (
    CandidateMatchProfile,
    JobMatchAnalysis,
    JobMatchContext,
)
from prompts.job_analysis_prompt import JOB_ANALYSIS_SYSTEM_PROMPT


OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_ANALYSIS_TIMEOUT_SECONDS = 60.0
STALE_TASK_THRESHOLD_SECONDS = 180.0


class JobAnalysisError(RuntimeError):
    """A privacy-safe, user-facing job analysis error."""


def _analysis_timeout_seconds() -> float:
    raw_timeout = os.getenv(
        "OPENROUTER_ANALYSIS_TIMEOUT_SECONDS",
        str(DEFAULT_ANALYSIS_TIMEOUT_SECONDS),
    )
    try:
        timeout = float(raw_timeout)
    except (TypeError, ValueError) as exc:
        raise JobAnalysisError("OpenRouter analysis timeout is invalid.") from exc

    if timeout <= 0 or timeout >= STALE_TASK_THRESHOLD_SECONDS:
        raise JobAnalysisError(
            "OpenRouter analysis timeout must be greater than 0 and less than 180 seconds."
        )
    return timeout


def analyze_candidate_for_job(
    candidate: CandidateMatchProfile,
    job: JobMatchContext,
    *,
    client: httpx.Client | None = None,
) -> JobMatchAnalysis:
    api_key = os.getenv("OPENROUTER_API_KEY")
    model = os.getenv("OPENROUTER_ANALYSIS_MODEL") or os.getenv("OPENROUTER_MODEL")
    timeout = _analysis_timeout_seconds()
    if not api_key or not model:
        raise JobAnalysisError("OpenRouter analysis is not configured.")

    candidate_json = json.dumps(candidate.model_dump(), ensure_ascii=False)
    job_json = json.dumps(job.model_dump(), ensure_ascii=False)
    payload = {
        "model": model,
        "temperature": 0,
        "provider": {
            "order": ["darkbloom"],
            "allow_fallbacks": False,
        },
        "messages": [
            {"role": "system", "content": JOB_ANALYSIS_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    "Evaluate the candidate profile against the job between the "
                    "data markers.\n\n"
                    f"<job_data>\n{job_json}\n</job_data>\n\n"
                    f"<candidate_profile>\n{candidate_json}\n</candidate_profile>"
                ),
            },
        ],
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    owns_client = client is None
    request_client = client or httpx.Client(timeout=timeout)
    try:
        response = request_client.post(OPENROUTER_URL, headers=headers, json=payload)
    except httpx.TimeoutException as exc:
        raise JobAnalysisError("Analysis timed out.") from exc
    except httpx.HTTPError as exc:
        raise JobAnalysisError("The analysis service is unavailable.") from exc
    finally:
        if owns_client:
            request_client.close()

    if response.status_code in (401, 403):
        raise JobAnalysisError("OpenRouter analysis authentication failed.")
    if response.status_code == 429:
        raise JobAnalysisError("The analysis service rate limit was reached.")
    if response.status_code >= 400:
        raise JobAnalysisError("The analysis service could not process this task.")

    try:
        body = response.json()
        content = body["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise JobAnalysisError("OpenRouter returned an invalid analysis response.") from exc

    if not isinstance(content, str) or not content.strip():
        raise JobAnalysisError("OpenRouter returned an empty analysis response.")

    try:
        analysis_data = json.loads(content)
    except json.JSONDecodeError as exc:
        raise JobAnalysisError("OpenRouter returned invalid analysis JSON.") from exc

    try:
        return JobMatchAnalysis.model_validate(analysis_data)
    except ValidationError as exc:
        raise JobAnalysisError(
            "OpenRouter returned analysis data in an invalid format."
        ) from exc
