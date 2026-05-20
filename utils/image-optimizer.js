/**
 * Image Optimization Utility
 * 
 * This script provides recommendations and utilities for optimizing images
 * in the portfolio, particularly for the photography gallery.
 * 
 * Usage:
 *   node utils/image-optimizer.js [directory]
 * 
 * Features:
 * - Analyzes image sizes and formats
 * - Provides optimization recommendations
 * - Suggests WebP conversion for better performance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const MAX_FILE_SIZE = 500 * 1024; // 500KB recommended max
const WARN_FILE_SIZE = 300 * 1024; // 300KB warning threshold

/**
 * Get file size in a human-readable format
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Analyze images in a directory
 */
function analyzeImages(directory) {
    const targetDir = path.join(__dirname, '..', directory);
    
    if (!fs.existsSync(targetDir)) {
        console.error(`❌ Directory not found: ${directory}`);
        return;
    }

    console.log(`\n📸 Analyzing images in: ${directory}\n`);
    console.log('='.repeat(70));

    let totalSize = 0;
    let imageCount = 0;
    let largeImages = [];
    let recommendations = [];

    function scanDirectory(dir) {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                scanDirectory(filePath);
            } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(file)) {
                imageCount++;
                totalSize += stat.size;

                const relativePath = path.relative(targetDir, filePath);
                const fileSize = stat.size;

                if (fileSize > MAX_FILE_SIZE) {
                    largeImages.push({
                        path: relativePath,
                        size: fileSize,
                        formatted: formatBytes(fileSize)
                    });
                }

                // Check if image should be converted to WebP
                if (/\.(jpg|jpeg|png)$/i.test(file) && !file.includes('.webp')) {
                    recommendations.push({
                        type: 'webp',
                        path: relativePath,
                        message: 'Consider converting to WebP format for better compression'
                    });
                }
            }
        });
    }

    scanDirectory(targetDir);

    // Display results
    console.log(`\n📊 Summary:`);
    console.log(`   Total images: ${imageCount}`);
    console.log(`   Total size: ${formatBytes(totalSize)}`);
    console.log(`   Average size: ${formatBytes(Math.round(totalSize / imageCount))}`);

    if (largeImages.length > 0) {
        console.log(`\n⚠️  Large images (>${formatBytes(MAX_FILE_SIZE)}):`);
        largeImages.forEach(img => {
            console.log(`   • ${img.path} - ${img.formatted}`);
        });
    } else {
        console.log(`\n✅ All images are under ${formatBytes(MAX_FILE_SIZE)}`);
    }

    console.log('\n💡 Optimization Recommendations:');
    console.log('   1. Use WebP format for 25-35% better compression');
    console.log('   2. Implement lazy loading for gallery images');
    console.log('   3. Use responsive images with srcset');
    console.log('   4. Consider using Cloudflare Image Resizing');
    console.log('   5. Enable browser caching with proper headers');

    if (largeImages.length > 0) {
        console.log('\n🔧 To optimize large images, you can use:');
        console.log('   • ImageMagick: convert input.jpg -quality 85 -resize 2000x2000> output.jpg');
        console.log('   • Sharp (Node.js): npm install sharp');
        console.log('   • Online tools: squoosh.app, tinypng.com');
    }

    console.log('\n' + '='.repeat(70) + '\n');
}

// Main execution
const directory = process.argv[2] || 'assets';
analyzeImages(directory);
