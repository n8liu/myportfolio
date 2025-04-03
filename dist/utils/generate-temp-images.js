const fs = require('fs');
const { createCanvas } = require('canvas');
const path = require('path');

// Ensure temp_images directory exists
const tempImagesDir = path.join(__dirname, '..', 'temp_images');
if (!fs.existsSync(tempImagesDir)) {
  fs.mkdirSync(tempImagesDir, { recursive: true });
}

// Define image sizes and colors for variety
const imageSizes = [
  { width: 800, height: 600 },   // Landscape
  { width: 600, height: 800 },   // Portrait
  { width: 1200, height: 800 },  // Wide landscape
  { width: 500, height: 500 },   // Square
  { width: 1200, height: 1200 }, // Large square
];

const colors = [
  '#3498db', // Blue
  '#e74c3c', // Red
  '#2ecc71', // Green
  '#f39c12', // Orange
  '#9b59b6', // Purple
  '#1abc9c', // Teal
  '#34495e', // Dark blue
  '#d35400', // Burnt orange
  '#2c3e50', // Navy
  '#27ae60'  // Emerald
];

// Generate the placeholder images
function generatePlaceholderImages() {
  console.log('Generating temporary placeholder images...');
  
  for (let i = 0; i < 15; i++) {
    const sizeIndex = i % imageSizes.length;
    const colorIndex = i % colors.length;
    
    const { width, height } = imageSizes[sizeIndex];
    const color = colors[colorIndex];
    
    // Create canvas with the specified dimensions
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Fill the background
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    
    // Add some text to indicate this is a placeholder
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Temp Image ${i + 1}`, width / 2, height / 2);
    
    // Add dimensions as smaller text
    ctx.font = '16px Arial';
    ctx.fillText(`${width} × ${height}`, width / 2, height / 2 + 40);
    
    // Save the image to the temp_images directory
    const buffer = canvas.toBuffer('image/png');
    const filename = path.join(tempImagesDir, `temp_image_${i + 1}.png`);
    fs.writeFileSync(filename, buffer);
    
    console.log(`Created: temp_image_${i + 1}.png (${width}x${height})`);
  }
  
  console.log('Finished generating temporary images!');
}

generatePlaceholderImages();
