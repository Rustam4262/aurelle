#!/bin/bash

# Security Scanning Script (Lynis)
# Performs comprehensive security audit of the server

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=== Security Scan (Lynis) for AURELLE ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}✗${NC} This script must be run as root or with sudo"
    exit 1
fi

# Configuration
TELEGRAM_SCRIPT="/var/www/aurelle/scripts/telegram-send.sh"
SCAN_LOG_DIR="/var/log/aurelle-security"
SCAN_LOG="$SCAN_LOG_DIR/lynis-scan-$(date +%Y%m%d-%H%M%S).log"

# Step 1: Create log directory
mkdir -p "$SCAN_LOG_DIR"

# Step 2: Install Lynis
echo "Step 1: Checking Lynis installation..."

if ! command -v lynis &> /dev/null; then
    echo -e "${YELLOW}⚠${NC}  Lynis is not installed"
    echo ""
    read -p "Install Lynis now? (Y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        echo "Installing Lynis..."

        # Add Lynis repository
        apt-get update
        apt-get install -y apt-transport-https ca-certificates

        # Install from official repository
        wget -O - https://packages.cisofy.com/keys/cisofy-software-public.key | apt-key add -
        echo "deb https://packages.cisofy.com/community/lynis/deb/ stable main" | tee /etc/apt/sources.list.d/cisofy-lynis.list

        apt-get update
        apt-get install -y lynis

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} Lynis installed successfully"
        else
            echo -e "${RED}✗${NC} Failed to install Lynis"
            echo ""
            echo "Installing from Ubuntu repository as fallback..."
            apt-get install -y lynis

            if [ $? -ne 0 ]; then
                echo -e "${RED}✗${NC} Installation failed"
                exit 1
            fi
        fi
    else
        echo "Please install Lynis manually:"
        echo "  sudo apt-get install lynis"
        exit 1
    fi
else
    LYNIS_VERSION=$(lynis show version 2>/dev/null | grep "Lynis version" | awk '{print $3}' || echo "unknown")
    echo -e "${GREEN}✓${NC} Lynis is installed: Version $LYNIS_VERSION"
fi
echo ""

# Step 3: Update Lynis
echo "Step 2: Updating Lynis..."

lynis update info 2>&1 | head -10

echo ""

# Step 4: Scan options
echo "Step 3: Security scan configuration..."
echo ""
echo "Scan options:"
echo "  1. Quick scan (basic checks)"
echo "  2. Full scan (comprehensive audit)"
echo "  3. Scan with automatic fixes (where possible)"
echo ""
read -p "Select option (1-3, default: 2): " SCAN_OPTION
SCAN_OPTION=${SCAN_OPTION:-2}

case $SCAN_OPTION in
    1)
        SCAN_TYPE="quick"
        SCAN_ARGS="--quick"
        ;;
    2)
        SCAN_TYPE="full"
        SCAN_ARGS=""
        ;;
    3)
        SCAN_TYPE="full-auto"
        SCAN_ARGS=""
        AUTO_FIX=true
        ;;
    *)
        SCAN_TYPE="full"
        SCAN_ARGS=""
        ;;
esac

echo ""
echo "Starting $SCAN_TYPE security scan..."
echo "This may take several minutes..."
echo ""

# Step 5: Run Lynis scan
echo "Step 4: Running Lynis security audit..."
echo ""

START_TIME=$(date +%s)

# Run scan and save to log
lynis audit system $SCAN_ARGS 2>&1 | tee "$SCAN_LOG"

SCAN_EXIT_CODE=${PIPESTATUS[0]}
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""

if [ $SCAN_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Security scan completed (Duration: ${DURATION}s)"
else
    echo -e "${YELLOW}⚠${NC}  Security scan completed with warnings (Duration: ${DURATION}s)"
fi

echo "Scan log: $SCAN_LOG"
echo ""

# Step 6: Parse scan results
echo "Step 5: Analyzing scan results..."
echo ""

# Extract scan results
LYNIS_REPORT="/var/log/lynis-report.dat"

if [ -f "$LYNIS_REPORT" ]; then
    # Get hardening index
    HARDENING_INDEX=$(grep "hardening_index=" "$LYNIS_REPORT" | cut -d'=' -f2)

    # Get warnings count
    WARNINGS_COUNT=$(grep -c "^warning\[\]=" "$LYNIS_REPORT" 2>/dev/null || echo "0")

    # Get suggestions count
    SUGGESTIONS_COUNT=$(grep -c "^suggestion\[\]=" "$LYNIS_REPORT" 2>/dev/null || echo "0")

    echo -e "${BLUE}Scan Results:${NC}"
    echo ""
    echo "  Hardening Index: $HARDENING_INDEX / 100"
    echo "  Warnings: $WARNINGS_COUNT"
    echo "  Suggestions: $SUGGESTIONS_COUNT"
    echo ""
else
    echo -e "${YELLOW}⚠${NC}  Report file not found: $LYNIS_REPORT"
    HARDENING_INDEX="N/A"
    WARNINGS_COUNT="N/A"
    SUGGESTIONS_COUNT="N/A"
fi

# Step 7: Display key findings
echo "Step 6: Key findings..."
echo ""

if [ -f "$LYNIS_REPORT" ]; then
    echo -e "${RED}High Priority Warnings:${NC}"
    grep "^warning\[\]=" "$LYNIS_REPORT" | cut -d'=' -f2- | head -10 | while read -r warning; do
        echo "  ⚠ $warning"
    done
    echo ""

    echo -e "${YELLOW}Suggestions for Hardening:${NC}"
    grep "^suggestion\[\]=" "$LYNIS_REPORT" | cut -d'=' -f2- | head -10 | while read -r suggestion; do
        echo "  → $suggestion"
    done
    echo ""
fi

# Step 8: Automated fixes (if selected)
if [ "$AUTO_FIX" = true ]; then
    echo "Step 7: Applying automated fixes..."
    echo ""

    FIXES_APPLIED=0

    # Fix 1: Set proper permissions on sensitive files
    echo "Checking file permissions..."

    if [ -f "/etc/passwd" ]; then
        chmod 644 /etc/passwd && echo "  ✓ Fixed /etc/passwd permissions" && FIXES_APPLIED=$((FIXES_APPLIED + 1))
    fi

    if [ -f "/etc/shadow" ]; then
        chmod 640 /etc/shadow && echo "  ✓ Fixed /etc/shadow permissions" && FIXES_APPLIED=$((FIXES_APPLIED + 1))
    fi

    if [ -f "/etc/group" ]; then
        chmod 644 /etc/group && echo "  ✓ Fixed /etc/group permissions" && FIXES_APPLIED=$((FIXES_APPLIED + 1))
    fi

    # Fix 2: Set proper SSH permissions
    if [ -d "/etc/ssh" ]; then
        chmod 755 /etc/ssh && echo "  ✓ Fixed /etc/ssh permissions" && FIXES_APPLIED=$((FIXES_APPLIED + 1))
    fi

    # Fix 3: Secure boot files
    if [ -d "/boot" ]; then
        chmod 700 /boot && echo "  ✓ Secured /boot directory" && FIXES_APPLIED=$((FIXES_APPLIED + 1))
    fi

    echo ""
    echo -e "${GREEN}✓${NC} Applied $FIXES_APPLIED automated fixes"
    echo ""
fi

# Step 9: Generate summary report
echo "Step 8: Generating summary report..."
echo ""

SUMMARY_FILE="$SCAN_LOG_DIR/summary-$(date +%Y%m%d-%H%M%S).txt"

cat > "$SUMMARY_FILE" << EOF
AURELLE Security Scan Summary
Generated: $(date)
Scan Type: $SCAN_TYPE
Duration: ${DURATION}s

=== Results ===
Hardening Index: $HARDENING_INDEX / 100
Warnings: $WARNINGS_COUNT
Suggestions: $SUGGESTIONS_COUNT

=== Status ===
EOF

if [ "$HARDENING_INDEX" != "N/A" ]; then
    if [ "$HARDENING_INDEX" -ge 80 ]; then
        echo "Security Status: EXCELLENT" >> "$SUMMARY_FILE"
    elif [ "$HARDENING_INDEX" -ge 70 ]; then
        echo "Security Status: GOOD" >> "$SUMMARY_FILE"
    elif [ "$HARDENING_INDEX" -ge 60 ]; then
        echo "Security Status: MODERATE" >> "$SUMMARY_FILE"
    else
        echo "Security Status: NEEDS IMPROVEMENT" >> "$SUMMARY_FILE"
    fi
fi

cat >> "$SUMMARY_FILE" << EOF

=== Files ===
Full Report: $LYNIS_REPORT
Detailed Log: $SCAN_LOG

=== Next Steps ===
1. Review warnings in the full report
2. Implement suggested improvements
3. Re-run scan to verify fixes
4. Schedule regular security scans (monthly)
EOF

echo -e "${GREEN}✓${NC} Summary report: $SUMMARY_FILE"
echo ""

# Step 10: Send Telegram notification
if [ -f "$TELEGRAM_SCRIPT" ]; then
    echo "Step 9: Sending Telegram notification..."

    NOTIFICATION_LEVEL="info"
    if [ "$HARDENING_INDEX" != "N/A" ] && [ "$HARDENING_INDEX" -lt 60 ]; then
        NOTIFICATION_LEVEL="warning"
    fi

    NOTIFICATION_MESSAGE="*Security Scan Completed*

*Hardening Index:* $HARDENING_INDEX / 100
*Warnings:* $WARNINGS_COUNT
*Suggestions:* $SUGGESTIONS_COUNT
*Duration:* ${DURATION}s

Review full report:
\`$SUMMARY_FILE\`"

    bash "$TELEGRAM_SCRIPT" "$NOTIFICATION_LEVEL" "Security Scan" "$NOTIFICATION_MESSAGE"

    echo -e "${GREEN}✓${NC} Notification sent"
    echo ""
fi

# Step 11: Display final summary
echo "=== Security Scan Complete ==="
echo ""

if [ "$HARDENING_INDEX" != "N/A" ]; then
    if [ "$HARDENING_INDEX" -ge 80 ]; then
        echo -e "${GREEN}✓${NC} Security Status: EXCELLENT (Hardening Index: $HARDENING_INDEX/100)"
    elif [ "$HARDENING_INDEX" -ge 70 ]; then
        echo -e "${GREEN}✓${NC} Security Status: GOOD (Hardening Index: $HARDENING_INDEX/100)"
    elif [ "$HARDENING_INDEX" -ge 60 ]; then
        echo -e "${YELLOW}⚠${NC}  Security Status: MODERATE (Hardening Index: $HARDENING_INDEX/100)"
    else
        echo -e "${RED}⚠${NC}  Security Status: NEEDS IMPROVEMENT (Hardening Index: $HARDENING_INDEX/100)"
    fi
else
    echo "Security Status: Scan completed (see reports for details)"
fi

echo ""
echo "Scan summary:"
echo "  Warnings: $WARNINGS_COUNT"
echo "  Suggestions: $SUGGESTIONS_COUNT"
echo "  Duration: ${DURATION}s"
echo ""

echo "Reports:"
echo "  Summary: $SUMMARY_FILE"
echo "  Full log: $SCAN_LOG"
echo "  Lynis report: $LYNIS_REPORT"
echo ""

echo "Next steps:"
echo ""
echo "  1. Review warnings:"
echo "     cat $SUMMARY_FILE"
echo "     less $LYNIS_REPORT"
echo ""
echo "  2. View specific category results:"
echo "     lynis show categories"
echo "     lynis show groups"
echo ""
echo "  3. Implement suggestions and re-scan:"
echo "     sudo bash scripts/security-scan.sh"
echo ""
echo "  4. Schedule regular scans (recommended: monthly):"
echo "     echo '0 4 1 * * /var/www/aurelle/scripts/security-scan.sh' | crontab -"
echo ""

echo "Common improvements to consider:"
echo ""
echo "  - SSH hardening: sudo bash scripts/harden-ssh.sh"
echo "  - Firewall setup: sudo bash scripts/setup-firewall.sh"
echo "  - Fail2ban: sudo bash scripts/setup-fail2ban.sh"
echo "  - Auto updates: sudo bash scripts/setup-auto-updates.sh"
echo "  - Audit logging: sudo bash scripts/setup-auditd.sh"
echo ""

# Step 12: Archive old scans
echo "Archiving old scan logs (keeping last 30 days)..."
find "$SCAN_LOG_DIR" -name "lynis-scan-*.log" -type f -mtime +30 -delete 2>/dev/null
find "$SCAN_LOG_DIR" -name "summary-*.txt" -type f -mtime +30 -delete 2>/dev/null
echo -e "${GREEN}✓${NC} Old logs cleaned up"
echo ""

