// Durable Object to track resume clicks
export class ResumeCounter {
  constructor(state, env) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname.endsWith('/increment')) {
      let clicks = (await this.state.storage.get('clicks')) || 0;
      clicks++;
      await this.state.storage.put('clicks', clicks);
      return new Response(JSON.stringify({ clicks }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    } else if (url.pathname.endsWith('/count')) {
      let clicks = (await this.state.storage.get('clicks')) || 0;
      return new Response(JSON.stringify({ clicks }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    return new Response('Not found', { status: 404, headers: corsHeaders });
  }
}
