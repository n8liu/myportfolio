import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { TotalCounter } from '../functions/total_counter.js';
import { UniqueVisitors } from '../functions/unique_visitors.js';

function storage() {
  const values = new Map();
  let queue = Promise.resolve();
  return {
    values,
    async get(key) { return structuredClone(values.get(key)); },
    async put(key, value) {
      for (const [name, item] of typeof key === 'object' ? Object.entries(key) : [[key, value]]) values.set(name, structuredClone(item));
    },
    async delete(key) { values.delete(key); },
    async list({ prefix, limit = 1000, startAfter }) {
      return new Map([...values].filter(([key]) => key.startsWith(prefix) && (!startAfter || key > startAfter))
        .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).slice(0, limit));
    },
    transaction(fn) {
      const result = queue.then(() => fn(this));
      queue = result.catch(() => {});
      return result;
    },
  };
}
function req(path, method = 'GET', ip = '2001:db8::1') {
  return new Request('https://site.example/api/' + path, { method, headers: { 'CF-Connecting-IP': ip } });
}

test('repeat views increment independently of deduplicated visitors, even concurrently', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.UTC(2026, 8, 28, 12) });
  const total = new TotalCounter({ storage: storage() });
  const unique = new UniqueVisitors({ storage: storage() });
  await Promise.all(Array.from({ length: 5 }, async () => {
    await total.fetch(req('total/increment', 'POST'));
    await unique.fetch(req('unique/increment', 'POST'));
  }));
  assert.equal((await (await total.fetch(req('total'))).json()).total, 5);
  assert.equal((await (await total.fetch(req('total/requests24h'))).json()).requests24h, 5);
  assert.equal((await (await unique.fetch(req('unique/count'))).json()).count, 1);
  const uniqueHistory = await (await unique.fetch(req('unique/history7d'))).json();
  assert.equal(uniqueHistory.counts.at(-1), 1);
});

test('unique visitors include all storage pages and preserve full IPv6 identities', async t => {
  const now = Date.UTC(2026, 8, 28, 1);
  t.mock.timers.enable({ apis: ['Date'], now });
  const db = storage();
  for (let i = 0; i < 250; i++) await db.put(`seen:2026-09-28:2001:db8::${i.toString(16)}`, now);
  await db.put('seen:2026-09-27:2001:db8::0', now - 2 * 3600000); // Same visitor yesterday.
  await db.put('seen:2026-09-27:2001:db8::ffff', now - 2 * 3600000);
  await db.put('seen:2026-09-20:2001:db8::eeee', now - 8 * 86400000);
  const unique = new UniqueVisitors({ storage: db });
  assert.equal(await unique.getUniqueCount7D(now), 251);
  assert.equal(await unique.getUniqueCount24H(now), 251);
  assert.equal(await unique.getAllTimeUniqueCount(), 252);
  assert.equal((await (await unique.fetch(req('unique/count'))).json()).count, 252);
});

test('all-time unique visitors persist and increment across days even after old daily records are pruned', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.UTC(2026, 8, 20, 12) });
  const db = storage();
  const unique = new UniqueVisitors({ storage: db });
  await unique.fetch(req('unique/increment', 'POST', '192.0.2.1'));
  await unique.fetch(req('unique/increment', 'POST', '192.0.2.2'));
  assert.equal((await (await unique.fetch(req('unique/count'))).json()).count, 2);

  // Advance time past 8 days
  t.mock.timers.tick(9 * 24 * 3600 * 1000);
  // Repeat visit from existing user 192.0.2.1 does not increment all-time count
  await unique.fetch(req('unique/increment', 'POST', '192.0.2.1'));
  assert.equal((await (await unique.fetch(req('unique/count'))).json()).count, 2);

  // New visit from 192.0.2.3 increments all-time count to 3
  await unique.fetch(req('unique/increment', 'POST', '192.0.2.3'));
  assert.equal((await (await unique.fetch(req('unique/count'))).json()).count, 3);
});

test('historical adjustment adds 400 once across concurrent reads, restarts, and visits', async () => {
  const db = storage();
  await db.put('total_uniques', 31);
  const env = { UNIQUE_VISITOR_ADJUSTMENT_2026_10_02: 'true' };
  const unique = new UniqueVisitors({ storage: db }, env);
  const counts = await Promise.all(Array.from({ length: 5 }, () => unique.getAllTimeUniqueCount()));
  assert.deepEqual(counts, [431, 431, 431, 431, 431]);
  assert.equal((await db.get('adjustment:2026-10-02:add-400')).previousCount, 31);
  const restarted = new UniqueVisitors({ storage: db }, env);
  await restarted.fetch(req('unique/increment', 'POST', '192.0.2.1'));
  await restarted.fetch(req('unique/increment', 'POST', '192.0.2.1'));
  assert.equal(await restarted.getAllTimeUniqueCount(), 432);
  const history = await (await restarted.fetch(req('unique/history7d'))).json();
  assert.equal(history.counts.at(-1), 1);
  assert.equal(await restarted.getUniqueCount24H(Date.now()), 1);
  assert.equal(await new UniqueVisitors({ storage: db }).getAllTimeUniqueCount(), 432);
});

test('repeat visits refresh last seen without increasing daily uniques', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.UTC(2026, 8, 27, 0, 10) });
  const db = storage();
  const unique = new UniqueVisitors({ storage: db });
  await unique.fetch(req('unique/increment', 'POST'));
  t.mock.timers.tick((23 * 60 + 40) * 60000);
  await unique.fetch(req('unique/increment', 'POST'));
  t.mock.timers.tick(70 * 60000);
  assert.equal(db.values.get('count:2026-09-27'), 1);
  assert.equal(await unique.getUniqueCount24H(Date.now()), 1);
});

test('view history uses UTC calendar days while views24h remains a rolling total', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.UTC(2026, 8, 27, 23, 55) });
  const total = new TotalCounter({ storage: storage() });
  await total.fetch(req('total/increment', 'POST'));
  t.mock.timers.tick(10 * 60000);
  const history = await (await total.fetch(req('total/history7d'))).json();
  assert.equal(history.counts.at(-2), 1);
  assert.equal(history.counts.at(-1), 0);
  assert.equal((await (await total.fetch(req('total/requests24h'))).json()).requests24h, 1);
});

test('browser counts reloads and full back/forward navigations as views', async () => {
  const source = readFileSync('viewers.js', 'utf8');
  for (const type of ['navigate', 'reload', 'back_forward']) {
    const calls = [];
    const context = vm.createContext({
      document: { addEventListener() {} },
      performance: { getEntriesByType: () => [{ type }] },
      crypto: { randomUUID: () => 'viewer-session-test' }, console,
      fetch: async (url, options) => { calls.push([url, options.method]); return {}; },
    });
    vm.runInContext(source + '\nglobalThis.client = Object.create(ViewerCounter.prototype); client.startPolling = () => {};', context);
    await context.client.initCloudflare();
    assert.deepEqual(calls, [['/api/total/increment', 'POST'], ['/api/unique/increment', 'POST']], type);
  }
});

test('section telemetry tracks visits, handles increments, and rejects invalid sections', async () => {
  const total = new TotalCounter({ storage: storage() });
  const initial = await (await total.fetch(req('sections', 'GET'))).json();
  assert.equal(typeof initial.projects, 'number');
  assert.equal(typeof initial.photography, 'number');
  assert.equal(typeof initial.experience, 'number');
  assert.equal(typeof initial.blog, 'number');
  assert.equal(typeof initial.education, 'number');
  assert.equal(typeof initial.skills, 'number');

  const prevProjects = initial.projects;
  const updated = await (await total.fetch(req('sections/increment?section=projects', 'POST'))).json();
  assert.equal(updated.projects, prevProjects + 1);

  // Method not allowed
  assert.equal((await total.fetch(req('sections/increment?section=projects', 'GET'))).status, 405);

  // Invalid section name
  assert.equal((await total.fetch(req('sections/increment?section=malicious', 'POST'))).status, 400);
});
