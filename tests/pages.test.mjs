import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPreviewSnapshot } from '../scripts/preview-snapshot.mjs';
import { planJourney } from '../lib/journeys.ts';
import { DEFAULT_ORIGIN } from '../lib/precinct.ts';
import { DEFAULT_NEEDS } from '../lib/walking.ts';

test('the public snapshot plans actual Elmina walks without inventing field checks', t => {
    const dir = mkdtempSync(join(tmpdir(), 'township-pages-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    execFileSync(process.execPath, ['scripts/osm-to-graph.mjs', '--in', 'precinct.json', '--out-json', join(dir, 'graph.json')]);
    const source = JSON.parse(readFileSync('precinct.json', 'utf8'));
    const snapshot = createPreviewSnapshot(JSON.parse(readFileSync(join(dir, 'graph.json'), 'utf8')), source, '2026-11-17T04:00:00Z');
    assert.equal(snapshot.graph.edges.length, 602);
    assert.ok(snapshot.graph.edges.every(e => e.pedestrian_access && e.kind !== 'street'));
    assert.deepEqual(snapshot.walking.verifications, []);
    assert.deepEqual(snapshot.hazards.hazards, []);
    assert.deepEqual(snapshot.reports.reports, []);
    assert.equal(snapshot.walking.assets.length, 4);
    for (const destination of snapshot.walking.assets.filter(a => a.kind === 'destination')) {
        for (const profile of ['senior', 'cane_walker', 'wheelchair']) {
            const plan = planJourney(snapshot.graph.nodes, snapshot.graph.edges, snapshot.walking, { origin: DEFAULT_ORIGIN,
                destination, profile, needs: DEFAULT_NEEDS, departure_at: snapshot.walking.as_of });
            assert.ok(plan.routes.direct, `${profile}: ${destination.name}`);
            assert.equal(plan.routes.direct.suitability, 'yellow');
            assert.ok(plan.routes.direct.total_min <= 30);
        }
    }
});

test('Pages data uses the project prefix, a current planning clock and never sends shared writes', () => {
    execFileSync(process.execPath, ['--input-type=module', '-e', `
        import assert from 'node:assert/strict';
        import {loadGraph,loadWalkingData,loadHazards,loadReports,submitReport,createWalkingAsset,recordVerification,markReportFixed,loadWeather} from './lib/api.ts';
        const urls=[];
        globalThis.fetch=async url=>{urls.push(url);return Response.json(String(url).includes('walking-data')?{assets:[],verifications:[],as_of:'2000-01-01T00:00:00Z'}:{});};
        await loadGraph();const walking=await loadWalkingData();await loadHazards();await loadReports('all');
        assert.deepEqual(urls,['/Township_Test/pilot/graph.json','/Township_Test/pilot/walking-data.json','/Township_Test/pilot/hazards.json','/Township_Test/pilot/reports.json']);
        assert.ok(Math.abs(Date.parse(walking.as_of)-Date.now())<2000);
        for(const call of [()=>submitReport({}),()=>createWalkingAsset({}),()=>recordVerification({}),()=>markReportFixed('1')])await assert.rejects(call,/Nothing was submitted/);
        assert.equal(urls.length,4);
        globalThis.fetch=async ()=>{throw new Error('Weather outage');};
        const weather=await loadWeather();assert.equal(weather.source,'unavailable');assert.equal(weather.feels_like_c,null);
    `], { env: { ...process.env, NEXT_PUBLIC_SITE_MODE: 'pages', NEXT_PUBLIC_BASE_PATH: '/Township_Test' } });
});

test('area-scoped public data keeps the project prefix and distinct source files',()=>{
    execFileSync(process.execPath,['--input-type=module','-e',`
        import assert from 'node:assert/strict';
        import {loadGraph,loadWalkingData,loadHazards,loadReports,loadPilotContext} from './lib/api.ts';
        const urls=[];globalThis.fetch=async url=>{urls.push(url);return Response.json({});};
        await loadGraph('pasar-seni');await loadWalkingData('elmina');await loadHazards('pasar-seni');await loadReports('all','elmina');await loadPilotContext('pasar-seni');
        assert.deepEqual(urls,['/Township_Test/pilot/pasar-seni/graph.json','/Township_Test/pilot/elmina/walking-data.json','/Township_Test/pilot/pasar-seni/hazards.json','/Township_Test/pilot/elmina/reports.json','/Township_Test/pilot/pasar-seni/context.json']);
    `],{env:{...process.env,NEXT_PUBLIC_SITE_MODE:'pages',NEXT_PUBLIC_BASE_PATH:'/Township_Test'}});
});
