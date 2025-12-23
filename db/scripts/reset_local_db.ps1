# Reset local database to clean state from schema.sql
# Usage: .\db\scripts\reset_local_db.ps1

$ErrorActionPreference = "Stop"

Write-Host "🔥 Dropping local DB volume (full reset)..." -ForegroundColor Yellow
docker-compose -f docker-compose.local.yml down -v

Write-Host ""
Write-Host "🚀 Starting local DB from schema..." -ForegroundColor Cyan
docker-compose -f docker-compose.local.yml up -d db

Write-Host ""
Write-Host "⏳ Waiting for database to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# Wait for health check
$maxAttempts = 30
$attempt = 0

while ($attempt -lt $maxAttempts) {
    $attempt++
    $health = docker inspect --format='{{.State.Health.Status}}' aurelle_db_local 2>$null

    if ($health -eq "healthy") {
        Write-Host "✅ Database is ready!" -ForegroundColor Green
        break
    }

    Write-Host "   Attempt $attempt/$maxAttempts - Status: $health" -ForegroundColor Gray
    Start-Sleep -Seconds 2
}

if ($attempt -eq $maxAttempts) {
    Write-Host "❌ Database failed to start within timeout" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📊 Verifying schema..." -ForegroundColor Cyan

# Check tables
$tables = docker exec aurelle_db_local psql -U beauty_user -d beauty_salon -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'"

Write-Host "   Tables created: $tables" -ForegroundColor Green

if ($tables -eq 0) {
    Write-Host "⚠️  WARNING: No tables found. Check db/schema/000_schema.sql exists" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Local DB is ready! Schema loaded from db/schema/000_schema.sql" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  • Start backend: docker-compose -f docker-compose.local.yml up -d backend"
Write-Host "  • Start frontend: docker-compose -f docker-compose.local.yml up -d frontend"
Write-Host "  • View logs: docker-compose -f docker-compose.local.yml logs -f"
