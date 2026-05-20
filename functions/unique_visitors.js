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

    const now = Date.now();
    const todayStr = new Date(now).toISOString().split('T')[0];

    if (url.pathname.endsWith('/increment')) {
      let ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '';
      if (!ip) {
        ip = Math.random().toString(36).slice(2);
      }

      // Check if IP is already seen today
      const seenKey = `seen:${todayStr}:${ip}`;
      const hasBeenSeen = await this.state.storage.get(seenKey);

      if (!hasBeenSeen) {
        // Record as seen today, with value as timestamp
        await this.state.storage.put(seenKey, now);

        // Increment today's unique count
        const dailyKey = `count:${todayStr}`;
        const dailyCount = (await this.state.storage.get(dailyKey)) || 0;
        await this.state.storage.put(dailyKey, dailyCount + 1);
      }

      // Trigger pruning of data older than 7 days once a day
      const lastPruned = await this.state.storage.get('last_pruned_date');
      if (lastPruned !== todayStr) {
        const eightDaysAgo = new Date(now - 8 * 24 * 3600 * 1000).toISOString().split('T')[0];
        const oldKeys = await this.state.storage.list({ prefix: `seen:${eightDaysAgo}:` });
        for (const key of oldKeys.keys()) {
          await this.state.storage.delete(key);
        }
        await this.state.storage.delete(`count:${eightDaysAgo}`);
        await this.state.storage.put('last_pruned_date', todayStr);
      }

      // Get 7-day exact unique visitors count
      const count = await this.getUniqueCount7D(now);
      return new Response(JSON.stringify({ count }), { headers: { "Content-Type": "application/json", ...corsHeaders } });

    } else if (url.pathname.endsWith('/visitors24h')) {
      // Sum visitors over the past 24 hours
      const visitors24h = await this.getUniqueCount24H(now);
      return new Response(JSON.stringify({ visitors24h }), { headers: { "Content-Type": "application/json", ...corsHeaders } });

    } else if (url.pathname.endsWith('/count')) {
      // Get 7-day unique count (this matches previous behavior)
      const count = await this.getUniqueCount7D(now);
      return new Response(JSON.stringify({ count }), { headers: { "Content-Type": "application/json", ...corsHeaders } });

    } else if (url.pathname.endsWith('/history7d')) {
      // Prepare 7 days of daily visitor counts
      const counts = [];
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now - i * 24 * 3600 * 1000);
        const dateStr = d.toISOString().split('T')[0];
        d.setUTCHours(0, 0, 0, 0);
        days.push(d.getTime());

        const dailyCount = (await this.state.storage.get(`count:${dateStr}`)) || 0;
        counts.push(dailyCount);
      }
      return new Response(JSON.stringify({ days, counts }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });
  }

  // Calculate unique IP count over past 7 days
  async getUniqueCount7D(now) {
    const uniqueIPs = new Set();
    for (let i = 0; i < 7; i++) {
      const dateStr = new Date(now - i * 24 * 3600 * 1000).toISOString().split('T')[0];
      let cursor = "";
      while (true) {
        const options = { prefix: `seen:${dateStr}:`, limit: 100 };
        if (cursor) options.cursor = cursor;
        const res = await this.state.storage.list(options);
        for (const key of res.keys()) {
          const parts = key.split(':');
          if (parts.length >= 3) {
            uniqueIPs.add(parts[2]);
          }
        }
        if (res.cursor) {
          cursor = res.cursor;
        } else {
          break;
        }
      }
    }
    return uniqueIPs.size;
  }

  // Calculate unique IP count over past 24 hours
  async getUniqueCount24H(now) {
    const uniqueIPs = new Set();
    const twentyFourHoursAgo = now - 24 * 3600 * 1000;
    for (let i = 0; i < 2; i++) {
      const dateStr = new Date(now - i * 24 * 3600 * 1000).toISOString().split('T')[0];
      const res = await this.state.storage.list({ prefix: `seen:${dateStr}:` });
      for (const [key, lastSeen] of res.entries()) {
        if (lastSeen >= twentyFourHoursAgo) {
          const parts = key.split(':');
          if (parts.length >= 3) {
            uniqueIPs.add(parts[2]);
          }
        }
      }
    }
    return uniqueIPs.size;
  }
}
