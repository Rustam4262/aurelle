"""add_user_consents_tables

Revision ID: 8d4a0b54d2e0
Revises: dff6a3944beb
Create Date: 2025-12-11 10:20:46.324188

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8d4a0b54d2e0'
down_revision = 'dff6a3944beb'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum types
    consent_type_enum = sa.Enum(
        'terms_of_service', 'privacy_policy', 'data_processing',
        'marketing_emails', 'marketing_sms', 'marketing_push',
        'cookies_functional', 'cookies_analytics', 'cookies_marketing',
        'geolocation', 'third_party_sharing',
        name='consenttype'
    )

    consent_status_enum = sa.Enum(
        'granted', 'revoked', 'expired',
        name='consentstatus'
    )

    # Create user_consents table
    op.create_table(
        'user_consents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('consent_type', consent_type_enum, nullable=False),
        sa.Column('status', consent_status_enum, nullable=False, server_default='granted'),
        sa.Column('document_version', sa.String(length=50), nullable=True),
        sa.Column('granted_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('consent_method', sa.String(length=50), nullable=True),
        sa.Column('consent_text', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for user_consents
    op.create_index(op.f('ix_user_consents_user_id'), 'user_consents', ['user_id'])
    op.create_index(op.f('ix_user_consents_consent_type'), 'user_consents', ['consent_type'])

    # Create consent_history table
    op.create_table(
        'consent_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('consent_type', consent_type_enum, nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('document_version', sa.String(length=50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for consent_history
    op.create_index(op.f('ix_consent_history_user_id'), 'consent_history', ['user_id'])
    op.create_index(op.f('ix_consent_history_timestamp'), 'consent_history', ['timestamp'])


def downgrade() -> None:
    # Drop indexes for consent_history
    op.drop_index(op.f('ix_consent_history_timestamp'), table_name='consent_history')
    op.drop_index(op.f('ix_consent_history_user_id'), table_name='consent_history')

    # Drop consent_history table
    op.drop_table('consent_history')

    # Drop indexes for user_consents
    op.drop_index(op.f('ix_user_consents_consent_type'), table_name='user_consents')
    op.drop_index(op.f('ix_user_consents_user_id'), table_name='user_consents')

    # Drop user_consents table
    op.drop_table('user_consents')

    # Drop enum types
    sa.Enum(name='consentstatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='consenttype').drop(op.get_bind(), checkfirst=True)
