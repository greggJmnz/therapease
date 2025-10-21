const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Serve static files
app.use(express.static(path.join(__dirname, '../client/build')));

// Handle React routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🌐 Public website running on port ${PORT}`);
});

module.exports = app;
