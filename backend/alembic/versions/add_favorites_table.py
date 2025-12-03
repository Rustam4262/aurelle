"""add_favorites_table

Revision ID: abc123def456
Revises: a1b2c3d4e5f6
Create Date: 2025-11-27 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'abc123def456'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create favorites table
    op.create_table('favorites',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('salon_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.ForeignKeyConstraint(['salon_id'], ['salons.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'salon_id', name='unique_user_salon_favorite')
    )
    op.create_index(op.f('ix_favorites_id'), 'favorites', ['id'], unique=False)
    op.create_index('ix_favorites_user_id', 'favorites', ['user_id'])
    op.create_index('ix_favorites_salon_id', 'favorites', ['salon_id'])


def downgrade() -> None:
    # Drop favorites table
    op.drop_index('ix_favorites_salon_id', 'favorites')
    op.drop_index('ix_favorites_user_id', 'favorites')
    op.drop_index(op.f('ix_favorites_id'), 'favorites')
    op.drop_table('favorites')
