#!/bin/bash
# Script to block malicious IP addresses using UFW firewall

set -e

if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

IP_ADDRESS=$1

if [ -z "$IP_ADDRESS" ]; then
    echo "Usage: sudo ./block-malicious-ip.sh <IP_ADDRESS>"
    echo "Example: sudo ./block-malicious-ip.sh 69.160.7.114"
    exit 1
fi

# Validate IP address format
if ! [[ $IP_ADDRESS =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
    echo "❌ Invalid IP address format: $IP_ADDRESS"
    exit 1
fi

echo "=========================================="
echo "  Block Malicious IP Address"
echo "=========================================="
echo ""
echo "Blocking IP: $IP_ADDRESS"
echo ""

# Check if UFW is installed
if ! command -v ufw &> /dev/null; then
    echo "❌ UFW is not installed. Installing..."
    apt-get update
    apt-get install -y ufw
fi

# Check if UFW is active
if ! ufw status | grep -q "Status: active"; then
    echo "⚠️  UFW is not active. Enabling UFW..."
    ufw --force enable
fi

# Check if IP is already blocked
if ufw status | grep -q "$IP_ADDRESS"; then
    echo "ℹ️  IP $IP_ADDRESS is already blocked"
    ufw status | grep "$IP_ADDRESS"
else
    # Block the IP
    echo "🚫 Blocking IP address: $IP_ADDRESS"
    ufw deny from $IP_ADDRESS
    
    echo ""
    echo "✅ IP $IP_ADDRESS has been blocked"
    echo ""
    echo "UFW status for this IP:"
    ufw status | grep "$IP_ADDRESS"
fi

echo ""
echo "=========================================="
echo "  Block Complete"
echo "=========================================="
echo ""
echo "To unblock this IP later, run:"
echo "  sudo ufw delete deny from $IP_ADDRESS"
echo ""
echo "To view all blocked IPs, run:"
echo "  sudo ufw status numbered"
echo ""

