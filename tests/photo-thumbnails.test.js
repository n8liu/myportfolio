import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import worker from '../dist/_worker.js';

const manifest = JSON.parse(readFileSync(new URL('../functions/photo-thumbnails.json', import.meta.url)));
const source = readFileSync(new URL('../script.js', import.meta.url), 'utf8');

test('generated preview manifest points to real public WebP files in source and build', () => {
    assert.ok(Object.keys(manifest).length > 0);
    for (const photo of Object.values(manifest)) {
        for (const candidate of photo.thumbnailSrcset.split(', ')) {
            const [url, width] = candidate.split(' ');
            assert.match(width, /^(480|960)w$/);
            for (const prefix of ['..', '../dist']) {
                const file = new URL(`${prefix}${url}`, import.meta.url);
                assert.ok(statSync(file).size > 0);
                const bytes = readFileSync(file);
                assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
            }
        }
    }
});

test('R2 API adds previews for exact keys and preserves originals and unknown photo support', async () => {
    const key = Object.keys(manifest)[0];
    const response = await worker.fetch(new Request('https://site.example/api/images/all'), {
        MY_BUCKET: { async list() { return { objects: [{ key, size: 5000000 }, { key: 'New/photo.jpg', size: 4000000 }], truncated: false }; } }
    });
    const [known, unknown] = await response.json();
    assert.equal(known.thumbnailUrl, manifest[key].thumbnailUrl);
    assert.equal(known.thumbnailSrcset, manifest[key].thumbnailSrcset);
    assert.equal(known.url, '/img/' + key.split('/').map(encodeURIComponent).join('/'));
    assert.equal(unknown.thumbnailUrl, undefined);
    assert.equal(unknown.url, '/img/New/photo.jpg');
});

test('gallery selects responsive previews, opens original photo data, and falls back on preview failure', () => {
    const dom = new JSDOM('<div id="grid"></div>');
    const grid = dom.window.document.getElementById('grid');
    const photo = { name: 'Example', url: '/img/original.jpg', ...Object.values(manifest)[0] };
    let opened;
    const code = source.slice(source.indexOf('    function appendPhotoBatch('), source.indexOf('    function updateInfiniteStatus('));
    const context = vm.createContext({ document: dom.window.document, photoGrid: grid,
        isAppendingBatch: false, renderedPhotoCount: 0, galleryPhotos: [photo], PHOTOS_PER_BATCH: 12,
        updateInfiniteStatus() {}, openPhotoModal(value) { opened = value; } });
    try {
        vm.runInContext(code, context);
        context.appendPhotoBatch();
        const image = grid.querySelector('img');
        assert.equal(image.getAttribute('src'), photo.thumbnailUrl);
        assert.equal(image.srcset, photo.thumbnailSrcset);
        assert.equal(image.decoding, 'async');
        grid.querySelector('button').click();
        assert.equal(opened.url, '/img/original.jpg');
        image.dispatchEvent(new dom.window.Event('error'));
        assert.equal(image.getAttribute('src'), photo.url);
        assert.equal(image.hasAttribute('srcset'), false);
    } finally { dom.window.close(); }
});

test('versioned thumbnails override no-store asset headers, but missing previews are not cached', async () => {
    const path = Object.values(manifest)[0].thumbnailUrl;
    for (const status of [200, 404]) {
        const response = await worker.fetch(new Request('https://site.example' + path), {
            ASSETS: { async fetch() { return new Response('preview', { status, headers: {
                'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache', Expires: '0'
            } }); } }
        });
        assert.equal(response.status, status);
        assert.equal(response.headers.get('Cache-Control'), status === 200
            ? 'public, max-age=31536000, immutable' : 'no-cache, no-store');
        if (status === 200) assert.equal(response.headers.has('Pragma'), false);
    }
});
