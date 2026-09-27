import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { packMapAssets } from '../scripts/pack-night-city-map.mjs';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const siteUrl = new URL(process.env.MAGNUS_SITE_URL || 'https://khr0mz.github.io/magnus-dm/');
if (!['https:', 'http:'].includes(siteUrl.protocol) || siteUrl.username || siteUrl.password || siteUrl.search || siteUrl.hash) {
  throw new Error('MAGNUS_SITE_URL must be a public HTTP(S) website URL.');
}
siteUrl.pathname = `${siteUrl.pathname.replace(/\/+$/, '')}/`;
const basePath = siteUrl.pathname.replace(/\/$/, '');
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'build', '--webpack'], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    MAGNUS_SITE_URL: siteUrl.href,
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_TELEMETRY_DISABLED: '1',
  },
});
const exitCode = await new Promise((resolve, reject) => {
  child.once('error', reject);
  child.once('exit', (code, signal) => {
    if (signal) reject(new Error(`Pages build interrupted: ${signal}`));
    else resolve(code);
  });
});
if (exitCode !== 0) process.exit(exitCode ?? 1);

const result = await packMapAssets(fileURLToPath(new URL('../out/maps/night-city-2077/', import.meta.url)));
await writeFile(new URL('../out/.nojekyll', import.meta.url), '');
console.log(`GitHub Pages: ${siteUrl.href}`);
console.log(`Map: ${result.coordinates} coordinates, ${result.images} unique images.`);
