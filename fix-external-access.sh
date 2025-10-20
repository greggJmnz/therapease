#!/bin/bash

echo "🔧 Fixing External Domain Access..."

# Check if there are any firewall rules blocking external access
echo "🔥 Checking firewall status..."
sudo ufw status verbose

# Check if there are any iptables rules
echo "🔒 Checking iptables rules..."
sudo iptables -L -n | head -20

# Check if the server is binding to the correct interface
echo "🌐 Checking service binding..."
echo "Nginx binding:"
sudo ss -tlnp | grep :80

echo ""
echo "API binding:"
sudo ss -tlnp | grep :5000

echo ""
echo "Public binding:"
sudo ss -tlnp | grep :8080

# Test external connectivity from the server itself
echo "🧪 Testing external connectivity from server..."
echo "Testing HTTP main site:"
curl -v http://therapease.site/ 2>&1 | head -10

echo ""
echo "Testing HTTP API:"
curl -v http://therapease.site/api/maintenance-status 2>&1 | head -10

# Check if there are any proxy or load balancer issues
echo "🔍 Checking for proxy issues..."
echo "Testing with different user agents:"
curl -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" -I http://therapease.site/

echo ""
echo "Testing with different headers:"
curl -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" -I http://therapease.site/

# Check if there are any rate limiting or blocking
echo "🔍 Checking for rate limiting..."
echo "Making multiple requests:"
for i in {1..5}; do
    echo "Request $i:"
    curl -s -I http://therapease.site/ | head -1
    sleep 1
done

# Check if the issue is with specific browsers or locations
echo "🌍 Testing from different perspectives..."
echo "Testing with curl from server:"
curl -s http://therapease.site/ | head -5

echo ""
echo "Testing API from server:"
curl -s http://therapease.site/api/maintenance-status

# Check if there are any DNS propagation issues
echo "🌐 Checking DNS propagation..."
echo "Testing with different DNS servers:"
nslookup therapease.site 8.8.8.8
nslookup therapease.site 1.1.1.1

# Check if the issue is with the domain registrar or DNS
echo "🔍 Checking domain configuration..."
echo "Testing direct IP access:"
curl -s -I http://167.71.199.133/ | head -5

echo ""
echo "Testing with Host header:"
curl -s -I -H "Host: therapease.site" http://167.71.199.133/ | head -5

echo "✅ External access diagnosis complete!"
