from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from app.db.session import get_db
from app.models import db_models as models
from app.schemas.schemas import (
    SessionCreate,
    BreakdownResponse,
    SubtaskOut,
    ScheduleResponse,
    PomodoroBlockOut,
    BlockUpdate,
)
from app.services.llm_service import break_down_task
from app.services.scheduler_service import schedule_pomodoros
from app.services.rag_service import store_session_embedding

router = APIRouter(prefix="/sessions", tags=["sessions"])

# NOTE: user_id would normally come from the validated Cognito JWT (via a
# dependency that decodes the token). Left as a placeholder here to keep
# this scaffold focused — wire up real auth before deploying.
PLACEHOLDER_USER_ID = "00000000-0000-0000-0000-000000000000"


@router.post("", status_code=201)
def create_session(payload: SessionCreate, db: DBSession = Depends(get_db)):
    session = models.Session(
        user_id=PLACEHOLDER_USER_ID,
        raw_input=payload.raw_input,
        day_start=payload.day_start,
        day_end=payload.day_end,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"session_id": session.id}


@router.post("/{session_id}/breakdown", response_model=BreakdownResponse)
def breakdown_session(session_id: str, db: DBSession = Depends(get_db)):
    session = db.get(models.Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    subtasks = break_down_task(session.raw_input)

    # Clear any tasks from a previous breakdown call on this session, so
    # re-running breakdown replaces rather than accumulates subtasks.
    db.query(models.Task).filter(models.Task.session_id == session.id).delete()

    for subtask in subtasks:
        db.add(
            models.Task(
                session_id=session.id,
                title=subtask["title"],
                estimated_pomodoros=subtask["estimated_pomodoros"],
            )
        )
    db.commit()

    return BreakdownResponse(
        session_id=session_id,
        subtasks=[SubtaskOut(**s) for s in subtasks],
    )


@router.post("/{session_id}/schedule", response_model=ScheduleResponse)
def schedule_session(session_id: str, db: DBSession = Depends(get_db)):
    session = db.get(models.Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    tasks = db.query(models.Task).filter(models.Task.session_id == session_id).all()
    subtasks = [{"title": t.title, "estimated_pomodoros": t.estimated_pomodoros} for t in tasks]
    task_by_title = {t.title: t for t in tasks}

    # Clear any blocks from a previous schedule call on this session
    # (session_id catches break blocks too, which have no task_id).
    db.query(models.PomodoroBlock).filter(models.PomodoroBlock.session_id == session_id).delete()

    blocks = schedule_pomodoros(subtasks, session.day_start, session.day_end)

    for block in blocks:
        task = task_by_title.get(block["task_title"])
        db.add(
            models.PomodoroBlock(
                session_id=session_id,
                task_id=task.id if task else None,
                start_time=block["start_time"],
                end_time=block["end_time"],
                is_break=block["is_break"],
            )
        )
    db.commit()

    saved_blocks = (
        db.query(models.PomodoroBlock)
        .filter(models.PomodoroBlock.session_id == session_id)
        .order_by(models.PomodoroBlock.start_time)
        .all()
    )
    title_by_task_id = {t.id: t.title for t in tasks}

    return ScheduleResponse(
        session_id=session_id,
        blocks=[
            PomodoroBlockOut(
                id=b.id,
                task_title="Break" if b.is_break else title_by_task_id.get(b.task_id, "Unknown"),
                start_time=b.start_time,
                end_time=b.end_time,
                is_break=b.is_break,
                completed=b.completed,
            )
            for b in saved_blocks
        ],
    )


@router.patch("/blocks/{block_id}")
def update_block(block_id: str, payload: BlockUpdate, db: DBSession = Depends(get_db)):
    block = db.get(models.PomodoroBlock, block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    block.completed = payload.completed
    db.commit()
    return {"ok": True}


@router.post("/{session_id}/complete")
def complete_session(session_id: str, db: DBSession = Depends(get_db)):
    """
    Call once a day's session is done. Summarizes what happened and stores
    an embedding of it, feeding future RAG-powered insights.
    """
    session = db.get(models.Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    tasks = db.query(models.Task).filter(models.Task.session_id == session_id).all()
    summary = "; ".join(
        f"{t.title}: estimated {t.estimated_pomodoros}, actual {t.actual_pomodoros}, status {t.status}"
        for t in tasks
    )
    store_session_embedding(db, session_id, summary)
    return {"ok": True, "summary": summary}
