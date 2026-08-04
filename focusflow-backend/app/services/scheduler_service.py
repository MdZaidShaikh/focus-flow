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
    Packs estimated minutes into the available time window.
    Tasks longer than 60 minutes are chunked into 25-minute blocks with 5-minute breaks.
    Tasks 60 minutes or shorter are scheduled as a single block.
    """
    chunk_minutes = settings.default_pomodoro_minutes
    break_minutes = settings.default_break_minutes

    blocks: List[ScheduledBlock] = []
    cursor = day_start

    for idx, subtask in enumerate(subtasks):
        remaining_minutes = subtask["estimated_minutes"]
        
        while remaining_minutes > 0:
            if remaining_minutes > 60:
                block_length = chunk_minutes
            else:
                block_length = remaining_minutes
                
            block_end = cursor + timedelta(minutes=block_length)
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
            remaining_minutes -= block_length

            # Add a break if there's more remaining in this task, or if we transition to a new task
            if remaining_minutes > 0 or idx < len(subtasks) - 1:
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
                else:
                    return blocks

    return blocks
