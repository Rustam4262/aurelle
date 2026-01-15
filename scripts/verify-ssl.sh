#!/bin/bash

# SSL Certificate Verification Script
# Verifies SSL configuration and security settings

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DOMAINS="${DOMAINS:-aurelle.uz www.aurelle.uz staging.aurelle.uz}"
REPORT_FILE="/var/log/aurelle-monitoring/ssl-verification-$(date +%Y%m%d-%H%M%S).txt"

echo "=== SSL Certificate Verification ===" | tee "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

# Create report directory
mkdir -p "$(dirname "$REPORT_FILE")"

# Function to check domain
check_domain() {
    local domain="$1"

    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$REPORT_FILE"
    echo -e "${BLUE}Checking: $domain${NC}" | tee -a "$REPORT_FILE"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$REPORT_FILE"
    echo "" | tee -a "$REPORT_FILE"

    # 1. Check if site is accessible via HTTPS
    echo "1. HTTPS Accessibility..." | tee -a "$REPORT_FILE"
    if curl -s -o /dev/null -w "%{http_code}" "https://$domain" | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✓${NC} Site is accessible via HTTPS" | tee -a "$REPORT_FILE"
    else
        echo -e "${RED}✗${NC} Site is not accessible via HTTPS" | tee -a "$REPORT_FILE"
    fi
    echo "" | tee -a "$REPORT_FILE"

    # 2. Check HTTP to HTTPS redirect
    echo "2. HTTP → HTTPS Redirect..." | tee -a "$REPORT_FILE"
    HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://$domain")
    REDIRECT_LOCATION=$(curl -s -I "http://$domain" | grep -i "Location:" | awk '{print $2}' | tr -d '\r')

    if [ "$HTTP_RESPONSE" = "301" ] || [ "$HTTP_RESPONSE" = "302" ]; then
        if [[ "$REDIRECT_LOCATION" == https://* ]]; then
            echo -e "${GREEN}✓${NC} HTTP redirects to HTTPS (Status: $HTTP_RESPONSE)" | tee -a "$REPORT_FILE"
            echo "  Redirect: $REDIRECT_LOCATION" | tee -a "$REPORT_FILE"
        else
            echo -e "${YELLOW}⚠${NC}  HTTP redirects but not to HTTPS" | tee -a "$REPORT_FILE"
        fi
    else
        echo -e "${RED}✗${NC} HTTP does not redirect to HTTPS (Status: $HTTP_RESPONSE)" | tee -a "$REPORT_FILE"
    fi
    echo "" | tee -a "$REPORT_FILE"

    # 3. Certificate Information
    echo "3. Certificate Information..." | tee -a "$REPORT_FILE"
    CERT_INFO=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -text 2>/dev/null)

    if [ -n "$CERT_INFO" ]; then
        # Issuer
        ISSUER=$(echo "$CERT_INFO" | grep "Issuer:" | sed 's/.*Issuer: //')
        echo "  Issuer: $ISSUER" | tee -a "$REPORT_FILE"

        # Subject
        SUBJECT=$(echo "$CERT_INFO" | grep "Subject:" | sed 's/.*Subject: //')
        echo "  Subject: $SUBJECT" | tee -a "$REPORT_FILE"

        # Validity
        echo "$CERT_INFO" | grep -A2 "Validity" | tee -a "$REPORT_FILE"

        # Expiration check
        EXPIRY_DATE=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
        if [ -n "$EXPIRY_DATE" ]; then
            EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$EXPIRY_DATE" +%s 2>/dev/null)
            CURRENT_EPOCH=$(date +%s)
            DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

            echo "  Expires: $EXPIRY_DATE" | tee -a "$REPORT_FILE"
            echo "  Days until expiration: $DAYS_UNTIL_EXPIRY" | tee -a "$REPORT_FILE"

            if [ $DAYS_UNTIL_EXPIRY -le 14 ]; then
                echo -e "  ${RED}⚠ WARNING: Certificate expires in $DAYS_UNTIL_EXPIRY days!${NC}" | tee -a "$REPORT_FILE"
            elif [ $DAYS_UNTIL_EXPIRY -le 30 ]; then
                echo -e "  ${YELLOW}⚠ NOTICE: Certificate expires in $DAYS_UNTIL_EXPIRY days${NC}" | tee -a "$REPORT_FILE"
            else
                echo -e "  ${GREEN}✓ Certificate valid for $DAYS_UNTIL_EXPIRY days${NC}" | tee -a "$REPORT_FILE"
            fi
        fi

        # SANs (Subject Alternative Names)
        SANS=$(echo "$CERT_INFO" | grep -A1 "Subject Alternative Name" | tail -1 | sed 's/DNS://g')
        if [ -n "$SANS" ]; then
            echo "  SANs:$SANS" | tee -a "$REPORT_FILE"
        fi
    else
        echo -e "${RED}✗${NC} Unable to retrieve certificate information" | tee -a "$REPORT_FILE"
    fi
    echo "" | tee -a "$REPORT_FILE"

    # 4. TLS Version Check
    echo "4. TLS Protocol Support..." | tee -a "$REPORT_FILE"

    # Check TLS 1.0 (should NOT be supported)
    if timeout 5 openssl s_client -tls1 -connect "$domain:443" </dev/null 2>&1 | grep -q "Cipher"; then
        echo -e "  ${RED}✗ TLS 1.0: Supported (INSECURE)${NC}" | tee -a "$REPORT_FILE"
    else
        echo -e "  ${GREEN}✓ TLS 1.0: Not supported (Good)${NC}" | tee -a "$REPORT_FILE"
    fi

    # Check TLS 1.1 (should NOT be supported)
    if timeout 5 openssl s_client -tls1_1 -connect "$domain:443" </dev/null 2>&1 | grep -q "Cipher"; then
        echo -e "  ${RED}✗ TLS 1.1: Supported (INSECURE)${NC}" | tee -a "$REPORT_FILE"
    else
        echo -e "  ${GREEN}✓ TLS 1.1: Not supported (Good)${NC}" | tee -a "$REPORT_FILE"
    fi

    # Check TLS 1.2 (should be supported)
    if timeout 5 openssl s_client -tls1_2 -connect "$domain:443" </dev/null 2>&1 | grep -q "Cipher"; then
        echo -e "  ${GREEN}✓ TLS 1.2: Supported (Good)${NC}" | tee -a "$REPORT_FILE"
    else
        echo -e "  ${YELLOW}⚠ TLS 1.2: Not supported${NC}" | tee -a "$REPORT_FILE"
    fi

    # Check TLS 1.3 (should be supported)
    if timeout 5 openssl s_client -tls1_3 -connect "$domain:443" </dev/null 2>&1 | grep -q "Cipher"; then
        echo -e "  ${GREEN}✓ TLS 1.3: Supported (Excellent)${NC}" | tee -a "$REPORT_FILE"
    else
        echo -e "  ${YELLOW}⚠ TLS 1.3: Not supported${NC}" | tee -a "$REPORT_FILE"
    fi
    echo "" | tee -a "$REPORT_FILE"

    # 5. Security Headers Check
    echo "5. Security Headers..." | tee -a "$REPORT_FILE"

    HEADERS=$(curl -s -I "https://$domain" 2>/dev/null)

    # HSTS
    if echo "$HEADERS" | grep -qi "Strict-Transport-Security"; then
        HSTS=$(echo "$HEADERS" | grep -i "Strict-Transport-Security" | cut -d: -f2- | xargs)
        echo -e "  ${GREEN}✓ HSTS: $HSTS${NC}" | tee -a "$REPORT_FILE"
    else
        echo -e "  ${RED}✗ HSTS: Not configured${NC}" | tee -a "$REPORT_FILE"
    fi

    # X-Frame-Options
    if echo "$HEADERS" | grep -qi "X-Frame-Options"; then
        XFO=$(echo "$HEADERS" | grep -i "X-Frame-Options" | cut -d: -f2- | xargs)
        echo -e "  ${GREEN}✓ X-Frame-Options: $XFO${NC}" | tee -a "$REPORT_FILE"
    else
        echo -e "  ${YELLOW}⚠ X-Frame-Options: Not configured${NC}" | tee -a "$REPORT_FILE"
    fi

    # X-Content-Type-Options
    if echo "$HEADERS" | grep -qi "X-Content-Type-Options"; then
        XCTO=$(echo "$HEADERS" | grep -i "X-Content-Type-Options" | cut -d: -f2- | xargs)
        echo -e "  ${GREEN}✓ X-Content-Type-Options: $XCTO${NC}" | tee -a "$REPORT_FILE"
    else
        echo -e "  ${YELLOW}⚠ X-Content-Type-Options: Not configured${NC}" | tee -a "$REPORT_FILE"
    fi

    # X-XSS-Protection
    if echo "$HEADERS" | grep -qi "X-XSS-Protection"; then
        XXSS=$(echo "$HEADERS" | grep -i "X-XSS-Protection" | cut -d: -f2- | xargs)
        echo -e "  ${GREEN}✓ X-XSS-Protection: $XXSS${NC}" | tee -a "$REPORT_FILE"
    else
        echo -e "  ${YELLOW}⚠ X-XSS-Protection: Not configured${NC}" | tee -a "$REPORT_FILE"
    fi

    # Content-Security-Policy
    if echo "$HEADERS" | grep -qi "Content-Security-Policy"; then
        CSP=$(echo "$HEADERS" | grep -i "Content-Security-Policy" | cut -d: -f2- | xargs | cut -c1-80)
        echo -e "  ${GREEN}✓ CSP: ${CSP}...${NC}" | tee -a "$REPORT_FILE"
    else
        echo -e "  ${YELLOW}⚠ CSP: Not configured${NC}" | tee -a "$REPORT_FILE"
    fi
    echo "" | tee -a "$REPORT_FILE"

    # 6. Cipher Strength
    echo "6. Cipher Configuration..." | tee -a "$REPORT_FILE"
    CIPHER=$(echo | openssl s_client -connect "$domain:443" 2>/dev/null | grep "Cipher" | head -1)
    echo "  $CIPHER" | tee -a "$REPORT_FILE"
    echo "" | tee -a "$REPORT_FILE"

    # 7. OCSP Stapling
    echo "7. OCSP Stapling..." | tee -a "$REPORT_FILE"
    OCSP_STATUS=$(echo | openssl s_client -connect "$domain:443" -status 2>/dev/null | grep "OCSP Response Status")
    if echo "$OCSP_STATUS" | grep -q "successful"; then
        echo -e "  ${GREEN}✓ OCSP Stapling: Enabled${NC}" | tee -a "$REPORT_FILE"
    else
        echo -e "  ${YELLOW}⚠ OCSP Stapling: Not detected${NC}" | tee -a "$REPORT_FILE"
    fi
    echo "" | tee -a "$REPORT_FILE"
}

# Check all domains
for domain in $DOMAINS; do
    check_domain "$domain"
done

# Summary
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$REPORT_FILE"
echo -e "${GREEN}Verification Summary${NC}" | tee -a "$REPORT_FILE"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

echo "Report saved to: $REPORT_FILE" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

echo "Next Steps:" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"
echo "1. Test on SSL Labs (more comprehensive test):" | tee -a "$REPORT_FILE"
for domain in $DOMAINS; do
    echo "   https://www.ssllabs.com/ssltest/analyze.html?d=$domain" | tee -a "$REPORT_FILE"
done
echo "" | tee -a "$REPORT_FILE"
echo "2. Check Mozilla Observatory:" | tee -a "$REPORT_FILE"
for domain in $DOMAINS; do
    echo "   https://observatory.mozilla.org/analyze/$domain" | tee -a "$REPORT_FILE"
done
echo "" | tee -a "$REPORT_FILE"
echo "3. Security Headers check:" | tee -a "$REPORT_FILE"
for domain in $DOMAINS; do
    echo "   https://securityheaders.com/?q=$domain" | tee -a "$REPORT_FILE"
done
echo "" | tee -a "$REPORT_FILE"

echo "=== Verification Complete ===" | tee -a "$REPORT_FILE"
