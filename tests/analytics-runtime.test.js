import assert from 'node:assert/strict';
import test from 'node:test';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

// Exercise Pages -> external Worker Durable Objects using real SQLite storage,
// rather than only the in-memory storage doubles used by unit tests.
test('Pages stats routes reach external Durable Objects in the Cloudflare runtime', async () => {
  const classes = {
    VIEWER_COUNTER: 'ViewerCounter', SESSION_TRACKER: 'SessionTracker',
    TOTAL_COUNTER: 'TotalCounter', UNIQUE_VISITORS: 'UniqueVisitors', RESUME_COUNTER: 'ResumeCounter',
  };
  const bindings = scriptName => Object.fromEntries(Object.entries(classes).map(([key, className]) => [
    key, { className, useSQLite: true, ...(scriptName ? { scriptName } : {}) },
  ]));
  const common = { modules: true, scriptPath: 'dist/_worker.js', compatibilityDate: '2023-12-01' };
  const mf = new Miniflare(convertV4MiniflareOptions({ workers: [
    { ...common, name: 'pages', durableObjects: bindings('analytics') },
    { ...common, name: 'analytics', durableObjects: bindings() },
  ] }));
  try {
    const origin = 'https://myportfolio.pages.dev';
    const fetch = (path, method = 'GET') => mf.dispatchFetch(origin + path, {
      method, headers: { Origin: origin, 'CF-Connecting-IP': '192.0.2.1' },
    });
    for (const path of ['/api/total/increment', '/api/unique/increment', '/api/resume/increment']) {
      const response = await fetch(path, 'POST');
      assert.equal(response.status, 200, await response.text());
    }
    for (const [path, field] of [
      ['/api/total', 'total'], ['/api/unique/count', 'count'],
      ['/api/total/requests24h', 'requests24h'], ['/api/resume/count', 'clicks'],
    ]) {
      const response = await fetch(path);
      assert.equal(response.status, 200, path);
      assert.equal((await response.json())[field], 1, path);
    }
    for (const path of ['/api/total/history7d', '/api/unique/history7d']) {
      const response = await fetch(path);
      assert.equal(response.status, 200, path);
      const data = await response.json();
      assert.equal(data.days.length, 7);
      assert.equal(data.counts.length, 7);
      assert.equal(data.counts.at(-1), 1);
    }
    // A returning visitor adds a view but is still one unique visitor.
    assert.equal((await fetch('/api/total/increment', 'POST')).status, 200);
    assert.equal((await fetch('/api/unique/increment', 'POST')).status, 200);
    assert.equal((await (await fetch('/api/total/requests24h')).json()).requests24h, 2);
    assert.equal((await (await fetch('/api/unique/count')).json()).count, 1);
    assert.equal((await fetch('/api/total/reset', 'POST')).status, 404);
    assert.equal((await fetch('/api/total/increment')).status, 405);
  } finally {
    await mf.dispose();
  }
});
