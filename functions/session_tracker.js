// One existing SessionTracker object per hashed client IP. No new namespace needed.
const WINDOW_MS = 60_000;
const LEASE_MS = 90_000;
const MAX_SESSIONS = 5;

export class SessionTracker {
  constructor(state) { this.state = state; }

  async fetch(request) {
    const { action, session } = await request.json();
    return this.state.storage.transaction(async storage => {
      const now = Date.now();
      let rate = await storage.get('rate');
      if (!rate || rate.until <= now) rate = { until: now + WINDOW_MS, requests: 0, writes: {} };
      const sessions = await storage.get('sessions') || {};
      for (const [id, expires] of Object.entries(sessions)) if (expires <= now) delete sessions[id];
      const increment = action.endsWith('/increment');
      const limit = action === '/api/resume/increment' ? 10 : 3;
      const renewing = action === '/api/viewers/heartbeat' || action === '/api/viewers/connect';
      const full = renewing && !Object.hasOwn(sessions, session) && Object.keys(sessions).length >= MAX_SESSIONS;
      if (rate.requests >= 120 || (increment && (rate.writes[action] || 0) >= limit) || full) {
        const retry = full ? Math.ceil((Math.min(...Object.values(sessions)) - now) / 1000) : Math.ceil((rate.until - now) / 1000);
        return new Response(null, { status: 429, headers: { 'Retry-After': String(Math.max(1, retry)) } });
      }
      rate.requests++;
      if (increment) rate.writes[action] = (rate.writes[action] || 0) + 1;
      if (renewing) sessions[session] = now + LEASE_MS;
      if (action === '/api/viewers/disconnect') delete sessions[session];
      await storage.put({ rate, sessions });
      await storage.setAlarm(Math.max(rate.until, ...Object.values(sessions)));
      return new Response(null, { status: 204 });
    });
  }

  async alarm() {
    // Serialize cleanup with requests so a late alarm cannot clear fresh limits.
    await this.state.storage.transaction(async storage => {
      const now = Date.now();
      const rate = await storage.get('rate');
      const sessions = await storage.get('sessions') || {};
      for (const [id, expires] of Object.entries(sessions)) if (expires <= now) delete sessions[id];
      if (rate?.until > now || Object.keys(sessions).length) {
        await storage.put('sessions', sessions);
        await storage.setAlarm(Math.max(rate?.until || 0, ...Object.values(sessions)));
      } else {
        await storage.delete(['rate', 'sessions']);
        await storage.deleteAlarm();
      }
    });
  }
}
