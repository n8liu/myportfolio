import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import { unstable_readConfig } from 'wrangler';
import worker from '../dist/_worker.js';
import * as workerExports from '../dist/_worker.js';

const origin = 'https://portfolio.example';
test('photos route serves the gallery shell and legacy links redirect with query parameters', async () => {
  const assets = { async fetch(request) {
    assert.equal(new URL(request.url).pathname, '/index.html');
    return new Response('gallery shell');
  } };
  const response = await worker.fetch(new Request(`${origin}/photos`), { ASSETS: assets });
  assert.equal(await response.text(), 'gallery shell');
  for (const path of ['/photography', '/photography/']) {
    const redirect = await worker.fetch(new Request(`${origin}${path}?ref=old`), {});
    assert.equal(redirect.status, 301);
    assert.equal(redirect.headers.get('Location'), `${origin}/photos?ref=old`);
  }
});

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

test('gallery and categories follow every R2 listing cursor', async () => {
  for (const route of ['images/all', 'images/Japan', 'categories']) {
    const calls = [];
    const pagedEnv = { MY_BUCKET: { async list(options = {}) {
      calls.push(options);
      const page = options.cursor ? Number(options.cursor) : 0;
      return {
        objects: Array.from({ length: 12 }, (_, i) => ({
          key: `${route === 'images/Japan' ? 'Japan' : `Category${page}`}/${page * 12 + i}.jpg`,
          size: 5,
        })),
        truncated: page < 2,
        cursor: page < 2 ? String(page + 1) : undefined,
      };
    } } };
    const response = await worker.fetch(new Request(`${origin}/api/${route}`), pagedEnv);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.length, route === 'categories' ? 3 : 36);
    assert.deepEqual(calls.map(call => call.cursor), [undefined, '1', '2']);
    assert.ok(calls.every(call => call.prefix === (route === 'images/Japan' ? 'Japan/' : undefined)));
  }
});

test('location filters use the newest upload across listing pages, with undated locations last', async () => {
  const pages = [
    [
      { key: 'Japan/old.jpg', uploaded: new Date('2020-01-01') },
      { key: 'England/photo.jpg', uploaded: new Date('2025-01-01') },
      { key: 'Empty/', uploaded: new Date('2026-09-01') },
      { key: 'Unknown/photo.jpg' },
    ],
    [
      { key: 'Japan/new.jpg', uploaded: new Date('2026-01-01') },
      { key: 'Canada/photo.jpg', uploaded: new Date('2025-01-01') },
      { key: 'Invalid/photo.jpg', uploaded: 'invalid' },
      { key: 'root.jpg', uploaded: new Date('2026-09-01') },
    ],
  ];
  const response = await worker.fetch(new Request(`${origin}/api/categories`), {
    MY_BUCKET: { async list({ cursor } = {}) {
      return { objects: pages[cursor ? 1 : 0], truncated: !cursor, cursor: cursor ? undefined : 'next' };
    } },
  });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).map(category => category.name),
    ['Japan', 'Canada', 'England', 'Invalid', 'Unknown']);
});

test('local storage listing follows continuation tokens for images and categories', async () => {
  const source = readFileSync(new URL('../utils/cloudflare.js', import.meta.url), 'utf8');
  const start = source.indexOf('async function listAllObjects(');
  const end = source.indexOf('\nasync function getCategories(', start);
  const calls = [];
  const context = vm.createContext({
    ListObjectsV2Command: class { constructor(input) { this.input = input; } },
    s3: { async send({ input }) {
      calls.push(input);
      return input.ContinuationToken
        ? { Contents: [{ Key: 'Japan/second.jpg' }], CommonPrefixes: [{ Prefix: 'Japan/' }], IsTruncated: false }
        : { Contents: [{ Key: 'England/first.jpg' }], CommonPrefixes: [{ Prefix: 'England/' }], IsTruncated: true, NextContinuationToken: 'next' };
    } },
  });
  vm.runInContext(source.slice(start, end), context);
  const result = await context.listAllObjects({ Bucket: 'photos', Prefix: 'test/' });
  assert.equal(result.Contents.length, 2);
  assert.equal(result.CommonPrefixes.length, 2);
  assert.equal(calls[1].ContinuationToken, 'next');
  assert.equal(calls[1].Bucket, 'photos');
  assert.equal(calls[1].Prefix, 'test/');
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

test('Worker preserves deployed v6 migration and exports retired namespaces without deleting data', async () => {
  const config = unstable_readConfig({ config: path.resolve('wrangler.toml') });
  assert.equal(config.migrations.at(-1).tag, 'v6');
  const retired = ['InstagramCounter', 'GitHubCounter', 'EmailCounter', 'LinkedInCounter'];
  assert.deepEqual(config.migrations.at(-1).new_sqlite_classes, retired);
  for (const migration of config.migrations) {
    assert.ok(!migration.deleted_classes?.length);
    for (const name of migration.new_sqlite_classes || []) {
      assert.equal(typeof workerExports[name], 'function');
    }
  }
  for (const name of retired) {
    const counter = new workerExports[name]();
    assert.equal((await counter.fetch(new Request('https://counter.example/count'))).status, 410);
  }
});
