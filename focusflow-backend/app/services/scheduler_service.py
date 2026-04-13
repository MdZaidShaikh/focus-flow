from datetime import datetime, timedelta
from typing import List, TypedDict

from app.core.config import settings


class ScheduledBlock(TypedDict):
    task_title: str
    start_time: datetime
    end_time: datetime
    is_break: bool


def schedule_pomodoros(
    subtasks: List[dict],
    day_start: datetime,
    day_end: datetime,
) -> List[ScheduledBlock]:
    """
    Packs estimated pomodoros into the available time window, inserting a
    break after every work block. This is intentionally plain scheduling
    logic (no LLM call) — the AI's job is breaking down the task, not
    arithmetic on time slots.

    If the day doesn't have enough room for every estimated pomodoro, the
    schedule is truncated and the caller can decide how to surface that
    (e.g. warn the user their day is overbooked).
    """
    work_minutes = settings.default_pomodoro_minutes
    break_minutes = settings.default_break_minutes

    blocks: List[ScheduledBlock] = []
    cursor = day_start

    for subtask in subtasks:
        for _ in range(subtask["estimated_pomodoros"]):
            block_end = cursor + timedelta(minutes=work_minutes)
            if block_end > day_end:
                return blocks  # ran out of day — stop scheduling

            blocks.append(
                ScheduledBlock(
                    task_title=subtask["title"],
                    start_time=cursor,
                    end_time=block_end,
                    is_break=False,
                )
            )
            cursor = block_end

            break_end = cursor + timedelta(minutes=break_minutes)
            if break_end <= day_end:
                blocks.append(
                    ScheduledBlock(
                        task_title="Break",
                        start_time=cursor,
                        end_time=break_end,
                        is_break=True,
                    )
                )
                cursor = break_end

    return blocks
