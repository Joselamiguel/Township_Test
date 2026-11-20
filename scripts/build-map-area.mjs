import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

const output = new URL('../public/map-area/', import.meta.url);
const extracts = {
    'pasar-seni': ['data/pasar-seni/source/pasar-seni-osm.json.gz'],
    'um-campus': ['data/um-campus/source/um-campus-osm.json.gz'],
    elmina: ['precinct.json', 'data/elmina/source/elmina-map-osm.json.gz'],
};
const metres = (value) => {
    const match = /^(\d+(?:\.\d+)?)\s*m?$/.exec(value ?? '');
    return match ? Number(match[1]) : null;
};
const footways = new Set(['footway', 'path', 'pedestrian', 'steps', 'cycleway', 'track', 'crossing']);
const highways = new Set(['primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street', 'service']);
const greens = new Set(['park', 'garden', 'pitch', 'grass', 'forest', 'wood']);

function mapFeature(way) {
    if (!way.geometry || !way.geometry.every(p => p && Number.isFinite(p.lon) && Number.isFinite(p.lat))) return null;
    const tags = way.tags ?? {};
    const line = way.geometry.map(p => [p.lon, p.lat]);
    const closed = line.length >= 4 && way.nodes?.[0] === way.nodes?.at(-1);
    const feature = (kind, properties = {}) => ({
        type: 'Feature',
        properties: { kind, ...properties },
        geometry: closed && ['building', 'green', 'water'].includes(kind)
            ? { type: 'Polygon', coordinates: [line] } : { type: 'LineString', coordinates: line },
    });
    if (closed && tags.building && tags.building !== 'no') {
        const base = metres(tags.min_height) ?? 0;
        const levels = Number(tags['building:levels']);
        const height = metres(tags.height) ?? (Number.isFinite(levels) && levels > 0 ? 3 * levels : base + 7);
        if (height > base) return feature('building', { height, base });
    }
    if (closed && (tags.natural === 'water' || tags.water)) return feature('water');
    if (closed && [tags.leisure, tags.landuse, tags.natural].some(value => greens.has(value))) return feature('green');
    if (line.length >= 2 && footways.has(tags.highway)) return feature('path');
    if (line.length >= 2 && highways.has(tags.highway)) return feature('street');
    return null;
}

await mkdir(output, { recursive: true });
for (const [area, sources] of Object.entries(extracts)) {
    const ways = new Map();
    for (const source of sources) {
        try {
            const file = await readFile(new URL(`../${source}`, import.meta.url));
            const bytes = source.endsWith('.gz') ? gunzipSync(file) : file;
            const { elements } = JSON.parse(bytes);
            for (const way of elements) if (way.type === 'way' && way.geometry) ways.set(way.id, way);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }
    const features = Array.from(ways.values(), mapFeature).filter(Boolean);
    await writeFile(new URL(`${area}.geojson`, output), JSON.stringify({ type: 'FeatureCollection', features }));
}
