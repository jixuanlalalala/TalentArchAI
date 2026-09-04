import json
import os

import httpx
from pydantic import ValidationError

from models.candidate_extraction import CandidateExtraction
from prompts.candidate_extraction_prompt import CANDIDATE_EXTRACTION_SYSTEM_PROMPT

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_TIMEOUT_SECONDS = 30.0
MAX_OPENROUTER_TEXT_CHARACTERS = 100_000

class OpenRouterError(RuntimeError):
    """A safe, user-facing OpenRouter extraction error."""


def extract_candidate_information(
    raw_text: str,
    *,
    client: httpx.Client | None = None,
) -> CandidateExtraction:
    api_key = os.getenv("OPENROUTER_API_KEY")
    model = os.getenv("OPENROUTER_EXTRACTION_MODEL") or os.getenv("OPENROUTER_MODEL")
    if not api_key or not model:
        raise OpenRouterError("OpenRouter is not configured on the backend.")

    resume_text = raw_text[:MAX_OPENROUTER_TEXT_CHARACTERS]
    payload = {
        "model": model,
        "temperature": 0,
        "provider": {
            "order": ["darkbloom", "akashml"],
            "allow_fallbacks": True,
        },
        "messages": [
            {"role": "system", "content": CANDIDATE_EXTRACTION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    "Extract candidate information from the resume text between "
                    "the data markers.\n\n<resume_data>\n"
                    f"{resume_text}\n"
                    "</resume_data>"
                ),
            },
        ],
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    owns_client = client is None
    request_client = client or httpx.Client(timeout=OPENROUTER_TIMEOUT_SECONDS)
    try:
        response = request_client.post(OPENROUTER_URL, headers=headers, json=payload)
    except httpx.TimeoutException as exc:
        raise OpenRouterError("Candidate extraction timed out. Please try again.") from exc
    except httpx.HTTPError as exc:
        raise OpenRouterError("Candidate extraction service is unavailable.") from exc
    finally:
        if owns_client:
            request_client.close()

    if response.status_code in (401, 403):
        raise OpenRouterError("OpenRouter authentication failed.")
    if response.status_code == 429:
        raise OpenRouterError("OpenRouter rate limit reached. Please try again later.")
    if response.status_code >= 400:
        raise OpenRouterError("OpenRouter could not process the resume.")

    try:
        body = response.json()
        content = body["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise OpenRouterError("OpenRouter returned an empty or invalid response.") from exc

    if not isinstance(content, str) or not content.strip():
        raise OpenRouterError("OpenRouter returned an empty response.")

    try:
        extracted = json.loads(content)
    except json.JSONDecodeError as exc:
        raise OpenRouterError("OpenRouter returned invalid JSON.") from exc

    try:
        return CandidateExtraction.model_validate(extracted)
    except ValidationError as exc:
        raise OpenRouterError(
            "OpenRouter returned candidate data in an invalid format."
        ) from exc
