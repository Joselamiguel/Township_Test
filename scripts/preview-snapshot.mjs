import { DESTINATIONS } from '../lib/precinct.ts';
import { projectPoint } from '../lib/walking-geometry.ts';

// Public, reproducible source data only. Never export the local database or its
// reports, auditor labels, evidence references, credentials or observations.
export function createPreviewSnapshot(graph, source, now = new Date().toISOString()) {
    const covered = new Map((source.elements ?? []).filter(e => e.type === 'way' && ['yes', 'no'].includes(e.tags?.covered))
        .map(e => [e.id, e.tags.covered === 'yes']));
    const edges = graph.edges.map(e => ({ ...e, covered: covered.get(e.osm_way_id) ?? null }));
    const assets = [];
    for (const [index, place] of DESTINATIONS.entries()) {
        const point = [place.coords[1], place.coords[0]];
        const nearest = edges.map(edge => ({ edge, ...projectPoint(edge.geometry, point) })).sort((a, b) => a.distance - b.distance)[0];
        if (!nearest || nearest.distance > 3) throw new Error(`The mapped access point for ${place.name} is outside the pedestrian network.`);
        const destination = { id: String(index * 2 + 1), external_id: place.id, parent_id: null, kind: 'destination', category: 'park',
            name: place.name, lat: place.coords[0], lng: place.coords[1], source: 'osm',
            source_ref: `https://www.openstreetmap.org/node/${place.osm_node_id}`, properties: {},
            edge_id: null, edge_fraction: null, connection_distance_m: null, anchor_lat: null, anchor_lng: null };
        assets.push(destination, { ...destination, id: String(index * 2 + 2), external_id: `${place.id}:access`,
            parent_id: destination.id, kind: 'entrance', name: `${place.name} — mapped access point`,
            edge_id: nearest.edge.id, edge_fraction: nearest.fraction, connection_distance_m: nearest.distance,
            anchor_lat: nearest.point[1], anchor_lng: nearest.point[0] });
    }
    return {
        graph: { nodes: graph.nodes, edges, source: { name: 'OpenStreetMap', pedestrian_only: true,
            attribution: '© OpenStreetMap contributors (ODbL)', snapshot_at: source.osm3s?.timestamp_osm_base ?? null } },
        walking: { assets, verifications: [], as_of: now },
        hazards: { hazards: [] }, reports: { reports: [] },
    };
}
