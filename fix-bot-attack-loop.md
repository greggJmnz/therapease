# Fix Bot Attack Loop - Go-http-client Bots

## Problem

Bots using "Go-http-client/1.1" user agent are causing an infinite loop of requests, getting 400 errors instead of being blocked with 403.

## Root Cause

Bot blocking is not active in the nginx configuration. The bots are getting 400 errors (bad request) instead of 403 (forbidden), which means they're reaching the server instead of being blocked.

## Solution

### Step 1: Check if bot blocking is active

```bash
# Check if bot blocking map exists
sudo grep -n "block_bot\|map.*user_agent" /etc/nginx/sites-enabled/therapease

# Check if bot blocking is applied
sudo grep -n "if.*block_bot" /etc/nginx/sites-enabled/therapease

# View full nginx config
sudo nginx -T | grep -A 20 "block_bot"
```

### Step 2: Add bot blocking to nginx config

Edit nginx config:
```bash
sudo nano /etc/nginx/sites-enabled/therapease
```

**Add at the top of the http block** (before server blocks):

```nginx
# Block known bot user agents
map $http_user_agent $block_bot {
    default 0;
    ~*Go-http-client 1;  # Block Go HTTP client bots
    ~*bot 1;            # Block common bots
    ~*crawler 1;        # Block crawlers
    ~*spider 1;         # Block spiders
    ~*scraper 1;        # Block scrapers
    ~*curl 1;           # Block curl
    ~*wget 1;            # Block wget
    ~*python-requests 1; # Block Python requests
    ~*java 1;            # Block Java HTTP clients
    ~*httpclient 1;     # Block HTTP clients
    "" 1;                # Block empty user agents
}

# Block bad IPs
geo $block_ip {
    default 0;
    37.111.41.38 1;      # Attacking IP
    38.51.129.136 1;     # Attacking IP
    69.160.6.72 1;       # Attacking IP
    103.231.95.54 1;     # Attacking IP
}
```

**Then in each server block** (frontend and API), add BEFORE location blocks:

```nginx
# Block bots and bad IPs
if ($block_bot) {
    return 403;
}

if ($block_ip) {
    return 403;
}
```

### Step 3: Increase rate limiting for root path

In the location / block (frontend server block), make rate limiting more aggressive:

```nginx
location / {
    # Very strict rate limiting for root path
    limit_req zone=strict burst=2 nodelay;
    
    # ... rest of location config
}
```

### Step 4: Test and reload

```bash
# Test nginx config
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx

# Check logs - should see 403 instead of 400
sudo tail -f /var/log/nginx/access.log | grep "Go-http-client"

# Should see:
# 37.111.41.38 - - [04/Nov/2025:16:24:58 +0100] "GET / HTTP/1.1" 403 ...
# NOT: 400
```

### Step 5: Verify bot blocking is working

```bash
# Check for 403 errors (should increase)
sudo tail -100 /var/log/nginx/access.log | grep " 403 " | grep "Go-http-client" | wc -l

# Check for 400 errors (should decrease)
sudo tail -100 /var/log/nginx/access.log | grep " 400 " | grep "Go-http-client" | wc -l

# After fix:
# - 403 errors should increase (bots being blocked)
# - 400 errors should decrease (bots not reaching server)
```

## Expected Results

After applying bot blocking:
- ✅ Bots should get **403 Forbidden** (not 400)
- ✅ Bot requests should be blocked **before** reaching the server
- ✅ Log files should show mostly 403 errors for bots
- ✅ Server load should decrease

## Additional Protection

### Block specific IPs permanently

If specific IPs keep attacking, add them to geo block:

```nginx
geo $block_ip {
    default 0;
    # Add attacking IPs here
    37.111.41.38 1;
    38.51.129.136 1;
    69.160.6.72 1;
    103.231.95.54 1;
    # Add more as needed
}
```

### Use fail2ban (optional)

For more advanced bot blocking, consider installing fail2ban:

```bash
# Install fail2ban
sudo apt-get update
sudo apt-get install fail2ban -y

# Configure fail2ban to block repeated 403 errors
```

## Monitoring

After applying fixes, monitor logs:

```bash
# Watch for bot attacks in real-time
sudo tail -f /var/log/nginx/access.log | grep -E "Go-http-client|403|400"

# Count bot requests by IP
sudo tail -1000 /var/log/nginx/access.log | grep "Go-http-client" | awk '{print $1}' | sort | uniq -c | sort -rn
```

## Summary

The bot blocking configuration exists in `nginx-rate-limit.conf` but needs to be applied to the actual nginx config file on the server. Once applied, bots should be blocked with 403 errors instead of reaching the server with 400 errors.

