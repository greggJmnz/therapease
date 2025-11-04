#!/bin/bash
# Check nginx configuration error

echo "Checking nginx configuration error..."
echo ""

NGINX_CONFIG="/etc/nginx/sites-enabled/therapease"

# Check nginx test
echo "1. Running nginx test..."
nginx -t 2>&1 | tee /tmp/nginx-test-output.txt

echo ""
echo "2. Checking line 66 (where the error was):"
sed -n '60,70p' "$NGINX_CONFIG" | cat -n

echo ""
echo "3. Checking for syntax issues around location blocks:"
grep -n "location / {" "$NGINX_CONFIG" | head -3
grep -n "location /api/ {" "$NGINX_CONFIG" | head -3

echo ""
echo "4. Checking if bot blocking was added correctly:"
grep -A 5 "location / {" "$NGINX_CONFIG" | head -10
echo "---"
grep -A 5 "location /api/ {" "$NGINX_CONFIG" | head -10

