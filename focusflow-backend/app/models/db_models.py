import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.db.session import Base


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    cognito_sub = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    sessions = relationship("Session", back_populates="user")


class Session(Base):
    """One day's planning session — a raw goal/task list plus its schedule."""

    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    raw_input = Column(Text, nullable=False)  # what the user typed in
    day_start = Column(DateTime, nullable=False)
    day_end = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sessions")
    tasks = relationship("Task", back_populates="session", cascade="all, delete-orphan")
    embedding = relationship(
        "SessionEmbedding", back_populates="session", uselist=False
    )


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    session_id = Column(UUID(as_uuid=False), ForeignKey("sessions.id"), nullable=False)
    title = Column(String, nullable=False)
    estimated_pomodoros = Column(Integer, nullable=False)
    actual_pomodoros = Column(Integer, default=0)
    status = Column(String, default="pending")  # pending | in_progress | done | skipped

    session = relationship("Session", back_populates="tasks")
    blocks = relationship(
        "PomodoroBlock", back_populates="task", cascade="all, delete-orphan"
    )


class PomodoroBlock(Base):
    __tablename__ = "pomodoro_blocks"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    session_id = Column(UUID(as_uuid=False), ForeignKey("sessions.id"), nullable=False)
    task_id = Column(UUID(as_uuid=False), ForeignKey("tasks.id"), nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    is_break = Column(Boolean, default=False)
    completed = Column(Boolean, default=False)

    task = relationship("Task", back_populates="blocks")


class SessionEmbedding(Base):
    """
    One embedding per session, summarizing what was worked on and how it went.
    Retrieved via cosine similarity for the /insights endpoint (RAG).
    gemini-embedding-001 produces 3072-dim vectors at full fidelity.
    """

    __tablename__ = "session_embeddings"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    session_id = Column(
        UUID(as_uuid=False), ForeignKey("sessions.id"), unique=True, nullable=False
    )
    summary_text = Column(Text, nullable=False)  # the text that was embedded
    embedding = Column(Vector(3072), nullable=False)

    session = relationship("Session", back_populates="embedding")
