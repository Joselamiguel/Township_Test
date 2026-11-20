import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildGraph, nearestEdge } from '../lib/routing.ts';
import { planJourney } from '../lib/journeys.ts';
import { presetStartPoints } from '../lib/start-points.ts';
import { DEFAULT_NEEDS } from '../lib/walking.ts';

test('mapped starts can replace the default origin in the route planner', () => {
    for (const area of ['um-campus', 'pasar-seni']) {
        const { graph, walking, context } = JSON.parse(readFileSync(`data/${area}/bundle.json`, 'utf8'));
        const network = buildGraph(graph.nodes, graph.edges);
        const starts = presetStartPoints(context, walking.assets, network);
        assert.equal(starts[0].id, 'area-start');
        assert.ok(starts.length > 2, area);
        for (const start of starts) {
            const edge = nearestEdge(network, ...start.coordinates);
            assert.ok(edge && edge.distance_m < 1, start.label);
        }
        const origin = starts[1].coordinates;
        const destination = walking.assets.find(asset => asset.id === starts[2].id);
        const { routes } = planJourney(graph.nodes, graph.edges, walking, {
            origin, destination, profile: 'senior', needs: DEFAULT_NEEDS, departure_at: '2026-11-20T04:00:00Z',
        });
        assert.ok(routes.direct, `Could not walk from ${starts[1].label} to ${destination.name}`);
        assert.deepEqual(routes.direct.coordinates[0], origin);
    }
});
