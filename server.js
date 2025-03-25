const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the root directory
app.use(express.static(__dirname));

// Route for the home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route for any other pages - will serve directly from static files
// This handles photography.html and other pages you might add

// 404 route for any requests to non-existent files
app.use((req, res) => {
    res.status(404).send('404: Page not found');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Press Ctrl+C to stop the server`);
});
