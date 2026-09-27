import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { ViewerCounter } from '../functions/viewers.js';

function createStorage() {
  const values = new Map([['viewers', 203]]);
  const storage = {
    values, alarmTime: null,
    async list({ prefix }) { return new Map([...values].filter(([key]) => key.startsWith(prefix))); },
    async put(key, value) { values.set(key, value); },
    async delete(key) { values.delete(key); },
    async setAlarm(time) { this.alarmTime = time; },
    async deleteAlarm() { this.alarmTime = null; },
    async transaction(callback) { return callback(this); },
  };
  return storage;
}
const first = 'first-tab-session-1234';
const second = 'second-tab-session-5678';
async function count(counter, action = '', id, method = 'POST') {
  const response = await counter.fetch(new Request(
    `https://counter.example/api/viewers${action ? '/' + action : ''}${id ? '?session=' + id : ''}`,
    { method }
  ));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  return (await response.json()).count;
}

test('viewer sessions replace inflated legacy count and repeated requests are idempotent', async () => {
  const storage = createStorage();
  const counter = new ViewerCounter({ storage });
  assert.equal(await count(counter, 'connect'), 0);
  assert.equal(storage.values.has('viewers'), false);
  assert.equal(await count(counter, 'heartbeat', first), 1);
  assert.equal(await count(counter, 'heartbeat', first), 1);
  assert.equal(await count(counter, 'connect', second), 2);
  assert.equal(await count(counter, 'disconnect'), 2); // Old cached client cannot decrement others.
  assert.equal(await count(counter, 'disconnect', first), 1);
  assert.equal(await count(counter, 'disconnect', first), 1);
  assert.equal(await count(counter, 'disconnect', second), 0);
  assert.equal(storage.alarmTime, null);
});

test('lost disconnects expire via alarm; renewed sessions survive restart and later expire', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: 100000 });
  const storage = createStorage();
  let counter = new ViewerCounter({ storage });
  await count(counter, 'heartbeat', first);
  await count(counter, 'heartbeat', second);
  assert.equal(storage.alarmTime, 190000);
  t.mock.timers.tick(60000);
  await count(counter, 'heartbeat', second);
  counter = new ViewerCounter({ storage });
  t.mock.timers.tick(30000);
  await counter.alarm();
  assert.equal(await count(counter), 1);
  assert.equal(storage.alarmTime, 250000);
  t.mock.timers.tick(60000);
  await counter.alarm();
  assert.equal(await count(counter), 0);
  assert.equal(storage.alarmTime, null);
});

test('count reads prune expired sessions even if alarm delivery is delayed', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: 100000 });
  const counter = new ViewerCounter({ storage: createStorage() });
  await count(counter, 'heartbeat', first);
  t.mock.timers.tick(90001);
  assert.equal(await count(counter, '', undefined, 'GET'), 0);
  assert.equal(await count(counter, 'connect', first, 'GET'), 0);
});

test('browser retries heartbeats, stops on pagehide, and reconnects after back/forward restore', async () => {
  const documentEvents = {};
  const windowEvents = {};
  const requests = [];
  let interval;
  let ids = 0;
  let failNext = true;
  const context = vm.createContext({
    document: { hidden: false, addEventListener(type, fn) { documentEvents[type] = fn; } },
    window: { addEventListener(type, fn) { windowEvents[type] = fn; } },
    crypto: { randomUUID() { return `tab-session-${++ids}`; } },
    AbortSignal: { timeout() { return undefined; } },
    console: { error() {} },
    setInterval(fn) { interval = fn; return 1; },
    clearInterval() { interval = null; },
    async fetch(url, options) {
      requests.push({ url, options });
      if (failNext) { failNext = false; throw new Error('offline'); }
      return { ok: true, async json() { return { count: 1 }; } };
    },
  });
  const source = readFileSync(new URL('../viewers.js', import.meta.url), 'utf8');
  vm.runInContext(source + `
    globalThis.client = Object.create(ViewerCounter.prototype);
    client.counterElements = [];
    client.sessionId = crypto.randomUUID();
    client.startPolling('https://counter.example');
  `, context);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(typeof interval, 'function');
  await interval();
  assert.equal(context.client.count, 1);
  assert.equal(requests[0].url, requests[1].url);
  assert.equal(requests[1].options.method, 'POST');
  context.document.hidden = true;
  documentEvents.visibilitychange();
  assert.equal(interval, null);
  context.document.hidden = false;
  documentEvents.visibilitychange();
  await new Promise(resolve => setImmediate(resolve));
  windowEvents.pagehide();
  assert.equal(interval, null);
  assert.match(requests.at(-1).url, /disconnect\?session=tab-session-1$/);
  assert.equal(requests.at(-1).options.keepalive, true);
  windowEvents.pageshow({ persisted: true });
  await new Promise(resolve => setImmediate(resolve));
  assert.match(requests.at(-1).url, /heartbeat\?session=tab-session-2$/);
  assert.equal(typeof interval, 'function');
});
