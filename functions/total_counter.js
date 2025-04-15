// Durable Object to track total requests with timestamps
export class TotalCounter {
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
      let total = (await this.state.storage.get('total')) || 0;
      total++;
      await this.state.storage.put('total', total);
      // Add timestamp for request
      let now = Date.now();
      let ts = (await this.state.storage.get('timestamps')) || [];
      ts.push(now);
      // Keep only last 7 days for space
      ts = ts.filter(t => now - t < 7*24*3600*1000);
      await this.state.storage.put('timestamps', ts);
      return new Response(JSON.stringify({ total }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    } else if (url.pathname.endsWith('/requests24h')) {
      let now = Date.now();
      let ts = (await this.state.storage.get('timestamps')) || [];
      let count = ts.filter(t => now - t < 24*3600*1000).length;
      return new Response(JSON.stringify({ requests24h: count }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    } else if (url.pathname.endsWith('/reset')) {
      await this.state.storage.put('total', 0);
      await this.state.storage.put('timestamps', []);
      return new Response(JSON.stringify({ total: 0 }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    } else if (url.pathname.endsWith('/history7d')) {
      let now = Date.now();
      let ts = (await this.state.storage.get('timestamps')) || [];
      // Prepare 7 days of buckets
      let buckets = Array(7).fill(0);
      for (let t of ts) {
        let daysAgo = Math.floor((now - t) / (24*3600*1000));
        if (daysAgo >= 0 && daysAgo < 7) buckets[6-daysAgo]++;
      }
      // Prepare day labels (midnight UTC for each day)
      let days = [];
      for (let i = 6; i >= 0; i--) {
        let d = new Date(now - i*24*3600*1000);
        d.setUTCHours(0,0,0,0);
        days.push(d.getTime());
      }
      return new Response(JSON.stringify({ days, counts: buckets }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    } else {
      let total = (await this.state.storage.get('total')) || 0;
      return new Response(JSON.stringify({ total }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }
}
