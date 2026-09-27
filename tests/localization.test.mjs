import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'vite';
import { fileURLToPath } from 'node:url';

await build({ configFile: false, logLevel: 'silent', build: { outDir: 'work/locale-tests', emptyOutDir: true, minify: false, lib: { entry: fileURLToPath(new URL('./locale-entry.tsx', import.meta.url)), formats: ['es'], fileName: () => 'ui.mjs' }, rollupOptions: { external: ['react', 'react-dom/server', 'react/jsx-runtime'] } } });
const { renderWorkbench, renderExplorer, renderReferenceDocument, renderFavoriteReferences, catalogSizes } = await import('../work/locale-tests/ui.mjs');

test('the workbench renders both languages with the correct switch selection', () => {
  const spanish = renderWorkbench('es');
  const english = renderWorkbench('en');
  for (const text of ['Nueva sesión', 'Cambiar de sesión', 'Nombre de la sesión', 'Mesa del DM', 'Notas de sesión', 'Crear reloj']) assert.ok(spanish.includes(text), text);
  for (const text of ['New session', 'Switch session', 'Session name', 'DM Workbench', 'Session notes', 'Create clock', 'Contact / NPC', 'Mission builder']) assert.ok(english.includes(text), text);
  assert.match(spanish, /lang="es" aria-label="Español" aria-pressed="true"/);
  assert.match(english, /lang="en" aria-label="English" aria-pressed="true"/);
  assert.doesNotMatch(english, /Lanzador de dados|Crear reloj|Herramientas de dirección|Recuperando|GUARDADO/);
  assert.doesNotMatch(spanish + english, /dice-panel|<footer|<a class="brand"|matrix-rain|hero-poster|terminal-hero|YOUR TABLE\.|TU MESA\.|save-indicator|>Renombrar<|>Rename</);
  assert.match(spanish, /NIGHT CITY \/ 2080/);
  assert.match(english, /NIGHT CITY \/ 2080/);
  assert.doesNotMatch(spanish + english, /NIGHT CITY \/ 2045/);
  assert.equal([...spanish.matchAll(/aria-label="Abrir herramienta:/g)].length, 9);
  assert.equal([...english.matchAll(/aria-label="Open tool:/g)].length, 9);
  assert.match(english, /Close tool/);
  assert.doesNotMatch(spanish + english, /class="tool-folders"|class="tool-selector"/);
});

test('generator folders include the contextual encounter and translated empty filters', () => {
  const spanish = renderExplorer('es', 'generators');
  const english = renderExplorer('en', 'generators');
  assert.match(spanish, /Carpetas de generadores/);
  assert.match(renderExplorer('es', 'generators', 'Encuentro en Night City'), /Configurar: Encuentro en Night City/);
  assert.match(renderExplorer('en', 'generators', 'Night City encounter'), /Configure: Night City encounter/);
  assert.match(english, /Generator folders/);
  assert.match(english, /Add to favorites:/);
  assert.doesNotMatch(english, /Todas las carpetas|Configurar encuentro|Añadir a favoritos/);
  const empty = renderExplorer('en', 'generators', 'xxx-no-matching-file');
  assert.match(empty, /Clear filters/);
  assert.doesNotMatch(empty, /class="stack-file-open"/);
});

test('reference search finds translated table cells, not only table titles', () => {
  const english = renderExplorer('en', 'reference', 'SUPPRESSIVE fire');
  assert.match(english, /Combat Actions/i);
  assert.match(english, /Open table: Available Combat Actions/i);
  assert.match(english, /Reference folders/);
  const empty = renderExplorer('en', 'reference', 'xxx-no-matching-file');
  assert.match(empty, /No tables found/);
  assert.doesNotMatch(empty, /class="stack-file-open"/);
});

test('scrollable stacks render every file without pagination and open reference contents separately', () => {
  for (const language of ['es', 'en']) {
    for (const kind of ['generators', 'reference']) {
      const html = renderExplorer(language, kind);
      assert.equal([...html.matchAll(/class="stack-file-open"/g)].length, catalogSizes[kind]);
      assert.match(html, language === 'en' ? /Drag or swipe/ : /Arrastra o desliza/);
      assert.doesNotMatch(html, /is-selected|stack-page|stack-controls|lucide-star|order-select|<h3><button|class="stack-content" hidden/);
      if (kind === 'reference') assert.doesNotMatch(html, /<table>/);
    }
  }
  const document = renderReferenceDocument('en', 'combatActions');
  assert.match(document, /<table>/);
  assert.match(document, /Suppressive Fire/i);
  assert.match(document, /Close table/);
  assert.match(document, /Copy table/);
  assert.doesNotMatch(document, /t:combat\.|Cerrar tabla/);
});

test('Edgerunners rules can be found by Spanish or canonical English terms and opened with source attribution', () => {
  const esSearch = renderExplorer('es', 'reference', 'quemadura sinaptica');
  const enSearch = renderExplorer('en', 'reference', 'synapse burnout');
  assert.match(esSearch, /Abrir tabla: Quickhacks · DV 10/);
  assert.match(enSearch, /Open table: Quickhacks · DV 10/);
  assert.match(renderExplorer('es', 'reference', 'cable'), /Conexión directa/);
  assert.match(renderExplorer('en', 'reference', 'neuroport firewall'), /Firewall \/ unsafe Jack Out/);
  for (const language of ['es', 'en']) {
    const document = renderReferenceDocument(language, 'cemkQuickhacks10');
    assert.match(document, /Synapse Burnout/);
    assert.match(document, /3d6/);
    assert.match(document, /Rule Book · pp. 16–17/);
    assert.match(document, language === 'en' ? /Copy table/ : /Copiar tabla/);
    assert.doesNotMatch(document, /t:cemk\.|undefined/);
  }
  const english = renderReferenceDocument('en', 'cemkDirect');
  assert.match(english, /RED \+ CEMK/);
  assert.match(english, /\+1 NET Action per turn/);
  assert.doesNotMatch(english, /Conexión directa|Fuente:/);
});

test('reference favorites expose memory markers, filtering and translated shortcuts on the DM desk', () => {
  for (const language of ['es', 'en']) {
    const html = renderExplorer(language, 'reference', 'synapse burnout', ['cemkQuickhacks10']);
    assert.match(html, language === 'es' ? /Favoritos/ : /Favorites/);
    const action = language === 'es' ? 'Quitar de favoritos' : 'Remove from favorites';
    assert.ok(html.includes(`aria-label="${action}: Quickhacks · DV 10" aria-pressed="true"`));
    const quick = renderFavoriteReferences(language, ['cemkQuickhacks10', 'combatActions', 'unknown-key']);
    assert.equal([...quick.matchAll(/class="stack-file-open"/g)].length, 2);
    assert.match(quick, /Quickhacks · DV 10/);
    assert.doesNotMatch(quick, /unknown-key/);
    assert.match(quick, language === 'es' ? /Referencias favoritas/ : /Favorite references/);
  }
  assert.match(renderFavoriteReferences('en', []), /favorite chip to access it here in any session/);
});

test('category filters render a folder directory with an accessible active route in both explorers', () => {
  for (const kind of ['generators', 'reference']) {
    const html = renderExplorer('en', kind);
    assert.match(html, /<details class="category-routing"/);
    assert.match(html, /<summary class="router-trigger"/);
    assert.match(html, /Change folder/);
    assert.match(html, /class="directory-matrix"/);
    assert.match(html, /class="directory-port"[^>]*aria-pressed="true"/);
    assert.doesNotMatch(html, /class="category-bus"|stack-directory-select|Cambiar carpeta/);
  }
});
