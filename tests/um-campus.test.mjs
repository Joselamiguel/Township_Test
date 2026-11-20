import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { validatePilotSnapshot } from '../scripts/pilot-export.mjs';
import { planJourney } from '../lib/journeys.ts';
import { DEFAULT_NEEDS, placeSearchText } from '../lib/walking.ts';

const bundle = JSON.parse(readFileSync('data/um-campus/bundle.json', 'utf-8'));

test('the UM bundle retains OSM provenance and connects campus landmarks', () => {
    validatePilotSnapshot(bundle, 'um-campus');
    const original = gunzipSync(readFileSync('data/um-campus/source/um-campus-osm.json.gz'));
    const { elements } = JSON.parse(original);
    const ways = new Map(elements.filter(e => e.type === 'way').map(e => [e.id, e.tags]));
    assert.equal(createHash('sha256').update(original).digest('hex'), bundle.context.sources.find(s => s.id === 'osm').sha256);
    for (const edge of bundle.graph.edges.filter(e => e.covered === true)) {
        const tags = ways.get(edge.osm_way_id);
        assert.ok(tags.covered === 'yes' || tags.tunnel === 'building_passage');
    }
    const { featured_ids, origin } = bundle.context;
    const namedPlaces = ['main library', 'dewan kuliah 3'];
    for (const name of namedPlaces) {
        const destination = bundle.walking.assets.find(a => featured_ids.includes(a.id) && placeSearchText(a).includes(name));
        assert.ok(destination, `Missing featured campus place: ${name}`);
        const plan = planJourney(bundle.graph.nodes, bundle.graph.edges, bundle.walking, {
            origin: origin.coordinates, destination, profile: 'senior', needs: DEFAULT_NEEDS, departure_at: '2026-11-20T04:00:00Z',
        });
        const { direct, sheltered } = plan.routes;
        assert.ok(direct && sheltered, `Missing pedestrian route: ${name}`);
        assert.equal(sheltered.suitability, 'yellow');
        assert.ok(sheltered.length_m - sheltered.unsheltered_m > 0);
        assert.ok(sheltered.unsheltered_m <= direct.unsheltered_m + 1e-6);
    }
});
