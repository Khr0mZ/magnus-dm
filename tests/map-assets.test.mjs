import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTileIndex, packMapAssets } from '../scripts/pack-night-city-map.mjs';

test('the publication index preserves the exact original image at every coordinate, including zooms 18 and 19', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/maps/night-city-2077/manifest.json', import.meta.url), 'utf8'));
  const { index } = createTileIndex(manifest);
  const originals = new Map(manifest.tiles.map(tile => [`${tile.z}/${tile.x}/${tile.y}`, tile.sha256]));
  assert.ok(index.paths.length < 20000, 'the full map fits within the static asset file limit');
  assert.ok(index.levels[18] && index.levels[19]);
  for (const tile of manifest.tiles) {
    const level = index.levels[tile.z];
    const offset = (tile.x - level.xMin) * level.height + tile.y - level.yMin;
    assert.equal(originals.get(index.paths[level.tiles[offset]]), tile.sha256);
  }
  const missing = structuredClone(manifest);
  missing.tiles.pop();
  assert.throws(() => createTileIndex(missing), /incomplete/);
});

test('publication packing verifies bytes, removes only repetitions and embeds the coordinate index', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'magnus-map-assets-'));
  try {
    const a = Buffer.from('identical image'), b = Buffer.from('different image');
    const tiles = [[0, 0, a], [0, 1, a], [1, 0, b], [1, 1, a]].map(([x, y, bytes]) => ({
      z: 11, x, y, sha256: createHash('sha256').update(bytes).digest('hex'), bytes,
    }));
    const manifest = { complete: true, expectedTiles: 4, levels: [{ zoom: 11, xMin: 0, xMax: 1, yMin: 0, yMax: 1 }], tiles };
    for (const tile of tiles) {
      await mkdir(join(directory, 'reading', '11', String(tile.x)), { recursive: true });
      await writeFile(join(directory, 'reading', '11', String(tile.x), `${tile.y}.png`), tile.bytes);
    }
    await writeFile(join(directory, 'manifest.json'), JSON.stringify(manifest));
    await writeFile(join(directory, 'preview.js'), '/* original viewer */');
    assert.deepEqual(await packMapAssets(directory), { coordinates: 4, images: 2 });
    assert.deepEqual(await readFile(join(directory, 'reading/11/0/0.png')), a);
    assert.deepEqual(await readFile(join(directory, 'reading/11/1/0.png')), b);
    await assert.rejects(readFile(join(directory, 'reading/11/0/1.png')), { code: 'ENOENT' });
    await assert.rejects(readFile(join(directory, 'reading/11/1/1.png')), { code: 'ENOENT' });
    assert.match(await readFile(join(directory, 'preview.js'), 'utf8'), /MAGNUS_MAP_TILES.*original viewer/s);
    await writeFile(join(directory, 'reading/11/0/1.png'), 'corrupted image');
    await writeFile(join(directory, 'reading/11/1/1.png'), a);
    await assert.rejects(packMapAssets(directory), /checksum mismatch/);
    assert.equal(await readFile(join(directory, 'reading/11/0/1.png'), 'utf8'), 'corrupted image');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
