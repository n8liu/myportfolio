// Cloudflare Pages Functions middleware to handle R2 image requests

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    // Add CORS headers to all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    // Handle API requests for categories and images
    if (path.startsWith('/api/')) {
      if (path === '/api/categories') {
        return await getCategories(env, corsHeaders);
      } else if (path.startsWith('/api/images/')) {
        const category = path.split('/').pop();
        return await getImages(category, env, corsHeaders);
      }
    }
    
    // Handle R2 image requests directly
    if (path.startsWith('/img/')) {
      return await serveR2Object(path.substring(5), env, corsHeaders); // Remove '/img/' from path
    }

    // Pass through all other requests
    return context.next();
  } catch (error) {
    console.error('Middleware error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', message: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });
  }
}

// Serve an R2 object directly
async function serveR2Object(objectKey, env, corsHeaders) {
  try {
    if (!env.MY_BUCKET) {
      throw new Error('R2 bucket binding not available');
    }

    console.log(`Serving from R2: ${objectKey}`);
    
    // Get the object from R2
    const object = await env.MY_BUCKET.get(objectKey);
    
    if (!object) {
      console.error(`Object not found in R2: ${objectKey}`);
      return new Response('Object Not Found', { 
        status: 404,
        headers: {
          'Content-Type': 'text/plain',
          ...corsHeaders
        }
      });
    }
    
    // Prepare headers
    const headers = new Headers(corsHeaders);
    
    // Set correct content type based on file extension
    const fileExtension = objectKey.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg'].includes(fileExtension)) {
      headers.set('Content-Type', 'image/jpeg');
    } else if (fileExtension === 'png') {
      headers.set('Content-Type', 'image/png');
    } else if (fileExtension === 'gif') {
      headers.set('Content-Type', 'image/gif');
    } else if (fileExtension === 'webp') {
      headers.set('Content-Type', 'image/webp');
    } else {
      headers.set('Content-Type', 'application/octet-stream');
    }
    
    // Set cache control for good performance
    headers.set('Cache-Control', 'public, max-age=31536000');
    headers.set('Content-Length', object.size);
    
    // Use streaming for better performance
    return new Response(object.body, {
      headers
    });
  } catch (error) {
    console.error(`Error serving R2 object: ${objectKey}`, error);
    return new Response(JSON.stringify({ 
      error: 'Failed to serve object', 
      message: error.message,
      objectKey
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

async function getCategories(env, corsHeaders) {
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

    console.log(`Found ${categories.length} categories`);
    
    return new Response(JSON.stringify(categories), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch categories', message: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

async function getImages(category, env, corsHeaders) {
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
    
    // Create URLs that point to our own Functions endpoint
    const images = objects.map((object) => {
      return {
        key: object.key,
        name: object.key.split('/').pop().replace(/\.[^/.]+$/, ""),
        url: `/img/${object.key}`,
        category: object.key.includes('/') ? object.key.split('/')[0] : 'uncategorized',
        size: object.size,
        uploaded: object.uploaded
      };
    });
    
    console.log(`Returning ${images.length} images for category: ${category}`);
    
    return new Response(JSON.stringify(images), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Error fetching images:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch images', message: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}
