#!/bin/bash

# 🌐 TherapEase Domain Configuration Script
# This script helps configure DNS settings for therapease.site domain

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DROPLET_IP="167.71.199.133"
DOMAIN="therapease.site"
API_DOMAIN="api.therapease.site"
WWW_DOMAIN="www.therapease.site"

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_header "🌐 TherapEase Domain Configuration"
echo "======================================"
print_status "Domain: $DOMAIN"
print_status "API Domain: $API_DOMAIN"
print_status "WWW Domain: $WWW_DOMAIN"
print_status "Droplet IP: $DROPLET_IP"
echo ""

print_header "DNS Configuration Required"
echo "================================"
print_warning "To use your domain, you need to configure DNS records with your domain registrar."
echo ""

print_status "Required DNS Records:"
echo ""
echo "1. A Record (Main Domain):"
echo "   Name: @"
echo "   Type: A"
echo "   Value: $DROPLET_IP"
echo "   TTL: 300 (5 minutes)"
echo ""

echo "2. A Record (API Subdomain):"
echo "   Name: api"
echo "   Type: A"
echo "   Value: $DROPLET_IP"
echo "   TTL: 300 (5 minutes)"
echo ""

echo "3. A Record (WWW Subdomain):"
echo "   Name: www"
echo "   Type: A"
echo "   Value: $DROPLET_IP"
echo "   TTL: 300 (5 minutes)"
echo ""

print_header "Popular Domain Registrars"
echo "=============================="
echo ""

echo "🔹 Cloudflare:"
echo "   1. Add your domain to Cloudflare"
echo "   2. Update nameservers at your registrar"
echo "   3. Add A records in Cloudflare DNS"
echo ""

echo "🔹 GoDaddy:"
echo "   1. Go to DNS Management"
echo "   2. Add A records for @, api, and www"
echo "   3. Point all to $DROPLET_IP"
echo ""

echo "🔹 Namecheap:"
echo "   1. Go to Advanced DNS"
echo "   2. Add A records for @, api, and www"
echo "   3. Point all to $DROPLET_IP"
echo ""

echo "🔹 Google Domains:"
echo "   1. Go to DNS settings"
echo "   2. Add A records for @, api, and www"
echo "   3. Point all to $DROPLET_IP"
echo ""

print_header "DNS Propagation Check"
echo "=========================="
print_status "After configuring DNS, you can check propagation with:"
echo ""
echo "nslookup $DOMAIN"
echo "nslookup $API_DOMAIN"
echo "nslookup $WWW_DOMAIN"
echo ""

print_status "Or use online tools:"
echo "https://dnschecker.org/"
echo "https://whatsmydns.net/"
echo ""

print_header "SSL Certificate Setup"
echo "==========================="
print_status "Once DNS is configured, you can set up SSL certificates:"
echo ""
echo "sudo certbot --nginx -d $DOMAIN -d $WWW_DOMAIN -d $API_DOMAIN"
echo ""

print_header "Testing Domain Configuration"
echo "=================================="
print_status "Test your domain configuration:"
echo ""
echo "# Test main domain"
echo "curl -I http://$DOMAIN"
echo ""
echo "# Test API domain"
echo "curl -I http://$API_DOMAIN/health"
echo ""
echo "# Test www domain"
echo "curl -I http://$WWW_DOMAIN"
echo ""

print_header "Nginx Configuration Update"
echo "==============================="
print_status "If you need to update Nginx configuration for your domain:"
echo ""
echo "sudo nano /etc/nginx/sites-available/therapease"
echo "sudo nginx -t"
echo "sudo systemctl reload nginx"
echo ""

print_header "Environment Variables Update"
echo "=================================="
print_status "Update your environment variables to use the domain:"
echo ""
echo "sudo nano /home/therapease/therapease/server/.env.production"
echo ""
echo "Update these variables:"
echo "CORS_ORIGIN=https://$DOMAIN"
echo "API_BASE_URL=https://$API_DOMAIN"
echo "REACT_APP_API_URL=https://$API_DOMAIN/api"
echo ""

print_header "Restart Services"
echo "====================="
print_status "After updating configuration, restart services:"
echo ""
echo "pm2 restart all"
echo "sudo systemctl reload nginx"
echo ""

print_header "Domain Configuration Complete!"
echo "===================================="
print_status "Your TherapEase application will be accessible at:"
echo ""
print_status "Frontend: https://$DOMAIN"
print_status "API: https://$API_DOMAIN"
print_status "Public Website: https://$WWW_DOMAIN"
echo ""

print_warning "Remember to:"
print_warning "1. Configure DNS records with your domain registrar"
print_warning "2. Wait for DNS propagation (5-30 minutes)"
print_warning "3. Set up SSL certificates with Certbot"
print_warning "4. Update environment variables"
print_warning "5. Restart services"
echo ""

print_status "For detailed instructions, see: COMPLETE_DEPLOYMENT_GUIDE.md"
