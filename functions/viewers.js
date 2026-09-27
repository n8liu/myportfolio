// Count recently active tabs, not lifetime connect/disconnect events.
const SESSION_TTL_MS = 90_000;
const SESSION_PREFIX = 'viewer-session:';

export class ViewerCounter {
  constructor(state) {
    this.state = state;
  }

  async updateSessions(action, sessionId) {
    return this.state.storage.transaction(async storage => {
      const now = Date.now();
      const sessions = await storage.list({ prefix: SESSION_PREFIX });
      for (const [key, expires] of sessions) {
        if (expires <= now) {
          await storage.delete(key);
          sessions.delete(key);
        }
      }
      if (sessionId) {
        const key = SESSION_PREFIX + sessionId;
        if (action === 'connect' || action === 'heartbeat') {
          const expires = now + SESSION_TTL_MS;
          await storage.put(key, expires);
          sessions.set(key, expires);
        } else if (action === 'disconnect') {
          await storage.delete(key);
          sessions.delete(key);
        }
      }
      // Discard the old accumulated count; only live leases contribute now.
      await storage.delete('viewers');
      if (sessions.size) {
        let nextExpiry = Infinity;
        for (const expires of sessions.values()) nextExpiry = Math.min(nextExpiry, expires);
        await storage.setAlarm(nextExpiry);
      } else {
        await storage.deleteAlarm();
      }
      return sessions.size;
    });
  }

  async alarm() {
    await this.updateSessions();
  }

  async fetch(request) {
    const url = new URL(request.url);
    const action = url.pathname.split('/').pop();
    if (!['viewers', 'connect', 'heartbeat', 'disconnect'].includes(action)) {
      return new Response('Not found', { status: 404 });
    }
    const sessionId = url.searchParams.get('session');
    if (sessionId && !/^[a-zA-Z0-9-]{16,128}$/.test(sessionId)) {
      return new Response('Invalid viewer session', { status: 400 });
    }
    // Old cached clients without IDs can read, but cannot inflate the counter.
    const count = await this.updateSessions(request.method === 'POST' ? action : null, sessionId);
    return new Response(JSON.stringify({ count }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    });
  }
}
