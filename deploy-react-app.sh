#!/bin/bash

echo "🚀 Deploying React Application..."

# Navigate to client directory
cd /home/therapease/therapease/client

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

# Build the React application
echo "🔨 Building React application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ React build successful"
    
    # Copy built files to server public directory
    echo "📁 Copying built files to server..."
    sudo cp -r build/* /home/therapease/therapease/server/public/
    
    # Fix permissions
    echo "🔧 Fixing permissions..."
    sudo chown -R therapease:therapease /home/therapease/therapease/server/public/
    sudo chmod -R 755 /home/therapease/therapease/server/public/
    
    # Update the public website to redirect to the React app
    echo "⚙️ Updating public website configuration..."
    sudo tee /home/therapease/therapease/public-website/index.html > /dev/null << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TherapEase - Professional Therapy Management System</title>
    <meta http-equiv="refresh" content="0; url=/">
    <script>
        window.location.href = '/';
    </script>
</head>
<body>
    <p>Redirecting to TherapEase Portal...</p>
</body>
</html>
EOF

    # Update Nginx configuration to serve React app
    echo "⚙️ Updating Nginx configuration..."
    sudo tee /etc/nginx/sites-available/therapease > /dev/null << 'EOF'
# TherapEase Configuration - React App
server {
    listen 80;
    server_name therapease.site www.therapease.site api.therapease.site;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # API routes - keep the /api prefix
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Static files (React app)
    location /static/ {
        alias /home/therapease/therapease/server/public/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Main site - serve React app
    location / {
        root /home/therapease/therapease/server/public;
        try_files $uri $uri/ /index.html;
        index index.html;
    }
}
EOF

    # Test Nginx configuration
    echo "🧪 Testing Nginx configuration..."
    sudo nginx -t
    
    if [ $? -eq 0 ]; then
        echo "✅ Nginx configuration is valid"
        
        # Restart Nginx
        echo "🔄 Restarting Nginx..."
        sudo systemctl restart nginx
        
        # Test the deployment
        echo "🧪 Testing deployment..."
        echo "Main site:"
        curl -s -I http://therapease.site/
        
        echo ""
        echo "Static assets:"
        curl -s -I http://therapease.site/static/css/main.css
        
        echo ""
        echo "API:"
        curl -s http://therapease.site/api/maintenance-status
        
        echo ""
        echo "✅ React application deployed successfully!"
        echo "🌐 Your portal is now accessible at: http://therapease.site"
        
    else
        echo "❌ Nginx configuration is invalid"
        exit 1
    fi
    
else
    echo "❌ React build failed"
    exit 1
fi

echo "✅ Deployment complete!"
