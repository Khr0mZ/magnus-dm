import assert from 'node:assert/strict';
import test from 'node:test';

test('production page renders the DM workbench, Spanish metadata and no starter UI', async () => {
  const { default: worker } = await import('../dist/server/index.js');
  const response = await worker.fetch(new Request('https://magnus.example/', { headers: { accept: 'text/html', host: 'magnus.example' } }), { ASSETS: { fetch: async () => new Response('Not found', { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /lang="es"/);
  for (const text of ['Magnus Laser', 'Nueva sesión', 'Cambiar de sesión', 'Mesa del DM', 'Oráculo', 'Generadores', 'Notas de sesión', 'Herramientas de dirección']) assert.ok(html.includes(text), text);
  assert.ok(html.includes('https://magnus.example/og.png'));
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton|terminal-hero/);
});
