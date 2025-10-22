const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || process.env.PUBLIC_PORT || 8000;

// Serve static files from the public-website directory
app.use(express.static(path.join(__dirname)));

// Serve the main index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🌐 Public website running on port ${PORT}`);
});

module.exports = app;
