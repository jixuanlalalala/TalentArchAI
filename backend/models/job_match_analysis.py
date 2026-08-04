from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator


Score = Annotated[int, Field(strict=True, ge=0, le=100)]


class CandidateMatchProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    education: list[str]
    hard_skills: list[str]
    soft_skills: list[str]
    work_experience: list[str]


class JobMatchContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    description: str
    required_skills: list[str]
    job_type: str | None = None


class JobMatchAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    education_score: Score | None
    hard_skill_score: Score | None
    soft_skill_score: Score | None
    work_experience_score: Score | None
    matched_skills: list[str]
    missing_skills: list[str]
    summary: str
    gap_analysis: str

    @field_validator("matched_skills", "missing_skills", mode="before")
    @classmethod
    def validate_skill_list(cls, value):
        if not isinstance(value, list):
            raise ValueError("must be an array")
        if len(value) > 100:
            raise ValueError("cannot contain more than 100 items")

        cleaned = []
        seen = set()
        for item in value:
            if not isinstance(item, str):
                raise ValueError("items must be strings")
            text = item.strip()
            if not text:
                continue
            if len(text) > 200:
                raise ValueError("items cannot exceed 200 characters")
            key = text.casefold()
            if key not in seen:
                cleaned.append(text)
                seen.add(key)
        return cleaned

    @field_validator("summary", "gap_analysis", mode="before")
    @classmethod
    def validate_explanation(cls, value):
        if not isinstance(value, str):
            raise ValueError("must be text")
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("must not be empty")
        if len(cleaned) > 4000:
            raise ValueError("cannot exceed 4000 characters")
        return cleaned
