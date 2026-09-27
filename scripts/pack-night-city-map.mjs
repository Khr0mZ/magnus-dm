import { createHash } from 'node:crypto';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Keep every downloaded XYZ tile locally, but publish identical images once.
// The viewer's generated index preserves every coordinate at every zoom level.
export function createTileIndex(manifest) {
  if (!manifest.complete || manifest.tiles.length !== manifest.expectedTiles) throw new Error('The local map is incomplete.');
  const index = { paths: [], levels: {} };
  const hashes = new Map();
  const files = [];
  for (const level of manifest.levels) {
    const { zoom, xMin, xMax, yMin, yMax } = level;
    if (![zoom, xMin, xMax, yMin, yMax].every(Number.isInteger) || zoom < 0 || zoom > 22
      || xMin < 0 || yMin < 0 || xMax >= 2 ** zoom || yMax >= 2 ** zoom || xMax < xMin || yMax < yMin
      || index.levels[zoom]) throw new Error('Invalid map coverage.');
    const width = xMax - xMin + 1, height = yMax - yMin + 1;
    index.levels[zoom] = { xMin, yMin, width, height, tiles: Array(width * height).fill(-1) };
  }
  for (const tile of manifest.tiles) {
    const { z, x, y, sha256 } = tile;
    const level = index.levels[z];
    if (![z, x, y].every(Number.isInteger) || !level || x < level.xMin || x >= level.xMin + level.width
      || y < level.yMin || y >= level.yMin + level.height || !/^[a-f0-9]{64}$/.test(sha256)) throw new Error('Invalid map tile.');
    const offset = (x - level.xMin) * level.height + y - level.yMin;
    if (level.tiles[offset] !== -1) throw new Error('Duplicate map coordinate.');
    const key = `${z}/${x}/${y}`;
    const duplicate = hashes.has(sha256);
    if (!duplicate) { hashes.set(sha256, index.paths.length); index.paths.push(key); }
    level.tiles[offset] = hashes.get(sha256);
    files.push({ key, sha256, duplicate });
  }
  if (Object.values(index.levels).some(level => level.tiles.includes(-1))) throw new Error('The map coverage has holes.');
  return { index, files };
}

export async function packMapAssets(directory) {
  const manifest = JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8'));
  const { index, files } = createTileIndex(manifest);
  // Verify the copied bytes before removing repetitions; never touch public/.
  let next = 0;
  const outcomes = await Promise.allSettled(Array.from({ length: 32 }, async () => {
    while (next < files.length) {
      const tile = files[next++];
      const path = resolve(directory, 'reading', `${tile.key}.png`);
      const bytes = await readFile(path);
      if (createHash('sha256').update(bytes).digest('hex') !== tile.sha256) throw new Error(`Map checksum mismatch: ${tile.key}`);
      if (tile.duplicate) await unlink(path);
    }
  }));
  const failure = outcomes.find(outcome => outcome.status === 'rejected');
  if (failure) throw failure.reason;
  const viewerPath = resolve(directory, 'preview.js');
  const viewer = await readFile(viewerPath, 'utf8');
  await writeFile(viewerPath, `globalThis.MAGNUS_MAP_TILES = ${JSON.stringify(index)};\n${viewer}`);
  return { coordinates: files.length, images: index.paths.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = fileURLToPath(new URL('../dist/client/maps/night-city-2077/', import.meta.url));
  const result = await packMapAssets(directory);
  console.log(`Map assets: ${result.coordinates} coordinates preserved in ${result.images} unique images.`);
}
