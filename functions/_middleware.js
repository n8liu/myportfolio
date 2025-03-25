// Cloudflare Pages Functions middleware to handle R2 image requests

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle API requests for categories and images
    if (path.startsWith('/api/')) {
      if (path === '/api/categories') {
        return await getCategories(env);
      } else if (path.startsWith('/api/images/')) {
        const category = path.split('/').pop();
        return await getImages(category, env);
      }
    }

    // Pass through all other requests
    return context.next();
  } catch (error) {
    console.error('Middleware error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getCategories(env) {
  try {
    // Check if bucket is available
    if (!env.MY_BUCKET) {
      throw new Error('R2 bucket binding not available');
    }
    
    // List all "directories" in the R2 bucket by examining object keys and finding unique prefixes
    const objects = await env.MY_BUCKET.list();
    const keys = objects.objects.map(obj => obj.key);
    
    // Extract categories from keys (first part of path)
    const categorySet = new Set();
    keys.forEach(key => {
      const parts = key.split('/');
      if (parts.length > 1) {
        categorySet.add(parts[0]);
      }
    });
    
    // Format categories for response
    const categories = Array.from(categorySet).map(name => ({
      name,
      displayName: name.replace(/_/g, ' ').toUpperCase()
    }));
    
    return new Response(JSON.stringify(categories), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch categories', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getImages(category, env) {
  try {
    // Check if bucket is available
    if (!env.MY_BUCKET) {
      throw new Error('R2 bucket binding not available');
    }
    
    const options = {};
    
    // Filter by category prefix unless "all" is requested
    if (category && category !== 'all') {
      options.prefix = `${category}/`;
    }
    
    // List objects in the bucket
    const result = await env.MY_BUCKET.list(options);
    
    // Filter out directory placeholders (objects with trailing slashes)
    const objects = result.objects.filter(obj => !obj.key.endsWith('/'));
    
    // Try different methods to get object URLs
    const images = [];
    
    for (const object of objects) {
      try {
        let url;
        
        // First try to get the object directly if possible
        const obj = await env.MY_BUCKET.get(object.key);
        if (obj) {
          url = obj.url || '';
        }
        
        // If no URL was obtained, try to construct one
        if (!url) {
          const accountId = env.R2_ACCOUNT_ID || '';
          const bucketName = env.R2_BUCKET_NAME || 'myportfolio';
          
          // Default to a standard R2 public URL format (requires public bucket configuration)
          url = `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${object.key}`;
        }
        
        images.push({
          key: object.key,
          name: object.key.split('/').pop(),
          url: url,
          category: object.key.includes('/') ? object.key.split('/')[0] : 'uncategorized',
          size: object.size,
          uploaded: object.uploaded
        });
      } catch (objError) {
        console.error(`Error processing object ${object.key}:`, objError);
        // Still add the object even if URL generation fails
        images.push({
          key: object.key,
          name: object.key.split('/').pop(),
          url: '',
          category: object.key.includes('/') ? object.key.split('/')[0] : 'uncategorized',
          size: object.size,
          uploaded: object.uploaded
        });
      }
    }
    
    return new Response(JSON.stringify(images), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching images:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch images', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
