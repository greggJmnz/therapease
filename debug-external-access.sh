#!/bin/bash

echo "🔍 Debugging External Access Issues..."

# Check if we can reach the server from outside
echo "🌍 Testing external access from server itself:"
curl -v http://therapease.site/ 2>&1 | head -20

echo ""
echo "🧪 Testing API endpoint:"
curl -v http://therapease.site/api/maintenance-status 2>&1 | head -20

echo ""
echo "🔍 Checking Nginx configuration:"
sudo cat /etc/nginx/sites-available/therapease

echo ""
echo "🔍 Checking if Nginx is actually serving the right content:"
curl -s http://localhost/ | head -10

echo ""
echo "🔍 Checking API through localhost:"
curl -s http://localhost/api/maintenance-status

echo ""
echo "🔍 Checking what's actually listening:"
sudo lsof -i :80 -P

echo ""
echo "🔍 Checking Nginx error logs:"
sudo tail -10 /var/log/nginx/error.log

echo ""
echo "🔍 Checking Nginx access logs:"
sudo tail -10 /var/log/nginx/access.log

echo ""
echo "🔍 Testing direct connection to services:"
echo "API direct test:"
curl -s http://localhost:5000/api/maintenance-status

echo ""
echo "Public site direct test:"
curl -s http://localhost:8080/ | head -5

echo ""
echo "🔍 Checking PM2 logs for errors:"
pm2 logs therapease-api --lines 5 --nostream
pm2 logs therapease-public --lines 5 --nostream

echo "✅ Debug complete!"
