import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createPreviewSnapshot } from './preview-snapshot.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'Township_Test';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (repository.toLowerCase().endsWith('.github.io') ? '' : `/${repository}`);
if (basePath && !/^\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(basePath)) throw new Error('Use an empty base path or app path segments without a trailing slash.');
const env = { ...process.env, NEXT_PUBLIC_SITE_MODE: 'pages', NEXT_PUBLIC_BASE_PATH: basePath };

await mkdir(resolve(root, '.local'), { recursive: true });
const graphPath = resolve(root, '.local/pages-graph.json');
execFileSync(process.execPath, ['scripts/osm-to-graph.mjs', '--in', 'precinct.json', '--out-json', graphPath], { cwd: root, stdio: 'inherit' });
const snapshot = createPreviewSnapshot(JSON.parse(await readFile(graphPath, 'utf8')), JSON.parse(await readFile(resolve(root, 'precinct.json'), 'utf8')));
const publicData = resolve(root, 'public/pilot');
await mkdir(publicData, { recursive: true });
for (const [name, value] of Object.entries({ graph: snapshot.graph, 'walking-data': snapshot.walking, hazards: snapshot.hazards, reports: snapshot.reports })) {
    await writeFile(resolve(publicData, `${name}.json`), JSON.stringify(value));
}
execFileSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], { cwd: root, env, stdio: 'inherit' });
await writeFile(resolve(root, 'out/.nojekyll'), '');
await writeFile(resolve(root, 'out/site-config.json'), JSON.stringify({ mode: 'pages', base_path: basePath,
    snapshot_at: snapshot.graph.source.snapshot_at, built_at: new Date().toISOString(), revision: process.env.GITHUB_SHA || 'local' }));
execFileSync(process.execPath, ['scripts/check-pages.mjs'], { cwd: root, stdio: 'inherit' });
