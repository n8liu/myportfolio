// Durable Object to track unique visitors by IP with last seen timestamps
export class UniqueVisitors {
  constructor(state, env) {
    this.state = state;
    this.applyHistoricalAdjustment = env?.UNIQUE_VISITOR_ADJUSTMENT_2026_10_02 === 'true';
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
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      const ip = request.headers.get('cf-connecting-ip');
      if (!ip) return new Response('Client address unavailable', { status: 400 });

      // Repeat visits refresh last-seen time, but only the first visit that day
      // increments the daily unique count. Serialize simultaneous tabs.
      const seenKey = `seen:${todayStr}:${ip}`;
      const everKey = `ever:${ip}`;
      await this.state.storage.transaction(async storage => {
        const seen = await storage.get(seenKey);
        if (seen === undefined) {
          const dailyKey = `count:${todayStr}`;
          const count = ((await storage.get(dailyKey)) || 0) + 1;
          await storage.put(dailyKey, count);
        }
        await storage.put(seenKey, now);

        const seenEver = await storage.get(everKey);
        if (seenEver === undefined) {
          let totalUniques = await storage.get('total_uniques');
          if (totalUniques === undefined) {
            const existingIPs = new Set();
            for await (const [key] of this.listSeen('seen:')) {
              if (key.length > 16) existingIPs.add(key.slice(16));
            }
            existingIPs.add(ip);
            totalUniques = existingIPs.size;
            for (const existingIp of existingIPs) {
              await storage.put(`ever:${existingIp}`, 1);
            }
          } else {
            totalUniques += 1;
            await storage.put(everKey, 1);
          }
          await storage.put('total_uniques', totalUniques);
        }
      });

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

      // Get the cumulative count, including the historical adjustment if enabled.
      const count = await this.getAllTimeUniqueCount();
      return new Response(JSON.stringify({ count }), { headers: { "Content-Type": "application/json", ...corsHeaders } });

    } else if (url.pathname.endsWith('/visitors24h')) {
      // Sum visitors over the past 24 hours
      const visitors24h = await this.getUniqueCount24H(now);
      return new Response(JSON.stringify({ visitors24h }), { headers: { "Content-Type": "application/json", ...corsHeaders } });

    } else if (url.pathname.endsWith('/count')) {
      // Get all-time unique count
      const count = await this.getAllTimeUniqueCount();
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

  // Durable Object list() returns a Map, not an R2 cursor response.
  async *listSeen(prefix) {
    let startAfter;
    while (true) {
      const page = await this.state.storage.list({ prefix, limit: 100, ...(startAfter ? { startAfter } : {}) });
      for (const entry of page) yield entry;
      if (page.size < 100) return;
      startAfter = [...page.keys()].at(-1);
    }
  }

  // Distinct complete IP addresses across the seven UTC calendar days shown.
  async getUniqueCount7D(now) {
    const uniqueIPs = new Set();
    for (let i = 0; i < 7; i++) {
      const dateStr = new Date(now - i * 24 * 3600 * 1000).toISOString().split('T')[0];
      const prefix = `seen:${dateStr}:`;
      for await (const [key] of this.listSeen(prefix)) {
        uniqueIPs.add(key.slice(prefix.length));
      }
    }
    return uniqueIPs.size;
  }

  // Rolling 24-hour distinct visitors, using refreshed last-seen timestamps.
  async getUniqueCount24H(now) {
    const uniqueIPs = new Set();
    const cutoff = now - 24 * 3600 * 1000;
    for (let i = 0; i < 2; i++) {
      const dateStr = new Date(now - i * 24 * 3600 * 1000).toISOString().split('T')[0];
      const prefix = `seen:${dateStr}:`;
      for await (const [key, lastSeen] of this.listSeen(prefix)) {
        if (lastSeen > cutoff && lastSeen <= now) uniqueIPs.add(key.slice(prefix.length));
      }
    }
    return uniqueIPs.size;
  }

  // Cumulative tracked visitors plus the explicitly requested historical adjustment.
  async getAllTimeUniqueCount() {
    return await this.state.storage.transaction(async storage => {
      let current = await storage.get('total_uniques');
      if (current === undefined) {
        const existingIPs = new Set();
        for await (const [key] of this.listSeen('seen:')) {
          if (key.length > 16) existingIPs.add(key.slice(16));
        }
        for (const existingIp of existingIPs) {
          await storage.put(`ever:${existingIp}`, 1);
        }
        current = existingIPs.size;
        await storage.put('total_uniques', current);
      }
      const adjustmentKey = 'adjustment:2026-10-02:add-400';
      if (this.applyHistoricalAdjustment && await storage.get(adjustmentKey) === undefined) {
        // Store the marker and total atomically so retries/redeploys cannot add twice.
        const previousCount = current;
        current += 400;
        await storage.put('total_uniques', current);
        await storage.put(adjustmentKey, { amount: 400, previousCount, appliedAt: Date.now() });
      }
      return current;
    });
  }
}
