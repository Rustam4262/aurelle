"""add_indexes_on_foreign_keys

Revision ID: 505d009b9892
Revises: d523dcafc9db
Create Date: 2025-11-19 17:31:47.688517

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '505d009b9892'
down_revision = 'd523dcafc9db'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add indexes on foreign keys for better query performance

    # Bookings table
    op.create_index('ix_bookings_salon_id', 'bookings', ['salon_id'])
    op.create_index('ix_bookings_service_id', 'bookings', ['service_id'])
    op.create_index('ix_bookings_master_id', 'bookings', ['master_id'])
    op.create_index('ix_bookings_client_id', 'bookings', ['client_id'])

    # Services table
    op.create_index('ix_services_salon_id', 'services', ['salon_id'])

    # Masters table
    op.create_index('ix_masters_salon_id', 'masters', ['salon_id'])

    # Reviews table
    op.create_index('ix_reviews_salon_id', 'reviews', ['salon_id'])
    op.create_index('ix_reviews_client_id', 'reviews', ['client_id'])

    # Salons table
    op.create_index('ix_salons_owner_id', 'salons', ['owner_id'])

    # Service_masters table (many-to-many)
    op.create_index('ix_service_masters_service_id', 'service_masters', ['service_id'])
    op.create_index('ix_service_masters_master_id', 'service_masters', ['master_id'])

    # Favorites table - SKIPPED: Table does not exist in initial migration
    # Will be added when favorites table is created
    # op.create_index('ix_favorites_user_id', 'favorites', ['user_id'])
    # op.create_index('ix_favorites_salon_id', 'favorites', ['salon_id'])


def downgrade() -> None:
    # Drop indexes in reverse order

    # Favorites table - SKIPPED: Indexes were not created
    # op.drop_index('ix_favorites_salon_id', 'favorites')
    # op.drop_index('ix_favorites_user_id', 'favorites')

    # Service_masters table
    op.drop_index('ix_service_masters_master_id', 'service_masters')
    op.drop_index('ix_service_masters_service_id', 'service_masters')

    # Salons table
    op.drop_index('ix_salons_owner_id', 'salons')

    # Reviews table
    op.drop_index('ix_reviews_client_id', 'reviews')
    op.drop_index('ix_reviews_salon_id', 'reviews')

    # Masters table
    op.drop_index('ix_masters_salon_id', 'masters')

    # Services table
    op.drop_index('ix_services_salon_id', 'services')

    # Bookings table
    op.drop_index('ix_bookings_client_id', 'bookings')
    op.drop_index('ix_bookings_master_id', 'bookings')
    op.drop_index('ix_bookings_service_id', 'bookings')
    op.drop_index('ix_bookings_salon_id', 'bookings')
