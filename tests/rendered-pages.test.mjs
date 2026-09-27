import assert from 'node:assert/strict';
import test from 'node:test';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const siteUrl = new URL(process.env.MAGNUS_SITE_URL || 'https://khr0mz.github.io/magnus-dm/');
const basePath = siteUrl.pathname.replace(/\/$/, '');
const output = resolve('out');

function outputPath(url, parent = siteUrl) {
  const parsed = new URL(url, parent);
  assert.equal(parsed.origin, siteUrl.origin);
  assert.ok(parsed.pathname.startsWith(`${basePath}/`), `Asset escaped the project path: ${parsed.pathname}`);
  return resolve(output, decodeURIComponent(parsed.pathname.slice(basePath.length + 1)));
}

test('the static workbench includes the real UI, social card and locally resolvable scripts, styles and images', async () => {
  const html = await readFile(resolve(output, 'index.html'), 'utf8');
  for (const label of ['Magnus Laser', 'Cambiar de sesión', 'Mesa del DM', 'Mapa de Night City']) assert.ok(html.includes(label), label);
  assert.ok(html.includes(new URL('og.png', siteUrl).href));
  assert.doesNotMatch(html, /codex-preview|terminal-hero|<footer/);
  const urls = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(match => match[1].replaceAll('&amp;', '&'));
  assert.ok(urls.some(url => url.includes('/_next/')), 'client scripts and styles are included');
  assert.ok(urls.includes(`${basePath}/magnus-laser.png`));
  for (const url of urls) await access(outputPath(url));
  await access(resolve(output, '.nojekyll'));
  const css = urls.filter(url => new URL(url, siteUrl).pathname.endsWith('.css'));
  for (const url of css) {
    const stylesheet = await readFile(outputPath(url), 'utf8');
    for (const [, asset] of stylesheet.matchAll(/url\(["']?([^\s)"']+)["']?\)/g)) {
      if (asset.startsWith('data:')) continue;
      await access(outputPath(asset, new URL(url, siteUrl)));
    }
  }
});

test('the standalone map resolves its branding and fonts from the project path, with zoom 18–19 and linked-marker actions', async () => {
  const mapUrl = new URL('maps/night-city-2077/preview.html', siteUrl);
  const html = await readFile(outputPath(mapUrl), 'utf8');
  for (const [, url] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (url.startsWith('https:')) continue;
    await access(outputPath(url, mapUrl));
  }
  const cssUrl = new URL('./preview.css', mapUrl);
  const css = await readFile(outputPath(cssUrl), 'utf8');
  for (const [, asset] of css.matchAll(/url\(["']?([^\s)"']+)["']?\)/g)) await access(outputPath(asset, cssUrl));
  const script = await readFile(outputPath(new URL('./preview.js', mapUrl)), 'utf8');
  const indexLine = script.split('\n')[0];
  const index = JSON.parse(indexLine.slice('globalThis.MAGNUS_MAP_TILES = '.length, -1));
  assert.ok(index.levels[18] && index.levels[19]);
  assert.equal(Object.values(index.levels).reduce((total, level) => total + level.tiles.length, 0), 114056);
  for (const coordinate of index.paths) await access(resolve(output, 'maps/night-city-2077/reading', `${coordinate}.png`));
  assert.match(script, /magnus:map-place-entry/);
  assert.match(script, /magnus:map-edit-entry/);
});
