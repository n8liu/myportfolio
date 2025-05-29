import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config();

// Configure the AWS SDK v3 S3Client to use Cloudflare R2
const s3 = new S3Client({
    region: 'auto', // R2 ignores region but requires a value
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
});

// Get all folders (prefixes) in the bucket to identify categories
async function getCategories() {
    try {
        const params = {
            Bucket: process.env.R2_BUCKET_NAME,
            Delimiter: '/'
        };
        const data = await s3.send(new ListObjectsV2Command(params));
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
    // Special case for SouthKorea
    if (name === 'SouthKorea') {
        return 'SOUTH KOREA';
    }
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
        const data = await s3.send(new ListObjectsV2Command(params));
        return data.Contents ? await Promise.all(data.Contents
            .filter(item => !item.Key.endsWith('/')) // Filter out directories
            .map(async item => {
                return {
                    key: item.Key,
                    url: await generatePreSignedUrl(item.Key),
                    lastModified: item.LastModified,
                    size: item.Size,
                    category: item.Key.split('/')[0] || 'uncategorized'
                };
            })) : [];
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
        const data = await s3.send(new ListObjectsV2Command(params));
        return data.Contents ? await Promise.all(data.Contents
            .filter(item => !item.Key.endsWith('/')) // Filter out directories
            .map(async item => {
                return {
                    key: item.Key,
                    url: await generatePreSignedUrl(item.Key),
                    lastModified: item.LastModified,
                    size: item.Size,
                    category: item.Key.split('/')[0] || 'uncategorized'
                };
            })) : [];
    } catch (error) {
        console.error('Error fetching all images:', error);
        return [];
    }
}

// Generate a pre-signed URL for an object (valid for 1 hour)
async function generatePreSignedUrl(key) {
    const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key
    });
    return await getSignedUrl(s3, command, { expiresIn: 3600 });
}

export {
    getCategories,
    getImagesFromCategory,
    getAllImages,
    generatePreSignedUrl
};
