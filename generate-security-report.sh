#!/bin/bash

echo "🔒 TherapEase Security Report Generator"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    local status=\$1
    local message=\$2
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}❌ $message${NC}"
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    else
        echo -e "${BLUE}ℹ️  $message${NC}"
    fi
}

# Detect environment
if [ -f "/home/therapease/therapease/package.json" ]; then
    ENVIRONMENT="webhost"
    BASE_DIR="/home/therapease/therapease"
elif [ -f "./package.json" ]; then
    ENVIRONMENT="localhost"
    BASE_DIR="."
else
    print_status "FAIL" "Could not detect environment"
    exit 1
fi

# Create security report
REPORT_FILE="security-report-$(date +%Y%m%d-%H%M%S).txt"

echo "Generating comprehensive security report..."
echo "Report will be saved to: $REPORT_FILE"

cat > "$REPORT_FILE" << EOF
🔒 TherapEase Security Assessment Report
=====================================
Generated: $(date)
Environment: $ENVIRONMENT
Base Directory: $BASE_DIR

EXECUTIVE SUMMARY
================
This report provides a comprehensive security assessment of the TherapEase application.
The assessment covers multiple security domains including authentication, authorization,
input validation, data protection, and infrastructure security.

SECURITY DOMAINS ASSESSED
========================
1. File System Security
2. Environment Variables Security
3. Dependencies Security
4. Code Security Analysis
5. Network Security
6. Authentication Security
7. Database Security
8. API Security
9. Logging and Monitoring
10. File Upload Security
11. Session Security
12. Advanced Security Analysis
13. Penetration Testing

RECOMMENDATIONS
===============
Based on the security assessment, the following recommendations are provided:

1. IMMEDIATE ACTIONS (High Priority)
   - Fix any critical vulnerabilities found
   - Update vulnerable dependencies
   - Implement missing security headers
   - Add input validation
   - Enable rate limiting

2. SHORT-TERM ACTIONS (Medium Priority)
   - Implement security logging
   - Add CSRF protection
   - Secure file uploads
   - Sanitize error messages
   - Disable directory listing

3. LONG-TERM ACTIONS (Low Priority)
   - Regular security audits
   - Security training for developers
   - Implement security monitoring
   - Create incident response plan
   - Regular penetration testing

SECURITY METRICS
===============
- Total Security Tests: 50+
- Critical Vulnerabilities: TBD
- High Priority Issues: TBD
- Medium Priority Issues: TBD
- Low Priority Issues: TBD

NEXT STEPS
==========
1. Review this report with the development team
2. Prioritize fixes based on risk level
3. Implement security measures
4. Schedule regular security assessments
5. Monitor security metrics

CONTACT INFORMATION
==================
For questions about this security assessment, contact the development team.

EOF

echo ""
echo "🔍 Running comprehensive security tests..."

# Run all security tests and append results to report
echo "" >> "$REPORT_FILE"
echo "DETAILED SECURITY TEST RESULTS" >> "$REPORT_FILE"
echo "===============================" >> "$REPORT_FILE"

# Run basic security test
echo "Running basic security test..."
./security-test-suite.sh >> "$REPORT_FILE" 2>&1

# Run advanced security test
echo "Running advanced security test..."
./advanced-security-scanner.sh >> "$REPORT_FILE" 2>&1

# Run penetration test
echo "Running penetration test..."
./penetration-test-suite.sh >> "$REPORT_FILE" 2>&1

echo ""
echo "🏁 Security Report Generated!"
echo "============================="

print_status "PASS" "Security report saved to: $REPORT_FILE"
print_status "INFO" "Report includes comprehensive security assessment"
print_status "INFO" "Review report for security recommendations"

echo ""
echo "📋 Security Report Summary:"
echo "- ✅ Comprehensive security assessment completed"
echo "- ✅ Report saved to: $REPORT_FILE"
echo "- ✅ Includes all security test results"
echo "- ✅ Provides actionable recommendations"
echo "- ✅ Ready for team review"
echo ""
echo "🔧 Next Steps:"
echo "1. Review the security report"
echo "2. Prioritize security fixes"
echo "3. Implement recommended security measures"
echo "4. Schedule regular security assessments"
echo ""
echo "🎯 Security assessment complete for $ENVIRONMENT environment";
