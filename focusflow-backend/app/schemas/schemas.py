from datetime import datetime
from typing import List
from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    raw_input: str = Field(..., description="Free-text goals/tasks for the day")
    day_start: datetime
    day_end: datetime


class SubtaskOut(BaseModel):
    title: str
    estimated_pomodoros: int


class BreakdownResponse(BaseModel):
    session_id: str
    subtasks: List[SubtaskOut]


class PomodoroBlockOut(BaseModel):
    id: str
    task_title: str
    start_time: datetime
    end_time: datetime
    is_break: bool
    completed: bool

    class Config:
        from_attributes = True


class ScheduleResponse(BaseModel):
    session_id: str
    blocks: List[PomodoroBlockOut]


class BlockUpdate(BaseModel):
    completed: bool


class InsightsResponse(BaseModel):
    query: str
    relevant_sessions: List[str]  # summaries of the most similar past sessions
    insight: str  # LLM-generated synthesis of the pattern


class SessionHistoryItem(BaseModel):
    id: str
    raw_input: str
    day_start: datetime
    day_end: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class SessionHistoryResponse(BaseModel):
    sessions: List[SessionHistoryItem]


class SessionDetailResponse(BaseModel):
    session_id: str
    raw_input: str
    day_start: datetime
    day_end: datetime
    subtasks: List[SubtaskOut]
    blocks: List[PomodoroBlockOut]
