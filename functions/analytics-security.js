const routes = {
  '/api/viewers': ['VIEWER_COUNTER', 'GET'],
  '/api/viewers/connect': ['VIEWER_COUNTER', 'POST'],
  '/api/viewers/heartbeat': ['VIEWER_COUNTER', 'POST'],
  '/api/viewers/disconnect': ['VIEWER_COUNTER', 'POST'],
  '/api/total': ['TOTAL_COUNTER', 'GET'],
  '/api/total/increment': ['TOTAL_COUNTER', 'POST'],
  '/api/total/requests24h': ['TOTAL_COUNTER', 'GET'],
  '/api/total/history7d': ['TOTAL_COUNTER', 'GET'],
  '/api/unique/count': ['UNIQUE_VISITORS', 'GET'],
  '/api/unique/increment': ['UNIQUE_VISITORS', 'POST'],
  '/api/unique/visitors24h': ['UNIQUE_VISITORS', 'GET'],
  '/api/unique/history7d': ['UNIQUE_VISITORS', 'GET'],
  '/api/resume/count': ['RESUME_COUNTER', 'GET'],
  '/api/resume/increment': ['RESUME_COUNTER', 'POST'],
  '/api/sections': ['TOTAL_COUNTER', 'GET'],
  '/api/sections/increment': ['TOTAL_COUNTER', 'POST'],
};

async function digest(value) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function handleAnalytics(request, env) {
  const url = new URL(request.url);
  const route = routes[url.pathname];
  const origin = request.headers.get('Origin');
  const allowedOrigins = new Set(['https://nathanliu.dev', 'https://www.nathanliu.dev', url.origin]);
  const headers = {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin',
    ...(origin && allowedOrigins.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
  };
  const respond = (status, error, extra = {}) => new Response(JSON.stringify({ error }), { status, headers: { ...headers, ...extra } });
  if (!route) return respond(404, 'Not found');
  if (origin && !allowedOrigins.has(origin)) return respond(403, 'Origin not allowed');
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: {
      ...headers, 'Access-Control-Allow-Methods': route[1], 'Access-Control-Allow-Headers': 'Content-Type',
    } });
  }
  if (request.method !== route[1]) return respond(405, 'Method not allowed', { Allow: route[1] });
  // Cloudflare supplies this header; do not trust caller-supplied forwarded IPs.
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return respond(403, 'Client address unavailable');
  const session = url.searchParams.get('session');
  const viewerMutation = route[0] === 'VIEWER_COUNTER' && route[1] === 'POST';
  if (viewerMutation && (!session || !/^[a-zA-Z0-9-]{16,128}$/.test(session))) {
    return respond(400, 'Valid viewer session required');
  }
  if (!env.SESSION_TRACKER || !env[route[0]]) return respond(503, 'Analytics unavailable');
  try {
    // Daily rotating digest avoids retaining raw IP addresses in the rate limiter.
    const client = await digest(`${new Date().toISOString().slice(0, 10)}:${ip}`);
    const limiter = env.SESSION_TRACKER.get(env.SESSION_TRACKER.idFromName(client));
    const limit = await limiter.fetch(new Request('https://internal/check', {
      method: 'POST', body: JSON.stringify({ action: url.pathname, session }),
    }));
    if (!limit.ok) return respond(429, 'Too many requests', { 'Retry-After': limit.headers.get('Retry-After') || '60' });
    if (viewerMutation) {
      // Bind ownership to the address; another address cannot disconnect this tab.
      url.searchParams.set('session', await digest(`${ip}:${session}`));
    }
    const namespace = env[route[0]];
    const response = await namespace.get(namespace.idFromName('global')).fetch(new Request(url, request));
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('Access-Control-Allow-Origin');
    for (const [key, value] of Object.entries(headers)) responseHeaders.set(key, value);
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } catch {
    return respond(503, 'Analytics unavailable');
  }
}
