import re

from pydantic import BaseModel, ConfigDict, field_validator

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class CandidateExtraction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None
    email: str | None
    phone: str | None
    location: str | None
    education: list[str]
    hard_skills: list[str]
    soft_skills: list[str]
    work_experience: list[str]

    @field_validator("name", "email", "phone", "location", mode="before")
    @classmethod
    def clean_optional_text(cls, value):
        if value is None:
            return None
        if not isinstance(value, str):
            raise ValueError("must be a string or null")
        cleaned = value.strip()
        return cleaned or None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value):
        if value is None:
            return None
        normalized = value.lower()
        if len(normalized) > 320 or not EMAIL_PATTERN.fullmatch(normalized):
            raise ValueError("must be a valid email address")
        return normalized

    @field_validator(
        "education",
        "hard_skills",
        "soft_skills",
        "work_experience",
        mode="before",
    )
    @classmethod
    def validate_text_list(cls, value):
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
            if len(text) > 1000:
                raise ValueError("items cannot exceed 1000 characters")
            key = text.casefold()
            if key not in seen:
                cleaned.append(text)
                seen.add(key)
        return cleaned
