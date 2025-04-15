const express = require('express');
const path = require('path');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const PORT = process.env.PORT || 3000;
require('dotenv').config();

// Import Cloudflare R2 utility functions
const { getCategories, getImagesFromCategory, getAllImages } = require('./utils/cloudflare');

// Serve static files from the root directory
app.use(express.static(__dirname));

// Add JSON body parser
app.use(express.json());

// Track connected users
let connectedUsers = 0;

// Socket.io connection handling
io.on('connection', (socket) => {
    // Increment the count when a user connects
    connectedUsers++;
    // Broadcast the updated count to all clients
    io.emit('viewerCount', connectedUsers);
    
    console.log('User connected - Current viewers:', connectedUsers);
    
    // When user disconnects, decrement the count
    socket.on('disconnect', () => {
        connectedUsers--;
        io.emit('viewerCount', connectedUsers);
        console.log('User disconnected - Current viewers:', connectedUsers);
    });
});

// Route for the home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoint to get all image categories
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await getCategories();
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// API endpoint to get images by category
app.get('/api/images/:category?', async (req, res) => {
    try {
        const category = req.params.category;
        let images;
        
        if (category && category !== 'all') {
            images = await getImagesFromCategory(category);
        } else {
            images = await getAllImages();
        }
        
        res.json(images);
    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).json({ error: 'Failed to fetch images' });
    }
});

// API endpoint to get the current viewer count
app.get('/api/viewers', (req, res) => {
    res.json({ count: connectedUsers });
});

// Route for any other pages - will serve directly from static files
// This handles photography.html and other pages you might add

// 404 route for any requests to non-existent files
app.use((req, res) => {
    res.status(404).send('404: Page not found');
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Press Ctrl+C to stop the server`);
});
