import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const scrollspy = source.slice(source.indexOf('    function setupScrollspy()'),
    source.indexOf('    // Check URL path on page load'));

function createScrollspy() {
    const listeners = {};
    const frames = [];
    const selected = [];
    const paths = [];
    const state = { active: true };
    const scrollContainer = {
        scrollHeight: 2200, clientHeight: 800, scrollTop: 1400,
        getBoundingClientRect: () => ({ top: 0 }),
        addEventListener: (name, callback) => { listeners[name] = callback; },
    };
    const panels = [['home', 0], ['education', 500], ['experience', 900], ['projects', 1300], ['skills', 1900]]
        .map(([name, top]) => ({ id: `panel-${name}`,
            getBoundingClientRect: () => ({ top: top - scrollContainer.scrollTop }) }));
    const context = vm.createContext({
        scrollContainer, isProgrammaticScroll: false,
        document: {
            querySelectorAll: () => panels,
            getElementById: () => ({ classList: { contains: () => state.active } }),
        },
        window: { location: { pathname: '/projects' }, addEventListener() {} },
        history: { replaceState: (_state, _title, path) => paths.push(path) },
        updateActiveNav: name => selected.push(name),
        requestAnimationFrame: callback => frames.push(callback),
    });
    vm.runInContext(`${scrollspy}\nsetupScrollspy();`, context);
    return { context, scrollContainer, state, selected, paths,
        flush: () => { while (frames.length) frames.shift()(); },
        scroll: () => listeners.scroll(), frames };
}

test('bottom selects skills even when its heading cannot reach the reading line', () => {
    const app = createScrollspy();
    app.flush();
    assert.equal(app.selected.at(-1), 'skills');
    assert.equal(app.paths.at(-1), '/skills');
    app.scrollContainer.scrollTop = 1398.5;
    app.scroll(); app.flush();
    assert.equal(app.selected.at(-1), 'skills');
});

test('scrolling back up restores the preceding section and coalesces events', () => {
    const app = createScrollspy();
    app.flush();
    app.scrollContainer.scrollTop = 1200;
    app.scroll(); app.scroll();
    assert.equal(app.frames.length, 1);
    app.flush();
    assert.equal(app.selected.at(-1), 'projects');
});

test('separate views and programmatic scrolling do not override navigation', () => {
    const app = createScrollspy();
    app.state.active = false;
    app.flush();
    assert.equal(app.selected.length, 0);
    app.state.active = true;
    app.context.isProgrammaticScroll = true;
    app.scroll(); app.flush();
    assert.equal(app.selected.length, 0);
});

test('a portfolio that fits the viewport starts at home', () => {
    const app = createScrollspy();
    app.scrollContainer.scrollTop = 0;
    app.scrollContainer.scrollHeight = 800;
    app.flush();
    assert.equal(app.selected.at(-1), 'home');
});
