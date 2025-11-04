#!/bin/bash
# Diagnose 401 Unauthorized errors after login

echo "=========================================="
echo "  Diagnose 401 Unauthorized Errors"
echo "=========================================="
echo ""

# Check backend logs for 401 errors
echo "1. Checking backend logs for 401 errors..."
echo "-----------------------------------"
if [ -f /home/therapease_user/therapease/logs/api-error.log ]; then
    echo "Recent 401 errors from backend:"
    tail -50 /home/therapease_user/therapease/logs/api-error.log | grep -i "401\|unauthorized\|token" | tail -10
else
    echo "⚠️  Backend error log not found"
fi
echo ""

# Check PM2 logs for auth errors
echo "2. Checking PM2 logs for auth errors..."
echo "-----------------------------------"
pm2 logs therapease-api --lines 50 --nostream | grep -i "401\|unauthorized\|token\|auth" | tail -10
echo ""

# Check JWT_SECRET in environment
echo "3. Checking JWT_SECRET configuration..."
echo "-----------------------------------"
if [ -f /home/therapease_user/therapease/server/.env.production ]; then
    if grep -q "^JWT_SECRET=" /home/therapease_user/therapease/server/.env.production; then
        JWT_SECRET_LENGTH=$(grep "^JWT_SECRET=" /home/therapease_user/therapease/server/.env.production | cut -d= -f2 | tr -d '"' | wc -c)
        echo "✅ JWT_SECRET is set (length: $((JWT_SECRET_LENGTH-1)) characters)"
        echo "   First 10 chars: $(grep "^JWT_SECRET=" /home/therapease_user/therapease/server/.env.production | cut -d= -f2 | tr -d '"' | cut -c1-10)..."
    else
        echo "❌ JWT_SECRET not found in .env.production"
    fi
else
    echo "⚠️  .env.production file not found"
fi
echo ""

# Check if backend is running
echo "4. Checking backend status..."
echo "-----------------------------------"
pm2 status | grep therapease-api
if pm2 list | grep -q "therapease-api.*online"; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is NOT running!"
fi
echo ""

# Test auth endpoint manually
echo "5. Testing auth verify endpoint..."
echo "-----------------------------------"
echo "This requires a valid token. Check browser console for token errors."
echo ""
echo "Common causes of 401 errors:"
echo "  1. Token not in localStorage after login"
echo "  2. Authorization header not being sent (CORS issue)"
echo "  3. Token expired immediately"
echo "  4. JWT_SECRET mismatch"
echo "  5. Backend not receiving Authorization header"
echo ""

# Check CORS configuration
echo "6. Checking CORS configuration..."
echo "-----------------------------------"
if grep -q "CORS_ORIGIN" /home/therapease_user/therapease/server/.env.production 2>/dev/null; then
    echo "CORS_ORIGIN in .env.production:"
    grep "^CORS_ORIGIN=" /home/therapease_user/therapease/server/.env.production
else
    echo "⚠️  CORS_ORIGIN not set in .env.production"
    echo "   Using default CORS origins from server code"
fi
echo ""

echo "=========================================="
echo "  Diagnosis Complete"
echo "=========================================="
echo ""
echo "To debug further:"
echo "1. Open browser DevTools -> Network tab"
echo "2. Try to login again"
echo "3. Check the failed requests:"
echo "   - Look at Request Headers - is 'Authorization: Bearer ...' present?"
echo "   - Look at Response - what's the exact error message?"
echo "4. Check browser Console for JavaScript errors"
echo "5. Check localStorage: localStorage.getItem('token')"
echo ""

