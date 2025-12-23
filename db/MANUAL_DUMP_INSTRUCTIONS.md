# Manual Production Schema Dump Instructions

## SSH Access Issue
PowerShell/Bash automation cannot access the production server. Execute manually via your SSH client.

---

## Step 1: Connect to Production Server

Use your SSH client (PuTTY, MobaXterm, or terminal):

```bash
ssh ubuntu@188.225.83.33
```

---

## Step 2: Check Database Container Name

```bash
sudo docker ps --filter name=db
```

Expected output should show a container like:
- `beauty_salon-db-1` or
- `beauty_salon_db_1` or
- `aurelle_db_1`

**Copy the exact container name** for the next step.

---

## Step 3: Dump Schema from Production

Replace `<CONTAINER_NAME>` with the actual name from Step 2:

```bash
sudo docker exec -t <CONTAINER_NAME> pg_dump \
  -U beauty_user -d beauty_salon \
  --schema-only \
  --no-owner \
  --no-privileges \
  > /tmp/000_schema.sql
```

Example:
```bash
sudo docker exec -t beauty_salon-db-1 pg_dump \
  -U beauty_user -d beauty_salon \
  --schema-only \
  --no-owner \
  --no-privileges \
  > /tmp/000_schema.sql
```

---

## Step 4: Verify Dump File

```bash
ls -lh /tmp/000_schema.sql
head -20 /tmp/000_schema.sql
```

Should show:
- File size > 0 bytes
- Contains SQL comments and CREATE statements

---

## Step 5: Download to Local Machine

### Option A: Using SCP (from your local machine)

```bash
scp ubuntu@188.225.83.33:/tmp/000_schema.sql "d:\Проекты\beauty_salon\db\schema\000_schema.sql"
```

### Option B: Copy-Paste (if SCP doesn't work)

On server:
```bash
cat /tmp/000_schema.sql
```

Copy the entire output and paste into:
`d:\Проекты\beauty_salon\db\schema\000_schema.sql`

---

## Step 6: Verify Local File

Check the file exists and contains schema:

**Windows:**
```powershell
Get-Content "d:\Проекты\beauty_salon\db\schema\000_schema.sql" | Select-Object -First 20
```

Should show PostgreSQL schema with:
- `CREATE TYPE userrole AS ENUM ('admin', 'salon_owner', 'master', 'client');`
- `CREATE TABLE users (...);`
- `CREATE TABLE salons (...);`
- etc.

---

## Step 7: Cleanup Server

```bash
rm /tmp/000_schema.sql
exit
```

---

## Next Steps

Once `000_schema.sql` is in place, run:

```bash
cd "d:\Проекты\beauty_salon"
docker-compose -f docker-compose.local.yml up -d
```

This will create a local database identical to production schema.
