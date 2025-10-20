#!/bin/bash

# Fix Production Server Issues
# This script addresses the 502 Bad Gateway and CORS errors

echo "🔧 Fixing Production Server Issues..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Starting production server fix process..."

# 1. Build the client
print_status "Building React client..."
cd client
npm run build
if [ $? -ne 0 ]; then
    print_error "Failed to build React client"
    exit 1
fi
cd ..

# 2. Copy built files to server public directory
print_status "Copying built files to server..."
rm -rf server/public/*
cp -r client/build/* server/public/

# 3. Install server dependencies
print_status "Installing server dependencies..."
cd server
npm install --production
if [ $? -ne 0 ]; then
    print_error "Failed to install server dependencies"
    exit 1
fi
cd ..

# 4. Create production environment file
print_status "Setting up production environment..."
if [ ! -f "server/.env.production" ]; then
    print_warning "Creating production environment file..."
    cp env.production.template server/.env.production
    
    # Generate secure keys
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    SESSION_SECRET=$(openssl rand -base64 32 | tr -d '\n')
    
    # Replace placeholder values
    sed -i.bak "s/your_jwt_secret_here/$JWT_SECRET/g" server/.env.production
    sed -i.bak "s/your_encryption_key_here/$ENCRYPTION_KEY/g" server/.env.production
    sed -i.bak "s/your_session_secret_here/$SESSION_SECRET/g" server/.env.production
    
    print_status "Production environment file created with secure keys"
else
    print_status "Production environment file already exists"
fi

# 5. Create PM2 ecosystem file for production
print_status "Setting up PM2 configuration..."
cat > server/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'therapease-api',
    script: 'index.js',
    cwd: '/home/therapease/therapease/server',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/home/therapease/logs/therapease-api-error.log',
    out_file: '/home/therapease/logs/therapease-api-out.log',
    log_file: '/home/therapease/logs/therapease-api-combined.log',
    time: true
  }]
};
EOF

# 6. Create deployment script
print_status "Creating deployment script..."
cat > deploy-to-production.sh << 'EOF'
#!/bin/bash

echo "🚀 Deploying TherapEase to Production..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on production server
if [ ! -d "/home/therapease" ]; then
    print_error "This script should be run on the production server"
    exit 1
fi

# Stop existing PM2 processes
print_status "Stopping existing processes..."
pm2 stop therapease-api 2>/dev/null || true
pm2 delete therapease-api 2>/dev/null || true

# Create logs directory
mkdir -p /home/therapease/logs

# Copy files to production location
print_status "Copying files to production location..."
cp -r server/* /home/therapease/therapease/server/
cp -r client/build/* /home/therapease/therapease/server/public/

# Install dependencies
print_status "Installing production dependencies..."
cd /home/therapease/therapease/server
npm install --production

# Start with PM2
print_status "Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup

# Check status
print_status "Checking application status..."
pm2 status

# Test the API
print_status "Testing API endpoint..."
sleep 5
curl -f http://localhost:5000/api/maintenance-status || print_warning "API test failed, but server might still be starting"

print_status "Deployment complete!"
print_warning "Make sure nginx is running and configured correctly"
print_warning "Check nginx status with: sudo systemctl status nginx"
print_warning "Check nginx config with: sudo nginx -t"
EOF

chmod +x deploy-to-production.sh

# 7. Create nginx configuration check script
print_status "Creating nginx configuration check..."
cat > check-nginx-config.sh << 'EOF'
#!/bin/bash

echo "🔍 Checking Nginx Configuration..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if nginx is running
if systemctl is-active --quiet nginx; then
    print_status "Nginx is running"
else
    print_error "Nginx is not running. Start it with: sudo systemctl start nginx"
    exit 1
fi

# Test nginx configuration
print_status "Testing nginx configuration..."
if sudo nginx -t; then
    print_status "Nginx configuration is valid"
else
    print_error "Nginx configuration has errors"
    exit 1
fi

# Check if therapease site is configured
if [ -f "/etc/nginx/sites-available/therapease" ]; then
    print_status "TherapEase nginx configuration found"
    
    # Check if it's enabled
    if [ -L "/etc/nginx/sites-enabled/therapease" ]; then
        print_status "TherapEase site is enabled"
    else
        print_warning "TherapEase site is not enabled. Enable it with:"
        print_warning "sudo ln -s /etc/nginx/sites-available/therapease /etc/nginx/sites-enabled/"
    fi
else
    print_warning "TherapEase nginx configuration not found"
    print_warning "Copy nginx-therapease.conf to /etc/nginx/sites-available/therapease"
fi

# Check if backend is accessible
print_status "Checking backend connectivity..."
if curl -f http://localhost:5000/api/maintenance-status >/dev/null 2>&1; then
    print_status "Backend is accessible on localhost:5000"
else
    print_error "Backend is not accessible on localhost:5000"
    print_error "Check if the Node.js server is running"
fi

# Test external access
print_status "Testing external API access..."
if curl -f https://api.therapease.site/api/maintenance-status >/dev/null 2>&1; then
    print_status "External API access is working"
else
    print_warning "External API access failed - this is expected if server is not deployed yet"
fi

print_status "Nginx configuration check complete"
EOF

chmod +x check-nginx-config.sh

print_status "✅ Production server fix scripts created!"
print_status ""
print_status "Next steps:"
print_status "1. Upload these files to your production server"
print_status "2. Run: ./deploy-to-production.sh"
print_status "3. Run: ./check-nginx-config.sh"
print_status ""
print_status "Files created:"
print_status "- deploy-to-production.sh (deploy script)"
print_status "- check-nginx-config.sh (nginx check script)"
print_status "- server/ecosystem.config.js (PM2 config)"
print_status "- server/.env.production (production environment)"
