#!/bin/bash

# Fix Public Website Configuration
echo "🔧 Fixing Public Website Configuration..."

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

cd /home/therapease/therapease

# 1. Check current PM2 status
print_status "Checking current PM2 status..."
pm2 status

# 2. Stop all PM2 processes
print_status "Stopping all PM2 processes..."
pm2 stop all
pm2 delete all

# 3. Fix the public website server port
print_status "Fixing public website server port configuration..."
cd public-website

# Update the server.js to use PORT from environment
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
        // File not found
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
        // Server error
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

    // Set appropriate headers
    const mimeType = getMimeType(filePath);
    res.writeHead(200, { 
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });
    res.end(data);
  });
}

// Create HTTP server
const server = http.createServer((req, res) => {
  // Parse URL
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Default to index.html for root path
  if (pathname === '/') {
    pathname = '/index.html';
  }

  // Security check: prevent directory traversal
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

  // Construct file path
  const filePath = path.join(PUBLIC_DIR, pathname);

  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // File doesn't exist, try with .html extension
      const htmlPath = filePath + '.html';
      fs.access(htmlPath, fs.constants.F_OK, (htmlErr) => {
        if (htmlErr) {
          // Neither file exists, serve 404
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
          // Serve the .html file
          serveStaticFile(htmlPath, res);
        }
      });
    } else {
      // File exists, serve it
      serveStaticFile(filePath, res);
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🌐 TherapEase Public Website server running on http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${PUBLIC_DIR}`);
  console.log(`🔗 Public Website: http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Public website server is ready!`);
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please stop the existing server or use a different port.`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});

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

print_status "✅ Updated public website server to use PORT from environment"

# 4. Go back to root directory
cd ..

# 5. Start PM2 with both applications
print_status "Starting PM2 with both applications..."
pm2 start ecosystem.config.js

# 6. Wait for startup
print_status "Waiting for applications to start..."
sleep 8

# 7. Check PM2 status
print_status "Checking PM2 status..."
pm2 status

# 8. Check logs for both applications
print_status "Checking logs for both applications..."
echo "=== API Logs ==="
pm2 logs therapease-api --lines 5

echo ""
echo "=== Public Website Logs ==="
pm2 logs therapease-public --lines 5

# 9. Test both applications
print_status "Testing both applications..."

# Test API
if curl -f http://localhost:5000/api/maintenance-status >/dev/null 2>&1; then
    print_status "✅ API is working!"
else
    print_error "❌ API not working"
fi

# Test Public Website
if curl -f http://localhost:8080 >/dev/null 2>&1; then
    print_status "✅ Public website is working!"
    echo "Public website response:"
    curl -s http://localhost:8080 | head -10
else
    print_error "❌ Public website not working"
fi

# 10. Final status
print_status "Final PM2 status:"
pm2 status

print_status "Public website fix complete!"
