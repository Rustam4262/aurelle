"""add master schedule and user_id to master

Revision ID: f8a9b0c1d2e3
Revises: abc123def456
Create Date: 2025-11-29 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM


# revision identifiers, used by Alembic.
revision = 'f8a9b0c1d2e3'
down_revision = 'abc123def456'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum for DayOfWeek
    dayofweek_enum = ENUM(
        'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
        name='dayofweek',
        create_type=True
    )

    # Add user_id column to masters table
    op.add_column('masters', sa.Column('user_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_masters_user_id'), 'masters', ['user_id'], unique=True)
    op.create_foreign_key('fk_masters_user_id', 'masters', 'users', ['user_id'], ['id'])

    # Create master_schedules table
    op.create_table(
        'master_schedules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('master_id', sa.Integer(), nullable=False),
        sa.Column('day_of_week', dayofweek_enum, nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('break_start', sa.Time(), nullable=True),
        sa.Column('break_end', sa.Time(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(['master_id'], ['masters.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_master_schedules_id'), 'master_schedules', ['id'], unique=False)
    op.create_index(op.f('ix_master_schedules_master_id'), 'master_schedules', ['master_id'], unique=False)

    # Create master_day_offs table
    op.create_table(
        'master_day_offs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('master_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('reason', sa.String(length=200), nullable=True),
        sa.ForeignKeyConstraint(['master_id'], ['masters.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_master_day_offs_id'), 'master_day_offs', ['id'], unique=False)
    op.create_index(op.f('ix_master_day_offs_master_id'), 'master_day_offs', ['master_id'], unique=False)
    op.create_index(op.f('ix_master_day_offs_date'), 'master_day_offs', ['date'], unique=False)


def downgrade() -> None:
    # Drop tables
    op.drop_index(op.f('ix_master_day_offs_date'), table_name='master_day_offs')
    op.drop_index(op.f('ix_master_day_offs_master_id'), table_name='master_day_offs')
    op.drop_index(op.f('ix_master_day_offs_id'), table_name='master_day_offs')
    op.drop_table('master_day_offs')

    op.drop_index(op.f('ix_master_schedules_master_id'), table_name='master_schedules')
    op.drop_index(op.f('ix_master_schedules_id'), table_name='master_schedules')
    op.drop_table('master_schedules')

    # Drop user_id from masters
    op.drop_constraint('fk_masters_user_id', 'masters', type_='foreignkey')
    op.drop_index(op.f('ix_masters_user_id'), table_name='masters')
    op.drop_column('masters', 'user_id')

    # Drop enum
    sa.Enum(name='dayofweek').drop(op.get_bind(), checkfirst=True)
