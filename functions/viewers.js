// Durable Object to track viewer count
export class ViewerCounter {
  constructor(state, env) {
    this.state = state;
    // Initialize counter if needed
    this.state.blockConcurrencyWhile(async () => {
      let stored = await this.state.storage.get("viewers");
      this.viewers = stored || 0;
    });
  }

  // Handle request to increment, decrement, or get the count
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.split('/').pop();

    if (path === "connect") {
      this.viewers++;
      await this.state.storage.put("viewers", this.viewers);
    } else if (path === "disconnect") {
      this.viewers = Math.max(0, this.viewers - 1); // Ensure count never goes negative
      await this.state.storage.put("viewers", this.viewers);
    }

    return new Response(JSON.stringify({ count: this.viewers }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

// Worker script to handle viewer count requests
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Only handle /api/viewers routes
    if (!url.pathname.startsWith('/api/viewers')) {
      return new Response("Not found", { status: 404 });
    }

    // Get durable object ID for the counter (single counter for the whole site)
    const id = env.VIEWER_COUNTER.idFromName("global_counter");
    const obj = env.VIEWER_COUNTER.get(id);
    
    // Pass the request to the durable object
    return await obj.fetch(request);
  }
};

// Define the Durable Object
export { ViewerCounter as DurableObjectExample };
