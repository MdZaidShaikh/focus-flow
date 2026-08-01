from typing import List

from pydantic import BaseModel, Field

from app.core.config import settings

from google import genai

client = genai.Client(api_key=settings.gemini_api_key)


class Subtask(BaseModel):
    title: str = Field(description="A concrete, actionable subtask")
    estimated_pomodoros: int = Field(
        description="Number of 25-minute pomodoros this subtask will take"
    )


class Breakdown(BaseModel):
    subtasks: List[Subtask]


def break_down_task(raw_input: str) -> List[dict]:
    """
    Uses the Interactions API with structured output (a Pydantic schema)
    to force the model to return clean, parseable JSON rather than prose.
    """
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


def embed_text(text: str) -> List[float]:
    """
    Embeddings still go through client.models.embed_content — this endpoint
    is unchanged by the Interactions API, which only covers generation.
    """
    result = client.models.embed_content(
        model=settings.gemini_embedding_model,
        contents=text,
    )
    return result.embeddings[0].values


def synthesize_insight(query: str, past_session_summaries: List[str]) -> str:
    """
    Given retrieved past sessions (via pgvector similarity search), asks
    Gemini to synthesize a pattern in plain language.
    """
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
