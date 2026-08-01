from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session as DBSession

from app.db.session import get_db
from app.schemas.schemas import InsightsResponse
from app.services.rag_service import retrieve_similar_sessions
from app.services.llm_service import synthesize_insight

from app.api.deps import get_current_user
from app.models.db_models import User

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("", response_model=InsightsResponse)
def get_insights(
    query: str = Query(..., description="e.g. 'what tasks do I tend to underestimate'"),
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    RAG in action: embed the query, retrieve the most similar past
    sessions via pgvector, then ask Gemini to synthesize the pattern
    across just those retrieved sessions (not the user's entire history).
    """
    relevant = retrieve_similar_sessions(db, current_user.id, query)
    insight = (
        synthesize_insight(query, relevant)
        if relevant
        else "Not enough session history yet."
    )

    return InsightsResponse(query=query, relevant_sessions=relevant, insight=insight)
