import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../public/maps/night-city-2077/', import.meta.url));
const bounds = { south: -0.1, west: -0.1, north: 0.1, east: 0.1 };
const minZoom = 11;
const maxZoom = 19;
const tileSize = 256;
const sourceTemplate = 'https://tile.nightcitynavigator.com/nightcity/{z}/{x}/{y}.png';
const workerOption = process.argv.find(argument => argument.startsWith('--workers='));
const workers = workerOption ? Number(workerOption.split('=')[1]) : 12;
if (!Number.isInteger(workers) || workers < 1 || workers > 64) throw new Error('--workers must be an integer from 1 to 64.');
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let bit = 0; bit < 8; bit++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});

function validPng(buffer) {
  if (buffer.length < 45 || !buffer.subarray(0, 8).equals(pngSignature)) return false;
  if (buffer.toString('ascii', 12, 16) !== 'IHDR') return false;
  if (buffer.readUInt32BE(16) !== tileSize || buffer.readUInt32BE(20) !== tileSize) return false;
  let offset = 8;
  let imageData = false;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > buffer.length) return false;
    let crc = 0xffffffff;
    for (let i = offset + 4; i < end - 4; i++) crc = crcTable[(crc ^ buffer[i]) & 255] ^ (crc >>> 8);
    if (((crc ^ 0xffffffff) >>> 0) !== buffer.readUInt32BE(end - 4)) return false;
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') imageData = true;
    if (type === 'IEND') return imageData && length === 0 && end === buffer.length;
    offset = end;
  }
  return false;
}

function tileX(longitude, zoom) {
  return Math.floor(((longitude + 180) / 360) * 2 ** zoom);
}

function tileY(latitude, zoom) {
  const radians = latitude * Math.PI / 180;
  return Math.floor((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2 * 2 ** zoom);
}

const levels = Array.from({ length: maxZoom - minZoom + 1 }, (_, index) => {
  const zoom = minZoom + index;
  const xMin = tileX(bounds.west, zoom);
  const xMax = tileX(bounds.east, zoom);
  const yMin = tileY(bounds.north, zoom);
  const yMax = tileY(bounds.south, zoom);
  return { zoom, xMin, xMax, yMin, yMax, count: (xMax - xMin + 1) * (yMax - yMin + 1) };
});

const tiles = levels.flatMap(({ zoom, xMin, xMax, yMin, yMax }) => {
  const level = [];
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) level.push({ z: zoom, x, y });
  }
  return level;
});

const plan = {
  name: 'Night City 2077',
  source: 'https://nightcitynavigator.com/',
  sourceTemplate,
  sourceConfiguration: 'https://nightcitynavigator.com/assets/application-339705ea40f73a4ec073f156879c60dcfb70ab3b7d9ea9c4d94b82b1aa1ee6c0.js',
  attribution: 'Game data © CD PROJEKT RED. Map © Night City Navigator and contributors.',
  license: 'ODbL-1.0',
  licenseUrl: 'https://nightcitynavigator.com/copyright',
  coordinateSystem: 'EPSG:3857',
  scheme: 'xyz',
  tileSize,
  bounds,
  minZoom,
  maxZoom,
  providerMaxZoom: 19,
  coverage: 'Complete provider bounds at every supported zoom (11–19), including the high-detail provider levels 18 and 19.',
  localTemplate: '/maps/night-city-2077/reading/{z}/{x}/{y}.png',
  levels,
  expectedTiles: tiles.length,
};

if (process.argv.includes('--plan')) {
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}

const verifying = process.argv.includes('--verify');
const tileRecords = [];
const failures = [];
let nextIndex = 0;
let reused = 0;
let downloaded = 0;
let bytes = 0;
let pausedUntil = 0;
let interrupted = false;
const startedAt = new Date().toISOString();
process.on('SIGINT', () => { interrupted = true; });
process.on('SIGTERM', () => { interrupted = true; });

const wait = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));
const localPath = ({ z, x, y }) => `${root}/reading/${z}/${x}/${y}.png`;
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex');

async function readExisting(tile) {
  try {
    const buffer = await readFile(localPath(tile));
    return validPng(buffer) ? buffer : null;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function fetchTile(tile) {
  const url = sourceTemplate.replace('{z}', tile.z).replace('{x}', tile.x).replace('{y}', tile.y);
  let lastError;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (interrupted) throw new Error('Interrupted before tile download.');
    while (Date.now() < pausedUntil && !interrupted) await wait(Math.min(pausedUntil - Date.now(), 1000));
    if (interrupted) throw new Error('Interrupted before tile download.');
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'MagnusLaser-LocalMapCache/1.0', Accept: 'image/png' },
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 429 || response.status === 503) {
          const retry = response.headers.get('retry-after');
          const seconds = Number(retry);
          const delay = retry && Number.isFinite(seconds) ? seconds * 1000 : retry ? Date.parse(retry) - Date.now() : 5000;
          pausedUntil = Math.max(pausedUntil, Date.now() + Math.max(1000, Number.isFinite(delay) ? delay : 5000));
        }
        const error = new Error(`HTTP ${response.status} for ${tile.z}/${tile.x}/${tile.y}`);
        error.permanent = response.status >= 400 && response.status < 500 && ![408, 429].includes(response.status);
        throw error;
      }
      if (!response.headers.get('content-type')?.startsWith('image/png')) {
        await response.body?.cancel();
        throw new Error(`Unexpected content type for ${tile.z}/${tile.x}/${tile.y}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!validPng(buffer)) throw new Error(`Invalid or truncated PNG for ${tile.z}/${tile.x}/${tile.y}`);
      const directory = `${root}/reading/${tile.z}/${tile.x}`;
      await mkdir(directory, { recursive: true });
      const destination = localPath(tile);
      await writeFile(`${destination}.part`, buffer);
      await rename(`${destination}.part`, destination);
      return buffer;
    } catch (error) {
      lastError = error;
      if (error.permanent || interrupted) break;
      await wait(500 * 2 ** attempt);
    }
  }
  throw lastError;
}

async function saveManifest() {
  const manifest = {
    ...plan,
    startedAt,
    checkedAt: new Date().toISOString(),
    complete: tileRecords.length === tiles.length && failures.length === 0,
    availableTiles: tileRecords.length,
    totalBytes: bytes,
    failures,
    tiles: tileRecords.slice().sort((a, b) => a.z - b.z || a.x - b.x || a.y - b.y),
  };
  await writeFile(`${root}/manifest.json.part`, `${JSON.stringify(manifest, null, 2)}\n`);
  await rename(`${root}/manifest.json.part`, `${root}/manifest.json`);
}

await mkdir(root, { recursive: true });
console.log(`${verifying ? 'Verifying' : 'Downloading'} ${tiles.length} tiles, zoom ${minZoom}–${maxZoom}; ${workers} workers. Existing valid tiles are reused.`);
const progress = setInterval(() => {
  console.log(`${tileRecords.length}/${tiles.length} valid; ${downloaded} downloaded; ${reused} reused; ${(bytes / 1048576).toFixed(1)} MiB; ${failures.length} failures.`);
}, 10000);

await Promise.all(Array.from({ length: workers }, async () => {
  while (nextIndex < tiles.length && !interrupted) {
    const tile = tiles[nextIndex++];
    try {
      let buffer = await readExisting(tile);
      if (buffer) reused++;
      else if (verifying) throw new Error('Missing or invalid local PNG.');
      else {
        buffer = await fetchTile(tile);
        downloaded++;
        await wait(25);
      }
      tileRecords.push({ ...tile, bytes: buffer.length, sha256: hash(buffer) });
      bytes += buffer.length;
    } catch (error) {
      failures.push({ ...tile, error: error.message });
      console.error(`Tile ${tile.z}/${tile.x}/${tile.y}: ${error.message}`);
    }
  }
}));

clearInterval(progress);
await saveManifest();
console.log(JSON.stringify({ complete: tileRecords.length === tiles.length && !failures.length, available: tileRecords.length, expected: tiles.length, downloaded, reused, bytes, failures: failures.length, interrupted }));
if (tileRecords.length !== tiles.length || failures.length) process.exitCode = 1;
