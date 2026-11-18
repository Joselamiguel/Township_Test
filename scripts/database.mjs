import { readFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import dotenv from 'dotenv';
import { getPool, closePool } from '../lib/server/postgres.ts';
import { seedWalkingData } from './seed-walking-data.mjs';
import { seedPilotArea } from './seed-pilot-area.mjs';

dotenv.config({ path: '.env.local', quiet: true });
const root = fileURLToPath(new URL('../', import.meta.url));
const command = process.argv[2] ?? 'setup';
const sourceIndex = process.argv.indexOf('--source');
const source = sourceIndex >= 0 ? resolve(process.argv[sourceIndex + 1] ?? '') : resolve(root, 'precinct.json');

async function migrate() {
    const schema = await readFile(resolve(root, 'db/schema.sql'), 'utf8');
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');
        await client.query(schema);
        await client.query('COMMIT');
        console.log('PostgreSQL/PostGIS schema is ready.');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally { client.release(); }
}

async function seed() {
    await mkdir(resolve(root, '.local'), { recursive: true });
    const graphPath = resolve(root, '.local/pedestrian-graph.json');
    execFileSync(process.execPath, [resolve(root, 'scripts/osm-to-graph.mjs'), '--in', source, '--out-json', graphPath], { stdio: 'inherit' });
    const contents = await readFile(graphPath, 'utf8');
    const graph = JSON.parse(contents);
    if (!graph.nodes?.length || !graph.edges?.length) throw new Error('No pedestrian network was found in the input.');
    const hash = createHash('sha256').update(contents).digest('hex');
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');
        await client.query("SELECT pg_advisory_xact_lock(hashtext('townshipgo-graph-import'))");
        const { rows } = await client.query("SELECT value FROM app_metadata WHERE key = 'graph_sha256'");
        const existing = await client.query("SELECT count(*)::int AS count FROM path_edges WHERE area_id='elmina'");
        if (existing.rows[0].count > 0) {
            if (rows[0]?.value !== hash) throw new Error('A different graph already exists. Use a separate database for a new dataset so reports and audits keep their original edge IDs.');
            await client.query('COMMIT');
            console.log('This pedestrian graph is already imported; existing data and reports were preserved.');
            return;
        }
        await client.query(`INSERT INTO path_nodes(id, lat, lng)
            SELECT id, lat, lng FROM jsonb_to_recordset($1::jsonb)
            AS n(id bigint, lat double precision, lng double precision)`, [JSON.stringify(graph.nodes)]);
        await client.query(`INSERT INTO path_edges
            (id, from_node, to_node, osm_way_id, name, source_highway, pedestrian_access, geometry,
             length_m, kind, surface, has_steps, slope_pct, surface_rating, is_crossing, crossing_type,
             crossing_width_m, ped_green_s, cycle_s, has_kerb_ramp, has_refuge, has_tactile,
             shade_morning, shade_midday, shade_afternoon, shade_source, lit_ratio, lighting_source)
            SELECT id, from_node, to_node, osm_way_id, name, source_highway, pedestrian_access, geometry,
             length_m, kind, surface, has_steps, slope_pct, surface_rating, is_crossing, crossing_type,
             crossing_width_m, ped_green_s, cycle_s, has_kerb_ramp, has_refuge, has_tactile,
             shade_morning, shade_midday, shade_afternoon, shade_source, lit_ratio, lighting_source
            FROM jsonb_to_recordset($1::jsonb) AS e
             (id bigint, from_node bigint, to_node bigint, osm_way_id bigint, name text, source_highway text,
              pedestrian_access boolean, geometry jsonb, length_m double precision, kind text, surface text,
              has_steps boolean, slope_pct double precision, surface_rating int, is_crossing boolean,
              crossing_type text, crossing_width_m double precision, ped_green_s double precision,
              cycle_s double precision, has_kerb_ramp boolean, has_refuge boolean, has_tactile boolean,
              shade_morning double precision, shade_midday double precision, shade_afternoon double precision,
              shade_source text, lit_ratio double precision, lighting_source text)`, [JSON.stringify(graph.edges)]);
        await client.query("INSERT INTO app_metadata(key, value) VALUES ('graph_sha256', $1) ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value", [hash]);
        await client.query('COMMIT');
        console.log(`Imported ${graph.nodes.length} nodes and ${graph.edges.length} pedestrian edges from the OpenStreetMap snapshot.`);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally { client.release(); }
}

try {
    if (!['setup', 'migrate', 'seed'].includes(command)) throw new Error('Use setup, migrate or seed.');
    if (command === 'setup' || command === 'migrate') await migrate();
    if (command === 'setup' || command === 'seed') await seed();
    if(command==='setup'||command==='seed'){
      await seedWalkingData(getPool(), source);
      try {
        const bundle=JSON.parse(await readFile(resolve(root,'data/pasar-seni/bundle.json'),'utf8'));
        await seedPilotArea(getPool(),bundle);
      }catch(error){if(error.code!=='ENOENT')throw error;console.log('Central KL source bundle is not present yet; the Elmina example remains available.');}
    }
} catch (error) {
    // PostgreSQL errors can include connection details; print a code instead of credentials.
    console.error('Database setup failed:', error.code ?? error.message);
    process.exitCode = 1;
} finally { await closePool(); }
