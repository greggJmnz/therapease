#!/bin/bash

echo "🔍 Diagnosing Domain Access Issues..."

# Check PM2 status
echo "📊 PM2 Status:"
pm2 status

# Check Nginx status
echo "🌐 Nginx Status:"
sudo systemctl status nginx --no-pager

# Check what's listening on ports
echo "🔌 Port Status:"
echo "Port 80 (HTTP):"
sudo lsof -i :80 || echo "Nothing on port 80"

echo "Port 443 (HTTPS):"
sudo lsof -i :443 || echo "Nothing on port 443"

echo "Port 5000 (API):"
sudo lsof -i :5000 || echo "Nothing on port 5000"

echo "Port 8080 (Public):"
sudo lsof -i :8080 || echo "Nothing on port 8080"

# Test local connectivity
echo "🧪 Local connectivity tests:"
echo "Local API test:"
curl -s http://localhost:5000/api/maintenance-status || echo "API not responding"

echo ""
echo "Local public site test:"
curl -s -I http://localhost:8080 || echo "Public site not responding"

echo ""
echo "Local Nginx test:"
curl -s -I http://localhost/ || echo "Nginx not responding"

# Test external connectivity from server
echo "🌍 External connectivity tests from server:"
echo "HTTP main site:"
curl -s -I http://therapease.site/ || echo "HTTP main site not responding"

echo ""
echo "HTTPS main site:"
curl -s -I https://therapease.site/ || echo "HTTPS main site not responding"

echo ""
echo "HTTP API:"
curl -s http://therapease.site/api/maintenance-status || echo "HTTP API not responding"

echo ""
echo "HTTPS API:"
curl -s https://therapease.site/api/maintenance-status || echo "HTTPS API not responding"

# Check Nginx configuration
echo "⚙️ Nginx Configuration:"
sudo nginx -t

# Check Nginx logs
echo "📋 Recent Nginx Error Logs:"
sudo tail -10 /var/log/nginx/error.log

echo ""
echo "📋 Recent Nginx Access Logs:"
sudo tail -10 /var/log/nginx/access.log

# Check firewall
echo "🔥 Firewall Status:"
sudo ufw status || echo "UFW not available"

# Check if domain resolves
echo "🌍 Domain Resolution:"
nslookup therapease.site || echo "Domain resolution failed"
nslookup www.therapease.site || echo "www domain resolution failed"
nslookup api.therapease.site || echo "api domain resolution failed"

# Check PM2 logs
echo "📋 Recent API Logs:"
pm2 logs therapease-api --lines 5 --nostream

echo ""
echo "📋 Recent Public Logs:"
pm2 logs therapease-public --lines 5 --nostream

# Check if services are binding to correct interfaces
echo "🔍 Service binding check:"
echo "API service binding:"
sudo netstat -tlnp | grep :5000 || echo "Nothing on port 5000"

echo ""
echo "Public service binding:"
sudo netstat -tlnp | grep :8080 || echo "Nothing on port 8080"

echo ""
echo "Nginx binding:"
sudo netstat -tlnp | grep :80 || echo "Nothing on port 80"

echo "✅ Domain diagnosis complete!"
