const AWS = require('aws-sdk');
require('dotenv').config();

// Configure the AWS SDK to use Cloudflare R2
const s3 = new AWS.S3({
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    endpoint: process.env.R2_ENDPOINT,
    s3ForcePathStyle: true, // Required for Cloudflare R2
    signatureVersion: 'v4', // Required for Cloudflare R2
});

// Get all folders (prefixes) in the bucket to identify categories
async function getCategories() {
    try {
        const params = {
            Bucket: process.env.R2_BUCKET_NAME,
            Delimiter: '/'
        };
        
        const data = await s3.listObjectsV2(params).promise();
        return data.CommonPrefixes ? data.CommonPrefixes.map(prefix => {
            return {
                name: prefix.Prefix.replace('/', ''), // Remove trailing slash
                displayName: formatCategoryName(prefix.Prefix.replace('/', ''))
            };
        }) : [];
    } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
}

// Helper function to format category names for display
function formatCategoryName(name) {
    // Convert category names like "south_korea" to "SOUTH KOREA"
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ').toUpperCase();
}

// Get images from a specific category
async function getImagesFromCategory(category) {
    try {
        const params = {
            Bucket: process.env.R2_BUCKET_NAME,
            Prefix: category ? `${category}/` : ''
        };
        
        const data = await s3.listObjectsV2(params).promise();
        return data.Contents ? data.Contents
            .filter(item => !item.Key.endsWith('/')) // Filter out directories
            .map(item => {
                return {
                    key: item.Key,
                    url: generatePreSignedUrl(item.Key),
                    lastModified: item.LastModified,
                    size: item.Size,
                    category: item.Key.split('/')[0] || 'uncategorized'
                };
            }) : [];
    } catch (error) {
        console.error('Error fetching images:', error);
        return [];
    }
}

// Get all images from all categories
async function getAllImages() {
    try {
        const params = {
            Bucket: process.env.R2_BUCKET_NAME
        };
        
        const data = await s3.listObjectsV2(params).promise();
        return data.Contents ? data.Contents
            .filter(item => !item.Key.endsWith('/')) // Filter out directories
            .map(item => {
                return {
                    key: item.Key,
                    url: generatePreSignedUrl(item.Key),
                    lastModified: item.LastModified,
                    size: item.Size,
                    category: item.Key.split('/')[0] || 'uncategorized'
                };
            }) : [];
    } catch (error) {
        console.error('Error fetching all images:', error);
        return [];
    }
}

// Generate a pre-signed URL for an object (valid for 1 hour)
function generatePreSignedUrl(key) {
    const params = {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Expires: 3600 // URL expires in 1 hour
    };
    
    return s3.getSignedUrl('getObject', params);
}

module.exports = {
    getCategories,
    getImagesFromCategory,
    getAllImages,
    generatePreSignedUrl
};
