import type { WalkPack } from './walk-library.ts';
import { routeSketch, walkTimeline } from './walk-timeline.ts';
import type { VerificationRecord } from './walking.ts';
import { sitePath } from './site.ts';

const escape = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function packHtml(pack: WalkPack) {
    const sketch = routeSketch(pack.route.coordinates);
    const records = pack.checks.map((c, i) => ({ ...c, id: c.id ?? String(i), created_at: c.created_at ?? c.observed_at, reviewer: '', method: 'site_visit', source_ref: '', notes: '' })) as VerificationRecord[];
    const timeline = walkTimeline(pack.route, pack.edges, records);
    return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(pack.title)} · TownshipGo offline walk</title>
<style>body{font:18px/1.5 system-ui;background:#f6f7f2;color:#24392f;max-width:48rem;margin:auto;padding:1rem;overflow-wrap:anywhere}h1{line-height:1.2}section,li{background:white;border:1px solid #ccd6cd;border-radius:12px;padding:1rem;margin:.8rem 0}svg{width:100%;height:auto;background:#e9eee6;border-radius:12px}small{display:block}li{break-inside:avoid}button{font:inherit;min-height:44px;padding:.5rem 1rem}a{color:#7f1d22}.notice{background:#fff4cd}ol{padding-left:1.5rem}</style>
<main><p>TownshipGo · offline walk pack</p><h1>${escape(pack.title)}</h1><p>${Math.ceil(pack.route.total_min)} min estimated · ${Math.round(pack.route.length_m)} m · ${pack.route.rest_min} min planned rest</p>
<section class="notice"><strong>Saved snapshot, not live navigation.</strong><small>Saved ${escape(pack.saved_at)}. Condition data loaded ${escape(pack.data_at)}. Network snapshot ${escape(pack.network_snapshot_at || 'date not provided')}. Recheck conditions before setting out. A saved green rating does not establish current conditions. This file does not record your location.</small></section>
<svg viewBox="0 0 600 340" role="img" aria-label="Offline route sketch, north is up"><polyline points="${sketch.points}" fill="none" stroke="#a4262c" stroke-width="5"/><circle cx="${sketch.start[0]}" cy="${sketch.start[1]}" r="7" fill="#166534"/><circle cx="${sketch.end[0]}" cy="${sketch.end[1]}" r="4" fill="#172b21"/></svg><p>Route sketch · north is up · green marks the start. Street-map tiles are not included. Walking network: © OpenStreetMap contributors, ODbL.</p>
<h2>Along your walk</h2><ol>${timeline.map(t => `<li><strong>${escape(t.title)}</strong><small>${Math.round(t.start_min)}–${Math.ceil(t.end_min)} min${t.distance_m ? ` · ${Math.round(t.distance_m)} m` : ''}</small>${escape(t.detail)}</li>`).join('')}</ol>
<h2>Nearby mapped facilities</h2>${pack.facilities.length ? `<ul>${pack.facilities.map(a => `<li>${escape(a.name)} · ${escape(a.kind)}<small>${a.lat.toFixed(6)}, ${a.lng.toFixed(6)} · Availability needs checking; nearby does not mean included in this route.</small></li>`).join('')}</ul>` : '<p>No nearby facilities are mapped in this pack. Do not assume a rest stop is available.</p>'}
<h2>Saved condition records</h2>${pack.checks.length ? `<ul>${pack.checks.map(c => `<li>${escape(c.target_type)} ${escape(c.target_id)} · ${escape(c.status)}<small>Observed ${escape(c.observed_at)} · review due ${escape(c.valid_until || 'not recorded')}</small>${escape(Object.entries(c.attributes).map(([k,v]) => `${k.replaceAll('_',' ')}: ${v}`).join('; '))}</li>`).join('')}</ul>` : '<p>No field observations were included. Path, crossing and facility conditions need confirmation.</p>'}
<p>Use the mapped pedestrian network and check surroundings. Planned rests and conditions are estimates or dated observations.</p></main></html>`;
}

export function downloadPack(pack: WalkPack) {
    const url = URL.createObjectURL(new Blob([packHtml(pack)], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `townshipgo-walk-${pack.id}.html`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function enableOfflineViewer() {
    if (!('serviceWorker' in navigator) || !('caches' in window)) return false;
    try {
        const registration = await navigator.serviceWorker.register(sitePath('/walk-offline-worker.js'), { scope: sitePath('/') });
        const worker = registration.installing || registration.waiting || registration.active;
        if (!worker) return false;
        await new Promise<void>((resolve, reject) => {
            if (worker.state === 'activated') { resolve(); return; }
            const timer = setTimeout(() => reject(new Error('Offline setup timed out')), 12000);
            worker.addEventListener('statechange', () => { if (worker.state === 'activated') { clearTimeout(timer); resolve(); } if (worker.state === 'redundant') { clearTimeout(timer); reject(new Error('Offline setup failed')); } });
        });
        return !!(await caches.match(sitePath('/offline-walks.html')));
    } catch { return false; }
}
