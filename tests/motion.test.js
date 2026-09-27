import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const client = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const navigation = client.slice(client.indexOf('    function navigateTo('),
    client.indexOf('    function performNavigation('));

function createNavigation({ supported = true, reduced = false } = {}) {
    const calls = [];
    const transitions = [];
    let activeView = 'view-portfolio';
    const document = { querySelector: () => ({ id: activeView }) };
    if (supported) {
        document.startViewTransition = update => {
            const transition = {
                ready: Promise.resolve(),
                finished: Promise.resolve(),
                skipped: false,
                skipTransition() { this.skipped = true; },
                update,
            };
            transitions.push(transition);
            return transition;
        };
    }
    const context = vm.createContext({
        document, console,
        reducedMotion: { matches: reduced },
        separatePages: ['photography', 'blog', 'stats'],
        performNavigation(target, updateHistory) {
            calls.push({ target, updateHistory });
            activeView = ['photography', 'blog', 'stats'].includes(target)
                ? `view-${target}` : 'view-portfolio';
        },
    });
    vm.runInContext(`let pageTransition = null;
        let navigationVersion = 0;
        let navigationInitialized = false;
        ${navigation}`, context);
    return { navigate: context.navigateTo, calls, transitions };
}

test('initial and in-page navigation remain immediate; separate views transition', () => {
    const app = createNavigation();
    app.navigate('home', false);
    app.navigate('projects');
    assert.equal(app.transitions.length, 0);
    app.navigate('photography');
    assert.equal(app.transitions.length, 1);
    assert.equal(app.calls.length, 2);
    app.transitions[0].update();
    assert.deepEqual(app.calls.at(-1), { target: 'photography', updateHistory: true });
});

test('rapid navigation discards stale snapshot callbacks and preserves history intent', () => {
    const app = createNavigation();
    app.navigate('home', false);
    app.navigate('photography');
    app.navigate('blog', false);
    assert.equal(app.transitions[0].skipped, true);
    app.transitions[0].update();
    app.transitions[1].update();
    assert.deepEqual(app.calls.map(call => call.target), ['home', 'blog']);
    assert.equal(app.calls.at(-1).updateHistory, false);
});

test('reduced motion and unsupported browsers navigate without snapshots', () => {
    for (const options of [{ reduced: true }, { supported: false }]) {
        const app = createNavigation(options);
        app.navigate('home', false);
        app.navigate('stats');
        assert.equal(app.transitions.length, 0);
        assert.equal(app.calls.at(-1).target, 'stats');
    }
});
