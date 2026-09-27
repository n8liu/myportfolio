import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../script.js', import.meta.url), 'utf8');

function extractFn(name, endPattern) {
    const start = source.indexOf(`    function ${name}(`);
    if (start === -1) throw new Error(`Could not find function ${name}`);
    const end = endPattern ? source.indexOf(endPattern, start) : source.indexOf('\n    function ', start + 10);
    return source.slice(start, end);
}

class FakeElement {
    constructor(tagName = 'div') {
        this.tagName = tagName.toUpperCase();
        this.children = [];
        this.attributes = {};
        this._classes = new Set();
        this.classList = {
            add: c => this._classes.add(c),
            remove: c => this._classes.delete(c),
            contains: c => this._classes.has(c),
        };
        this.textContent = '';
        this.tabIndex = 0;
        this.inert = false;
        this.hidden = false;
        this.listeners = {};
        this.offsetLeft = 0;
        this.offsetWidth = 0;
        this.scrollLeft = 0;
        this.clientWidth = 0;
        this.scrollWidth = 0;
        this.scrollToCalls = [];
    }

    get innerHTML() {
        return this.textContent;
    }
    set innerHTML(val) {
        if (!val) {
            this.children = [];
            this.textContent = '';
        } else {
            this.textContent = val;
        }
    }

    setAttribute(k, v) { this.attributes[k] = String(v); }
    getAttribute(k) { return this.attributes[k]; }
    replaceChildren(...nodes) { this.children = [...nodes]; this.textContent = ''; }
    appendChild(node) { this.children.push(node); }
    addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
    dispatch(name, event = {}) { (this.listeners[name] || []).forEach(fn => fn(event)); }
    focus() { this.focused = true; }
    contains(child) {
        if (!child) return false;
        if (child === this) return true;
        return this.children.some(c => c.contains && c.contains(child));
    }
    querySelector(sel) {
        return this.querySelectorAll(sel)[0] || null;
    }
    querySelectorAll(sel) {
        const results = [];
        for (const child of this.children) {
            if (sel.includes('button') && child.tagName === 'BUTTON') results.push(child);
            if (sel.includes('progress') && child.tagName === 'PROGRESS') results.push(child);
            if (sel.includes('.load-state') && child.className?.includes('load-state')) results.push(child);
            if (sel.includes('.photo-card') && child.className?.includes('photo-card')) results.push(child);
            if (child.querySelectorAll) results.push(...child.querySelectorAll(sel));
        }
        return results;
    }
    scrollTo(options) {
        this.scrollToCalls.push(options);
        if (options && typeof options.left === 'number') this.scrollLeft = options.left;
    }
}

test('setLoadState standardizes busy and retry states with progress and alert semantics', () => {
    const setLoadStateCode = extractFn('setLoadState');
    const container = new FakeElement('div');
    let retryCalled = false;

    const context = vm.createContext({
        document: {
            createElement: tag => new FakeElement(tag),
            activeElement: null,
        },
    });
    vm.runInContext(setLoadStateCode, context);

    // 1. Loading busy state
    context.setLoadState(container, 'loading photos...', null, true);
    assert.equal(container.getAttribute('aria-busy'), 'true');
    const loadStateEl = container.children[0];
    assert.equal(loadStateEl.className, 'load-state');
    const spinner = loadStateEl.querySelector('progress');
    assert.ok(spinner, 'Spinner element exists');
    assert.equal(spinner.className, 'loading-spinner');
    assert.equal(loadStateEl.children[1].getAttribute('role'), 'status');
    assert.equal(loadStateEl.children[1].textContent, 'loading photos...');

    // 2. Error state with retry callback
    context.setLoadState(container, 'photos unavailable.', () => { retryCalled = true; });
    assert.equal(container.getAttribute('aria-busy'), 'false');
    const errorStateEl = container.children[0];
    const alertText = errorStateEl.children[0];
    assert.equal(alertText.getAttribute('role'), 'alert');
    assert.equal(alertText.textContent, 'photos unavailable.');
    const retryBtn = errorStateEl.querySelector('button');
    assert.ok(retryBtn, 'Retry button exists');
    assert.equal(retryBtn.textContent, 'retry');
    retryBtn.dispatch('click', { preventDefault() {} });
    assert.equal(retryCalled, true);

    // 3. Clear state
    context.setLoadState(container);
    assert.equal(container.children.length, 0);
});

test('showAccessibleModal sets background inert, focuses target, and restores on hide', () => {
    const showModalCode = extractFn('showAccessibleModal');
    const hideModalCode = extractFn('hideAccessibleModal');
    const modal = new FakeElement('div');
    modal.classList = {
        add: name => modal.classList[name] = true,
        remove: name => delete modal.classList[name],
    };
    const closeBtn = new FakeElement('button');
    modal.children.push(closeBtn);

    const background1 = new FakeElement('main');
    const background2 = new FakeElement('header');
    const triggerBtn = new FakeElement('button');
    triggerBtn.isConnected = true;

    const documentMock = {
        activeElement: triggerBtn,
        body: { children: [background1, background2, modal] },
        querySelector: () => triggerBtn,
    };

    const context = vm.createContext({
        document: documentMock,
        activeModal: null,
        modalReturnFocus: null,
        inertBackground: new Map(),
    });

    vm.runInContext(`${showModalCode}\n${hideModalCode}`, context);

    // Open modal
    context.showAccessibleModal(modal, closeBtn);
    assert.equal(background1.inert, true);
    assert.equal(background2.inert, true);
    assert.equal(closeBtn.focused, true);
    assert.equal(modal.classList.active, true);

    // Close modal
    context.hideAccessibleModal(modal);
    assert.equal(background1.inert, false);
    assert.equal(background2.inert, false);
    assert.equal(triggerBtn.focused, true);
    assert.equal(modal.classList.active, undefined);
});

test('trapModalFocus cycles keyboard tab focus within modal interactive elements', () => {
    const trapCode = extractFn('trapModalFocus');
    const btn1 = new FakeElement('button');
    const btn2 = new FakeElement('button');
    const modal = new FakeElement('div');
    modal.children.push(btn1, btn2);

    const context = vm.createContext({
        document: { activeElement: btn2 },
    });
    vm.runInContext(trapCode, context);

    let defaultPrevented = false;
    // Tab on last element should wrap to first element
    context.trapModalFocus(modal, {
        key: 'Tab',
        shiftKey: false,
        preventDefault: () => { defaultPrevented = true; },
    });
    assert.equal(defaultPrevented, true);
    assert.equal(btn1.focused, true);

    // Shift+Tab on first element should wrap to last element
    defaultPrevented = false;
    context.document.activeElement = btn1;
    context.trapModalFocus(modal, {
        key: 'Tab',
        shiftKey: true,
        preventDefault: () => { defaultPrevented = true; },
    });
    assert.equal(defaultPrevented, true);
    assert.equal(btn2.focused, true);
});

test('keepActiveTabVisible centers active mobile tab when out of visible scroll area', () => {
    const keepVisibleCode = extractFn('keepActiveTabVisible');
    const headerNav = new FakeElement('nav');
    headerNav.scrollWidth = 800;
    headerNav.clientWidth = 350;
    headerNav.scrollLeft = 0;

    const activeTab = new FakeElement('a');
    activeTab.offsetLeft = 500;
    activeTab.offsetWidth = 80;

    headerNav.querySelector = sel => sel.includes('active') ? activeTab : null;

    const context = vm.createContext({
        headerNav,
        reducedMotion: { matches: false },
    });
    vm.runInContext(keepVisibleCode, context);

    context.keepActiveTabVisible(false);
    assert.equal(headerNav.scrollToCalls.length, 1);
    // targetLeft = tabLeft (500) - (navWidth (350) - tabWidth (80)) / 2 = 500 - 135 = 365
    assert.equal(headerNav.scrollToCalls[0].left, 365);
    assert.equal(headerNav.scrollToCalls[0].behavior, 'auto');
});

test('photography infinite scroll renders initial batch, prioritizes first two images, and updates status', () => {
    const appendBatchCode = extractFn('appendPhotoBatch');
    const updateStatusCode = extractFn('updateInfiniteStatus');
    const setupObserverCode = extractFn('setupInfiniteObserver');
    const renderPhotosCode = extractFn('renderPhotos', '\n    function setupInfiniteObserver(');

    const photoGrid = new FakeElement('div');
    const photoInfiniteContainer = new FakeElement('div');
    const photoSentinel = new FakeElement('div');
    const photoInfiniteStatus = new FakeElement('div');
    const photoLoadMoreBtn = new FakeElement('button');

    const testPhotos = Array.from({ length: 28 }, (_, i) => ({
        url: `photo_${i + 1}.jpg`,
        name: `Photo ${i + 1}`,
    }));

    let observedElement = null;
    class FakeIntersectionObserver {
        observe(el) { observedElement = el; }
        unobserve() {}
    }

    const context = vm.createContext({
        document: {
            createElement: tag => new FakeElement(tag),
            getElementById: () => null,
        },
        IntersectionObserver: FakeIntersectionObserver,
        PHOTOS_PER_BATCH: 12,
        photoGrid,
        photoInfiniteContainer,
        photoSentinel,
        photoInfiniteStatus,
        photoLoadMoreBtn,
        galleryPhotos: [],
        renderedPhotoCount: 0,
        isAppendingBatch: false,
        photoInfiniteObserver: null,
        openPhotoModal: () => {},
    });

    vm.runInContext(`${setupObserverCode}\n${updateStatusCode}\n${appendBatchCode}\n${renderPhotosCode}`, context);

    // Initial render
    context.renderPhotos(testPhotos);

    assert.equal(context.renderedPhotoCount, 12);
    assert.equal(photoGrid.children.length, 12);
    assert.equal(photoInfiniteContainer.hidden, false);
    assert.equal(photoInfiniteStatus.textContent, 'showing 12 of 28 photos');

    // First 2 images have fetchpriority="high" and no loading="lazy"
    const firstImg = photoGrid.children[0].children[0];
    const secondImg = photoGrid.children[1].children[0];
    const thirdImg = photoGrid.children[2].children[0];
    assert.equal(firstImg.getAttribute('fetchpriority'), 'high');
    assert.equal(firstImg.loading, undefined);
    assert.equal(secondImg.getAttribute('fetchpriority'), 'high');
    assert.equal(secondImg.loading, undefined);
    assert.equal(thirdImg.loading, 'lazy');
    assert.equal(thirdImg.getAttribute('fetchpriority'), undefined);
});

test('photography infinite scroll appends subsequent batches and detects completion', () => {
    const appendBatchCode = extractFn('appendPhotoBatch');
    const updateStatusCode = extractFn('updateInfiniteStatus');

    const photoGrid = new FakeElement('div');
    const photoInfiniteContainer = new FakeElement('div');
    const photoSentinel = new FakeElement('div');
    const photoInfiniteStatus = new FakeElement('div');
    const photoLoadMoreBtn = new FakeElement('button');

    const testPhotos = Array.from({ length: 28 }, (_, i) => ({
        url: `photo_${i + 1}.jpg`,
        name: `Photo ${i + 1}`,
    }));

    let unobserved = false;
    class FakeIntersectionObserver {
        observe() {}
        unobserve() { unobserved = true; }
    }

    const context = vm.createContext({
        document: {
            createElement: tag => new FakeElement(tag),
        },
        IntersectionObserver: FakeIntersectionObserver,
        PHOTOS_PER_BATCH: 12,
        photoGrid,
        photoInfiniteContainer,
        photoSentinel,
        photoInfiniteStatus,
        photoLoadMoreBtn,
        galleryPhotos: testPhotos,
        renderedPhotoCount: 12,
        isAppendingBatch: false,
        photoInfiniteObserver: new FakeIntersectionObserver(),
        openPhotoModal: () => {},
    });

    vm.runInContext(`${updateStatusCode}\n${appendBatchCode}`, context);

    // Append batch 2 (12 to 24)
    context.appendPhotoBatch();
    assert.equal(context.renderedPhotoCount, 24);
    assert.equal(photoGrid.children.length, 12);
    assert.equal(photoInfiniteStatus.textContent, 'showing 24 of 28 photos');

    // Append final batch (24 to 28)
    context.appendPhotoBatch();
    assert.equal(context.renderedPhotoCount, 28);
    assert.equal(photoGrid.children.length, 16);
    assert.equal(photoInfiniteStatus.textContent, 'all 28 photos loaded.');
    assert.equal(photoLoadMoreBtn.hidden, true);
    assert.equal(unobserved, true);

    // Further attempts do not append
    context.appendPhotoBatch();
    assert.equal(context.renderedPhotoCount, 28);
    assert.equal(photoGrid.children.length, 16);
});

test('closing photo modal dynamically loads missing batches and restores focus to active card', () => {
    const appendBatchCode = extractFn('appendPhotoBatch');
    const updateStatusCode = extractFn('updateInfiniteStatus');
    const closePhotoModalCode = extractFn('closePhotoModal');

    const photoGrid = new FakeElement('div');
    const photoInfiniteContainer = new FakeElement('div');
    const photoSentinel = new FakeElement('div');
    const photoInfiniteStatus = new FakeElement('div');
    const photoLoadMoreBtn = new FakeElement('button');
    const photoModal = new FakeElement('div');

    const testPhotos = Array.from({ length: 30 }, (_, i) => ({
        url: `photo_${i + 1}.jpg`,
        name: `Photo ${i + 1}`,
    }));

    let hiddenModal = null;
    const context = vm.createContext({
        document: {
            createElement: tag => new FakeElement(tag),
        },
        PHOTOS_PER_BATCH: 12,
        photoGrid,
        photoInfiniteContainer,
        photoSentinel,
        photoInfiniteStatus,
        photoLoadMoreBtn,
        photoModal,
        galleryPhotos: testPhotos,
        renderedPhotoCount: 0,
        isAppendingBatch: false,
        photoInfiniteObserver: null,
        activePhotoIndex: 18, // User stepped into photo 18 while modal open
        modalReturnFocus: null,
        hideAccessibleModal: m => { hiddenModal = m; },
        openPhotoModal: () => {},
    });

    vm.runInContext(`${updateStatusCode}\n${appendBatchCode}\n${closePhotoModalCode}`, context);

    // Simulate only first batch loaded in grid
    context.appendPhotoBatch();
    assert.equal(context.renderedPhotoCount, 12);
    assert.equal(photoGrid.children.length, 12);

    // Close modal should append second batch (reaching 24) so photo 18 exists
    context.closePhotoModal();

    assert.equal(hiddenModal, photoModal);
    assert.equal(context.renderedPhotoCount, 24);
    assert.equal(photoGrid.children.length, 24);
    assert.equal(context.modalReturnFocus, photoGrid.children[18]);
});
