import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const out = new URL('../out/', import.meta.url);
const metadata = JSON.parse(await readFile(new URL('site-config.json', out), 'utf8'));
const prefix = metadata.base_path;
for (const route of ['', 'resident/', 'dashboard/', 'verification/']) {
    const html = await readFile(new URL(`${route}index.html`, out), 'utf8');
    assert.ok(html.includes('TownshipGo') || html.includes('Loading'), `Missing actual app HTML: ${route}`);
    const styles = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map(m => /href="([^"]+)"/.exec(m[0])?.[1]).filter(Boolean);
    assert.ok(styles.length, `Missing styles: ${route}`);
    const assets = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)].map(m => m[1]).filter(p => p.includes('/_next/'));
    assert.ok(assets.length, `Missing app JavaScript: ${route}`);
    for (const path of [...styles, ...assets]) {
        assert.ok(path.startsWith(`${prefix}/_next/`), `An asset escapes the project base path: ${path}`);
        const file = resolve(out.pathname, decodeURIComponent(path.slice(prefix.length + 1).split('?')[0]));
        assert.ok(file.startsWith(resolve(out.pathname) + '/'));
        await access(file);
    }
}
const graph = JSON.parse(await readFile(new URL('pilot/graph.json', out), 'utf8'));
const data = JSON.parse(await readFile(new URL('pilot/walking-data.json', out), 'utf8'));
assert.ok(graph.nodes.length && graph.edges.length);
assert.ok(graph.edges.every(e => e.pedestrian_access === true && e.kind !== 'street'));
assert.equal(data.verifications.length, 0, 'The public source build must never publish local observations.');
assert.equal(data.assets.filter(a => a.kind === 'destination').length, 2);
await access(new URL('.nojekyll', out));
console.log(`Static app checked: HTML, CSS, JavaScript and ${graph.edges.length} pedestrian edges under ${prefix || '/'}.`);
