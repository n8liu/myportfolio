import { ViewerCounter } from './viewers';
import { SessionTracker } from './session_tracker';
import { TotalCounter } from './total_counter';
import { ResumeCounter } from './resume_counter';
import { UniqueVisitors } from './unique_visitors';
import photosMetadata from './photos-metadata.json';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. Durable Object routing (Stats & Viewers)
    if (path.startsWith('/api/viewers')) {
      const id = env.VIEWER_COUNTER.idFromName("global");
      const obj = env.VIEWER_COUNTER.get(id);
      return obj.fetch(request);
    }
    else if (path.startsWith('/api/resume')) {
      const id = env.RESUME_COUNTER.idFromName('global');
      const obj = env.RESUME_COUNTER.get(id);
      return obj.fetch(request);
    }
    else if (path.startsWith('/api/unique')) {
      const id = env.UNIQUE_VISITORS.idFromName('global');
      const obj = env.UNIQUE_VISITORS.get(id);
      return obj.fetch(request);
    }
    else if (path.startsWith('/api/total')) {
      const id = env.TOTAL_COUNTER.idFromName("global");
      const obj = env.TOTAL_COUNTER.get(id);
      return obj.fetch(request);
    }

    // 2. R2 and Photography API routing
    if (path.startsWith('/api/')) {
      if (path === '/api/categories') {
        return await getCategories(env, corsHeaders);
      } else if (path.startsWith('/api/images/')) {
        const category = path.split('/').pop();
        return await getImages(category, env, corsHeaders);
      }
    }
    
    if (path.startsWith('/img/')) {
      return await serveR2Object(path.substring(5), env, corsHeaders); // Remove '/img/' from path
    }

    // 3. Fallback to Cloudflare Pages static asset serving
    if (env.ASSETS) {
      // For client-side clean sub-routes without an extension (like /photography, /experience, etc.),
      // serve the root index.html so client-side routing can take over.
      const isCleanRoute = !path.includes('.') && path !== '/';
      if (isCleanRoute) {
        const indexRequest = new Request(new URL('/index.html', request.url), request);
        return env.ASSETS.fetch(indexRequest);
      }
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};

// --- Helper Functions for R2 / Photography ---

async function serveR2Object(objectKey, env, corsHeaders) {
  try {
    if (!env.MY_BUCKET) {
      throw new Error('R2 bucket binding not available');
    }
    
    const object = await env.MY_BUCKET.get(objectKey);
    
    if (!object) {
      return new Response('Object Not Found', { 
        status: 404,
        headers: {
          'Content-Type': 'text/plain',
          ...corsHeaders
        }
      });
    }
    
    const headers = new Headers(corsHeaders);
    
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
    
    headers.set('Cache-Control', 'public, max-age=31536000');
    headers.set('Content-Length', object.size);
    
    return new Response(object.body, {
      headers
    });
  } catch (error) {
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
    if (!env.MY_BUCKET) {
      throw new Error('R2 bucket binding not available');
    }
    
    const objects = await env.MY_BUCKET.list();
    const keys = objects.objects.map(obj => obj.key);
    
    const categorySet = new Set();
    keys.forEach(key => {
      const parts = key.split('/');
      if (parts.length > 1) {
        categorySet.add(parts[0]);
      }
    });
    
    const categories = Array.from(categorySet).map(name => ({
      name,
      displayName: name.replace(/_/g, ' ').toUpperCase()
    }));
    
    return new Response(JSON.stringify(categories), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
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
    if (!env.MY_BUCKET) {
      throw new Error('R2 bucket binding not available');
    }
    
    const options = {};
    if (category && category !== 'all') {
      options.prefix = `${category}/`;
    }
    
    const result = await env.MY_BUCKET.list(options);
    const objects = result.objects.filter(obj => !obj.key.endsWith('/'));
    
    const images = objects.map((object) => {
      const filename = object.key.split('/').pop();
      const meta = photosMetadata.find(m => m.filename.toLowerCase() === filename.toLowerCase());
      
      const baseObj = {
        key: object.key,
        name: filename.replace(/\.[^/.]+$/, ""),
        url: `/img/${object.key}`,
        category: object.key.includes('/') ? object.key.split('/')[0] : 'uncategorized',
        size: object.size,
        uploaded: object.uploaded
      };

      if (meta) {
        const cameraStr = `${meta.camera || 'FUJIFILM'} ${meta.model || 'X-T5'}`;
        const lensStr = meta.software ? meta.software.replace('Digital Camera ', '') : 'XF 35mm F1.4 R';
        const exposureStr = meta.shutterSpeed || '1/250s';
        const apertureStr = meta.aperture ? meta.aperture.replace('f/f/', 'f/') : 'f/5.6';
        const isoStr = meta.iso ? String(meta.iso) : '200';
        const locationStr = baseObj.category ? baseObj.category.replace(/_/g, ' ').toUpperCase() : 'CALIFORNIA';

        return {
          ...baseObj,
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
      return baseObj;
    });
    
    return new Response(JSON.stringify(images), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch images', message: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

export { ViewerCounter, SessionTracker, TotalCounter, ResumeCounter, UniqueVisitors};
