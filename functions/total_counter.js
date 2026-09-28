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
    if (url.pathname.endsWith('/sections/increment')) {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      const section = url.searchParams.get('section');
      const validSections = ['projects', 'photography', 'experience', 'blog', 'education', 'skills'];
      if (!section || !validSections.includes(section)) {
        return new Response(JSON.stringify({ error: 'Invalid section' }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      const defaultSections = {
        projects: 0,
        photography: 0,
        experience: 0,
        blog: 0,
        education: 0,
        skills: 0
      };
      const sections = await this.state.storage.transaction(async storage => {
        let current = (await storage.get('sections')) || defaultSections;
        let updated = { ...defaultSections, ...current };
        updated[section] = (updated[section] || 0) + 1;
        await storage.put('sections', updated);
        return updated;
      });
      return new Response(JSON.stringify(sections), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    } else if (url.pathname.endsWith('/sections')) {
      const defaultSections = {
        projects: 0,
        photography: 0,
        experience: 0,
        blog: 0,
        education: 0,
        skills: 0
      };
      let current = (await this.state.storage.get('sections')) || defaultSections;
      let sections = { ...defaultSections, ...current };
      return new Response(JSON.stringify(sections), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    } else if (url.pathname.endsWith('/increment')) {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      const total = await this.state.storage.transaction(async storage => {
        const total = ((await storage.get('total')) || 0) + 1;
        const now = Date.now();
        const timestamps = ((await storage.get('timestamps')) || [])
          .filter(timestamp => now - timestamp < 7 * 24 * 3600 * 1000);
        timestamps.push(now);
        await storage.put({ total, timestamps });
        return total;
      });
      return new Response(JSON.stringify({ total }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    } else if (url.pathname.endsWith('/requests24h')) {
      let now = Date.now();
      let ts = (await this.state.storage.get('timestamps')) || [];
      let count = ts.filter(t => now - t < 24*3600*1000).length;
      return new Response(JSON.stringify({ requests24h: count }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    } else if (url.pathname.endsWith('/history7d')) {
      let now = Date.now();
      let ts = (await this.state.storage.get('timestamps')) || [];
      // Calendar-day buckets must match the UTC-midnight chart labels.
      const todayStart = new Date(now).setUTCHours(0, 0, 0, 0);
      let buckets = Array(7).fill(0);
      for (let t of ts) {
        const eventDay = new Date(t).setUTCHours(0, 0, 0, 0);
        const daysAgo = Math.round((todayStart - eventDay) / (24*3600*1000));
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
    } else if (url.pathname === '/api/total') {
      let total = (await this.state.storage.get('total')) || 0;
      return new Response(JSON.stringify({ total }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    return new Response('Not found', { status: 404 });
  }
}
