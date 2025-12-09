#!/bin/bash

# ==========================================
# ENV VALIDATION SCRIPT
# AURELLE - Beauty Salon Marketplace
# ==========================================
# Проверяет наличие всех обязательных переменных окружения
# Использование:
#   bash validate_env.sh
# ==========================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

echo "=========================================="
echo "  Environment Variables Validation"
echo "=========================================="
echo ""

# Load .env file
if [ ! -f ".env" ]; then
    log_error ".env file not found!"
    echo ""
    echo "Please create .env file from template:"
    echo "  cp .env.production.template .env"
    echo "  nano .env"
    exit 1
fi

source .env

# Critical variables (must be present)
CRITICAL_VARS=(
    "DATABASE_URL"
    "SECRET_KEY"
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "POSTGRES_DB"
)

# Important variables (should be present)
IMPORTANT_VARS=(
    "VITE_YANDEX_MAPS_API_KEY"
    "CORS_ORIGINS"
    "FRONTEND_URL"
    "API_URL"
)

# Optional but recommended variables
OPTIONAL_VARS=(
    "SMTP_HOST"
    "SMTP_USER"
    "SMTP_PASSWORD"
    "SMS_API_TOKEN"
    "PAYME_MERCHANT_ID"
    "CLICK_MERCHANT_ID"
    "TELEGRAM_BOT_TOKEN"
)

missing_critical=()
missing_important=()
missing_optional=()

# Check critical variables
echo "Checking CRITICAL variables..."
for var in "${CRITICAL_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        missing_critical+=("$var")
        log_error "$var is NOT SET"
    else
        # Check if it's still a template value
        if [[ "${!var}" == *"CHANGE_ME"* ]] || [[ "${!var}" == *"YOUR_"* ]]; then
            log_error "$var has template value: ${!var}"
            missing_critical+=("$var")
        else
            log_success "$var is set"
        fi
    fi
done

echo ""
echo "Checking IMPORTANT variables..."
for var in "${IMPORTANT_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        missing_important+=("$var")
        log_warn "$var is NOT SET"
    else
        if [[ "${!var}" == *"YOUR_"* ]]; then
            log_warn "$var has template value: ${!var}"
            missing_important+=("$var")
        else
            log_success "$var is set"
        fi
    fi
done

echo ""
echo "Checking OPTIONAL variables..."
for var in "${OPTIONAL_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        log_warn "$var is NOT SET (optional)"
        missing_optional+=("$var")
    else
        if [[ "${!var}" == *"YOUR_"* ]]; then
            log_warn "$var has template value (optional)"
        else
            log_success "$var is set"
        fi
    fi
done

echo ""
echo "=========================================="

# Summary
if [ ${#missing_critical[@]} -gt 0 ]; then
    echo ""
    log_error "CRITICAL: ${#missing_critical[@]} required variable(s) missing:"
    for var in "${missing_critical[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Please set these variables in .env file before deployment!"
    echo ""
    exit 1
fi

if [ ${#missing_important[@]} -gt 0 ]; then
    echo ""
    log_warn "WARNING: ${#missing_important[@]} important variable(s) missing:"
    for var in "${missing_important[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Application will work, but some features may be limited."
    echo ""
fi

if [ ${#missing_optional[@]} -gt 0 ]; then
    echo ""
    echo "NOTE: ${#missing_optional[@]} optional variable(s) not set:"
    for var in "${missing_optional[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "These features will be disabled until configured."
    echo ""
fi

log_success "Environment validation passed!"
echo "=========================================="
echo ""

# Additional checks
echo "Additional checks:"

# Check SECRET_KEY strength
SECRET_LENGTH=${#SECRET_KEY}
if [ $SECRET_LENGTH -lt 32 ]; then
    log_warn "SECRET_KEY is too short ($SECRET_LENGTH chars). Recommended: 64+ chars"
    echo "  Generate strong key: openssl rand -hex 32"
else
    log_success "SECRET_KEY length is good ($SECRET_LENGTH chars)"
fi

# Check DATABASE_URL format
if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
    log_error "DATABASE_URL doesn't look like PostgreSQL URL"
else
    log_success "DATABASE_URL format looks correct"
fi

# Check URLs
if [[ "$FRONTEND_URL" == "https://aurelle.uz" ]]; then
    log_success "FRONTEND_URL is set to production"
elif [[ "$FRONTEND_URL" == *"localhost"* ]]; then
    log_warn "FRONTEND_URL is set to localhost (development mode)"
fi

if [[ "$API_URL" == "https://api.aurelle.uz" ]]; then
    log_success "API_URL is set to production"
elif [[ "$API_URL" == *"localhost"* ]]; then
    log_warn "API_URL is set to localhost (development mode)"
fi

echo ""
log_success "All checks completed!"
