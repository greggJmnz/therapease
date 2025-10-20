#!/bin/bash

echo "🔍 Diagnosing Connection Issues..."

# Check PM2 status
echo "📊 PM2 Status:"
pm2 status

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

# Check Nginx status
echo "🌐 Nginx Status:"
sudo systemctl status nginx --no-pager

# Check Nginx configuration
echo "⚙️ Nginx Configuration:"
sudo nginx -t

# Check if Nginx is listening
echo "🔍 Nginx listening ports:"
sudo netstat -tlnp | grep nginx || echo "Nginx not listening"

# Test local connectivity
echo "🧪 Local API Test:"
curl -s http://localhost:5000/api/maintenance-status || echo "API not responding"

echo "🧪 Local Public Test:"
curl -s http://localhost:8080 || echo "Public site not responding"

# Check firewall
echo "🔥 Firewall Status:"
sudo ufw status || echo "UFW not available"

# Check if domain resolves
echo "🌍 Domain Resolution:"
nslookup therapease.site || echo "Domain resolution failed"
nslookup www.therapease.site || echo "www domain resolution failed"
nslookup api.therapease.site || echo "api domain resolution failed"

# Check Nginx logs
echo "📋 Recent Nginx Error Logs:"
sudo tail -20 /var/log/nginx/error.log

echo "📋 Recent Nginx Access Logs:"
sudo tail -20 /var/log/nginx/access.log

# Check PM2 logs
echo "📋 Recent API Logs:"
pm2 logs therapease-api --lines 10 --nostream

echo "📋 Recent Public Logs:"
pm2 logs therapease-public --lines 10 --nostream

echo "✅ Diagnosis complete!"
