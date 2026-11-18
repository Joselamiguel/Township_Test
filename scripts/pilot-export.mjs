import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pointInPilot } from '../lib/pilots.ts';
import { gisLayers } from './pilot-snapshot.mjs';

/** Fail before a source build could publish private records or a mismatched graph. */
export function validatePilotSnapshot(bundle){
    assert.equal(bundle.area_id,'pasar-seni','Use the Pasar Seni source bundle.');
    const {graph,walking,context}=bundle;
    assert.ok(graph.nodes.length&&graph.edges.length,'The pilot needs a real pedestrian network.');
    assert.equal(graph.source.area_id,bundle.area_id);
    assert.equal(walking.area_id,bundle.area_id);
    assert.equal(context.area_id,bundle.area_id);
    assert.equal(context.dataset_id,graph.source.dataset_id);
    assert.equal(context.dataset_id,walking.dataset_id);
    const nodes=new Map(graph.nodes.map(n=>[n.id,n]));
    assert.equal(nodes.size,graph.nodes.length,'Duplicate source node.');
    const edges=new Map(graph.edges.map(e=>[e.id,e]));
    assert.equal(edges.size,graph.edges.length,'Duplicate source edge.');
    for(const n of nodes.values())assert.ok(Number.isSafeInteger(n.id)&&Number.isFinite(n.lat)&&Number.isFinite(n.lng));
    for(const e of edges.values()){
        assert.ok(e.pedestrian_access===true&&e.kind!=='street','Road carriageways must not become walking routes.');
        assert.ok(nodes.has(e.from_node)&&nodes.has(e.to_node)&&e.length_m>0);
        assert.ok(e.geometry.length>=2&&e.geometry.every(p=>p.length===2&&p.every(Number.isFinite)));
    }
    const assets=new Map(walking.assets.map(a=>[a.id,a]));
    assert.equal(assets.size,walking.assets.length);
    for(const a of assets.values()){
        assert.ok(pointInPilot([a.lat,a.lng],bundle.area_id),'A place is outside the pilot.');
        assert.ok(a.source==='osm'&&/^https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/\d+$/.test(a.source_ref),'Every place needs its original OSM reference.');
        assert.ok(a.edge_id===null||edges.has(a.edge_id),'A place references another graph.');
        assert.ok(a.parent_id===null||assets.has(a.parent_id),'Missing parent destination.');
    }
    assert.deepEqual(walking.verifications,[],'Never publish local field-auditor records.');
    assert.deepEqual(bundle.hazards.hazards,[],'Never publish local reports in a source snapshot.');
    assert.deepEqual(bundle.reports.reports,[],'Never publish local reports in a source snapshot.');
    assert.ok(context.featured_ids.length&&context.featured_ids.every(id=>assets.has(id)),'The pilot needs connected featured places.');
    assert.ok(pointInPilot(context.origin.coordinates,bundle.area_id));
    assert.ok(context.sources.some(s=>['osm','geofabrik'].includes(s.id)&&s.status==='loaded'),'The walking source must be loaded.');
}

export async function writePublicSnapshot(directory,snapshot){
    await mkdir(directory,{recursive:true});
    for(const [name,value] of Object.entries({graph:snapshot.graph,'walking-data':snapshot.walking,hazards:snapshot.hazards,reports:snapshot.reports,context:snapshot.context})){
        await writeFile(resolve(directory,`${name}.json`),JSON.stringify(value));
    }
}

export async function writePublicPilot(directory,bundle){
    validatePilotSnapshot(bundle);
    await writePublicSnapshot(directory,bundle);
    const gis=resolve(directory,'gis');await mkdir(gis,{recursive:true});
    for(const [name,layer]of Object.entries(gisLayers(bundle)))await writeFile(resolve(gis,`${name}.geojson`),JSON.stringify(layer));
}
