# Dump production database schema (no data) to local project
# Usage: .\db\scripts\dump_schema_from_prod.ps1

$PROD_SERVER = "ubuntu@188.225.83.33"
$CONTAINER_NAME = "beauty_salon-db-1"  # or check with: docker ps
$DB_NAME = "beauty_salon"
$DB_USER = "beauty_user"

$SCHEMA_FILE = "db\schema\000_schema.sql"

Write-Host "🔍 Dumping schema from production..." -ForegroundColor Cyan
Write-Host "   Server: $PROD_SERVER"
Write-Host "   Container: $CONTAINER_NAME"
Write-Host "   Database: $DB_NAME"
Write-Host ""

# Execute dump command via SSH
$dumpCommand = "sudo docker exec -t $CONTAINER_NAME pg_dump -U $DB_USER -d $DB_NAME --schema-only --no-owner --no-privileges"

try {
    ssh $PROD_SERVER $dumpCommand | Out-File -FilePath $SCHEMA_FILE -Encoding UTF8

    if (Test-Path $SCHEMA_FILE) {
        $fileSize = (Get-Item $SCHEMA_FILE).Length
        $tables = (Select-String -Path $SCHEMA_FILE -Pattern "CREATE TABLE" -AllMatches).Matches.Count
        $indexes = (Select-String -Path $SCHEMA_FILE -Pattern "CREATE INDEX" -AllMatches).Matches.Count
        $enums = (Select-String -Path $SCHEMA_FILE -Pattern "CREATE TYPE" -AllMatches).Matches.Count

        Write-Host "✅ Schema dumped successfully to $SCHEMA_FILE" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 Schema summary:"
        Write-Host "   Size: $fileSize bytes"
        Write-Host "   Tables: $tables"
        Write-Host "   Indexes: $indexes"
        Write-Host "   Enums: $enums"
        Write-Host ""
        Write-Host "✅ Ready to use with docker-compose.local.yml" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Schema dump failed or empty" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}
