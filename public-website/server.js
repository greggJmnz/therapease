const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || process.env.PUBLIC_PORT || 8000;
const siteRoot = path.join(__dirname, '../client/public/public-website');

// Serve the public website from the client deployment tree
app.use(express.static(siteRoot));

// Serve the main index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(siteRoot, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🌐 Public website running on port ${PORT}`);
});

module.exports = app;
