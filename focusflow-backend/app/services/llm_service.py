import hashlib
import re
from typing import List

from pydantic import BaseModel, Field

from app.core.config import settings

try:
    from google import genai
except ImportError:  # pragma: no cover - defensive import path
    genai = None


def _has_gemini_key() -> bool:
    return bool(settings.gemini_api_key and settings.gemini_api_key != "your-gemini-api-key-here")


client = genai.Client(api_key=settings.gemini_api_key) if genai and _has_gemini_key() else None


class Subtask(BaseModel):
    title: str = Field(description="A concrete, actionable subtask")
    estimated_pomodoros: int = Field(
        description="Number of 25-minute pomodoros this subtask will take"
    )


class Breakdown(BaseModel):
    subtasks: List[Subtask]


def _fallback_subtasks(raw_input: str) -> List[dict]:
    parts = [part.strip() for part in re.split(r"[\n,;]+", raw_input) if part.strip()]
    if not parts:
        return [{"title": "Plan your day", "estimated_pomodoros": 1}]

    subtasks: List[dict] = []
    for index, part in enumerate(parts[:6], start=1):
        title = part if len(part) <= 60 else part[:57] + "..."
        estimated_pomodoros = 2 if len(part.split()) > 6 else 1
        subtasks.append({"title": title, "estimated_pomodoros": estimated_pomodoros})
    return subtasks


def _fallback_embedding(text: str) -> List[float]:
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    vector = [0.0] * 3072
    for index, value in enumerate(digest):
        vector[index] = round(value / 255.0, 6)
    return vector


def break_down_task(raw_input: str) -> List[dict]:
    """
    Uses the Interactions API with structured output (a Pydantic schema)
    to force the model to return clean, parseable JSON rather than prose.
    Falls back to a simple heuristic when Gemini is unavailable.
    """
    if not client:
        return _fallback_subtasks(raw_input)

    try:
        interaction = client.interactions.create(
            model=settings.gemini_model,
            input=(
                "Break the following goal/task list into concrete, actionable "
                "subtasks with realistic pomodoro (25 min) time estimates. "
                f"Input: {raw_input}"
            ),
            response_format={
                "type": "text",
                "mime_type": "application/json",
                "schema": Breakdown.model_json_schema(),
            },
        )
        breakdown = Breakdown.model_validate_json(interaction.output_text)
        return [s.model_dump() for s in breakdown.subtasks]
    except Exception:
        return _fallback_subtasks(raw_input)


def embed_text(text: str) -> List[float]:
    """
    Embeddings still go through client.models.embed_content — this endpoint
    is unchanged by the Interactions API, which only covers generation.
    Falls back to a deterministic local embedding when Gemini is unavailable.
    """
    if not client:
        return _fallback_embedding(text)

    try:
        result = client.models.embed_content(
            model=settings.gemini_embedding_model,
            contents=text,
        )
        return result.embeddings[0].values
    except Exception:
        return _fallback_embedding(text)


def synthesize_insight(query: str, past_session_summaries: List[str]) -> str:
    """
    Given retrieved past sessions (via pgvector similarity search), asks
    Gemini to synthesize a pattern in plain language.
    Falls back to a local summary when Gemini is unavailable.
    """
    if not client:
        return (
            "No Gemini API key configured; using the local fallback. "
            f"Past sessions suggest a pattern around: {query}."
        )

    try:
        context = "\n".join(f"- {s}" for s in past_session_summaries)
        interaction = client.interactions.create(
            model=settings.gemini_model,
            input=(
                f"Based on these past work sessions:\n{context}\n\n"
                f"Answer this question about the user's patterns: {query}\n"
                "Be specific and concise, citing the pattern you observed."
            ),
        )
        return interaction.output_text
    except Exception:
        return (
            "The Gemini request failed, so a local fallback summary is being used. "
            f"Past sessions suggest a pattern around: {query}."
        )
