#!/bin/bash

# CineMini Security Deployment Validation Script
# This script validates that all security measures are properly configured for production deployment

set -e

echo "🔒 CineMini Security Deployment Validation"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
check_passed() {
  echo -e "${GREEN}✅ $1${NC}"
  ((PASSED++))
}

check_failed() {
  echo -e "${RED}❌ $1${NC}"
  ((FAILED++))
}

check_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
  ((WARNINGS++))
}

check_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# 1. Environment Variables Check
echo "1. Checking Environment Variables"
echo "--------------------------------"

required_vars=(
  "NODE_ENV"
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "TMDB_API_KEY"
  "CSRF_SECRET"
  "SESSION_SECRET"
)

for var in "${required_vars[@]}"; do
  if [[ -n "${!var}" ]]; then
    if [[ "$var" == *"SECRET"* ]] || [[ "$var" == *"KEY"* ]]; then
      if [[ ${#!var} -ge 20 ]]; then
        check_passed "$var is set with appropriate length"
      else
        check_failed "$var is too short (minimum 20 characters for secrets)"
      fi
    else
      check_passed "$var is set"
    fi
  else
    check_failed "$var is not set"
  fi
done

# Check NODE_ENV is production
if [[ "$NODE_ENV" == "production" ]]; then
  check_passed "NODE_ENV is set to production"
else
  check_failed "NODE_ENV must be set to 'production' for deployment"
fi

echo ""

# 2. Security Configuration Check
echo "2. Checking Security Configuration"
echo "---------------------------------"

# Check if security middleware files exist
security_files=(
  "lib/security/index.ts"
  "lib/security/auth.ts"
  "lib/security/csrf.ts"
  "lib/security/rate-limit.ts"
  "lib/security/headers.ts"
  "lib/security/monitoring.ts"
  "lib/security/audit-logger.ts"
  "lib/validation/logging.ts"
)

for file in "${security_files[@]}"; do
  if [[ -f "$file" ]]; then
    check_passed "Security file exists: $file"
  else
    check_failed "Missing security file: $file"
  fi
done

# Check middleware.ts exists and has security measures
if [[ -f "middleware.ts" ]]; then
  if grep -q "applySecurity" middleware.ts; then
    check_passed "Security middleware is properly configured"
  else
    check_failed "Security middleware not found in middleware.ts"
  fi
else
  check_failed "middleware.ts file is missing"
fi

echo ""

# 3. Next.js Security Configuration
echo "3. Checking Next.js Security Configuration"
echo "-----------------------------------------"

if [[ -f "next.config.mjs" ]]; then
  check_passed "next.config.mjs exists"
  
  # Check for security headers
  if grep -q "headers()" next.config.mjs; then
    check_passed "Security headers are configured"
  else
    check_warning "Security headers may not be configured in next.config.mjs"
  fi
  
  # Check for poweredByHeader: false
  if grep -q "poweredByHeader.*false" next.config.mjs; then
    check_passed "X-Powered-By header is disabled"
  else
    check_warning "X-Powered-By header should be disabled"
  fi
else
  check_failed "next.config.mjs is missing"
fi

echo ""

# 4. Database Security Check
echo "4. Checking Database Security"
echo "-----------------------------"

# Check for SQL files with RLS policies
rls_files=(
  "sql/budget_bracket_rls_fix.sql"
  "sql/simple_rls_fix.sql"
)

for file in "${rls_files[@]}"; do
  if [[ -f "$file" ]]; then
    if grep -q "ROW LEVEL SECURITY" "$file"; then
      check_passed "RLS policies found in $file"
    else
      check_warning "RLS policies may not be properly configured in $file"
    fi
  else
    check_warning "RLS configuration file not found: $file"
  fi
done

echo ""

# 5. Security Testing Infrastructure
echo "5. Checking Security Testing Infrastructure"
echo "------------------------------------------"

test_files=(
  "lib/security/testing/security-test-helpers.ts"
  "lib/security/testing/vulnerability-scanner.ts"
  "app/api/admin/security/test/route.ts"
)

for file in "${test_files[@]}"; do
  if [[ -f "$file" ]]; then
    check_passed "Security testing file exists: $file"
  else
    check_failed "Missing security testing file: $file"
  fi
done

echo ""

# 6. API Security Check
echo "6. Checking API Security"
echo "-----------------------"

# Find all API route files and check for security measures
api_routes=$(find app/api -name "route.ts" 2>/dev/null || true)

if [[ -n "$api_routes" ]]; then
  secure_routes=0
  total_routes=0
  
  while IFS= read -r route; do
    ((total_routes++))
    if grep -q "withSecurity\|applySecurity" "$route"; then
      ((secure_routes++))
    fi
  done <<< "$api_routes"
  
  if [[ $secure_routes -eq $total_routes ]]; then
    check_passed "All $total_routes API routes are secured"
  else
    unsecured=$((total_routes - secure_routes))
    check_warning "$unsecured out of $total_routes API routes may not be secured"
  fi
else
  check_info "No API routes found"
fi

echo ""

# 7. Component Security Check
echo "7. Checking Component Security"
echo "------------------------------"

# Check for security components
security_components=(
  "components/security/security-dashboard.tsx"
  "components/security/audit-trail.tsx"
  "app/admin/security/page.tsx"
)

for component in "${security_components[@]}"; do
  if [[ -f "$component" ]]; then
    check_passed "Security component exists: $component"
  else
    check_failed "Missing security component: $component"
  fi
done

echo ""

# 8. Documentation Check
echo "8. Checking Security Documentation"
echo "---------------------------------"

docs=(
  "docs/SECURITY_GUIDE.md"
  "docs/SECURITY_TROUBLESHOOTING.md"
  "docs/SECURITY_DEPLOYMENT_GUIDE.md"
)

for doc in "${docs[@]}"; do
  if [[ -f "$doc" ]]; then
    check_passed "Security documentation exists: $doc"
  else
    check_failed "Missing security documentation: $doc"
  fi
done

echo ""

# 9. Package Security Check
echo "9. Checking Package Security"
echo "----------------------------"

if [[ -f "package.json" ]]; then
  check_passed "package.json exists"
  
  # Check for security-related packages
  security_packages=(
    "bcrypt"
    "jsonwebtoken"
    "helmet"
    "cors"
  )
  
  for package in "${security_packages[@]}"; do
    if grep -q "\"$package\"" package.json; then
      check_passed "Security package installed: $package"
    else
      check_info "Optional security package not found: $package"
    fi
  done
  
  # Run npm audit if npm is available
  if command -v npm &> /dev/null; then
    echo ""
    check_info "Running npm audit..."
    if npm audit --audit-level=moderate --dry-run > /dev/null 2>&1; then
      check_passed "No moderate or high security vulnerabilities found"
    else
      check_warning "Security vulnerabilities found - run 'npm audit' to see details"
    fi
  fi
else
  check_failed "package.json is missing"
fi

echo ""

# 10. Build and Production Readiness
echo "10. Checking Production Readiness"
echo "--------------------------------"

# Check if .env.example exists for reference
if [[ -f ".env.example" ]]; then
  check_passed ".env.example exists for reference"
else
  check_warning ".env.example not found - consider creating one for deployment reference"
fi

# Check if .gitignore includes security files
if [[ -f ".gitignore" ]]; then
  if grep -q ".env" .gitignore; then
    check_passed ".env files are properly ignored by git"
  else
    check_failed ".env files should be added to .gitignore"
  fi
else
  check_warning ".gitignore file not found"
fi

# Check if there are any .env files committed (security risk)
if git ls-files | grep -q "\.env$"; then
  check_failed ".env files are committed to git - this is a security risk!"
else
  check_passed "No .env files are committed to git"
fi

echo ""

# 11. TypeScript and Build Check
echo "11. Checking TypeScript Configuration"
echo "------------------------------------"

if [[ -f "tsconfig.json" ]]; then
  check_passed "tsconfig.json exists"
  
  # Check for strict mode
  if grep -q '"strict": true' tsconfig.json; then
    check_passed "TypeScript strict mode is enabled"
  else
    check_warning "TypeScript strict mode should be enabled for better security"
  fi
else
  check_failed "tsconfig.json is missing"
fi

# Try to build the project to check for TypeScript errors
if command -v npm &> /dev/null; then
  echo ""
  check_info "Running TypeScript check..."
  if npm run build > /dev/null 2>&1; then
    check_passed "Project builds successfully with no TypeScript errors"
  else
    check_warning "Project build failed - fix TypeScript errors before deployment"
  fi
fi

echo ""

# Final Summary
echo "🎯 Security Validation Summary"
echo "=============================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [[ $FAILED -eq 0 ]]; then
  if [[ $WARNINGS -eq 0 ]]; then
    echo -e "${GREEN}🎉 Excellent! All security checks passed. Your application is ready for secure deployment.${NC}"
    exit 0
  else
    echo -e "${YELLOW}⚠️  Good! All critical checks passed, but there are $WARNINGS warnings to consider.${NC}"
    echo -e "${YELLOW}   Review the warnings above and address them if possible before deployment.${NC}"
    exit 0
  fi
else
  echo -e "${RED}❌ Critical security issues found! Please fix all failed checks before deployment.${NC}"
  echo ""
  echo "Common fixes:"
  echo "- Set all required environment variables"
  echo "- Ensure all security middleware files are present"
  echo "- Configure security headers in next.config.mjs"
  echo "- Remove any .env files from git tracking"
  echo "- Fix any TypeScript compilation errors"
  echo ""
  echo "Run this script again after making fixes."
  exit 1
fi