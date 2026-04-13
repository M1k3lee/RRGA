"""initial schema

Revision ID: 20260413_0001
Revises:
Create Date: 2026-04-13
"""

from __future__ import annotations

from alembic import op

from app.db import models  # noqa: F401
from app.db.session import Base

revision = "20260413_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
