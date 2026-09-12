"""add notifications

Revision ID: a4ef04ad98e7
Revises: 1d24d97301fb
Create Date: 2026-09-11 19:10:03.955732

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a4ef04ad98e7"
down_revision: Union[str, Sequence[str], None] = "1d24d97301fb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # Add title to existing notifications.
    #
    # A temporary server default prevents migration failure if
    # notifications already exist in the database.
    op.add_column(
        "notifications",
        sa.Column(
            "title",
            sa.String(length=200),
            nullable=False,
            server_default="",
        ),
    )

    # Remove the temporary database default after existing rows
    # have received an empty title.
    op.alter_column(
        "notifications",
        "title",
        server_default=None,
    )

    # Add read timestamp.
    op.add_column(
        "notifications",
        sa.Column(
            "read_at",
            sa.DateTime(),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_column(
        "notifications",
        "read_at",
    )

    op.drop_column(
        "notifications",
        "title",
    )