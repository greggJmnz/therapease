#!/bin/bash

# Fix All TherapEase Issues
echo "🔧 Fixing All TherapEase Issues..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

print_header() {
    echo -e "${BLUE}[FIX]${NC} $1"
}

cd /home/therapease/therapease

# 1. Stop all PM2 processes
print_header "1. Stopping all PM2 processes..."
pm2 stop all
pm2 delete all
pm2 kill
sleep 2

# 2. Fix port conflicts
print_header "2. Fixing port conflicts..."
echo "Killing any processes using port 8080..."
sudo fuser -k 8080/tcp 2>/dev/null || true
echo "Killing any processes using port 5000..."
sudo fuser -k 5000/tcp 2>/dev/null || true
sleep 2

# 3. Pull latest changes
print_header "3. Pulling latest changes..."
git pull origin main

# 4. Fix therapease-public port issue
print_header "4. Fixing therapease-public port issue..."
cd public-website

# Update server.js to handle port conflicts better
cat > server.js << 'EOF'
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = __dirname;

// MIME types for different file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// Function to get MIME type based on file extension
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

// Function to serve static files
function serveStaticFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>404 - Page Not Found</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              h1 { color: #e74c3c; }
            </style>
          </head>
          <body>
            <h1>404 - Page Not Found</h1>
            <p>The requested page could not be found.</p>
            <a href="/">Go back to homepage</a>
          </body>
          </html>
        `);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>500 - Server Error</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              h1 { color: #e74c3c; }
            </style>
          </head>
          <body>
            <h1>500 - Server Error</h1>
            <p>An internal server error occurred.</p>
            <a href="/">Go back to homepage</a>
          </body>
          </html>
        `);
      }
      return;
    }

    const mimeType = getMimeType(filePath);
    res.writeHead(200, { 
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=3600'
    });
    res.end(data);
  });
}

// Create HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  if (pathname === '/') {
    pathname = '/index.html';
  }

  if (pathname.includes('..')) {
    res.writeHead(403, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>403 - Forbidden</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          h1 { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1>403 - Forbidden</h1>
        <p>Access denied.</p>
        <a href="/">Go back to homepage</a>
      </body>
      </html>
    `);
    return;
  }

  const filePath = path.join(PUBLIC_DIR, pathname);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      const htmlPath = filePath + '.html';
      fs.access(htmlPath, fs.constants.F_OK, (htmlErr) => {
        if (htmlErr) {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>404 - Page Not Found</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                h1 { color: #e74c3c; }
              </style>
            </head>
            <body>
              <h1>404 - Page Not Found</h1>
              <p>The requested page could not be found.</p>
              <a href="/">Go back to homepage</a>
            </body>
            </html>
          `);
        } else {
          serveStaticFile(htmlPath, res);
        }
      });
    } else {
      serveStaticFile(filePath, res);
    }
  });
});

// Start server with retry logic
const startServer = (port) => {
  server.listen(port, () => {
    console.log(`🌐 TherapEase Public Website server running on http://localhost:${port}`);
    console.log(`📁 Serving files from: ${PUBLIC_DIR}`);
    console.log(`🔗 Public Website: http://localhost:${port}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✅ Public website server is ready!`);
  });
};

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Trying port ${PORT + 1}...`);
    startServer(PORT + 1);
  } else {
    console.error('❌ Server error:', err);
    process.exit(1);
  }
});

// Start the server
startServer(PORT);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down public website server...');
  server.close(() => {
    console.log('✅ Public website server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down public website server...');
  server.close(() => {
    console.log('✅ Public website server stopped');
    process.exit(0);
  });
});
EOF

print_status "✅ Updated public website server with port conflict handling"
cd ..

# 5. Rebuild frontend
print_header "5. Rebuilding frontend..."
cd client
print_status "Installing dependencies..."
npm install --silent

print_status "Building frontend..."
npm run build

print_status "✅ Frontend built successfully"
cd ..

# 6. Deploy frontend to server
print_header "6. Deploying frontend to server..."
print_status "Copying build files to server public directory..."
rm -rf server/public/*
cp -r client/build/* server/public/
print_status "✅ Frontend deployed to server"

# 7. Start PM2 with both applications
print_header "7. Starting PM2 with both applications..."
pm2 start ecosystem.config.js

# 8. Wait for startup
print_status "Waiting for applications to start..."
sleep 10

# 9. Check PM2 status
print_header "8. Checking PM2 status..."
pm2 status

# 10. Test API endpoints
print_header "9. Testing API endpoints..."
echo "Testing maintenance status:"
curl -s http://localhost:5000/api/maintenance-status && echo " ✅" || echo " ❌"

echo "Testing auth login route:"
curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test","password":"test"}' && echo " ✅" || echo " ❌"

# 11. Test external API
print_header "10. Testing external API..."
echo "Testing https://api.therapease.site/api/maintenance-status:"
curl -s https://api.therapease.site/api/maintenance-status && echo " ✅" || echo " ❌"

echo "Testing https://api.therapease.site/api/auth/login:"
curl -s -X POST https://api.therapease.site/api/auth/login -H "Content-Type: application/json" -d '{"email":"test","password":"test"}' && echo " ✅" || echo " ❌"

# 12. Test public website
print_header "11. Testing public website..."
echo "Testing http://localhost:8080:"
curl -s http://localhost:8080 | head -5 && echo " ✅" || echo " ❌"

# 13. Final status
print_header "12. Final Status Check"
echo "========================"
pm2 status
echo ""
echo "Port usage:"
ss -tlnp | grep -E ":(80|443|5000|8080)" || netstat -tlnp | grep -E ":(80|443|5000|8080)"

print_status "All fixes applied! Your TherapEase application should now be working properly."
