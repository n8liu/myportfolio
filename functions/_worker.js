import { ViewerCounter } from './viewers';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/viewers')) {
      const id = env.VIEWER_COUNTER.idFromName("global");
      const obj = env.VIEWER_COUNTER.get(id);
      return obj.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};

export { ViewerCounter };
