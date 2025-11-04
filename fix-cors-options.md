# Fix CORS OPTIONS Preflight Error

## Problem
Browser OPTIONS preflight requests are failing with CORS error. Nginx is blocking or not handling them correctly.

## Solution

### Step 1: Check current nginx config
```bash
sudo grep -A 10 "location /api" /etc/nginx/sites-enabled/therapease
```

### Step 2: Add OPTIONS handling to API location block

Edit nginx config:
```bash
sudo nano /etc/nginx/sites-enabled/therapease
```

Find the API location block (should look like):
```nginx
location /api/ {
    limit_req zone=api burst=30 nodelay;
    proxy_pass http://127.0.0.1:5000/api/;
    # ... other proxy settings
}
```

**IMPORTANT**: Add OPTIONS handling BEFORE proxy_pass. The location block should look like:

```nginx
location /api/ {
    # Handle OPTIONS preflight requests FIRST
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '$http_origin' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With, X-Data-Protection, X-Content-Encryption' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Length' 0;
        add_header 'Content-Type' 'text/plain';
        return 204;
    }
    
    # Rate limiting
    limit_req zone=api burst=30 nodelay;
    
    # Proxy to backend
    proxy_pass http://127.0.0.1:5000/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

### Step 3: Test and reload
```bash
# Test nginx config
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

### Step 4: Verify OPTIONS request works
```bash
curl -X OPTIONS https://api.therapease.site/api/admin/dashboard \
  -H "Origin: https://therapease.site" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  -v

# Should return 204 with CORS headers, not 403
```

## Alternative: Let backend handle OPTIONS

If you prefer, ensure OPTIONS requests reach the backend (which already handles CORS):

```nginx
location /api/ {
    # Don't block OPTIONS - let backend handle it
    limit_req zone=api burst=30 nodelay;
    
    # Make sure OPTIONS gets through
    proxy_pass http://127.0.0.1:5000/api/;
    # ... rest of proxy config
}
```

The backend CORS middleware already handles OPTIONS, so this should work if nginx isn't blocking it.
