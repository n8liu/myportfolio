// Durable Object to track unique visitors by IP with last seen timestamps
export class UniqueVisitors {
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
      let ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '';
      if (!ip) {
        ip = Math.random().toString(36).slice(2);
      }
      let now = Date.now();
      await this.state.storage.put(ip, now);
      
      // Prune records older than 7 days to prevent storage leaks and DO memory limit issues
      const sevenDaysAgo = now - (7 * 24 * 3600 * 1000);
      let all = await this.state.storage.list();
      let count = 0;
      for (let [key, lastSeen] of all.entries()) {
        if (lastSeen < sevenDaysAgo) {
          await this.state.storage.delete(key);
        } else {
          count++;
        }
      }
      return new Response(JSON.stringify({ count }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    } else if (url.pathname.endsWith('/visitors24h')) {
      let now = Date.now();
      let all = await this.state.storage.list();
      let count = 0;
      for (let [ip, lastSeen] of all.entries()) {
        if (now - lastSeen < 24*3600*1000) count++;
      }
      return new Response(JSON.stringify({ visitors24h: count }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    } else if (url.pathname.endsWith('/count')) {
      let all = await this.state.storage.list();
      let count = all.size;
      return new Response(JSON.stringify({ count }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    } else if (url.pathname.endsWith('/history7d')) {
      let now = Date.now();
      let all = await this.state.storage.list();
      // Prepare 7 days of buckets for unique IPs per day
      let buckets = Array(7).fill(0);
      let perDayIPs = Array(7).fill(null).map(() => new Set());
      for (let [ip, lastSeen] of all.entries()) {
        for (let i = 0; i < 7; i++) {
          let dayStart = new Date(now - (6-i)*24*3600*1000);
          dayStart.setUTCHours(0,0,0,0);
          let dayEnd = dayStart.getTime() + 24*3600*1000;
          if (lastSeen >= dayStart.getTime() && lastSeen < dayEnd) {
            perDayIPs[i].add(ip);
          }
        }
      }
      for (let i = 0; i < 7; i++) buckets[i] = perDayIPs[i].size;
      // Prepare day labels (midnight UTC for each day)
      let days = [];
      for (let i = 6; i >= 0; i--) {
        let d = new Date(now - i*24*3600*1000);
        d.setUTCHours(0,0,0,0);
        days.push(d.getTime());
      }
      return new Response(JSON.stringify({ days, counts: buckets }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    return new Response('Not found', { status: 404, headers: corsHeaders });
  }
}
