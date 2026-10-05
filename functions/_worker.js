import { handleAnalytics } from './analytics-security.js';
import { isPublicFile } from '../utils/public-files.js';
import { sortPhotoCategories } from '../utils/photo-categories.js';
import { ViewerCounter } from './viewers';
import { SessionTracker } from './session_tracker';
import { TotalCounter } from './total_counter';
import { ResumeCounter } from './resume_counter';
import { UniqueVisitors } from './unique_visitors';
import photosMetadata from './photos-metadata.json';
import photoThumbnails from './photo-thumbnails.json';
// Keep the v6 namespaces exported without restoring retired social-counter routes.
export { InstagramCounter, GitHubCounter, EmailCounter, LinkedInCounter } from './retired_counters.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (/^\/api\/(viewers|resume|unique|total|sections)(?:\/|$)/.test(path)) {
      return handleAnalytics(request, env);
    }
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });

    // 2. R2 and Photography API routing
    if (path.startsWith('/api/')) {
      if (path === '/api/categories') {
        return await getCategories(env, corsHeaders);
      } else if (path.startsWith('/api/images/')) {
        const category = decodeURIComponent(path.split('/').pop());
        return await getImages(category, env, corsHeaders);
      }
    }
    
    if (path.startsWith('/img/')) {
      return await serveR2Object(path.substring(5), env, corsHeaders, request, ctx); // Remove '/img/' from path
    }

    if (path === '/photography' || path === '/photography/') {
      const destination = new URL(request.url);
      destination.pathname = '/photos';
      return Response.redirect(destination.toString(), 301);
    }

    // 3. Fallback to Cloudflare Pages static asset serving
    if (env.ASSETS) {
      // For client-side clean sub-routes without an extension (like /photos, /experience, etc.),
      // serve the root index.html so client-side routing can take over.
      const isCleanRoute = /^\/(?:home|experience|projects|skills|education|photos|blog|stats)(?:\/[a-z0-9-]+)?$/.test(path);
      if (isCleanRoute) {
        const indexRequest = new Request(new URL('/index.html', request.url), request);
        return env.ASSETS.fetch(indexRequest);
      }
      if (path !== '/' && !isPublicFile(path)) return new Response('Not found', { status: 404 });
      const asset = await env.ASSETS.fetch(request);
      if (asset.ok && /^\/assets\/photo-thumbnails\/[a-f0-9]{20}-(480|960)\.webp$/.test(path)) {
        const response = new Response(asset.body, asset);
        response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        response.headers.delete('Pragma');
        response.headers.delete('Expires');
        return response;
      }
      return asset;
    }

    return new Response("Not found", { status: 404 });
  },
};

// --- Helper Functions for R2 / Photography ---

async function serveR2Object(objectKey, env, corsHeaders, request, ctx) {
  try {
    if (!env.MY_BUCKET) {
      throw new Error('R2 bucket binding not available');
    }

    // Check Cloudflare Edge Cache first
    const cache = caches.default;
    let cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log(`Cache hit for: ${objectKey}`);
      return cachedResponse;
    }

    console.log(`Cache miss. Serving from R2: ${objectKey}`);
    
    objectKey = decodeURIComponent(objectKey);
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
    
    // Set cache control for good performance (1 year browser and Edge CDN cache)
    headers.set('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    headers.set('Content-Length', object.size);
    
    const response = new Response(object.body, {
      headers
    });

    // Cache the response asynchronously at the Edge CDN
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(cache.put(request, response.clone()));
    }
    
    return response;
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
    
    const objects = await listAllObjects(env.MY_BUCKET);
    const categories = sortPhotoCategories(objects).map(name => ({
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

async function listAllObjects(bucket, options = {}) {
  const objects = [];
  let cursor;
  do {
    const page = await bucket.list({ ...options, ...(cursor ? { cursor } : {}) });
    objects.push(...page.objects);
    cursor = page.truncated ? page.cursor : undefined;
    if (page.truncated && !cursor) throw new Error('Missing R2 listing cursor');
  } while (cursor);
  return objects;
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
    
    const listed = await listAllObjects(env.MY_BUCKET, options);
    const objects = listed.filter(obj => !obj.key.endsWith('/'));
    
    const images = objects.map((object) => {
      const filename = object.key.split('/').pop();
      const meta = photosMetadata.find(m => m.filename.toLowerCase() === filename.toLowerCase());
      
      const baseObj = {
        key: object.key,
        ...(photoThumbnails[object.key] || {}),
        name: filename.replace(/\.[^/.]+$/, ""),
        url: `/img/${object.key.split('/').map(encodeURIComponent).join('/')}`,
        category: object.key.includes('/') ? object.key.split('/')[0] : 'uncategorized',
        size: object.size,
        uploaded: object.uploaded
      };

      if (meta) {
        const cameraStr = `${meta.camera || 'FUJIFILM'} ${meta.model || 'X100VI'}`;
        const lensStr = meta.software ? meta.software.replace('Digital Camera ', '') : 'Fujinon 23mm F2.0 (Fixed)';
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
