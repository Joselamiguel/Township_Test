import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { PILOTS, pointInPilot } from '../lib/pilots.ts';
import { download, importSourceFile } from './data-download.mjs';
import { validatePilotSnapshot } from './pilot-export.mjs';
import { createPilotSnapshot } from './pilot-snapshot.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const area = 'um-campus';
const out = resolve(root, 'data', area);
const local = resolve(root, '.local');
const arg = process.argv.indexOf('--osm-file');
const supplied = arg === -1 ? null : process.argv[arg + 1];
if (arg !== -1 && !supplied) throw Error('Supply an Overpass JSON or JSON.gz file.');

const box = PILOTS[area].bounds.join(',');
const query = `[out:json][timeout:90];(
  way[highway~"^(footway|path|pedestrian|steps|crossing|cycleway|service|track)$"](${box});
  nwr[amenity~"^(bench|toilets|drinking_water|shelter|clinic|hospital|pharmacy|doctors|dentist|community_centre|library|marketplace|restaurant|cafe|fast_food|food_court|place_of_worship|university|college)$"](${box});
  nwr[leisure~"^(park|garden|sports_centre)$"](${box});
  nwr[shop](${box}); nwr[tourism](${box}); nwr[place=square](${box});
  node[entrance](${box}); nwr[railway~"^(station|halt|subway_entrance)$"](${box});
  nwr[public_transport=station](${box}); relation[public_transport=stop_area](${box});
  way[building](${box});
);out body geom;`;
const endpoint = 'https://overpass-api.de/api/interpreter';
const url = endpoint + '?' + new URLSearchParams({ data: query });

await mkdir(local, { recursive: true });
const work = await mkdtemp(resolve(local, 'um-source-'));
try {
    const path = resolve(work, 'osm.json');
    const metadata = supplied ? await importSourceFile(resolve(supplied), path) : await download(url, path);
    let originalFetch = metadata.fetched_at ?? null;
    if (supplied) {
        try {
            const existing = JSON.parse(await readFile(resolve(out, 'sources.json'), 'utf8'));
            const previous = existing.sources.find(source => source.id === 'osm' && source.sha256 === metadata.sha256);
            if (previous) originalFetch = previous.fetched_at;
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }
    const source = await readFile(path);
    const osm = JSON.parse(source);
    const date = osm.osm3s?.timestamp_osm_base;
    if (!Number.isFinite(Date.parse(date)) || !Array.isArray(osm.elements) || osm.remark) {
        throw Error('Expected a complete, dated Overpass snapshot.');
    }

    const graphPath = resolve(work, 'graph.json');
    execFileSync(process.execPath, ['scripts/osm-to-graph.mjs', '--in', path, '--out-json', graphPath], { cwd: root, stdio: 'inherit' });
    const rawGraph = JSON.parse(await readFile(graphPath, 'utf8'));
    if (!rawGraph.nodes.some(n => pointInPilot([n.lat, n.lng], area))) throw Error('The extract does not include the UM walking area.');

    const osmSource = {
        id: 'osm', name: 'OpenStreetMap / Overpass', url: 'https://www.openstreetmap.org/copyright',
        license: 'ODbL', status: 'loaded', fetched_at: originalFetch, data_at: date,
        sha256: metadata.sha256, records: rawGraph.edges.length,
        note: 'Mapped walkways, crossings, buildings and amenities. Roof cover uses explicit OSM cover or building-passage tags. Access and shelter need field checks.',
    };
    const sources = [osmSource, {
        id: 'um-map', name: 'Universiti Malaya campus map', url: 'https://www.um.edu.my/campus-map',
        license: 'UM website', status: 'partial', fetched_at: null, data_at: null, records: 0,
        note: 'Official campus reference for orientation and landmark names. Routing geometry is from OpenStreetMap.',
    }];
    const bundle = createPilotSnapshot(rawGraph, osm, { sources }, date, area);
    validatePilotSnapshot(bundle, area);

    await mkdir(resolve(out, 'source'), { recursive: true });
    await writeFile(resolve(out, 'source/um-campus-osm.json.gz'), gzipSync(source, { level: 9 }));
    await writeFile(resolve(out, 'sources.json'), JSON.stringify({ area, bounds: PILOTS[area].bounds, endpoint, query, sources }, null, 2) + '\n');
    await writeFile(resolve(out, 'bundle.json'), JSON.stringify(bundle) + '\n');
    console.log(`UM campus source ready: ${bundle.context.coverage.paths} walkable segments, ${bundle.context.coverage.destinations} destinations.`);
} finally {
    await rm(work, { recursive: true, force: true });
}
