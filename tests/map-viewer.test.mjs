import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const script = await readFile(new URL('../public/maps/night-city-2077/preview.js', import.meta.url), 'utf8');
const mime = 'application/x-magnus-session-entry';

// Exercise the actual viewer event handlers without a browser or network.
function viewer(tileIndex) {
  class Element extends EventTarget {
    constructor(tag = 'div') {
      super(); this.tag = tag; this.dataset = {}; this.style = {}; this.children = []; this.attrs = {};
      this.clientWidth = 800; this.clientHeight = 600; this.complete = true;
      const classes = new Set();
      this.classList = { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value), toggle: (value, force) => force ? classes.add(value) : classes.delete(value) };
    }
    append(child) { child.parent = this; this.children.push(child); }
    remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
    get firstElementChild() { return this.children[0]; }
    setAttribute(name, value) { this.attrs[name] = value; }
    closest(selector) { return selector.split(',').map(s => s.trim()).includes(this.tag) ? this : this.parent?.closest(selector) ?? null; }
    contains(other) { return other === this || this.children.some(child => child.contains(other)); }
    focus() { this.focused = true; }
    setPointerCapture() {}
    getBoundingClientRect() { return { left: 120, top: 30 }; }
  }
  const elements = new Map();
  for (const id of ['map', 'tiles', 'position', 'load-status', 'map-loader', 'map-loading-label', 'map-load-progress', 'zoom-in', 'zoom-out', 'map-markers', 'placement-banner', 'placement-instruction', 'cancel-placement', 'fit-map', 'map-hint']) elements.set(`#${id}`, new Element(['zoom-in', 'zoom-out', 'cancel-placement', 'fit-map'].includes(id) ? 'button' : 'div'));
  for (const selector of ['.theme-switch', '.map-controls', '.back-link', '.map-attribution a']) elements.set(selector, new Element());
  const themes = ['chrome', 'flesh'].map(theme => { const button = new Element('button'); button.dataset.themeButton = theme; return button; });
  const sent = [], frames = [];
  const origin = 'http://localhost:3000';
  const window = new EventTarget();
  window.parent = { postMessage: (message, target) => sent.push({ ...JSON.parse(JSON.stringify(message)), target }) };
  const context = vm.createContext({
    MAGNUS_MAP_TILES: tileIndex,
    document: { documentElement: new Element('html'), querySelector: selector => elements.get(selector), querySelectorAll: () => themes, createElement: tag => new Element(tag) },
    window, location: { origin, search: '?embed=1' }, URLSearchParams,
    ResizeObserver: class { observe() {} }, requestAnimationFrame: callback => frames.push(callback),
  });
  vm.runInContext(script, context);
  const flush = () => { while (frames.length) frames.shift()(); };
  const emit = (target, type, props = {}) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, props); target.dispatchEvent(event); flush(); return event;
  };
  const state = (overrides = {}, eventOverrides = {}) => emit(window, 'message', {
    origin, source: window.parent,
    data: { type: 'magnus:map-preferences', sessionId: 'session-a', enabled: true, pendingEntryId: null, entries: [{ id: 'entry-a', title: 'Pista <script>' }], theme: 'chrome', language: 'es', ...overrides },
    ...eventOverrides,
  });
  const dataTransfer = (payload, types = [mime]) => ({ types, getData: () => typeof payload === 'string' ? payload : JSON.stringify(payload), setData() {} });
  return { elements, context, sent, state, emit, dataTransfer, window, origin };
}

test('log drops use the current geographic point and reject stale, foreign or malformed payloads', () => {
  const v = viewer(), map = v.elements.get('#map');
  v.state();
  const drop = payload => v.emit(map, 'drop', { clientX: 520, clientY: 330, dataTransfer: v.dataTransfer(payload) });
  assert.equal(v.emit(map, 'dragover', { dataTransfer: v.dataTransfer({}) }).defaultPrevented, true);
  assert.equal(drop({ sessionId: 'session-a', entryId: 'entry-a' }).defaultPrevented, true);
  assert.deepEqual(v.sent[0], { type: 'magnus:map-place-entry', sessionId: 'session-a', entryId: 'entry-a', location: { latitude: 0, longitude: 0 }, target: v.origin });
  v.emit(map, 'keydown', { key: 'ArrowRight' });
  drop({ sessionId: 'session-a', entryId: 'entry-a' });
  assert.ok(v.sent[1].location.longitude > 0, 'panning changes the dropped geographic point');
  for (const payload of [{ sessionId: 'session-b', entryId: 'entry-a' }, { sessionId: 'session-a', entryId: 'removed' }, '{broken', null]) drop(payload);
  assert.equal(v.sent.length, 2);
  v.state({ enabled: false });
  drop({ sessionId: 'session-a', entryId: 'entry-a' });
  assert.equal(v.sent.length, 2);
});

test('the published viewer resolves repeated images through the packed index and preserves local XYZ fallback', () => {
  const v = viewer({ paths: ['11/1023/1023'], levels: { 14: { xMin: 8187, yMin: 8187, width: 10, height: 10, tiles: Array(100).fill(0) } } });
  const tiles = v.elements.get('#tiles').children;
  assert.ok(tiles.length > 1);
  assert.ok(tiles.every(tile => tile.src === './reading/11/1023/1023.png'));
  v.emit(v.elements.get('#map'), 'keydown', { key: '+' });
  assert.ok(v.elements.get('#tiles').children.every(tile => /^\.\/reading\/15\/\d+\/\d+\.png$/.test(tile.src)));
  assert.equal(v.elements.get('#map-loader').hidden, false);
});

test('markers track live entries and map projection, emit edits and disappear on deletion or session switch', () => {
  const v = viewer(), layer = v.elements.get('#map-markers');
  const entry = { id: 'entry-a', title: '<img onerror=alert(1)>', map: { latitude: 0, longitude: 0 } };
  v.state({ entries: [entry] });
  const marker = layer.firstElementChild;
  assert.equal(marker.firstElementChild.textContent, entry.title, 'user content is text, never HTML');
  assert.equal(marker.style.left, '400px');
  assert.equal(marker.style.top, '300px');
  v.emit(marker, 'click');
  assert.equal(v.sent[0].type, 'magnus:map-edit-entry');
  v.emit(v.elements.get('#map'), 'keydown', { key: 'ArrowRight' });
  assert.equal(marker.style.left, '300px');
  const position = v.elements.get('#position').textContent;
  v.state({ entries: [{ ...entry, title: 'Título revisado' }], theme: 'flesh', language: 'en' });
  assert.equal(layer.children.length, 1);
  assert.equal(marker.firstElementChild.textContent, 'Título revisado');
  assert.equal(marker.attrs['aria-label'], 'Edit marker: Título revisado');
  assert.equal(v.elements.get('#position').textContent, position, 'preferences preserve the viewport');
  v.state({ entries: [] });
  assert.equal(layer.children.length, 0);
  v.state({ entries: [entry] });
  v.state({ sessionId: 'session-b', entries: [] });
  assert.equal(layer.children.length, 0);
});

test('touch and keyboard placement support cancellation and panning never creates accidental markers', () => {
  const v = viewer(), map = v.elements.get('#map');
  v.state({ pendingEntryId: 'entry-a' });
  assert.equal(v.elements.get('#placement-banner').hidden, false);
  assert.equal(map.focused, true);
  v.emit(map, 'keydown', { key: 'Enter' });
  assert.equal(v.sent.at(-1).type, 'magnus:map-place-entry');
  v.emit(map, 'keydown', { key: 'Escape' });
  assert.equal(v.sent.at(-1).type, 'magnus:map-cancel-placement');
  assert.equal(v.elements.get('#placement-banner').hidden, true);
  v.state({ pendingEntryId: 'entry-a' });
  const pointer = { pointerId: 1, pointerType: 'touch', clientX: 520, clientY: 330 };
  v.emit(map, 'pointerdown', pointer);
  v.emit(map, 'pointermove', { ...pointer, clientX: 600 });
  v.emit(map, 'pointerup', { ...pointer, clientX: 600 });
  const count = v.sent.length;
  v.emit(map, 'click', { clientX: 600, clientY: 330 });
  assert.equal(v.sent.length, count, 'a drag/pinch ending in click cannot place a marker');
  v.emit(map, 'pointerdown', pointer);
  v.emit(map, 'pointerup', pointer);
  v.emit(map, 'click', pointer);
  assert.equal(v.sent.at(-1).type, 'magnus:map-place-entry');
});

test('only preferences from the same origin and parent window enable map actions', () => {
  const v = viewer(), map = v.elements.get('#map');
  v.state({}, { origin: 'https://foreign.example' });
  v.state({}, { source: {} });
  v.emit(map, 'drop', { clientX: 520, clientY: 330, dataTransfer: v.dataTransfer({ sessionId: 'session-a', entryId: 'entry-a' }) });
  assert.equal(v.sent.length, 0);
  v.state({ pendingEntryId: 'entry-a' });
  for (let i = 0; i < 3; i++) v.emit(v.elements.get('#zoom-out'), 'click');
  v.emit(map, 'click', { clientX: 120, clientY: 30 });
  assert.equal(v.sent.length, 0, 'the empty area outside the geographic bounds is not a valid marker location');
  assert.match(v.elements.get('#load-status').textContent, /límites/);
});

test('high-detail zooms 18 and 19 use local tiles and preserve marker coordinates', () => {
  const v = viewer(), layer = v.elements.get('#map-markers');
  v.state({ entries: [{ id: 'entry-a', title: 'Watson', map: { latitude: 0, longitude: 0 } }] });
  for (let i = 0; i < 4; i++) v.emit(v.elements.get('#zoom-in'), 'click');
  assert.match(v.elements.get('#position').textContent, /^ZOOM 18/);
  assert.ok(v.elements.get('#tiles').children.every(tile => tile.src.startsWith('./reading/18/')));
  assert.equal(layer.firstElementChild.style.left, '400px');
  v.emit(v.elements.get('#zoom-in'), 'click');
  assert.match(v.elements.get('#position').textContent, /^ZOOM 19/);
  assert.ok(v.elements.get('#tiles').children.every(tile => tile.src.startsWith('./reading/19/')));
  assert.equal(layer.firstElementChild.style.left, '400px');
  assert.equal(layer.firstElementChild.style.top, '300px');
  assert.equal(v.elements.get('#zoom-in').disabled, true);
  v.emit(v.elements.get('#map'), 'keydown', { key: '+' });
  assert.match(v.elements.get('#position').textContent, /^ZOOM 19/);
});

test('the map loader waits for image decoding, restarts on zoom and ends even when a tile fails', async () => {
  const v = viewer(), map = v.elements.get('#map'), loader = v.elements.get('#map-loader');
  const tiles = v.elements.get('#tiles').children;
  assert.equal(loader.hidden, false);
  assert.equal(map.attrs['aria-busy'], 'true');
  let decoded;
  tiles[0].decode = () => new Promise(resolve => { decoded = resolve; });
  const pending = tiles[0].onload();
  await Promise.all(tiles.slice(1).map(tile => tile.onload()));
  assert.equal(loader.hidden, false, 'a loaded but undecoded image is still pending');
  decoded(); await pending;
  assert.equal(loader.hidden, true);
  assert.equal(map.attrs['aria-busy'], 'false');
  assert.equal(v.elements.get('#map-load-progress').value, tiles.length);
  v.emit(map, 'keydown', { key: '+' });
  assert.equal(loader.hidden, false);
  v.state({ language: 'en' });
  assert.equal(v.elements.get('#map-loading-label').textContent, 'Loading map…');
  const next = v.elements.get('#tiles').children;
  next[0].onerror();
  await Promise.all(next.slice(1).map(tile => tile.onload()));
  assert.equal(loader.hidden, true, 'failed images do not leave a permanent spinner');
  assert.equal(map.attrs['aria-busy'], 'false');
  assert.match(v.elements.get('#load-status').textContent, /missing/i);
});
