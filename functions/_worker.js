import { ViewerCounter } from './viewers';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/viewers') {
      // Use a global ID for the counter
      const id = env.VIEWER_COUNTER.idFromName("global");
      const obj = env.VIEWER_COUNTER.get(id);
      return obj.fetch(request);
    }

    // Fallback: serve static files or 404
    return new Response("Not found", { status: 404 });
  },
};

export { ViewerCounter };
