import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { buildGraph } from '../lib/routing.ts';

test('OSM import only includes pedestrian ways and shared ways with explicit foot access', (t) => {
    const dir = mkdtempSync(join(tmpdir(), 'township-osm-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const ways = [
        { highway: 'footway', covered: 'yes', lit: 'yes' },
        { highway: 'footway', footway: 'crossing', crossing: 'zebra' },
        { highway: 'steps' },
        { highway: 'cycleway', foot: 'yes' },
        { highway: 'service', foot: 'designated' },
        { highway: 'primary', foot: 'yes' },
        { highway: 'residential' },
        { highway: 'service' },
        { highway: 'cycleway' },
        { highway: 'path', foot: 'no' },
        { highway: 'footway', access: 'private' },
        { highway: 'path', foot: 'private' },
        { highway: 'path', foot: 'destination' },
        { highway: 'path', foot: 'customers' },
        { highway: 'path', access: 'customers' },
    ].map((tags, index) => ({
        type: 'way', id: index + 1, tags, nodes: [index * 2 + 1, index * 2 + 2],
        geometry: [{ lat: 3.12, lon: 101.65 }, { lat: 3.121, lon: 101.651 }],
    }));
    writeFileSync(join(dir, 'source.json'), JSON.stringify({ elements: ways }));
    execFileSync(process.execPath, ['scripts/osm-to-graph.mjs', '--in', join(dir, 'source.json'), '--out-json', join(dir, 'graph.json')]);
    const graph = JSON.parse(readFileSync(join(dir, 'graph.json'), 'utf8'));
    assert.deepEqual(graph.edges.map((e) => e.osm_way_id), [1, 2, 3, 4, 5]);
    assert.ok(graph.edges.every((e) => e.pedestrian_access && e.kind !== 'street'));
    assert.equal(graph.edges[0].shade_source, 'modelled');
    assert.equal(graph.edges[0].lighting_source, 'modelled');
    assert.equal(graph.edges[1].kind, 'crossing');
    assert.equal(graph.edges[2].has_steps, true);
    assert.ok(graph.edges.every((e) => e.geometry.length >= 2 && e.length_m > 0));
});

test('routing excludes carriageways and edges forbidden to pedestrians', () => {
    const nodes = [{ id: 1, lat: 3, lng: 101 }, { id: 2, lat: 3.001, lng: 101 }];
    const base = { from_node: 1, to_node: 2, length_m: 100, geometry: [[101, 3], [101, 3.001]] };
    const graph = buildGraph(nodes, [
        { ...base, id: 1, kind: 'street' },
        { ...base, id: 2, kind: 'footway', pedestrian_access: false },
        { ...base, id: 3, kind: 'footway', pedestrian_access: true },
    ]);
    assert.deepEqual([...graph.edges.keys()], [3]);
    assert.equal(graph.adj.get(1).length, 1);
});
