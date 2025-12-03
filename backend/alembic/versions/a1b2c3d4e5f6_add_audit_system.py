"""add audit system

Revision ID: a1b2c3d4e5f6
Revises: 75764dde32d3
Create Date: 2025-11-24 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '75764dde32d3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create audit_logs table
    op.create_table('audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=True),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('request_method', sa.String(length=10), nullable=True),
        sa.Column('request_path', sa.String(length=500), nullable=True),
        sa.Column('request_ip', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('status_code', sa.Integer(), nullable=True),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_id'), 'audit_logs', ['id'], unique=False)
    op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_audit_logs_entity_type'), 'audit_logs', ['entity_type'], unique=False)
    op.create_index(op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'], unique=False)

    # Create login_logs table
    op.create_table('login_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('phone', sa.String(length=20), nullable=False),
        sa.Column('success', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('failure_reason', sa.String(length=200), nullable=True),
        sa.Column('request_ip', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_login_logs_id'), 'login_logs', ['id'], unique=False)
    op.create_index(op.f('ix_login_logs_user_id'), 'login_logs', ['user_id'], unique=False)
    op.create_index(op.f('ix_login_logs_created_at'), 'login_logs', ['created_at'], unique=False)

    # Add created_by and updated_by to salons table
    op.add_column('salons', sa.Column('created_by', sa.Integer(), nullable=True))
    op.add_column('salons', sa.Column('updated_by', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_salons_created_by', 'salons', 'users', ['created_by'], ['id'])
    op.create_foreign_key('fk_salons_updated_by', 'salons', 'users', ['updated_by'], ['id'])

    # Add created_by and updated_by to services table
    op.add_column('services', sa.Column('created_by', sa.Integer(), nullable=True))
    op.add_column('services', sa.Column('updated_by', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_services_created_by', 'services', 'users', ['created_by'], ['id'])
    op.create_foreign_key('fk_services_updated_by', 'services', 'users', ['updated_by'], ['id'])

    # Add created_by and updated_by to masters table
    op.add_column('masters', sa.Column('created_by', sa.Integer(), nullable=True))
    op.add_column('masters', sa.Column('updated_by', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_masters_created_by', 'masters', 'users', ['created_by'], ['id'])
    op.create_foreign_key('fk_masters_updated_by', 'masters', 'users', ['updated_by'], ['id'])

    # Add created_by and updated_by to bookings table
    op.add_column('bookings', sa.Column('created_by', sa.Integer(), nullable=True))
    op.add_column('bookings', sa.Column('updated_by', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_bookings_created_by', 'bookings', 'users', ['created_by'], ['id'])
    op.create_foreign_key('fk_bookings_updated_by', 'bookings', 'users', ['updated_by'], ['id'])


def downgrade() -> None:
    # Remove created_by and updated_by from bookings
    op.drop_constraint('fk_bookings_updated_by', 'bookings', type_='foreignkey')
    op.drop_constraint('fk_bookings_created_by', 'bookings', type_='foreignkey')
    op.drop_column('bookings', 'updated_by')
    op.drop_column('bookings', 'created_by')

    # Remove created_by and updated_by from masters
    op.drop_constraint('fk_masters_updated_by', 'masters', type_='foreignkey')
    op.drop_constraint('fk_masters_created_by', 'masters', type_='foreignkey')
    op.drop_column('masters', 'updated_by')
    op.drop_column('masters', 'created_by')

    # Remove created_by and updated_by from services
    op.drop_constraint('fk_services_updated_by', 'services', type_='foreignkey')
    op.drop_constraint('fk_services_created_by', 'services', type_='foreignkey')
    op.drop_column('services', 'updated_by')
    op.drop_column('services', 'created_by')

    # Remove created_by and updated_by from salons
    op.drop_constraint('fk_salons_updated_by', 'salons', type_='foreignkey')
    op.drop_constraint('fk_salons_created_by', 'salons', type_='foreignkey')
    op.drop_column('salons', 'updated_by')
    op.drop_column('salons', 'created_by')

    # Drop login_logs table
    op.drop_index(op.f('ix_login_logs_created_at'), table_name='login_logs')
    op.drop_index(op.f('ix_login_logs_user_id'), table_name='login_logs')
    op.drop_index(op.f('ix_login_logs_id'), table_name='login_logs')
    op.drop_table('login_logs')

    # Drop audit_logs table
    op.drop_index(op.f('ix_audit_logs_created_at'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_entity_type'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_action'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_user_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_id'), table_name='audit_logs')
    op.drop_table('audit_logs')
