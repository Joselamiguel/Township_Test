import { readFile } from 'node:fs/promises';
import { DESTINATIONS } from '../lib/precinct.ts';

// Mapped assets are deliberately unverified. Only explicit audit records can confirm them.
export async function seedWalkingData(pool, sourcePath) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const place of DESTINATIONS) {
            const edge = await client.query(`SELECT id, ST_LineLocatePoint(geom, ST_SetSRID(ST_MakePoint($1,$2),4326)) AS fraction,
                ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) AS distance
                FROM path_edges WHERE pedestrian_access AND ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,3)
                ORDER BY distance LIMIT 1`, [place.coords[1], place.coords[0]]);
            if (!edge.rows[0]) continue;
            const anchor = edge.rows[0], ref = `https://www.openstreetmap.org/node/${place.osm_node_id}`;
            const parent = await client.query(`INSERT INTO walking_assets(external_id,kind,category,name,lat,lng,source,source_ref)
                VALUES($1,'destination','park',$2,$3,$4,'osm',$5) ON CONFLICT(external_id) DO UPDATE SET external_id=EXCLUDED.external_id RETURNING id`,
            [place.id, place.name, place.coords[0], place.coords[1], ref]);
            await client.query(`INSERT INTO walking_assets(external_id,parent_id,kind,category,name,lat,lng,source,source_ref,edge_id,edge_fraction,connection_distance_m)
                VALUES($1,$2,'entrance','park',$3,$4,$5,'osm',$6,$7,$8,$9) ON CONFLICT(external_id) DO NOTHING`,
            [`${place.id}:access`, parent.rows[0].id, `${place.name} — mapped access point`, place.coords[0], place.coords[1], ref, anchor.id, anchor.fraction, anchor.distance]);
        }
        const raw = JSON.parse(await readFile(sourcePath, 'utf8'));
        for (const element of raw.elements ?? []) {
            const t = element.tags ?? {};
            if (element.type === 'way' && ['yes', 'no'].includes(t.covered)) {
                await client.query('UPDATE path_edges SET covered=$1 WHERE osm_way_id=$2 AND covered IS NULL', [t.covered === 'yes', element.id]);
            }
            if (element.type !== 'node' || !Number.isFinite(element.lat) || !Number.isFinite(element.lon)) continue;
            const kind = t.amenity === 'bench' ? 'rest' : t.amenity === 'toilets' ? 'toilet' : t.amenity === 'drinking_water' ? 'water'
                : t.amenity === 'shelter' ? 'shelter' : ['clinic', 'hospital', 'pharmacy', 'community_centre', 'marketplace'].includes(t.amenity) || t.shop || t.leisure === 'park' ? 'destination' : null;
            if (!kind || ['no', 'private'].includes(t.access)) continue;
            const category = ['clinic', 'hospital', 'pharmacy'].includes(t.amenity) ? 'healthcare' : t.amenity === 'community_centre' ? 'community'
                : t.leisure === 'park' ? 'park' : t.shop || t.amenity === 'marketplace' ? 'shopping' : 'other';
            const anchor = await client.query(`SELECT id,ST_LineLocatePoint(geom,ST_SetSRID(ST_MakePoint($1,$2),4326)) AS fraction,
                ST_Distance(geom::geography,ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) AS distance FROM path_edges
                WHERE ST_DWithin(geom::geography,ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,30) ORDER BY distance LIMIT 1`, [element.lon,element.lat]);
            const a = anchor.rows[0];
            const props = { ...(kind === 'rest' ? { has_seat: true } : {}), ...(t.opening_hours ? { opening_hours: t.opening_hours } : {}) };
            await client.query(`INSERT INTO walking_assets(external_id,kind,category,name,lat,lng,source,source_ref,properties,edge_id,edge_fraction,connection_distance_m)
                VALUES($1,$2,$3,$4,$5,$6,'osm',$7,$8,$9,$10,$11) ON CONFLICT(external_id) DO NOTHING`,
            [`osm:node:${element.id}`,kind,category,t.name || `Mapped ${kind}`,element.lat,element.lon,`https://www.openstreetmap.org/node/${element.id}`,JSON.stringify(props),a?.id??null,a?.fraction??null,a?.distance??null]);
        }
        await client.query('COMMIT');
        console.log('Mapped places and access points are ready; no facilities or checks were invented.');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
}
