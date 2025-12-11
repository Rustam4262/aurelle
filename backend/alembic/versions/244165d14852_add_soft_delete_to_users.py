"""add_soft_delete_to_users

Revision ID: 244165d14852
Revises: 8d4a0b54d2e0
Create Date: 2025-12-11 14:05:33.973901

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '244165d14852'
down_revision = '8d4a0b54d2e0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add soft delete columns to users table
    op.add_column('users', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))

    # Create index for is_deleted for faster queries
    op.create_index(op.f('ix_users_is_deleted'), 'users', ['is_deleted'])


def downgrade() -> None:
    # Drop index
    op.drop_index(op.f('ix_users_is_deleted'), table_name='users')

    # Remove soft delete columns
    op.drop_column('users', 'deleted_at')
    op.drop_column('users', 'is_deleted')
