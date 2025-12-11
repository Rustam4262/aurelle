"""add_idempotency_keys_table

Revision ID: dff6a3944beb
Revises: a46466e74e99
Create Date: 2025-12-11 10:02:23.779803

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'dff6a3944beb'
down_revision = 'a46466e74e99'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create idempotency_keys table
    op.create_table(
        'idempotency_keys',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=255), nullable=False),
        sa.Column('request_path', sa.String(length=500), nullable=False),
        sa.Column('request_method', sa.String(length=10), nullable=False),
        sa.Column('request_body_hash', sa.String(length=64), nullable=True),
        sa.Column('response_status', sa.Integer(), nullable=True),
        sa.Column('response_body', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index(op.f('ix_idempotency_keys_key'), 'idempotency_keys', ['key'], unique=True)
    op.create_index('ix_idempotency_key_path_method', 'idempotency_keys', ['key', 'request_path', 'request_method'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_idempotency_key_path_method', table_name='idempotency_keys')
    op.drop_index(op.f('ix_idempotency_keys_key'), table_name='idempotency_keys')

    # Drop table
    op.drop_table('idempotency_keys')
