const ExifReader = require('exifreader');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Extract metadata from an image file
 * @param {string} filePath - Path to the image file
 * @returns {Object} - Object containing extracted metadata
 */
async function extractImageMetadata(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        // Read file
        const fileBuffer = fs.readFileSync(filePath);
        
        // Extract metadata using ExifReader
        const tags = ExifReader.load(fileBuffer);
        
        // Basic image info
        const metadata = {
            filename: path.basename(filePath),
            filepath: filePath,
            filesize: fs.statSync(filePath).size,
            fileType: path.extname(filePath).replace('.', '').toUpperCase(),
        };
        
        // Extract EXIF data if available
        if (tags) {
            // Camera info
            if (tags.Make) metadata.camera = tags.Make.description;
            if (tags.Model) metadata.model = tags.Model.description;
            
            // Camera settings
            if (tags.FNumber) metadata.aperture = `f/${tags.FNumber.description}`;
            if (tags.ExposureTime) metadata.shutterSpeed = tags.ExposureTime.description;
            if (tags.ISOSpeedRatings) metadata.iso = tags.ISOSpeedRatings.description;
            if (tags.FocalLength) metadata.focalLength = tags.FocalLength.description;
            if (tags.LensModel) metadata.lens = tags.LensModel.description;
            
            // Date and time
            if (tags.DateTimeOriginal) metadata.dateTaken = tags.DateTimeOriginal.description;
            
            // GPS data
            if (tags.GPSLatitude && tags.GPSLongitude) {
                metadata.location = {
                    latitude: tags.GPSLatitude.description,
                    longitude: tags.GPSLongitude.description
                };
                
                if (tags.GPSAltitude) {
                    metadata.location.altitude = tags.GPSAltitude.description;
                }
            }
            
            // Image dimensions
            if (tags['Image Width'] && tags['Image Height']) {
                metadata.dimensions = {
                    width: tags['Image Width'].value,
                    height: tags['Image Height'].value
                };
            }
            
            // Additional tags
            if (tags.Software) metadata.software = tags.Software.description;
            if (tags.Artist) metadata.artist = tags.Artist.description;
            if (tags.Copyright) metadata.copyright = tags.Copyright.description;
        }
        
        return metadata;
    } catch (error) {
        console.error(`Error extracting metadata from ${filePath}:`, error);
        return {
            filename: path.basename(filePath),
            error: error.message
        };
    }
}

/**
 * Extract metadata from all images in a directory
 * @param {string} directoryPath - Path to the directory containing images
 * @param {boolean} recursive - Whether to scan subdirectories recursively
 * @returns {Object[]} - Array of metadata objects
 */
async function extractDirectoryMetadata(directoryPath, recursive = true) {
    try {
        const results = [];
        const files = fs.readdirSync(directoryPath);
        
        for (const file of files) {
            const filePath = path.join(directoryPath, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isDirectory() && recursive) {
                // Recursively scan subdirectories
                const subdirResults = await extractDirectoryMetadata(filePath, recursive);
                results.push(...subdirResults);
            } else if (stats.isFile() && isImageFile(file)) {
                // Extract metadata from image files
                const metadata = await extractImageMetadata(filePath);
                results.push(metadata);
            }
        }
        
        return results;
    } catch (error) {
        console.error(`Error scanning directory ${directoryPath}:`, error);
        return [];
    }
}

/**
 * Check if a file is an image based on its extension
 * @param {string} filename - Name of the file
 * @returns {boolean} - True if the file is an image, false otherwise
 */
function isImageFile(filename) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.bmp'];
    const ext = path.extname(filename).toLowerCase();
    return imageExtensions.includes(ext);
}

/**
 * Save metadata to a JSON file
 * @param {Object[]} metadata - Array of metadata objects
 * @param {string} outputPath - Path to save the JSON file
 */
function saveMetadataToJson(metadata, outputPath) {
    try {
        fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));
        console.log(`Metadata saved to ${outputPath}`);
    } catch (error) {
        console.error(`Error saving metadata to ${outputPath}:`, error);
    }
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const photosDir = args[0] || path.join(__dirname, '..', 'photos');
    const outputPath = args[1] || path.join(__dirname, '..', 'photos-metadata.json');
    
    console.log(`Extracting metadata from ${photosDir}...`);
    
    extractDirectoryMetadata(photosDir).then(metadata => {
        console.log(`Found ${metadata.length} images`);
        saveMetadataToJson(metadata, outputPath);
    });
}

module.exports = {
    extractImageMetadata,
    extractDirectoryMetadata,
    saveMetadataToJson
};
