import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { marked } from 'marked';
import worker from '../dist/_worker.js';
import { SessionTracker } from '../functions/session_tracker.js';
import { TotalCounter } from '../functions/total_counter.js';
import { ViewerCounter } from '../functions/viewers.js';
import { isPublicFile } from '../utils/public-files.js';

function memoryStorage() {
  const values = new Map();
  let queue = Promise.resolve();
  return {
    values, alarmTime: null,
    async get(key) { return structuredClone(values.get(key)); },
    async put(key, value) {
      for (const [name, item] of typeof key === 'object' ? Object.entries(key) : [[key, value]]) values.set(name, structuredClone(item));
    },
    async delete(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) values.delete(key); },
    async list({ prefix }) { return new Map([...values].filter(([key]) => key.startsWith(prefix))); },
    async setAlarm(time) { this.alarmTime = time; },
    async deleteAlarm() { this.alarmTime = null; },
    transaction(fn) {
      const result = queue.then(() => fn(this));
      queue = result.catch(() => {});
      return result;
    },
  };
}
function namespace(Class) {
  const objects = new Map();
  return { idFromName: name => name, get(id) {
    if (!objects.has(id)) objects.set(id, new Class({ storage: memoryStorage() }));
    return objects.get(id);
  } };
}
function analyticsEnv() {
  return { SESSION_TRACKER: namespace(SessionTracker), TOTAL_COUNTER: namespace(TotalCounter), VIEWER_COUNTER: namespace(ViewerCounter) };
}
function request(path, method = 'POST', extra = {}) {
  return new Request(`https://counter.example${path}`, { method, headers: {
    'CF-Connecting-IP': '192.0.2.1', Origin: 'https://nathanliu.dev', ...extra,
  } });
}

test('analytics reset is removed and mutations require POST and an allowed origin', async () => {
  const env = analyticsEnv();
  await worker.fetch(request('/api/total/increment'), env);
  for (const method of ['GET', 'POST']) {
    assert.equal((await worker.fetch(request('/api/total/reset', method), env)).status, 404);
  }
  assert.equal((await worker.fetch(request('/api/total/increment', 'GET'), env)).status, 405);
  assert.equal((await worker.fetch(request('/api/total/increment', 'POST', { Origin: 'https://evil.example' }), env)).status, 403);
  const response = await worker.fetch(request('/api/total', 'GET'), env);
  assert.equal((await response.json()).total, 1);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://nathanliu.dev');
  const preflight = await worker.fetch(request('/api/total/increment', 'OPTIONS'), env);
  assert.equal(preflight.headers.get('Access-Control-Allow-Methods'), 'POST');
  const missingIP = request('/api/total/increment');
  missingIP.headers.delete('CF-Connecting-IP');
  missingIP.headers.set('X-Forwarded-For', '192.0.2.5');
  assert.equal((await worker.fetch(missingIP, env)).status, 403);
});

test('rate limits enforce per-IP increments, concurrent session caps, and ownership', async () => {
  const env = analyticsEnv();
  const attempts = await Promise.all(Array.from({ length: 8 }, () => worker.fetch(request('/api/total/increment'), env)));
  assert.equal(attempts.filter(response => response.status === 200).length, 3);
  assert.equal(attempts.filter(response => response.status === 429).length, 5);
  assert.ok(attempts.find(response => response.status === 429).headers.get('Retry-After'));
  for (let index = 0; index < 5; index++) {
    assert.equal((await worker.fetch(request(`/api/viewers/heartbeat?session=viewer-session-00${index}`), env)).status, 200);
  }
  assert.equal((await worker.fetch(request('/api/viewers/heartbeat?session=viewer-session-006'), env)).status, 429);
  assert.equal((await worker.fetch(request('/api/viewers/heartbeat?session=viewer-session-000'), env)).status, 200);
  await worker.fetch(request('/api/viewers/disconnect?session=viewer-session-000', 'POST', { 'CF-Connecting-IP': '192.0.2.2' }), env);
  assert.equal((await (await worker.fetch(request('/api/viewers', 'GET'), env)).json()).count, 5);
  await worker.fetch(request('/api/viewers/disconnect?session=viewer-session-000'), env);
  assert.equal((await (await worker.fetch(request('/api/viewers', 'GET'), env)).json()).count, 4);
});

test('limiter caps reads and clears expired state without deleting fresh windows', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: 100000 });
  const storage = memoryStorage();
  const limiter = new SessionTracker({ storage });
  const check = () => limiter.fetch(new Request('https://internal/check', { method: 'POST', body: JSON.stringify({ action: '/api/total' }) }));
  for (let i = 0; i < 120; i++) assert.equal((await check()).status, 204);
  assert.equal((await check()).status, 429);
  t.mock.timers.tick(60000);
  assert.equal((await check()).status, 204);
  await limiter.alarm();
  assert.equal(storage.values.get('rate').requests, 1);
  t.mock.timers.tick(60000);
  await limiter.alarm();
  assert.equal(storage.values.size, 0);
  assert.equal(storage.alarmTime, null);
});

test('build output and Pages routing exclude repository, secrets, and tooling files', async () => {
  const files = readdirSync('dist', { recursive: true, withFileTypes: true });
  for (const item of files.filter(item => item.isFile())) {
    const relative = `${item.parentPath}/${item.name}`.replace(/^dist\//, '');
    if (['_worker.js', 'wrangler.toml', '_headers'].includes(relative)) continue;
    assert.equal(isPublicFile(relative), true, relative);
  }
  for (const path of ['/server.js', '/utils/cloudflare.js', '/package.json', '/wrangler.toml', '/.env.production', '/.git/config', '/assets/secret.key', '/assets/%2eenv']) {
    const response = await worker.fetch(new Request('https://site.example' + path), { ASSETS: { fetch() { throw new Error('Private path reached assets'); } } });
    assert.equal(response.status, 404, path);
  }
  assert.equal(isPublicFile('/blog/posts/portfolio.md'), true);
  assert.equal(isPublicFile('/vendor/purify.min.js'), true);
  const ignored = execFileSync('git', ['check-ignore', '--no-index', '--stdin'], {
    input: '.env.production\n.env.staging\n.dev.vars\nprivate.pem\nprivate.key\ncredentials.json\n', encoding: 'utf8',
  }).trim().split('\n');
  assert.equal(ignored.length, 6);
});

test('Express source and build preview refuse private files and serve public assets', async t => {
  const previousMode = process.env.SERVE_BUILD;
  try {
    for (const mode of ['0', '1']) {
      process.env.SERVE_BUILD = mode;
      const { app } = await import(`../server.js?security-mode=${mode}`);
      const server = app.listen(0, '127.0.0.1');
      await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
      t.after(() => new Promise(resolve => server.close(resolve)));
      const origin = `http://127.0.0.1:${server.address().port}`;
      for (const path of ['/server.js', '/utils/cloudflare.js', '/package.json', '/.env', '/.env.production', '/.git/config', '/dist/wrangler.toml', '/_worker.js', '/wrangler.toml']) {
        assert.equal((await fetch(origin + path)).status, 404, `${mode}: ${path}`);
      }
      for (const path of ['/', '/photography', '/script.js', '/vendor/purify.min.js', '/blog/posts/portfolio.md']) {
        const response = await fetch(origin + path);
        assert.equal(response.status, 200, `${mode}: ${path}`);
        assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
      }
    }
  } finally {
    if (previousMode === undefined) delete process.env.SERVE_BUILD;
    else process.env.SERVE_BUILD = previousMode;
  }
});

const client = readFileSync('script.js', 'utf8');
function fn(name, next, async = false) {
  const start = client.indexOf(`    ${async ? 'async ' : ''}function ${name}(`);
  return client.slice(start, client.indexOf(`    ${next}`, start + 1));
}
function blogContext() {
  const dom = new JSDOM('<div id="cards"></div><div id="modal"><div id="content"></div></div>', { url: 'https://site.example' });
  const { window } = dom;
  window.DOMPurify = createDOMPurify(window);
  window.marked = marked;
  const context = vm.createContext({
    window, document: window.document, history: window.history, console,
    blogCardsContainer: window.document.getElementById('cards'),
    blogModal: window.document.getElementById('modal'),
    modalBlogTitle: window.document.createElement('h1'), modalBlogDate: window.document.createElement('span'),
    modalBlogContent: window.document.getElementById('content'), modalBlogFilename: null,
    blogModalCloseBtn: null, cachedBlogPosts: [], showAccessibleModal() {}, setLoadState() {},
    fetch: async () => ({ ok: true, text: async () => '# Title\n\n<img src=x onerror="alert(1)"><script>alert(1)</script><a href="javascript:alert(1)">bad</a>\n\n**safe**' }),
  });
  vm.runInContext(fn('escapeHtml', 'function renderBlogCards(') + fn('renderBlogCards', 'async function loadBlogPosts(') + fn('openBlogModal', 'function closeBlogModal(', true), context);
  return { context, window };
}

test('blog HTML is sanitized, manifest text is escaped, and invalid paths are rejected', async () => {
  const { context, window } = blogContext();
  context.renderBlogCards([{ id: 'test', title: '<img src=x onerror=alert(1)>', summary: '<script>alert(1)</script>', date: '', readTime: '' }, { id: '../secret', title: 'invalid' }]);
  assert.equal(context.blogCardsContainer.querySelectorAll('.retro-card').length, 1);
  assert.equal(context.blogCardsContainer.querySelector('img,script'), null);
  assert.match(context.blogCardsContainer.textContent, /<img/);
  await context.openBlogModal('test', false);
  assert.equal(context.modalBlogContent.querySelector('script,[onerror],[href^="javascript:"]'), null);
  assert.equal(context.modalBlogContent.querySelector('strong').textContent, 'safe');
  window.DOMPurify = undefined;
  await context.openBlogModal('test', false);
  assert.equal(context.modalBlogContent.children.length, 0);
  assert.match(context.modalBlogContent.textContent, /onerror/);
  context.fetch = () => { throw new Error('Invalid slug fetched'); };
  await context.openBlogModal('../secrets', false);
  window.close();
});
