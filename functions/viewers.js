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

  // Handle request to increment or get the count
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.split('/').pop();

    // Always use a single instance for global count
    if (url.pathname.startsWith('/api/viewers')) {
      if (path === "connect") {
        this.viewers++;
        await this.state.storage.put("viewers", this.viewers);
      } else if (path === "disconnect") {
        this.viewers = Math.max(0, this.viewers - 1);
        await this.state.storage.put("viewers", this.viewers);
      }
      // Always return the current count
      return new Response(JSON.stringify({ count: this.viewers }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response("Not found", { status: 404 });
  }
}
