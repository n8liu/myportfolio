import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import { unstable_readConfig } from 'wrangler';
import worker from '../dist/_worker.js';

const origin = 'https://portfolio.example';
const key = 'Japan/Tokyo #1 100%.jpg';
const env = {
  MY_BUCKET: {
    async list(options = {}) {
      assert.ok(!options.prefix || options.prefix === 'Japan/');
      return { objects: [{ key, size: 5 }], truncated: false };
    },
    async get(requestedKey) {
      assert.equal(requestedKey, key);
      return { body: 'photo', size: 5 };
    },
  },
};

test('built Pages worker lists categories and serves the exact R2 key', async () => {
  const categories = await worker.fetch(new Request(`${origin}/api/categories`), env);
  assert.deepEqual(await categories.json(), [{ name: 'Japan', displayName: 'JAPAN' }]);
  const response = await worker.fetch(new Request(`${origin}/api/images/Japan`), env);
  assert.equal(response.status, 200);
  const [photo] = await response.json();
  assert.equal(photo.url, '/img/Japan/Tokyo%20%231%20100%25.jpg');

  const previousCaches = globalThis.caches;
  const pending = [];
  globalThis.caches = { default: {
    async match() { return undefined; },
    async put(request, cached) {
      assert.equal(request.url, origin + photo.url);
      assert.equal(await cached.text(), 'photo');
    },
  } };
  try {
    const image = await worker.fetch(new Request(origin + photo.url), env,
      { waitUntil(promise) { pending.push(promise); } });
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('Content-Type'), 'image/jpeg');
    assert.equal(await image.text(), 'photo');
    await Promise.all(pending);
  } finally {
    globalThis.caches = previousCaches;
  }
});

// Exercise the actual built gallery loader with browser dependencies stubbed.
const client = readFileSync(new URL('../dist/script.js', import.meta.url), 'utf8');
const galleryLoader = client.slice(client.indexOf('    async function loadPhotosByCategory('),
  client.indexOf('    function renderPhotos('));

test('gallery uses the Pages origin even when analytics points at a separate Worker', async () => {
  let rendered;
  const context = vm.createContext({
    API_BASE: 'https://analytics.example',
    photoGrid: {}, console,
    async fetch(url) {
      assert.equal(url, '/api/images/Japan');
      return worker.fetch(new Request(origin + url), env);
    },
    renderPhotos(images) { rendered = images; },
  });
  await vm.runInContext(galleryLoader + '\nloadPhotosByCategory("Japan")', context);
  assert.equal(rendered[0].key, key);
});

test('gallery displays an unavailable message when R2 is unavailable', async () => {
  const photoGrid = {};
  const context = vm.createContext({
    photoGrid, console: { warn() {} },
    async fetch(url) { return worker.fetch(new Request(origin + url), {}); },
    renderPhotos() { assert.fail('Failed API response must not render'); },
  });
  await vm.runInContext(galleryLoader + '\nloadPhotosByCategory("all")', context);
  assert.match(photoGrid.innerHTML, /photos unavailable/);
  assert.doesNotMatch(photoGrid.innerHTML, /<img/);
});

test('generated Pages config binds R2 and existing Worker Durable Objects', () => {
  const config = unstable_readConfig({ config: path.resolve('dist/wrangler.toml') });
  assert.equal(config.pages_build_output_dir, path.resolve('dist'));
  assert.equal(config.main, undefined);
  assert.equal(config.r2_buckets[0].binding, 'MY_BUCKET');
  assert.equal(config.r2_buckets[0].bucket_name, 'myportfolio');
  assert.deepEqual(config.migrations, []);
  assert.equal(config.durable_objects.bindings.length, 5);
  for (const binding of config.durable_objects.bindings) {
    assert.equal(binding.script_name, 'myportfolio');
  }
});
