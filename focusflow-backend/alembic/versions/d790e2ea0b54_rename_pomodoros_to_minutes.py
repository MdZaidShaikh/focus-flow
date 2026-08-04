"""rename pomodoros to minutes

Revision ID: d790e2ea0b54
Revises: 665bb212118a
Create Date: 2026-08-13 12:33:10.822428

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd790e2ea0b54'
down_revision: Union[str, Sequence[str], None] = '665bb212118a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('tasks', 'estimated_pomodoros', new_column_name='estimated_minutes')
    op.alter_column('tasks', 'actual_pomodoros', new_column_name='actual_minutes')

def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('tasks', 'estimated_minutes', new_column_name='estimated_pomodoros')
    op.alter_column('tasks', 'actual_minutes', new_column_name='actual_pomodoros')
