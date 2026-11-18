import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createPreviewSnapshot } from './preview-snapshot.mjs';
import { validatePilotSnapshot,writePublicSnapshot,writePublicPilot } from './pilot-export.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'Township_Test';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (repository.toLowerCase().endsWith('.github.io') ? '' : `/${repository}`);
if (basePath && !/^\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(basePath)) throw new Error('Use an empty base path or app path segments without a trailing slash.');
const env = { ...process.env, NEXT_PUBLIC_SITE_MODE: 'pages', NEXT_PUBLIC_BASE_PATH: basePath };
// Explicitly limited validation mode; never used by the deployment workflow.
const exampleOnly=process.argv.includes('--example-only');
if(exampleOnly&&process.env.GITHUB_ACTIONS)throw Error('Example-only validation cannot publish the production site.');
let pilot=null;
if(!exampleOnly){
    try{pilot=JSON.parse(await readFile(resolve(root,'data/pasar-seni/bundle.json'),'utf8'));}
    catch(error){if(error.code==='ENOENT')throw Error('The real Pasar Seni source bundle is missing. Run npm run data:refresh after allowing the data-source domains; no placeholder pilot will be published.');throw error;}
    validatePilotSnapshot(pilot);
}

await mkdir(resolve(root, '.local'), { recursive: true });
const graphPath = resolve(root, '.local/pages-graph.json');
execFileSync(process.execPath, ['scripts/osm-to-graph.mjs', '--in', 'precinct.json', '--out-json', graphPath], { cwd: root, stdio: 'inherit' });
const snapshot = createPreviewSnapshot(JSON.parse(await readFile(graphPath, 'utf8')), JSON.parse(await readFile(resolve(root, 'precinct.json'), 'utf8')));
const publicData = resolve(root, 'public/pilot');
await rm(publicData,{recursive:true,force:true});
await writePublicSnapshot(publicData,snapshot); // Legacy bridge links and old packs.
await writePublicSnapshot(resolve(publicData,'elmina'),snapshot);
if(pilot)await writePublicPilot(resolve(publicData,'pasar-seni'),pilot);
execFileSync(process.execPath,['scripts/build-planning-worker.mjs'],{cwd:root,stdio:'inherit'});
execFileSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], { cwd: root, env, stdio: 'inherit' });
await writeFile(resolve(root, 'out/.nojekyll'), '');
await writeFile(resolve(root, 'out/site-config.json'), JSON.stringify({ mode: 'pages', base_path: basePath,
    snapshot_at: pilot?.graph.source.snapshot_at??snapshot.graph.source.snapshot_at, built_at: new Date().toISOString(), revision: process.env.GITHUB_SHA || 'local',
    areas:pilot?['pasar-seni','elmina']:['elmina'],validation_only:exampleOnly }));
execFileSync(process.execPath, ['scripts/check-pages.mjs'], { cwd: root, stdio: 'inherit' });
