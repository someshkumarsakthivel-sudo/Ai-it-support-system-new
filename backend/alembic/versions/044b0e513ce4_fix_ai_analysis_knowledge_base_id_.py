"""Fix AI analysis knowledge base ID generation

Revision ID: 044b0e513ce4
Revises: 45dcbbfe3640
Create Date: 2026-09-11 14:46:12.348321

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "044b0e513ce4"
down_revision: Union[str, Sequence[str], None] = "45dcbbfe3640"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the AI analysis Knowledge Base relationship table."""

    op.create_table(
        "ai_analysis_knowledge_base",
        sa.Column(
            "id",
            sa.BigInteger(),
            sa.Identity(),
            nullable=False,
        ),
        sa.Column(
            "ai_analysis_id",
            sa.BigInteger(),
            nullable=False,
        ),
        sa.Column(
            "knowledge_base_article_id",
            sa.BigInteger(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["ai_analysis_id"],
            ["ai_analyses.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["knowledge_base_article_id"],
            ["knowledge_base_articles.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    """Drop the AI analysis Knowledge Base relationship table."""

    op.drop_table("ai_analysis_knowledge_base")