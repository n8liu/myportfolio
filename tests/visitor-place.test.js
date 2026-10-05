import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { JSDOM } from 'jsdom';

const source = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const helpers = source.slice(source.indexOf('    // History entries own'), source.indexOf('    function updateActiveNav('));
const navigation = source.slice(source.indexOf('    function performNavigation('), source.indexOf('    // Keep switchTab'));
function app() {
    const dom = new JSDOM(`<div class="window-body"><div class="page-view active" id="view-portfolio"><div id="panel-projects"></div><details class="projects-archive"></details></div><div class="page-view" id="view-photography"></div><div class="page-view" id="view-blog"></div></div><div id="portfolio-photo-grid"></div>`, { url: 'https://portfolio.example/projects' });
    const { window } = dom;
    const container = window.document.querySelector('.window-body');
    container.scrollTo = ({ top }) => { container.scrollTop = top; };
    const context = vm.createContext({
        window, document: window.document, history: window.history, scrollContainer: container,
        setTimeout: () => 1, clearTimeout() {},
        selectedPhotoCategory: 'Japan', renderedPhotoCount: 36, galleryPhotos: Array(60).fill({}),
        galleryLoaded: true, photographyInitialized: true, isProgrammaticScroll: false, scrollTimeout: null,
        photoGrid: window.document.getElementById('portfolio-photo-grid'),
        separatePages: ['photography', 'blog', 'stats'], reducedMotion: { matches: true },
        updateActiveNav() {},
        showPageView(name) {
            window.document.querySelectorAll('.page-view').forEach(el => el.classList.toggle('active', el.id === `view-${name}`));
        },
        appendPhotoBatch() { context.renderedPhotoCount += 12; },
        loadPhotosByCategory(category) { context.selectedPhotoCategory = category; context.galleryPhotos = []; context.galleryLoaded = false; },
    });
    vm.runInContext(helpers + navigation, context);
    return { context, window, container, close: () => window.close() };
}

test('Back restores an exact portfolio position and expanded archive; explicit links still jump', () => {
    const a = app();
    try {
        a.container.scrollTop = 1234;
        a.window.document.querySelector('details').open = true;
        a.context.saveVisitorPlace();
        const saved = structuredClone(a.window.history.state.place);
        a.context.performNavigation('photography');
        a.window.history.replaceState({ page: 'projects', place: saved }, '', '/projects');
        a.context.performNavigation('projects', false, saved);
        assert.equal(a.container.scrollTop, 1234);
        assert.equal(a.window.document.querySelector('details').open, true);
        a.context.performNavigation('projects', true);
        assert.equal(a.container.scrollTop, 0);
    } finally { a.close(); }
});

test('returning to Photos retains category, loaded batches, and scroll offset', () => {
    const a = app();
    try {
        a.context.performNavigation('photography');
        a.container.scrollTop = 900;
        a.context.saveVisitorPlace();
        a.context.performNavigation('projects');
        a.context.performNavigation('photography');
        assert.equal(a.container.scrollTop, 900);
        assert.equal(a.context.selectedPhotoCategory, 'Japan');
        assert.equal(a.context.renderedPhotoCount, 36);
    } finally { a.close(); }
});

test('history restoration waits for category data and appends enough batches before scrolling', () => {
    const a = app();
    try {
        a.context.performNavigation('photography');
        const saved = { view: 'photography', top: 1400, category: 'Austria', count: 48 };
        a.context.restoreVisitorPlace(saved);
        assert.equal(a.context.selectedPhotoCategory, 'Austria');
        assert.equal(a.container.scrollTop, 0);
        a.context.galleryPhotos = Array(60).fill({});
        a.context.galleryLoaded = true;
        a.context.renderedPhotoCount = 12;
        a.context.restoreVisitorPlace(saved);
        assert.equal(a.context.renderedPhotoCount, 48);
        assert.equal(a.container.scrollTop, 1400);
    } finally { a.close(); }
});

test('leaving while photos load cancels their pending restoration', () => {
    const a = app();
    try {
        a.context.performNavigation('photography');
        a.context.restoreVisitorPlace({ view: 'photography', top: 900, category: 'Austria', count: 36 });
        a.context.performNavigation('projects');
        assert.equal(vm.runInContext('pendingPlace', a.context), null);
        assert.equal(a.container.scrollTop, 0);
        assert.equal(a.window.history.state.place.view, 'portfolio');
    } finally { a.close(); }
});

test('complete client initialization restores a reloaded gallery after asynchronous category discovery', async () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const dom = new JSDOM(html, { url: 'https://portfolio.example/photos', runScripts: 'outside-only', pretendToBeVisual: true });
    const { window } = dom;
    const errors = [];
    window.addEventListener('error', event => errors.push(event.error));
    window.matchMedia = () => ({ matches: true, addEventListener() {} });
    window.HTMLElement.prototype.scrollTo = function ({ top = 0, left = 0 }) { this.scrollTop = top; this.scrollLeft = left; };
    const requests = [];
    window.fetch = async url => {
        requests.push(url);
        await new Promise(resolve => setTimeout(resolve, 5));
        if (url === '/api/categories') return { ok: true, json: async () => [{ name: 'Japan' }, { name: 'Austria' }] };
        if (url === '/api/images/Japan') return { ok: true, json: async () => Array.from({ length: 60 }, (_, i) => ({ name: `Photo ${i}`, url: `/img/Japan/${i}.jpg` })) };
        if (url === '/blog/posts.json') return { ok: true, json: async () => [] };
        throw new Error(`Unexpected request ${url}`);
    };
    window.history.replaceState({ page: 'photography', place: { view: 'photography', top: 1350, category: 'Japan', count: 48 } }, '');
    try {
        window.eval(source);
        await new Promise(resolve => setTimeout(resolve, 80));
        assert.deepEqual(errors, []);
        assert.ok(requests.includes('/api/images/Japan'));
        assert.ok(!requests.includes('/api/images/all'));
        assert.equal(window.document.querySelectorAll('.photo-card').length, 48);
        assert.equal(window.document.querySelector('.photo-cat.active').dataset.category, 'Japan');
        assert.equal(window.document.querySelector('.window-body').scrollTop, 1350);
        window.document.querySelector('[data-tab="projects"]').click();
        assert.equal(window.document.querySelector('.page-view.active').id, 'view-portfolio');
        window.document.querySelector('[data-tab="photography"]').click();
        assert.equal(window.document.querySelector('.window-body').scrollTop, 1350);
        assert.equal(window.document.querySelectorAll('.photo-card').length, 48);
        const back = async () => {
            const changed = new Promise(resolve => window.addEventListener('popstate', resolve, { once: true }));
            window.history.back();
            await changed;
        };
        await back();
        assert.equal(window.document.querySelector('.page-view.active').id, 'view-portfolio');
        await back();
        assert.equal(window.document.querySelector('.page-view.active').id, 'view-photography');
        assert.equal(window.document.querySelector('.window-body').scrollTop, 1350);
        assert.deepEqual(errors, []);
    } finally { window.close(); }
});
