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
    
    // Handle R2 image requests directly
    if (path.startsWith('/img/')) {
      return await serveR2Object(path.substring(4), env); // Remove '/img/' from path
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

// Serve an R2 object directly
async function serveR2Object(objectKey, env) {
  try {
    if (!env.MY_BUCKET) {
      throw new Error('R2 bucket binding not available');
    }

    const object = await env.MY_BUCKET.get(objectKey);
    
    if (!object) {
      return new Response('Object Not Found', { status: 404 });
    }
    
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    
    // Set cache control
    headers.set('Cache-Control', 'public, max-age=31536000');
    
    // Set CORS headers
    headers.set('Access-Control-Allow-Origin', '*');
    
    return new Response(object.body, {
      headers
    });
  } catch (error) {
    console.error('Error serving R2 object:', error);
    return new Response(JSON.stringify({ error: 'Failed to serve object', message: error.message }), {
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
    
    // Create URLs that point to our own Functions endpoint
    const images = objects.map((object) => {
      // Always use a simple relative URL path that will be resolved by the client
      const url = `img/${object.key}`;
      
      return {
        key: object.key,
        name: object.key.split('/').pop(),
        url: url,
        category: object.key.includes('/') ? object.key.split('/')[0] : 'uncategorized',
        size: object.size,
        uploaded: object.uploaded
      };
    });
    
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
