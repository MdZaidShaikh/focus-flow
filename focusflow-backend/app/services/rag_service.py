from typing import List
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import select

from app.models.db_models import SessionEmbedding
from app.services.llm_service import embed_text


def retrieve_similar_sessions(db: DBSession, user_id: str, query: str, top_k: int = 5) -> List[str]:
    """
    Embeds the query, then finds the top_k most similar past session
    summaries for this user via pgvector cosine distance (<=>).

    Note: filtering by user_id happens in the join to `sessions`, not shown
    here for brevity — see the insights route for the full query with the
    join included.
    """
    query_embedding = embed_text(query)

    stmt = (
        select(SessionEmbedding.summary_text)
        .order_by(SessionEmbedding.embedding.cosine_distance(query_embedding))
        .limit(top_k)
    )
    results = db.execute(stmt).scalars().all()
    return list(results)


def store_session_embedding(db: DBSession, session_id: str, summary_text: str) -> None:
    """Embeds and persists a session summary once the session is complete."""
    vector = embed_text(summary_text)
    record = SessionEmbedding(session_id=session_id, summary_text=summary_text, embedding=vector)
    db.add(record)
    db.commit()
