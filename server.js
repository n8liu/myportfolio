import express from 'express';
import path from 'path';
import http from 'http';
import { Server as SocketIO } from 'socket.io';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getCategories, getImagesFromCategory, getAllImages } from './utils/cloudflare.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load photos metadata
let photosMetadata = [];
try {
    const metaPath = path.join(__dirname, 'photos-metadata.json');
    if (fs.existsSync(metaPath)) {
        photosMetadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        console.log(`Successfully loaded ${photosMetadata.length} EXIF metadata records.`);
    } else {
        console.warn('photos-metadata.json not found in root.');
    }
} catch (error) {
    console.error('Failed to load photos-metadata.json:', error);
}

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server);
const PORT = process.env.PORT || 3000;

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

// Route for other HTML pages - handles clean URLs
app.get('/:page', (req, res) => {
    const page = req.params.page;
    // Remove .html extension if present
    const pageName = page.replace('.html', '');
    // Try to serve the file from pages directory
    res.sendFile(path.join(__dirname, 'pages', `${pageName}.html`), (err) => {
        if (err) {
            // If file not found, send 404
            res.status(404).send('404: Page not found');
        }
    });
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
        
        // Enrich images with metadata
        const enrichedImages = images.map(img => {
            const filename = img.key.split('/').pop();
            const meta = photosMetadata.find(m => m.filename.toLowerCase() === filename.toLowerCase());
            
            if (meta) {
                const cameraStr = `${meta.camera || 'FUJIFILM'} ${meta.model || 'X-T5'}`;
                const lensStr = meta.software ? meta.software.replace('Digital Camera ', '') : 'XF 35mm F1.4 R';
                const exposureStr = meta.shutterSpeed || '1/250s';
                const apertureStr = meta.aperture ? meta.aperture.replace('f/f/', 'f/') : 'f/5.6';
                const isoStr = meta.iso ? String(meta.iso) : '200';
                const locationStr = img.category ? img.category.replace(/_/g, ' ').toUpperCase() : 'CALIFORNIA';

                return {
                    ...img,
                    name: filename.replace(/\.[^/.]+$/, ""),
                    camera: cameraStr,
                    lens: lensStr,
                    exposure: exposureStr,
                    aperture: apertureStr,
                    iso: isoStr,
                    location: locationStr,
                    exif: {
                        camera: cameraStr,
                        lens: lensStr,
                        exposure: exposureStr,
                        aperture: apertureStr,
                        iso: isoStr,
                        location: locationStr
                    }
                };
            }
            return img;
        });

        res.json(enrichedImages);
    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).json({ error: 'Failed to fetch images' });
    }
});

// Local mock database state for development analytics
let mockTotalViews = 1530;
let mockUniqueViews = 412;
let mockViews24h = 87;
let mockResumeClicks = 28;

// Local mock history generator helper
function getPast7Days() {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
    }
    return days;
}

app.post('/api/total/increment', (req, res) => {
    mockTotalViews++;
    mockViews24h++;
    res.json({ success: true, count: mockTotalViews });
});

app.post('/api/unique/increment', (req, res) => {
    mockUniqueViews++;
    res.json({ success: true, count: mockUniqueViews });
});

app.post('/api/resume/increment', (req, res) => {
    mockResumeClicks++;
    res.json({ success: true, count: mockResumeClicks });
});

app.get('/api/total', (req, res) => {
    res.json({ total: mockTotalViews });
});

app.get('/api/unique/count', (req, res) => {
    res.json({ count: mockUniqueViews });
});

app.get('/api/total/requests24h', (req, res) => {
    res.json({ requests24h: mockViews24h });
});

app.get('/api/resume/count', (req, res) => {
    res.json({ clicks: mockResumeClicks });
});

app.get('/api/total/history7d', (req, res) => {
    res.json({
        days: getPast7Days(),
        counts: [142, 168, 150, 190, 185, 210, mockViews24h]
    });
});

app.get('/api/unique/history7d', (req, res) => {
    res.json({
        days: getPast7Days(),
        counts: [40, 52, 45, 61, 55, 68, 80]
    });
});

// API endpoint to get the current viewer count
app.get('/api/viewers', (req, res) => {
    res.json({ count: connectedUsers });
});

// 404 route for any requests to non-existent files
app.use((req, res) => {
    res.status(404).send('404: Page not found');
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Press Ctrl+C to stop the server`);
});
