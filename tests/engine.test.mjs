import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'vite';
import { fileURLToPath } from 'node:url';

await build({ configFile: false, publicDir: false, logLevel: 'silent', build: { outDir: 'work/tests', emptyOutDir: true, minify: false, lib: { entry: fileURLToPath(new URL('./entry.ts', import.meta.url)), formats: ['es'], fileName: () => 'engine.mjs' } } });
const engine = await import('../work/tests/engine.mjs');

test('preparation records migrate into old sessions and survive switching without changing existing content or favorites', () => {
  const legacy = engine.emptySession();
  delete legacy.preparation;
  legacy.notes = 'Keep my session';
  legacy.npcs = [{ id: 'ally', name: 'Zero', role: 'Fixer', status: 'Vivo', relationship: 'Aliado', notes: 'Do not change', stats: 'REF 8' }];
  const original = JSON.stringify(legacy);
  const library = engine.createSessionLibrary(legacy);
  const restored = engine.parseSessionLibrary(JSON.stringify(library));
  assert.deepEqual(restored.sessions[0].data.preparation, engine.emptyPreparation());
  assert.equal(restored.sessions[0].data.notes, legacy.notes);
  assert.deepEqual(restored.sessions[0].data.npcs, legacy.npcs);
  assert.deepEqual(restored.favorites, library.favorites);
  assert.equal(JSON.stringify(legacy), original, 'migration leaves the source untouched');
  const storage = { raw: JSON.stringify(library), getItem() { return this.raw; }, setItem(_key, value) { this.raw = value; } };
  const store = engine.createSessionStore(() => storage);
  store.hydrate();
  store.setSession(session => ({ ...session, preparation: { ...session.preparation, markets: [engine.createMarket('Kabuki', 'mixed', 3, 1000, 'es')], architectures: [engine.createArchitecture('Security', 8, 2, 8, 'en')] } }));
  store.createSession('second', 'Second night');
  assert.equal(engine.activeSession(store.getSnapshot().library).preparation.markets.length, 0);
  store.selectSession('initial');
  const returned = engine.activeSession(store.getSnapshot().library);
  assert.equal(returned.preparation.markets[0].name, 'Kabuki');
  assert.equal(returned.preparation.architectures[0].floors.length, 8);
  assert.equal(returned.notes, 'Keep my session');
  const broken = JSON.parse(storage.raw);
  broken.sessions[0].data.preparation.markets[0].stalls[0].items[0].stock = -1;
  assert.throws(() => engine.parseSessionLibrary(JSON.stringify(broken)), 'invalid new data is not silently reset');
});

test('night market preparation respects categories and price caps', () => {
  for (const language of ['es', 'en']) for (const category of engine.marketCategories) {
    const catalog = engine.marketCatalog(category.key, language);
    assert.ok(catalog.length, `${category.key} has real catalog items`);
    const market = engine.createMarket('Test', category.key, 2, 1000, language);
    assert.equal(market.stalls.length, 2);
    for (const stall of market.stalls) {
      assert.equal(stall.category, category.key);
      assert.ok(stall.items.length);
      assert.equal(new Set(stall.items.map(item => item.name)).size, stall.items.length);
      assert.ok(stall.items.every(item => item.price <= 1000 && item.stock > 0 && !item.name.startsWith('t:')));
    }
  }
  assert.throws(() => engine.createMarket('Test', 'missing', 2, 1000, 'es'));
});

test('catalog names follow the selected language while authored names survive migration', () => {
  const market = engine.createMarket('', 'weapons', 1, 1000, 'es');
  assert.equal(engine.preparationName(market, 'en'), 'Night Market');
  assert.equal(engine.preparationName(market.stalls[0], 'en'), 'Weapons 1');
  const pistol = engine.marketCatalog('weapons', 'es').find(item => item.nameKey === 't:weapons.mediumPistol');
  assert.ok(pistol);
  assert.equal(engine.preparationName(pistol, 'en'), 'Medium Pistol');
  assert.equal(engine.preparationName({ ...pistol, name: 'La pistola de Zero' }, 'en'), 'La pistola de Zero');
  const session = engine.emptySession();
  session.preparation.markets = [market];
  session.preparation.architectures = [engine.createArchitecture('Red de Zero', 6, 0, 8, 'es')];
  session.preparation.calendar = { date: '2080-01-01', tasks: [] };
  session.preparation.screamsheets = [{ id: 'old-edition', name: 'Retired tool' }];
  const architecture = session.preparation.architectures[0];
  architecture.notes = 'Notas propias';
  architecture.positionId = architecture.floors[0].id;
  architecture.floors[0].revealed = true;
  for (const floor of architecture.floors) delete floor.nameKey;
  const migrated = engine.parseSession(JSON.stringify(session)).preparation;
  assert.equal(Object.hasOwn(migrated, 'calendar'), false);
  assert.equal(Object.hasOwn(migrated, 'screamsheets'), false);
  assert.equal(Object.hasOwn(migrated.architectures[0], 'positionId'), false);
  assert.equal(Object.hasOwn(migrated.architectures[0].floors[0], 'revealed'), false);
  assert.equal(migrated.architectures[0].notes, 'Notas propias');
  assert.equal(migrated.architectures[0].name, 'Red de Zero');
  assert.equal(engine.preparationName(migrated.architectures[0].floors[0], 'en'), 'Restricted access');
  assert.equal(engine.validPreparation(migrated), true);
});

test('authored names matching generated labels remain literal through repeated saves', () => {
  const session = engine.emptySession();
  const market = engine.createMarket('Mercado nocturno', 'weapons', 1, 1000, 'es');
  market.stalls[0].name = 'Armas 1';
  market.stalls[0].nameKey = null;
  market.stalls[0].items[0] = {
    ...market.stalls[0].items[0], name: 'Pistola mediana', nameKey: null, notes: 'Texto del narrador',
  };
  const architecture = engine.createArchitecture('Arquitectura NET', 6, 0, 8, 'es');
  architecture.floors[0].nameKey = null;
  session.preparation = { markets: [market], architectures: [architecture] };
  let saved = session;
  for (let reload = 0; reload < 3; reload++) saved = engine.parseSession(JSON.stringify(saved));
  const restored = saved.preparation;
  assert.equal(engine.preparationName(restored.markets[0], 'en'), 'Mercado nocturno');
  assert.equal(engine.preparationName(restored.markets[0].stalls[0], 'en'), 'Armas 1');
  assert.equal(engine.preparationName(restored.markets[0].stalls[0].items[0], 'en'), 'Pistola mediana');
  assert.equal(engine.preparationName(restored.architectures[0], 'en'), 'Arquitectura NET');
  assert.equal(engine.preparationName(restored.architectures[0].floors[0], 'en'), 'Acceso restringido');
  assert.equal(engine.preparationName(restored.architectures[0].floors[1], 'en'), 'Operations data');
  assert.match(engine.marketText(restored.markets[0], 'en'), /Pistola mediana.*Stock:/);
  assert.match(engine.marketText(restored.markets[0], 'en'), /Texto del narrador/);
});

test('NET generation keeps one connected acyclic root and obeys the requested branch limit', () => {
  for (let run = 0; run < 100; run++) for (const branches of [0, 1, 4]) {
    const architecture = engine.createArchitecture('Security', 18, branches, 8, 'en');
    assert.equal(architecture.floors.length, 18);
    assert.equal(engine.validArchitecture(architecture), true);
    assert.ok(architecture.floors.filter(floor => architecture.floors.filter(child => child.parentId === floor.id).length === 2).length <= branches);
    assert.equal(engine.netPositions(architecture.floors).positions.size, 18);
  }
  const architecture = engine.createArchitecture('Security', 6, 0, 8, 'en');
  architecture.notes = 'ARCHITECTURE-SECRET';
  architecture.floors[0].notes = 'FLOOR-SECRET';
  const notes = engine.architectureText(architecture, 'en');
  assert.match(notes, /ARCHITECTURE-SECRET/);
  assert.match(notes, /FLOOR-SECRET/);
  const reparented = engine.reparentNetFloor(architecture, architecture.floors[5].id, architecture.floors[1].id);
  assert.equal(reparented.floors[5].parentId, architecture.floors[1].id);
  assert.equal(engine.validArchitecture(reparented), true);
  const reduced = engine.removeFloorBranch(architecture, architecture.floors[2].id);
  assert.equal(reduced.floors.length, 2);
  assert.equal(engine.validArchitecture(reduced), true);
  assert.deepEqual(engine.removeFloorBranch(architecture, architecture.floors[0].id), architecture);
  const cycle = structuredClone(architecture);
  cycle.floors[1].parentId = cycle.floors[5].id;
  assert.equal(engine.validArchitecture(cycle), false);
});

test('a cached wallpaper finishes loading even when its load event happened before hydration', async () => {
  const image = new EventTarget();
  Object.assign(image, { complete: true, naturalWidth: 1920, decode: async () => {} });
  const states = [];
  const stop = engine.observeImageLoading(image, state => states.push(state));
  await Promise.resolve();
  assert.deepEqual(states, ['ready']);
  stop();
});

test('wallpaper readiness waits for decoding and ignores completion from a previous theme or screen size', async () => {
  const image = new EventTarget();
  let resolveDecode;
  Object.assign(image, { complete: false, naturalWidth: 1920, decode: () => new Promise(resolve => { resolveDecode = resolve; }) });
  const states = [];
  const stop = engine.observeImageLoading(image, state => states.push(state));
  image.dispatchEvent(new Event('load'));
  assert.deepEqual(states, []);
  resolveDecode(); await Promise.resolve();
  assert.deepEqual(states, ['ready']);
  image.dispatchEvent(new Event('load'));
  stop();
  resolveDecode(); await Promise.resolve();
  image.dispatchEvent(new Event('error'));
  assert.deepEqual(states, ['ready'], 'an unmounted image cannot update the current loader');
});

test('cached failures and load or decode errors stop the wallpaper loader', async () => {
  for (const kind of ['cached', 'load', 'decode']) {
    const image = new EventTarget();
    Object.assign(image, { complete: kind === 'cached', naturalWidth: kind === 'cached' ? 0 : 1920, decode: async () => { throw new Error('decode failed'); } });
    const states = [];
    const stop = engine.observeImageLoading(image, state => states.push(state));
    if (kind !== 'cached') image.dispatchEvent(new Event(kind === 'load' ? 'error' : 'load'));
    await Promise.resolve();
    assert.deepEqual(states, ['error'], kind);
    stop();
  }
});

test('mouse dragging scrolls files without activating them, preserving clicks, touch and keyboard', () => {
  class Rail extends EventTarget {
    dataset = {};
    scrollWidth = 1200;
    clientWidth = 400;
    scrollLeft = 100;
    ownerDocument = { defaultView: new EventTarget() };
    captured = new Set();
    hasPointerCapture(id) { return this.captured.has(id); }
    setPointerCapture(id) { this.captured.add(id); }
    releasePointerCapture(id) { this.captured.delete(id); }
  }
  const rail = new Rail();
  const emit = (type, fields = {}) => {
    const event = Object.assign(new Event(type, { cancelable: true }), { pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, clientX: 200, clientY: 50, detail: 1 }, fields);
    rail.dispatchEvent(event);
    return event;
  };
  let starts = 0;
  const detach = engine.bindDragScroll(rail, () => starts++);
  let activations = 0;
  rail.addEventListener('click', () => activations++);
  emit('pointerdown');
  emit('pointermove', { clientX: 196 });
  emit('pointerup', { buttons: 0 });
  emit('click');
  assert.equal(activations, 1, 'small pointer jitter still permits a file/favorite click');
  assert.equal(rail.scrollLeft, 100);
  emit('pointerdown');
  assert.equal(emit('pointermove', { clientX: 120 }).defaultPrevented, true);
  assert.equal(rail.scrollLeft, 180);
  assert.equal(rail.dataset.dragging, 'true');
  assert.ok(rail.hasPointerCapture(1), 'drag continues outside the original card');
  emit('pointerup', { buttons: 0 });
  assert.equal(rail.dataset.dragging, undefined);
  assert.equal(emit('click').defaultPrevented, true);
  assert.equal(activations, 1, 'release after dragging does not activate a card or favorite');
  emit('pointerdown');
  emit('pointerup', { buttons: 0 });
  emit('click');
  assert.equal(activations, 2, 'the next deliberate click is restored');
  emit('pointerdown', { pointerType: 'touch' });
  assert.equal(emit('pointermove', { pointerType: 'touch', clientX: 30 }).defaultPrevented, false);
  assert.equal(rail.scrollLeft, 180, 'touch scrolling remains browser-owned');
  assert.equal(starts, 1);
  emit('pointerdown');
  emit('pointermove', { clientX: 150 });
  rail.ownerDocument.defaultView.dispatchEvent(new Event('blur'));
  assert.equal(rail.dataset.dragging, undefined);
  assert.equal(rail.captured.size, 0);
  assert.equal(emit('click', { detail: 0 }).defaultPrevented, false, 'keyboard activation is never suppressed');
  detach();
  const left = rail.scrollLeft;
  emit('pointerdown');
  emit('pointermove', { clientX: 20 });
  assert.equal(rail.scrollLeft, left, 'cleanup releases all gesture listeners');
});

test('open oracle uses only the chosen sources, labels complete results and keeps languages independent', () => {
  for (const language of ['es', 'en']) {
    for (const approach of engine.oracleApproaches) {
      const answers = engine.openOracle('Who is behind this?', approach.sources, language, () => 0);
      assert.deepEqual(answers.map(answer => answer.key), approach.sources);
      assert.ok(answers.every(answer => answer.text.trim() && answer.label.trim()));
      assert.ok(answers.every(answer => !answer.text.includes('undefined')));
    }
  }
  const selected = ['person', 'motivation', 'person'];
  const english = engine.openOracle('Who is behind this?', selected, 'en', () => 0);
  assert.deepEqual(english.map(answer => answer.label), ['Occupation', 'Motivation']);
  assert.deepEqual(selected, ['person', 'motivation', 'person']);
  const spanish = engine.openOracle('Quién está detrás?', ['person', 'motivation'], 'es', () => 0);
  assert.notEqual(spanish[0].text, english[0].text);
  assert.throws(() => engine.openOracle('  ', ['event'], 'es'));
  assert.throws(() => engine.openOracle('What happened?', [], 'en'));
  assert.throws(() => engine.openOracle('What happened?', ['missing'], 'en'));
});

test('overlapping files keep one stable hover owner at shared edges and while reaching raised controls', () => {
  const slots = [0, 1, 2].map(index => ({ left: 24 + index * 204, right: 248 + index * 204, top: 38, bottom: 170 }));
  let owner = engine.deckHoverIndex(slots, 227.5, 160, null);
  assert.equal(owner, 0);
  // The face lifts clear of this point, but its resting slot still owns it.
  for (let frame = 0; frame < 100; frame++) owner = engine.deckHoverIndex(slots, 227.5, 160, owner);
  assert.equal(owner, 0);
  owner = engine.deckHoverIndex(slots, 228, 160, owner);
  assert.equal(owner, 1, 'crossing an exposed spine transfers ownership once');
  for (let frame = 0; frame < 100; frame++) owner = engine.deckHoverIndex(slots, 228, 160, owner);
  assert.equal(owner, 1);
  assert.equal(engine.deckHoverIndex(slots, 280, 22, owner), 1, 'raised favorite remains reachable');
  assert.equal(engine.deckHoverIndex(slots, 500, 80, owner), 2);
  assert.equal(engine.deckHoverIndex(slots, 656, 80, 2), null, 'leaving the last card clears hover');
  assert.equal(engine.deckHoverIndex(slots, 280, 175, owner), null);
  assert.equal(engine.deckHoverIndex(slots, 280, 0, owner), null);
  const scrolled = slots.map(box => ({ ...box, left: box.left - 204, right: box.right - 204 }));
  assert.equal(engine.deckHoverIndex(scrolled, 228, 160, null), 2, 'scrolling uses the new resting positions');
  assert.equal(engine.deckHoverIndex([], 180, 22, owner), null, 'a new empty page cannot retain an old owner');
});

test('reference copy contains translated headers and every data row', () => {
  const table = engine.gmTableCategories.flatMap(folder => folder.tables).find(table => table.key === 'combatActions');
  for (const language of ['es', 'en']) {
    const copied = engine.formatReference(table, language).split('\n');
    assert.equal(copied[0], engine.referenceLabel(table.titleKey, language));
    const headerIndex = table.descriptionKey ? 2 : 1;
    assert.equal(copied.length, headerIndex + 1 + table.rows.length + Number(!!table.sourceKey));
    assert.equal(copied[headerIndex].split('\t').length, table.columns.length);
    assert.ok(copied.every(line => !line.includes('t:combat.')));
  }
});

test('Mission Kit quickhack references copy all eleven effects with their source and variant', () => {
  const tables = engine.gmTableCategories.flatMap(folder => folder.tables);
  const quickhacks = [6, 8, 10, 12].map(dv => tables.find(table => table.key === `cemkQuickhacks${dv}`));
  assert.equal(quickhacks.reduce((sum, table) => sum + table.rows.length, 0), 11);
  for (const language of ['es', 'en']) {
    for (const table of tables.filter(table => table.key.startsWith('cemk'))) {
      const copied = engine.formatReference(table, language);
      assert.doesNotMatch(copied, /t:cemk\.|undefined|\[object Object\]/);
      assert.ok(copied.endsWith(engine.referenceLabel(table.sourceKey, language)));
      assert.match(copied, /Edgerunners Mission Kit · Rule Book/);
      assert.notEqual(engine.referenceLabel(table.descriptionKey, language), table.descriptionKey);
    }
  }
  const copy = key => engine.formatReference(tables.find(table => table.key === key), 'en');
  assert.match(copy('cemkTurn'), /Each specific Quickhack may be attempted only once per target per turn/i);
  assert.match(copy('cemkTurn'), /another Quickhack against the same target/i);
  assert.match(copy('cemkQuickhacks8'), /4 direct HP damage/);
  assert.match(copy('cemkQuickhacks8'), /GM chooses 3/);
  assert.match(copy('cemkQuickhacks8'), /Cybereye/);
  assert.match(copy('cemkQuickhacks10'), /3d6 direct HP damage/);
  assert.match(copy('cemkDirect'), /\+1 NET Action per turn/);
  assert.match(copy('cemkDirect'), /Passwalls, but not Black ICE/);
  assert.match(copy('cemkInterface'), /full Cyberpunk RED system/);
});

test('copy buttons use the clipboard API and clean up their fallback when it is denied', async () => {
  const originals = Object.fromEntries(['navigator', 'document', 'HTMLElement'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const copied = [];
  const fallback = { value: '', style: {}, setAttribute() {}, select() { copied.push(this.value); }, remove() { this.removed = true; } };
  class Element { focus() { this.restored = true; } }
  const focused = new Element();
  let appended = false;
  let allowed = true;
  try {
    Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: Element });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { activeElement: focused, createElement: () => fallback, body: { append() { appended = true; } }, execCommand: () => allowed } });
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async value => { copied.push(value); } } } });
    await engine.copyText('tabla\tfila');
    assert.deepEqual(copied, ['tabla\tfila']);
    assert.equal(appended, false);
    navigator.clipboard.writeText = async () => { throw new Error('Denied'); };
    await engine.copyText('datos de respaldo');
    assert.deepEqual(copied, ['tabla\tfila', 'datos de respaldo']);
    assert.equal(fallback.removed, true);
    assert.equal(focused.restored, true);
    allowed = false;
    fallback.removed = false;
    await assert.rejects(engine.copyText('fallo'), /Clipboard unavailable/);
    assert.equal(fallback.removed, true);
  } finally {
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

test('file search combines accent-insensitive terms across folders, names and descriptions', () => {
  const folders = [
    { key: 'city', label: 'Localizaciones', files: [
      { key: 'a', label: 'Clínica clandestina', description: 'Un médico y equipo robado' },
      { key: 'b', label: 'Mercado', description: 'Equipo de segunda mano' },
    ] },
    { key: 'people', label: 'Contactos', files: [
      { key: 'c', label: 'Médico', description: 'Una deuda con una corporación' },
    ] },
  ];
  const original = structuredClone(folders);
  assert.deepEqual(engine.filterFolders(folders, ' LOCALIZACIONES medico '), [{ ...folders[0], files: [folders[0].files[0]] }]);
  assert.deepEqual(engine.filterFolders(folders, 'equipo', ['b', 'c'], true), [{ ...folders[0], files: [folders[0].files[1]] }]);
  assert.deepEqual(engine.filterFolders(folders, '', [], true), []);
  assert.deepEqual(engine.filterFolders(folders, 'no existe'), []);
  assert.deepEqual(engine.filterFolders(folders, '   '), folders);
  assert.deepEqual(folders, original, 'filtering must not remove source files or reorder folders');
});

test('all original and full-content generators return usable Spanish content', () => {
  const random = Math.random;
  try {
    for (const value of [0, 0.12, 0.49, 0.77, 0.999999]) {
      Math.random = () => value;
      for (const gen of engine.allGenerators) {
        const result = engine.formatResult(gen.generator());
        assert.ok(result.trim().length, gen.key);
        assert.doesNotMatch(result, /undefined|\[object Object\]|NaN/, gen.key);
        assert.notEqual(gen.label, gen.key, `Missing label: ${gen.key}`);
      }
      for (const zone of ['corporate', 'moderate', 'combatZone', 'outskirts']) {
        for (const time of ['day', 'night', 'midnight']) assert.ok(engine.generateRandomEncounter(zone, time).length);
      }
    }
    assert.ok(engine.allGenerators.length >= 65);
    assert.equal(new Set(engine.allGenerators.map(g => g.key)).size, engine.allGenerators.length);
  } finally { Math.random = random; }
});

test('all reference tables, columns and translated cells resolve', () => {
  let count = 0;
  for (const category of engine.gmTableCategories) {
    assert.notEqual(engine.referenceLabel(category.titleKey), category.titleKey);
    for (const table of category.tables) {
      count++;
      assert.notEqual(engine.referenceLabel(table.titleKey), table.titleKey);
      for (const column of table.columns) assert.notEqual(engine.referenceLabel(column.headerKey), column.headerKey);
      for (const row of table.rows) {
        assert.equal(row.cells.length, table.columns.length, table.key);
        for (const cell of row.cells) if (typeof cell === 'string' && cell.startsWith('t:')) assert.notEqual(engine.referenceLabel(cell), cell);
      }
    }
  }
  assert.ok(count >= 60);
});

test('English generators and reference tables resolve without changing Spanish calls', () => {
  const random = Math.random;
  const english = engine.getGeneratorGroups('en').flatMap(group => group.generators);
  try {
    for (const value of [0, .12, .49, .77, .999999]) {
      Math.random = () => value;
      for (const gen of english) {
        const result = engine.formatResult(gen.generator(), 'en');
        assert.ok(result.trim().length, gen.key);
        assert.doesNotMatch(result, /undefined|\[object Object\]|NaN|Nombre:|Ánimo:|Motivación:|Contratante:|Complicación:|por equipo/, gen.key);
        assert.notEqual(gen.label, gen.key, gen.key);
      }
      for (const zone of ['corporate', 'moderate', 'combatZone', 'outskirts']) {
        for (const time of ['day', 'night', 'midnight']) assert.ok(engine.withLanguage('en', () => engine.generateRandomEncounter(zone, time)).length);
      }
    }
    Math.random = () => 0;
    const enNPC = engine.formatResult(english.find(gen => gen.key === 'contactFull').generator(), 'en');
    const esNPC = engine.formatResult(engine.generatorByKey('contactFull').generator());
    assert.match(enNPC, /Name:.*\nHandle:.*\nRole:/);
    assert.match(esNPC, /Nombre:.*\nAlias:.*\nRol:/);
    assert.notEqual(enNPC.split('Mood: ')[1]?.split('\n')[0], esNPC.split('Ánimo: ')[1]?.split('\n')[0]);
    for (const category of engine.gmTableCategories) {
      assert.notEqual(engine.referenceLabel(category.titleKey, 'en'), category.titleKey);
      for (const table of category.tables) {
        const keys = [table.titleKey, table.descriptionKey, ...table.columns.map(column => column.headerKey), ...table.rows.flatMap(row => row.cells.filter(cell => typeof cell === 'string' && cell.startsWith('t:')))];
        for (const key of keys.filter(Boolean)) assert.notEqual(engine.referenceLabel(key, 'en'), key, key);
      }
    }
    assert.equal(engine.oracleAnswer(2, 100, 'en'), 'Yes.');
    assert.equal(engine.oracleAnswer(2, 100), 'Sí.');
    assert.throws(() => engine.withLanguage('en', () => { throw new Error('test'); }));
    assert.equal(engine.translate('Nombre'), 'Nombre');
    assert.equal(engine.withLanguage('en', () => engine.withLanguage('es', () => engine.translate('Nombre'))), 'Nombre');
  } finally { Math.random = random; }
});

test('dice accepts modifiers and enforces safe formula limits', () => {
  assert.deepEqual(engine.rollDice('2d6+3', () => 4), { expression: '2d6+3', rolls: [4, 4], modifier: 3, total: 11 });
  assert.equal(engine.rollDice('d10 - 8', () => 1).total, -7);
  assert.equal(engine.rollDice('100d100', sides => sides).total, 10000);
  for (const formula of ['0d6', '101d6', '1d1', '1d101', '2d6+foo', '2d6;alert(1)', '3', '']) assert.throws(() => engine.rollDice(formula));
});

test('oracle matches every probability boundary in the original system', () => {
  const answers = ['No.', 'No, pero…', 'Es complicado.', 'Sí, pero…', 'Sí.'];
  engine.probabilities.forEach((probability, index) => {
    let start = 1;
    [...probability.ranges, 100].forEach((end, answer) => {
      assert.equal(engine.oracleAnswer(index, start), answers[answer]);
      assert.equal(engine.oracleAnswer(index, end), answers[answer]);
      start = end + 1;
    });
  });
  assert.throws(() => engine.oracleAnswer(7, 20));
  assert.throws(() => engine.oracleAnswer(2, 0));
});

test('countdown clocks remove ones and optional sixes, including completion', () => {
  assert.equal(engine.rollClock(6, false, () => 1).remaining, 0);
  assert.equal(engine.rollClock(6, false, () => 6).remaining, 6);
  assert.equal(engine.rollClock(6, true, () => 6).remaining, 0);
  assert.deepEqual(engine.rollClock(0, true), { rolls: [], remaining: 0, removed: 0 });
});

test('weighted tables respect zero, boundaries and invalid weights', () => {
  const items = [{ text: 'A', weight: 1 }, { text: 'B', weight: 2 }, { text: 'C', weight: 1 }];
  assert.equal(engine.weightedPick(items, () => 0), 'A');
  assert.equal(engine.weightedPick(items, () => .25), 'B');
  assert.equal(engine.weightedPick(items, () => .75), 'C');
  assert.throws(() => engine.weightedPick([{ text: 'A', weight: 0 }]));
  assert.throws(() => engine.weightedPick([{ text: 'A', weight: Infinity }]));
  assert.throws(() => engine.weightedPick([]));
});

test('session can reload all tool state without losing notes or results', () => {
  const session = engine.emptySession();
  session.notes = '¿Quién mató al fixer?\n日本語 / <script>texto</script>';
  session.clocks.push({ id: 'clock', name: 'Alarma', initial: 6, remaining: 4, escalate: true, rolls: [1, 6, 3, 4, 5, 2], luckUsed: false });
  session.npcs.push({ id: 'npc', name: 'Zero', role: 'Fixer', status: 'Vivo', relationship: 'Neutral', notes: 'Contacto', stats: 'REF 7' });
  session.scenes.push({ id: 'scene', name: 'La llamada', location: 'Afterlife', participants: 'Zero', goal: 'Un encargo', outcome: '', done: false });
  session.beats.push({ id: 'beat', kind: 'Gancho', text: 'Una llamada', done: true });
  session.challenges.push({ id: 'case', kind: 'investigation', name: 'Apagón', target: 3, base: 10, difficulty: 13, checks: [{ total: 15, detail: 'Éxito', win: true }] });
  session.ip.push({ id: 'ip', name: 'V', amount: 30, note: 'Partida', date: new Date().toISOString() });
  session.customTables.push({ id: 'table', name: 'Eventos', items: [{ text: 'A', weight: 1 }, { text: 'B', weight: 2 }, { text: 'C', weight: 1 }] });
  session.mission = engine.createMission();
  assert.deepEqual(engine.parseSession(JSON.stringify(session)), session);
});

test('invalid stored sessions are rejected rather than silently overwritten', () => {
  assert.throws(() => engine.parseSession('{broken'));
  assert.throws(() => engine.parseSession('{}'));
  for (const overrides of [{ version: 2 }, { notes: 5 }, { clocks: [null] }, { history: [{ title: 'missing fields' }] }, { favorites: [4] }, { npcs: [{}] }, { challenges: [{ checks: null }] }]) {
    assert.throws(() => engine.parseSession(JSON.stringify({ ...engine.emptySession(), ...overrides })));
  }
});

test('history retains the newest 200 results and all pinned entries', () => {
  let session = engine.emptySession();
  for (let i = 0; i < 220; i++) session = engine.appendEntry(session, { id: String(i), title: 'Tirada', text: String(i), kind: 'dados', time: i, pinned: i < 3 });
  assert.equal(session.history.length, 203);
  assert.equal(session.history[0].id, '219');
  assert.equal(session.history.filter(entry => entry.pinned).length, 3);
});

test('map markers share the saved log entry, move in place and remain isolated between sessions', () => {
  const fixture = sessionStorageFixture();
  const store = fixture.open();
  const original = { id: 'contact', title: 'Zero', text: 'Fixer en Watson', kind: 'generador', generator: 'contactFull', time: 42, pinned: false };
  store.setSession(current => engine.appendEntry(current, original));
  store.setSession(current => engine.placeEntryOnMap(current, original.id, { latitude: 0.03, longitude: -0.04 }));
  store.setSession(current => engine.placeEntryOnMap(current, original.id, { latitude: -0.02, longitude: 0.05 }));
  store.setSession(current => engine.replaceEntryResult(current, original.id, { title: 'Zero / Afterlife', text: 'Nueva pista' }));
  const linked = fixture.active(store).history[0];
  assert.deepEqual(linked, { ...original, title: 'Zero / Afterlife', text: 'Nueva pista', map: { latitude: -0.02, longitude: 0.05 } });
  assert.equal(fixture.active(store).history.length, 1, 'repeated placement and editing never duplicate the entry');
  assert.deepEqual(fixture.active(fixture.open()).history[0], linked, 'location and edits survive reload');
  store.createSession('other', 'Otra sesión');
  assert.deepEqual(fixture.active(store).history, []);
  store.setSession(current => engine.placeEntryOnMap(current, original.id, { latitude: 0, longitude: 0 }));
  assert.deepEqual(fixture.active(store).history, [], 'a stale drag cannot create an entry in another session');
  store.selectSession('initial');
  assert.deepEqual(fixture.active(store).history[0], linked);
  store.setSession(current => engine.removeEntryFromMap(current, original.id));
  assert.deepEqual(fixture.active(store).history[0], { ...original, title: 'Zero / Afterlife', text: 'Nueva pista' });
  assert.deepEqual(fixture.active(fixture.open()).history[0], fixture.active(store).history[0]);
});

test('mapped entries survive history pruning and invalid coordinates cannot alter saved sessions', () => {
  let session = engine.appendEntry(engine.emptySession(), { id: 'marker', title: 'Pista', text: 'Persistente', kind: 'oráculo', time: 0, pinned: false });
  const legacy = session;
  assert.deepEqual(engine.parseSession(JSON.stringify(legacy)), legacy, 'old sessions need no location migration');
  session = engine.placeEntryOnMap(session, 'marker', { latitude: 0, longitude: 0 });
  for (let i = 0; i < 220; i++) session = engine.appendEntry(session, { id: `new-${i}`, title: 'Resultado', text: String(i), kind: 'generador', time: i, pinned: false });
  assert.equal(session.history.length, 201);
  assert.equal(session.history.at(-1).id, 'marker', 'mapped entries remain in their original position');
  assert.deepEqual(engine.parseSession(JSON.stringify(session)), session);
  for (const location of [null, {}, { latitude: 0.11, longitude: 0 }, { latitude: 0, longitude: -0.11 }, { latitude: '0', longitude: 0 }, { latitude: NaN, longitude: 0 }, { latitude: 0, longitude: Infinity }]) {
    assert.equal(engine.placeEntryOnMap(session, 'marker', location), session);
    assert.throws(() => engine.parseSession(JSON.stringify({ ...session, history: [{ ...session.history[0], map: location }] })));
  }
  const deleted = { ...session, history: session.history.filter(entry => entry.id !== 'marker') };
  assert.equal(engine.placeEntryOnMap(deleted, 'marker', { latitude: 0, longitude: 0 }), deleted);
  assert.equal(engine.replaceEntryResult(deleted, 'marker', { title: 'Stale save', text: '' }), deleted);
});

test('reroll replaces only its logged result, retaining order, pins and identity across reloads', () => {
  const fixture = sessionStorageFixture();
  const store = fixture.open();
  let session = engine.emptySession();
  for (let i = 0; i < 204; i++) session = engine.appendEntry(session, { id: String(i), title: 'NPC', text: `Original ${i}`, kind: 'generador', generator: 'contactFull', time: i, pinned: i < 2 });
  store.setSession(session);
  const before = fixture.active(store);
  const ids = before.history.map(entry => entry.id);
  store.setSession(current => engine.replaceEntryResult(current, '0', { title: 'Contact / NPC', text: 'Revised contact' }));
  const after = fixture.active(store);
  assert.equal(after.history.length, 202, 'reroll does not add an entry or prune an older one');
  assert.deepEqual(after.history.map(entry => entry.id), ids, 'even a pinned old entry stays in its original position');
  assert.deepEqual(after.history.find(entry => entry.id === '0'), { ...before.history.find(entry => entry.id === '0'), title: 'Contact / NPC', text: 'Revised contact' });
  assert.equal(before.history.find(entry => entry.id === '0').text, 'Original 0', 'previous snapshots stay immutable');
  assert.deepEqual(after.history.filter(entry => entry.id !== '0'), before.history.filter(entry => entry.id !== '0'), 'other entries from the same generator are untouched');
  const reopened = fixture.open();
  assert.deepEqual(fixture.active(reopened).history, after.history, 'the replacement survives reloading');
  reopened.setSession(current => engine.replaceEntryResult(current, '0', { title: 'NPC', text: 'Rerolled again' }));
  assert.deepEqual(fixture.active(reopened).history.map(entry => entry.id), ids);
  const withoutTarget = { ...fixture.active(reopened), history: after.history.filter(entry => entry.id !== '0') };
  assert.equal(engine.replaceEntryResult(withoutTarget, '0', { title: 'NPC', text: 'Stale click' }), withoutTarget, 'a removed result cannot be recreated by reroll');
});

function sessionStorageFixture() {
  const values = new Map();
  let writable = true;
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { if (!writable) throw new Error('Quota exceeded'); values.set(key, value); },
  };
  const open = () => { const store = engine.createSessionStore(() => storage); store.hydrate(); return store; };
  const active = store => engine.activeSession(store.getSnapshot().library);
  return { values, open, active, setWritable: value => { writable = value; } };
}

test('removing configurable screens preserves saved sessions and favorites across reloads', () => {
  const fixture = sessionStorageFixture();
  const older = engine.createSessionLibrary({ ...engine.emptySession(), notes: 'Keep this case' });
  older.referenceScreens = [{ id: 'combat', name: 'Old screen', tables: ['critBody'], notes: 'Removed screen note' }];
  older.favorites.references = ['critBody'];
  fixture.values.set(engine.SESSION_LIBRARY_KEY, JSON.stringify(older));
  const store = fixture.open();
  assert.ok(!Object.hasOwn(store.getSnapshot().library, 'referenceScreens'));
  assert.equal(fixture.active(store).notes, 'Keep this case');
  assert.deepEqual(store.getSnapshot().library.favorites.references, ['critBody']);
  store.setSession(current => ({ ...current, notes: 'Updated case note' }));
  const reopened = fixture.open();
  assert.equal(fixture.active(reopened).notes, 'Updated case note');
  assert.deepEqual(reopened.getSnapshot().library.favorites.references, ['critBody']);
  assert.ok(!Object.hasOwn(JSON.parse(fixture.values.get(engine.SESSION_LIBRARY_KEY)), 'referenceScreens'));
});

test('floating references migrate without auto-opening or changing older session data', () => {
  const fixture = sessionStorageFixture();
  const older = engine.createSessionLibrary({ ...engine.emptySession(), notes: 'My authored clues' });
  delete older.referenceNotes;
  older.favorites.references = ['combatActions', 'critBody'];
  fixture.values.set(engine.SESSION_LIBRARY_KEY, JSON.stringify(older));
  const store = fixture.open();
  assert.deepEqual(store.getSnapshot().library.referenceNotes, {});
  assert.deepEqual(store.getSnapshot().library.favorites.references, older.favorites.references);
  assert.equal(fixture.active(store).notes, 'My authored clues');
  assert.equal(fixture.values.get(engine.SESSION_LIBRARY_KEY), JSON.stringify(older), 'hydration does not rewrite the older library');
});

test('floating references preserve independent open, fold, pin, size and position states across sessions and reloads', () => {
  const fixture = sessionStorageFixture();
  const store = fixture.open();
  for (const key of ['combatActions', 'critBody']) {
    store.toggleFavorite('references', key);
    store.toggleReferenceNote(key);
  }
  const first = store.getSnapshot().library.referenceNotes.combatActions;
  store.updateReferenceNote('combatActions', { x: 170, y: 230, width: 740, height: 530, collapsed: true });
  store.updateReferenceNote('critBody', { pinned: true });
  const states = store.getSnapshot().library.referenceNotes;
  assert.equal(states.combatActions.open, true);
  assert.equal(states.critBody.open, true);
  assert.equal(first.x, 40, 'prior snapshots stay unchanged');
  store.createSession('next', 'Another session');
  assert.deepEqual(store.getSnapshot().library.referenceNotes, states, 'reference preferences belong to the GM');
  const reopened = fixture.open();
  assert.deepEqual(reopened.getSnapshot().library.referenceNotes, states);
  reopened.toggleReferenceNote('combatActions');
  assert.equal(reopened.getSnapshot().library.referenceNotes.combatActions.open, false);
  assert.deepEqual(reopened.getSnapshot().library.referenceNotes.critBody, states.critBody);
  reopened.toggleReferenceNote('combatActions');
  const restored = reopened.getSnapshot().library.referenceNotes.combatActions;
  for (const field of ['x', 'y', 'width', 'height', 'collapsed']) assert.equal(restored[field], states.combatActions[field]);
  assert.ok(restored.order > states.critBody.order, 'reopening brings only this note to the front');
});

test('reference changes merge other tabs and unfavoriting closes only that reference', () => {
  const fixture = sessionStorageFixture();
  const first = fixture.open();
  for (const key of ['combatActions', 'critBody']) { first.toggleFavorite('references', key); first.toggleReferenceNote(key); }
  const second = fixture.open();
  second.updateReferenceNote('critBody', { x: 690, collapsed: true });
  first.updateReferenceNote('combatActions', { width: 810 });
  assert.equal(first.getSnapshot().library.referenceNotes.critBody.x, 690);
  assert.equal(first.getSnapshot().library.referenceNotes.critBody.collapsed, true);
  second.raiseReferenceNote('combatActions');
  assert.equal(second.getSnapshot().library.referenceNotes.combatActions.width, 810);
  second.toggleFavorite('references', 'critBody');
  first.sync();
  assert.ok(!Object.hasOwn(first.getSnapshot().library.referenceNotes, 'critBody'));
  assert.equal(first.getSnapshot().library.referenceNotes.combatActions.open, true);
  assert.deepEqual(first.getSnapshot().library.favorites.references, ['combatActions']);
});

test('failed note saves retain the saved state and malformed geometry never overwrites the library', () => {
  const fixture = sessionStorageFixture();
  const store = fixture.open();
  store.toggleFavorite('references', 'combatActions');
  store.toggleReferenceNote('combatActions');
  const before = store.getSnapshot().library.referenceNotes.combatActions;
  const raw = fixture.values.get(engine.SESSION_LIBRARY_KEY);
  fixture.setWritable(false);
  assert.equal(store.updateReferenceNote('combatActions', { open: false, x: 300 }), false);
  assert.deepEqual(store.getSnapshot().library.referenceNotes.combatActions, before);
  assert.equal(fixture.values.get(engine.SESSION_LIBRARY_KEY), raw);
  fixture.setWritable(true);
  assert.equal(store.updateReferenceNote('combatActions', { collapsed: true }), true);
  const invalid = JSON.parse(fixture.values.get(engine.SESSION_LIBRARY_KEY));
  invalid.referenceNotes.combatActions.width = '640';
  const corrupt = JSON.stringify(invalid);
  fixture.values.set(engine.SESSION_LIBRARY_KEY, corrupt);
  const blocked = fixture.open();
  assert.equal(blocked.getSnapshot().blocked, true);
  assert.equal(blocked.updateReferenceNote('combatActions', { open: false }), false);
  assert.equal(fixture.values.get(engine.SESSION_LIBRARY_KEY), corrupt);
});

test('reference notes remain reachable on small viewports and moving a folded note preserves its preferred size', () => {
  const bounds = { x: 12, y: 184, width: 366, height: 648 };
  const note = { ...engine.createReferenceNote(0), x: 1300, y: 900, width: 740, height: 530 };
  assert.deepEqual(engine.fitReferenceNote(note, bounds), { x: 12, y: 302, width: 366, height: 530 });
  const folded = { ...note, collapsed: true };
  const moved = engine.changeReferenceNoteRect(folded, bounds, 'move', -2000, -2000);
  assert.deepEqual(moved, { x: 12, y: 184, width: 740, height: 530 });
  assert.equal(engine.fitReferenceNote({ ...folded, ...moved }, bounds).height, engine.NOTE_HEADER_HEIGHT);
  assert.deepEqual(note, { ...engine.createReferenceNote(0), x: 1300, y: 900, width: 740, height: 530 }, 'fitting never overwrites the saved dimensions');
  const resized = engine.changeReferenceNoteRect(engine.createReferenceNote(0), { x: 12, y: 98, width: 1416, height: 940 }, 'resize', -900, -900);
  assert.equal(resized.width, 320);
  assert.equal(resized.height, 220);
});

test('saved floating notes retire expansion and start unpinned without losing positions or session data', () => {
  const fixture = sessionStorageFixture();
  const older = engine.createSessionLibrary({ ...engine.emptySession(), notes: 'Keep my preparation' });
  const previous = { ...engine.createReferenceNote(0), collapsed: true, expanded: true, width: 810, y: 240 };
  delete previous.pinned;
  older.favorites.references = ['combatActions'];
  older.referenceNotes.combatActions = previous;
  fixture.values.set(engine.SESSION_LIBRARY_KEY, JSON.stringify(older));
  const store = fixture.open();
  const migrated = store.getSnapshot().library.referenceNotes.combatActions;
  assert.equal(migrated.pinned, false);
  assert.equal(migrated.y, 240);
  assert.equal(migrated.width, 810);
  assert.equal(migrated.collapsed, true);
  assert.ok(!Object.hasOwn(migrated, 'expanded'));
  assert.equal(fixture.active(store).notes, 'Keep my preparation');
  store.updateReferenceNote('combatActions', { pinned: true });
  assert.equal(fixture.open().getSnapshot().library.referenceNotes.combatActions.pinned, true);
  assert.ok(!Object.hasOwn(JSON.parse(fixture.values.get(engine.SESSION_LIBRARY_KEY)).referenceNotes.combatActions, 'expanded'));
  const invalid = JSON.parse(fixture.values.get(engine.SESSION_LIBRARY_KEY));
  invalid.referenceNotes.combatActions.pinned = 'yes';
  assert.throws(() => engine.parseSessionLibrary(JSON.stringify(invalid)));
});

test('opening favorites while scrolled uses document coordinates, while pinned notes keep screen coordinates', () => {
  const fixture = sessionStorageFixture();
  const store = fixture.open();
  const viewport = { bounds: { x: 12, y: 12, width: 1200, height: 800 }, scrollY: 1000 };
  for (const key of ['combatActions', 'critBody']) { store.toggleFavorite('references', key); store.toggleReferenceNote(key, viewport); }
  let notes = store.getSnapshot().library.referenceNotes;
  assert.equal(notes.combatActions.pinned, false);
  assert.equal(notes.combatActions.y, 1120, 'the new note appears at y=120 in the visible viewport');
  store.updateReferenceNote('critBody', { pinned: true, y: 230 });
  store.toggleReferenceNote('critBody');
  store.toggleReferenceNote('critBody', viewport);
  assert.equal(store.getSnapshot().library.referenceNotes.critBody.y, 230, 'reopening a pinned note does not add the page scroll');
  store.updateReferenceNote('combatActions', { width: 740, height: 530, collapsed: true });
  store.toggleReferenceNote('combatActions');
  store.toggleReferenceNote('combatActions', { ...viewport, scrollY: 2000 });
  notes = store.getSnapshot().library.referenceNotes;
  assert.equal(notes.combatActions.y, 2012, 'a closed note outside the current view reopens where it can be reached');
  assert.equal(notes.combatActions.width, 740);
  assert.equal(notes.combatActions.height, 530);
  assert.equal(notes.combatActions.collapsed, true);
  assert.equal(notes.critBody.y, 230, 'opening another note does not move this one');
});

test('RED reference corrections preserve range DVs, critical tables and priced catalog names', () => {
  const tables = engine.gmTableCategories.flatMap(category => category.tables);
  const table = key => tables.find(table => table.key === key);
  const copy = key => engine.formatReference(table(key), 'en');
  assert.deepEqual(table('autofireDV').rows.map(row => row.cells.slice(1)), [[20,17,20,25,30], [22,20,17,20,25]]);
  assert.equal(table('critBody').rows.length, 11);
  assert.equal(table('critHead').rows.length, 11);
  assert.match(copy('deathSaves'), /below BODY/);
  assert.match(copy('deathSaves'), /natural 10/i);
  assert.match(copy('coverConcealment'), /Steel\s+25\s+50/);
  assert.match(copy('coverConcealment'), /Concrete\s+10\s+25/);
  assert.match(copy('magazineCapacities'), /Cyberpunk RED.*344/);
  assert.match(copy('ammoTypes'), /EMP\s+500 eb/);
  assert.match(copy('ammoTypes'), /Poison\s+100 eb/);
  assert.doesNotMatch(copy('drugEffects'), /Timewarp/i);
  assert.match(copy('cyberaudio'), /Homing Tracer/);
  assert.match(copy('humanityEmpathy'), /maximum −2 per piece with HL, −4 per Borgware/);
  assert.ok(tables.every(table => table.descriptionKey && table.sourceKey), 'all rules identify their context and source');
});

test('hazards and medical references keep RED timing, prices and exceptions', () => {
  const tables = engine.gmTableCategories.flatMap(category => category.tables);
  const copy = key => engine.formatReference(tables.find(table => table.key === key), 'en');
  assert.match(copy('fireRadiation'), /end of each Turn/i);
  assert.match(copy('falls'), /10 m\/yd.*2d6/);
  assert.match(copy('asphyxiationExposure'), /start of each Turn/i);
  assert.match(copy('electricityPoisons'), /6d6/);
  assert.match(copy('traumaTeam'), /1d6 Rounds/);
  assert.match(copy('hospitalCare'), /highest-DV/);
  assert.match(copy('addictionWithdrawal'), /one year/i);
  assert.match(copy('therapyDVs'), /2d6 Humanity/);
  assert.match(copy('drugEffects'), /additional dose extends the Primary Effect by its full duration/);
});

test('editable NPC starting stats derive HP and the wound threshold from BODY and WILL', () => {
  for (let n = 0; n < 100; n++) {
    const { stats, hp, seriouslyWounded } = engine.createNPCStats();
    assert.equal(Object.keys(stats).length, 10);
    assert.ok(Object.values(stats).every(value => value >= 2 && value <= 8));
    assert.equal(hp, 10 + 5 * Math.ceil((stats.BODY + stats.WILL) / 2));
    assert.equal(seriouslyWounded, Math.ceil(hp / 2));
  }
});

test('session library migrates the existing session intact and keeps the original backup', () => {
  const fixture = sessionStorageFixture();
  const legacy = { ...engine.emptySession(), name: 'La deuda', notes: 'Una pista importante', reader: true, favorites: ['gigFull'], mission: { objective: 'Encontrar a Zero' }, history: [{ id: 'roll', title: '1d10', text: '7', kind: 'dados', time: 42, pinned: true }] };
  const raw = JSON.stringify(legacy);
  fixture.values.set(engine.LEGACY_SESSION_KEY, raw);
  const store = fixture.open();
  assert.deepEqual(fixture.active(store), legacy);
  assert.equal(fixture.values.get(engine.LEGACY_SESSION_KEY), raw);
  assert.deepEqual(engine.parseSessionLibrary(fixture.values.get(engine.SESSION_LIBRARY_KEY)).sessions[0].data, legacy);
  store.setSession(current => ({ ...current, notes: 'Pista actualizada' }));
  assert.equal(fixture.active(fixture.open()).notes, 'Pista actualizada', 'v2 must take precedence over its old backup');
});

test('switching, renaming and reloading sessions keeps each workspace independent', () => {
  const fixture = sessionStorageFixture();
  const store = fixture.open();
  const originalId = store.getSnapshot().library.activeId;
  store.setSession(current => ({ ...current, notes: 'Caso A', reader: true, npcs: [{ id: 'a', name: 'Zero', role: 'Fixer', status: 'Vivo', relationship: 'Deuda', notes: 'Solo A', stats: '' }] }));
  assert.equal(store.createSession('b', '  Caso B  '), true);
  assert.equal(fixture.active(store).name, 'Caso B');
  assert.equal(fixture.active(store).reader, true, 'theme is global');
  assert.equal(fixture.active(store).notes, '');
  assert.deepEqual(fixture.active(store).npcs, []);
  store.setSession(current => engine.appendEntry({ ...current, notes: 'Notas B' }, { id: 'b1', title: 'Tirada B', text: '5', kind: 'dados', time: 3, pinned: true }));
  assert.equal(store.renameSession('B / Después del golpe'), true);
  assert.equal(store.selectSession(originalId), true);
  assert.equal(fixture.active(store).notes, 'Caso A');
  assert.equal(fixture.active(store).npcs[0].name, 'Zero');
  assert.deepEqual(fixture.active(store).history, []);
  assert.equal(store.selectSession('b'), true);
  const reopened = fixture.open();
  assert.equal(reopened.getSnapshot().library.activeId, 'b');
  assert.equal(fixture.active(reopened).name, 'B / Después del golpe');
  assert.equal(fixture.active(reopened).notes, 'Notas B');
  assert.equal(fixture.active(reopened).history[0].id, 'b1');
  assert.equal(store.deleteSession(), true);
  assert.equal(fixture.active(store).notes, 'Caso A');
  assert.equal(store.deleteSession(), false, 'keep the final session');
  assert.equal(store.createSession('empty', '  '), false);
  assert.equal(store.renameSession(''), false);
});

test('a failed save retains pending notes and prevents switching until they are saved', () => {
  const fixture = sessionStorageFixture();
  const store = fixture.open();
  store.createSession('b', 'B');
  store.selectSession('initial');
  const persisted = fixture.values.get(engine.SESSION_LIBRARY_KEY);
  fixture.setWritable(false);
  store.setSession(current => ({ ...current, notes: 'No perder esta nota' }));
  assert.equal(fixture.active(store).notes, 'No perder esta nota');
  assert.equal(store.getSnapshot().dirty, true);
  assert.ok(store.getSnapshot().error);
  assert.equal(store.selectSession('b'), false);
  assert.equal(store.createSession('c', 'C'), false);
  assert.equal(store.deleteSession(), false);
  assert.equal(store.getSnapshot().library.activeId, 'initial');
  assert.equal(fixture.values.get(engine.SESSION_LIBRARY_KEY), persisted);
  fixture.setWritable(true);
  assert.equal(store.retrySave(), true);
  assert.equal(store.getSnapshot().error, '');
  assert.equal(store.selectSession('b'), true);
  store.selectSession('initial');
  assert.equal(fixture.active(fixture.open()).notes, 'No perder esta nota');
});

test('session writes merge other tabs and never redirect edits to another session', () => {
  const fixture = sessionStorageFixture();
  const a = fixture.open();
  a.createSession('b', 'B');
  a.selectSession('initial');
  const b = fixture.open();
  b.selectSession('b');
  b.setSession(current => ({ ...current, notes: 'Desde pestaña B' }));
  a.setSession(current => ({ ...current, notes: 'Desde pestaña A' }));
  a.sync();
  assert.equal(a.getSnapshot().library.activeId, 'initial');
  b.sync();
  assert.equal(b.getSnapshot().library.activeId, 'b');
  assert.equal(fixture.active(a).notes, 'Desde pestaña A');
  assert.equal(fixture.active(b).notes, 'Desde pestaña B');
  b.deleteSession();
  const saved = fixture.values.get(engine.SESSION_LIBRARY_KEY);
  // A tab that has not yet received the deletion event cannot write into A.
  const stale = fixture.open();
  stale.createSession('c', 'C');
  a.sync();
  a.selectSession('c');
  a.deleteSession();
  stale.setSession(current => ({ ...current, notes: 'Edición obsoleta' }));
  assert.equal(stale.getSnapshot().blocked, true);
  assert.equal(engine.parseSessionLibrary(fixture.values.get(engine.SESSION_LIBRARY_KEY)).sessions.length, 1);
  assert.equal(engine.parseSessionLibrary(saved).sessions[0].data.notes, 'Desde pestaña A');
});

test('corrupt libraries and failed migrations cannot overwrite saved data', () => {
  for (const key of [engine.LEGACY_SESSION_KEY, engine.SESSION_LIBRARY_KEY]) {
    const fixture = sessionStorageFixture();
    fixture.values.set(key, '{broken');
    const store = fixture.open();
    assert.equal(store.getSnapshot().blocked, true);
    store.setSession(current => ({ ...current, notes: 'replacement' }));
    assert.equal(store.createSession('new', 'New'), false);
    assert.equal(fixture.values.get(key), '{broken');
  }
  const fixture = sessionStorageFixture();
  const raw = JSON.stringify({ ...engine.emptySession(), notes: 'Legacy notes' });
  fixture.values.set(engine.LEGACY_SESSION_KEY, raw);
  fixture.setWritable(false);
  const store = fixture.open();
  assert.equal(fixture.active(store).notes, 'Legacy notes');
  assert.equal(store.getSnapshot().dirty, true);
  assert.equal(fixture.values.get(engine.LEGACY_SESSION_KEY), raw);
  fixture.setWritable(true);
  assert.equal(store.retrySave(), true);
  assert.equal(fixture.active(fixture.open()).notes, 'Legacy notes');
  const valid = engine.createSessionLibrary();
  for (const invalid of [{ ...valid, activeId: 'missing' }, { ...valid, sessions: [] }, { ...valid, sessions: [...valid.sessions, valid.sessions[0]] }, { ...valid, sessions: [{ id: 'initial', data: {} }] }]) {
    assert.throws(() => engine.parseSessionLibrary(JSON.stringify(invalid)));
  }
});

test('legacy per-session favorites merge once into a shared GM selection', () => {
  const fixture = sessionStorageFixture();
  const older = {
    version: 2, activeId: 'a', reader: false,
    sessions: [
      { id: 'a', data: { ...engine.emptySession(), name: 'A', favorites: ['gigFull', 'contactFull'] } },
      { id: 'b', data: { ...engine.emptySession(), name: 'B', favorites: ['contactFull', 'itemFull'] } },
    ],
  };
  fixture.values.set(engine.SESSION_LIBRARY_KEY, JSON.stringify(older));
  const store = fixture.open();
  assert.deepEqual(store.getSnapshot().library.favorites, { generators: ['gigFull', 'contactFull', 'itemFull'], references: [] });
  store.toggleFavorite('generators', 'contactFull');
  store.toggleFavorite('references', 'cemkQuickhacks10');
  store.selectSession('b');
  assert.deepEqual(fixture.active(store).favorites, ['gigFull', 'itemFull']);
  store.createSession('c', 'C');
  assert.deepEqual(store.getSnapshot().library.favorites, { generators: ['gigFull', 'itemFull'], references: ['cemkQuickhacks10'] });
  store.deleteSession();
  const reopened = fixture.open();
  assert.deepEqual(reopened.getSnapshot().library.favorites, { generators: ['gigFull', 'itemFull'], references: ['cemkQuickhacks10'] });
  assert.ok(!reopened.getSnapshot().library.favorites.generators.includes('contactFull'), 'old session fields must not resurrect removed favorites');
});

test('shared generator and reference favorites persist independently, including empty selections', () => {
  const fixture = sessionStorageFixture();
  const store = fixture.open();
  for (const key of [...store.getSnapshot().library.favorites.generators]) store.toggleFavorite('generators', key);
  store.toggleFavorite('generators', 'same-key');
  store.toggleFavorite('references', 'same-key');
  store.toggleFavorite('generators', 'same-key');
  store.createSession('b', 'B');
  assert.deepEqual(store.getSnapshot().library.favorites, { generators: [], references: ['same-key'] });
  store.toggleFavorite('references', 'same-key');
  assert.deepEqual(fixture.open().getSnapshot().library.favorites, { generators: [], references: [] });
  fixture.setWritable(false);
  assert.equal(store.toggleFavorite('references', 'cemkTurn'), false);
  assert.deepEqual(store.getSnapshot().library.favorites.references, [], 'a failed save must not pretend the favorite persisted');
});

test('another tab changing favorites is preserved when saving notes or retrying a failed save', () => {
  const fixture = sessionStorageFixture();
  const a = fixture.open();
  const b = fixture.open();
  a.toggleFavorite('references', 'cemkTurn');
  b.toggleFavorite('references', 'cemkDirect');
  a.setSession(current => ({ ...current, notes: 'A note' }));
  assert.deepEqual(a.getSnapshot().library.favorites.references, ['cemkTurn', 'cemkDirect']);
  fixture.setWritable(false);
  a.setSession(current => ({ ...current, notes: 'Pending note' }));
  fixture.setWritable(true);
  b.toggleFavorite('references', 'cemkTurn');
  assert.equal(a.retrySave(), true);
  assert.deepEqual(a.getSnapshot().library.favorites.references, ['cemkDirect']);
  assert.equal(fixture.active(a).notes, 'Pending note');
  b.sync();
  assert.deepEqual(b.getSnapshot().library.favorites.references, ['cemkDirect']);
});
