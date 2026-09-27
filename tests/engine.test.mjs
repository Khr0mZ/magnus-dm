import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'vite';
import { fileURLToPath } from 'node:url';

await build({ configFile: false, logLevel: 'silent', build: { outDir: 'work/tests', emptyOutDir: true, minify: false, lib: { entry: fileURLToPath(new URL('./entry.ts', import.meta.url)), formats: ['es'], fileName: () => 'engine.mjs' } } });
const engine = await import('../work/tests/engine.mjs');

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
