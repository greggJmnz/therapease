const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;
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
  console.log(`📊 Environment: development`);
  console.log(`⚠️  This is a development server - not suitable for production`);
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
