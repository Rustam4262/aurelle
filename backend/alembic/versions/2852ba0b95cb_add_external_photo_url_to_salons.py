"""add_external_photo_url_to_salons

Revision ID: 2852ba0b95cb
Revises: 505d009b9892
Create Date: 2025-11-19 17:53:00.911957

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2852ba0b95cb'
down_revision = '505d009b9892'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add external_photo_url column to salons table
    op.add_column('salons', sa.Column('external_photo_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    # Remove external_photo_url column from salons table
    op.drop_column('salons', 'external_photo_url')
