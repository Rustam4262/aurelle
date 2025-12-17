"""
MVP Seed (NO ORM imports) for AURELLE - Go-Live 22.12.2025
- Inserts 3 salons + 15 services directly via SQL
- Avoids importing models (fixes RefreshToken circular import issue)
- Idempotent: re-run safe (won't duplicate by slug/name)

Run:
docker compose exec backend python seed_mvp.py

Optional overrides (if your table names differ):
SALON_TABLE=salons SERVICE_TABLE=services docker compose exec backend python seed_mvp.py
"""

from __future__ import annotations

import os
import sys
from decimal import Decimal
from typing import Any, Dict, List, Tuple

from sqlalchemy import inspect, text

# ✅ Your SessionLocal path
try:
    from app.core.database import SessionLocal  # backend/app/core/database.py
except Exception as e:
    print("❌ Cannot import SessionLocal from app.core.database:", repr(e))
    sys.exit(1)

# ========================================
# OWNER USER CREDENTIALS
# ========================================
OWNER_EMAIL = "owner@aurelle.uz"
OWNER_PHONE = "+998901111111"  # Unique phone number
OWNER_NAME = "Salon Owner"
OWNER_PASSWORD_HASH = "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92"  # sha256("owner123")
OWNER_ROLE = "SALON_OWNER"  # Uppercase to match database enum

SALONS = [
    dict(
        name="AURELLE Signature",
        slug="aurelle-signature",
        address="Tashkent, Mirabad district",
        city="Tashkent",
        phone="+998 90 000 00 01",
        description="Premium beauty space: hair, nails, makeup.",
        lat=41.2995,
        lng=69.2401,
    ),
    dict(
        name="AURELLE Studio",
        slug="aurelle-studio",
        address="Tashkent, Yunusabad district",
        city="Tashkent",
        phone="+998 90 000 00 02",
        description="Fast service, clean results, best masters.",
        lat=41.3660,
        lng=69.2892,
    ),
    dict(
        name="AURELLE Nail Bar",
        slug="aurelle-nailbar",
        address="Tashkent, Chilonzor district",
        city="Tashkent",
        phone="+998 90 000 00 03",
        description="Nails-only spot: manicure, pedicure, design.",
        lat=41.2857,
        lng=69.2030,
    ),
]

SERVICES_PER_SALON = [
    dict(name="Haircut", duration_minutes=60, price=Decimal("150000")),
    dict(name="Hair coloring", duration_minutes=120, price=Decimal("350000")),
    dict(name="Manicure", duration_minutes=60, price=Decimal("120000")),
    dict(name="Pedicure", duration_minutes=75, price=Decimal("160000")),
    dict(name="Makeup", duration_minutes=60, price=Decimal("200000")),
]

# ========================================
# MASTERS - ONE PER SALON
# ========================================
MASTERS_PER_SALON = [
    dict(name="Anna Ivanova", specialization="Hair stylist", phone="+998901112233"),
    dict(name="Maria Petrova", specialization="Nail specialist", phone="+998901113344"),
]


def pick_table(table_names: List[str], preferred: List[str]) -> str:
    for p in preferred:
        if p in table_names:
            return p
    raise RuntimeError(f"Could not find table. Tried: {preferred}. Existing: {table_names}")


def table_columns(inspector, table: str) -> List[str]:
    return [c["name"] for c in inspector.get_columns(table)]


def best_col(cols: List[str], candidates: List[str]) -> str | None:
    for c in candidates:
        if c in cols:
            return c
    return None


def insert_if_missing_returning_id(
    session,
    table: str,
    cols: List[str],
    identity_where_sql: str,
    identity_params: Dict[str, Any],
    insert_payload: Dict[str, Any],
) -> int:
    # 1) check exists
    q = text(f"SELECT id FROM {table} WHERE {identity_where_sql} LIMIT 1")
    row = session.execute(q, identity_params).first()
    if row and row[0]:
        return int(row[0])

    # 2) insert
    usable = {k: v for k, v in insert_payload.items() if k in cols}
    if not usable:
        raise RuntimeError(f"No usable insert columns for {table}. Available cols: {cols}")

    keys = ", ".join(usable.keys())
    vals = ", ".join([f":{k}" for k in usable.keys()])
    ins = text(f"INSERT INTO {table} ({keys}) VALUES ({vals}) RETURNING id")
    new_id = session.execute(ins, usable).scalar_one()
    return int(new_id)


def main() -> None:
    session = SessionLocal()
    try:
        bind = session.get_bind()
        inspector = inspect(bind)

        tables = inspector.get_table_names()

        salon_table = os.getenv("SALON_TABLE")
        service_table = os.getenv("SERVICE_TABLE")

        if not salon_table:
            salon_table = pick_table(tables, ["salons", "salon"])
        if not service_table:
            service_table = pick_table(tables, ["services", "service"])

        salon_cols = table_columns(inspector, salon_table)
        service_cols = table_columns(inspector, service_table)

        # Detect common column names
        salon_name_col = best_col(salon_cols, ["name", "title"])
        salon_slug_col = best_col(salon_cols, ["slug", "code"])
        salon_address_col = best_col(salon_cols, ["address", "location"])
        salon_city_col = best_col(salon_cols, ["city"])
        salon_phone_col = best_col(salon_cols, ["phone", "phone_number"])
        salon_desc_col = best_col(salon_cols, ["description", "about"])
        salon_lat_col = best_col(salon_cols, ["lat", "latitude"])
        salon_lng_col = best_col(salon_cols, ["lng", "longitude", "lon"])

        service_name_col = best_col(service_cols, ["name", "title"])
        service_salon_id_col = best_col(service_cols, ["salon_id", "salonId"])
        service_duration_col = best_col(service_cols, ["duration_minutes", "duration", "minutes"])
        service_price_col = best_col(service_cols, ["price", "cost", "amount"])

        if not salon_name_col:
            raise RuntimeError(f"Salon table '{salon_table}' has no name/title column. cols={salon_cols}")
        if not service_name_col or not service_salon_id_col:
            raise RuntimeError(
                f"Service table '{service_table}' missing required columns "
                f"(need name/title + salon_id). cols={service_cols}"
            )

        print("🔎 Using tables:", {"salon_table": salon_table, "service_table": service_table})
        print("🔎 Salon cols:", salon_cols)
        print("🔎 Service cols:", service_cols)

        # ========================================
        # STEP 1: Create SALON_OWNER user first
        # ========================================
        users_table = pick_table(tables, ["users", "user"])
        users_cols = table_columns(inspector, users_table)

        # Detect user column names
        user_email_col = best_col(users_cols, ["email"])
        user_phone_col = best_col(users_cols, ["phone", "phone_number"])
        user_name_col = best_col(users_cols, ["name", "full_name"])
        user_password_col = best_col(users_cols, ["hashed_password", "password"])
        user_role_col = best_col(users_cols, ["role"])
        user_is_active_col = best_col(users_cols, ["is_active"])

        if not user_email_col or not user_password_col:
            raise RuntimeError(f"Users table '{users_table}' missing required columns (email, password). cols={users_cols}")

        print("\n👤 Creating salon owner user...")

        user_payload: Dict[str, Any] = {}
        user_payload[user_email_col] = OWNER_EMAIL
        if user_phone_col:
            user_payload[user_phone_col] = OWNER_PHONE
        if user_name_col:
            user_payload[user_name_col] = OWNER_NAME
        if user_password_col:
            user_payload[user_password_col] = OWNER_PASSWORD_HASH
        if user_role_col:
            user_payload[user_role_col] = OWNER_ROLE
        if user_is_active_col:
            user_payload[user_is_active_col] = True

        owner_id = insert_if_missing_returning_id(
            session=session,
            table=users_table,
            cols=users_cols,
            identity_where_sql=f"{user_email_col} = :email",
            identity_params={"email": OWNER_EMAIL},
            insert_payload=user_payload,
        )

        session.commit()
        print(f"✅ Owner user ready (id={owner_id})")

        # Detect salon owner_id column
        salon_owner_col = best_col(salon_cols, ["owner_id", "ownerId"])
        if not salon_owner_col:
            print("⚠️  Warning: No owner_id column found in salons table")

        salon_ids: List[Tuple[str, int]] = []

        # ========================================
        # STEP 2: Seed salons
        # ========================================
        created_salons = 0
        for s in SALONS:
            payload: Dict[str, Any] = {}

            payload[salon_name_col] = s["name"]
            if salon_owner_col:
                payload[salon_owner_col] = owner_id  # 🔥 THIS FIXES THE NOT NULL ERROR
            if salon_slug_col:
                payload[salon_slug_col] = s["slug"]
            if salon_address_col:
                payload[salon_address_col] = s["address"]
            if salon_city_col:
                payload[salon_city_col] = s["city"]
            if salon_phone_col:
                payload[salon_phone_col] = s["phone"]
            if salon_desc_col:
                payload[salon_desc_col] = s["description"]
            if salon_lat_col:
                payload[salon_lat_col] = s["lat"]
            if salon_lng_col:
                payload[salon_lng_col] = s["lng"]

            # Set is_active to True for MVP
            if best_col(salon_cols, ["is_active"]):
                payload["is_active"] = True

            # Idempotency: prefer slug if exists, else name
            if salon_slug_col:
                where_sql = f"{salon_slug_col} = :slug"
                where_params = {"slug": s["slug"]}
            else:
                where_sql = f"{salon_name_col} = :name"
                where_params = {"name": s["name"]}

            before = session.execute(text(f"SELECT 1 FROM {salon_table} WHERE {where_sql} LIMIT 1"), where_params).first()
            salon_id = insert_if_missing_returning_id(
                session=session,
                table=salon_table,
                cols=salon_cols,
                identity_where_sql=where_sql,
                identity_params=where_params,
                insert_payload=payload,
            )
            if not before:
                created_salons += 1
            salon_ids.append((s["name"], salon_id))

        session.commit()
        print(f"✅ Salons ready: {len(salon_ids)} (created {created_salons})")

        # Seed services
        created_services = 0
        total_services = 0

        for salon_name, salon_id in salon_ids:
            for svc in SERVICES_PER_SALON:
                sp: Dict[str, Any] = {}
                sp[service_salon_id_col] = salon_id
                sp[service_name_col] = svc["name"]

                if service_duration_col:
                    sp[service_duration_col] = int(svc["duration_minutes"])
                if service_price_col:
                    # keep decimal where possible
                    sp[service_price_col] = svc["price"]

                # Set is_active to True for MVP
                if best_col(service_cols, ["is_active"]):
                    sp["is_active"] = True

                # idempotency: (salon_id + service_name)
                where_sql = f"{service_salon_id_col} = :sid AND {service_name_col} = :sname"
                where_params = {"sid": salon_id, "sname": svc["name"]}

                before = session.execute(text(f"SELECT 1 FROM {service_table} WHERE {where_sql} LIMIT 1"), where_params).first()
                _ = insert_if_missing_returning_id(
                    session=session,
                    table=service_table,
                    cols=service_cols,
                    identity_where_sql=where_sql,
                    identity_params=where_params,
                    insert_payload=sp,
                )
                if not before:
                    created_services += 1
                total_services += 1

        session.commit()
        print(f"✅ Services ready: {total_services} (created {created_services})")

        # ========================================
        # STEP 3: Seed masters (for bookings to work)
        # ========================================
        masters_table = pick_table(tables, ["masters", "master"])
        masters_cols = table_columns(inspector, masters_table)

        master_name_col = best_col(masters_cols, ["name"])
        master_salon_id_col = best_col(masters_cols, ["salon_id", "salonId"])
        master_phone_col = best_col(masters_cols, ["phone", "phone_number"])
        master_spec_col = best_col(masters_cols, ["specialization"])
        master_is_active_col = best_col(masters_cols, ["is_active"])

        created_masters = 0
        master_ids: List[int] = []

        print("\n👤 Creating masters...")
        for salon_name, salon_id in salon_ids:
            for master_data in MASTERS_PER_SALON:
                mp: Dict[str, Any] = {}
                mp[master_name_col] = master_data["name"]
                mp[master_salon_id_col] = salon_id
                if master_phone_col:
                    mp[master_phone_col] = master_data["phone"]
                if master_spec_col:
                    mp[master_spec_col] = master_data["specialization"]
                if master_is_active_col:
                    mp["is_active"] = True

                # Idempotency: salon_id + name
                where_sql = f"{master_salon_id_col} = :sid AND {master_name_col} = :mname"
                where_params = {"sid": salon_id, "mname": master_data["name"]}

                before = session.execute(text(f"SELECT 1 FROM {masters_table} WHERE {where_sql} LIMIT 1"), where_params).first()
                master_id = insert_if_missing_returning_id(
                    session=session,
                    table=masters_table,
                    cols=masters_cols,
                    identity_where_sql=where_sql,
                    identity_params=where_params,
                    insert_payload=mp,
                )
                if not before:
                    created_masters += 1
                master_ids.append(master_id)

        session.commit()
        print(f"✅ Masters ready: {len(master_ids)} (created {created_masters})")

        # ========================================
        # STEP 4: Link masters to services (service_masters)
        # ========================================
        sm_table = pick_table(tables, ["service_masters", "servicemasters"])
        sm_cols = table_columns(inspector, sm_table)

        sm_service_id_col = best_col(sm_cols, ["service_id", "serviceId"])
        sm_master_id_col = best_col(sm_cols, ["master_id", "masterId"])

        created_links = 0
        print("\n🔗 Linking masters to all services...")

        # Get all service IDs
        all_service_ids = session.execute(text(f"SELECT id FROM {service_table}")).fetchall()
        service_id_list = [row[0] for row in all_service_ids]

        # Link each master to ALL services (for MVP simplicity)
        for master_id in master_ids:
            for service_id in service_id_list:
                lp: Dict[str, Any] = {}
                lp[sm_service_id_col] = service_id
                lp[sm_master_id_col] = master_id

                # Idempotency: service_id + master_id
                where_sql = f"{sm_service_id_col} = :sid AND {sm_master_id_col} = :mid"
                where_params = {"sid": service_id, "mid": master_id}

                before = session.execute(text(f"SELECT 1 FROM {sm_table} WHERE {where_sql} LIMIT 1"), where_params).first()
                if not before:
                    insert_if_missing_returning_id(
                        session=session,
                        table=sm_table,
                        cols=sm_cols,
                        identity_where_sql=where_sql,
                        identity_params=where_params,
                        insert_payload=lp,
                    )
                    created_links += 1

        session.commit()
        print(f"✅ Service-Master links ready: {created_links} created")

        print("\n🎉 MVP seed complete. Next checks:")
        print("   1) GET /api/salons")
        print("   2) GET /api/services?salon_id=<id>")
        print("   3) GET /api/masters?salon_id=<id>")
        print("   4) POST /api/bookings (now possible!)")

    except Exception as e:
        session.rollback()
        print("❌ Seed failed:", repr(e))
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
