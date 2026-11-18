import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { validatePilotSnapshot } from '../scripts/pilot-export.mjs';
import { planJourney } from '../lib/journeys.ts';
import { DEFAULT_NEEDS,placeSearchText } from '../lib/walking.ts';

const bundle=JSON.parse(readFileSync(new URL('../data/pasar-seni/bundle.json',import.meta.url),'utf8'));
const at='2026-11-19T04:00:00Z'; // Noon in Malaysia; mapped venue hours apply.
const destination=external=>bundle.walking.assets.find(a=>a.external_id===`pasar-seni:osm:${external}`);
const request=(place,needs={})=>({origin:bundle.context.origin.coordinates,destination:place,profile:'senior',departure_at:at,needs:{...DEFAULT_NEEDS,...needs}});

test('the committed KL sources match the supplied downloads and publish no field verification records',()=>{
    validatePilotSnapshot(bundle);
    assert.equal(bundle.graph.source.snapshot_at,'2026-11-18T17:21:50Z');
    for(const [id,file]of [['osm','pasar-seni-osm.json.gz'],['dosm','population_district.csv.gz']]){
        const archive=readFileSync(new URL(`../data/pasar-seni/source/${file}`,import.meta.url));
        const source=bundle.context.sources.find(s=>s.id===id);
        assert.equal(source.status,'loaded');assert.equal(source.archive_sha256,createHash('sha256').update(archive).digest('hex'));
        assert.equal(source.sha256,createHash('sha256').update(gunzipSync(archive)).digest('hex'));
    }
    assert.deepEqual(bundle.walking.verifications,[]);assert.deepEqual(bundle.hazards.hazards,[]);assert.deepEqual(bundle.reports.reports,[]);
    assert.ok(bundle.graph.edges.every(e=>e.pedestrian_access===true&&e.kind!=='street'));
    assert.ok(bundle.context.sources.filter(s=>!['osm','dosm'].includes(s.id)).every(s=>s.status==='not_loaded'));
});

test('the population context uses the 2026 Kuala Lumpur district total and age groups once',()=>{
    const d=bundle.context.demographics;
    assert.equal(d.district,'W.P. Kuala Lumpur');assert.equal(d.year,'2026');
    assert.equal(d.population,2082300);assert.equal(d.older_population,154600);
    assert.ok(Math.abs(d.older_share-154600/2082300)<1e-12);
});

test('actual KL landmarks route on the source network and remain yellow until field checks exist',()=>{
    for(const external of ['way:23768012','way:28224155','way:446256442','way:480717734','node:6502502981']){
        const place=destination(external);assert.ok(place,external);
        const plan=planJourney(bundle.graph.nodes,bundle.graph.edges,bundle.walking,request(place),[],null,['direct']);
        assert.ok(plan.routes.direct,`${place.name}: ${plan.reasons.join('; ')}`);
        const route=plan.routes.direct;assert.equal(route.suitability,'yellow');assert.equal(route.verified_rest_stops,0);
        assert.ok(route.total_min<=DEFAULT_NEEDS.budget_min);assert.ok(route.unchecked_segments>0);
        assert.ok(route.edge_ids.every(id=>bundle.graph.edges.some(e=>e.id===id)));
    }
});

test('mapped Central Market hours and unchecked seating constrain real routes',()=>{
    const place=destination('way:23768012');
    for(const departure_at of ['2026-11-19T01:00:00Z','2026-11-19T13:55:00Z']){
        const closed=planJourney(bundle.graph.nodes,bundle.graph.edges,bundle.walking,{...request(place),departure_at},[],null,['direct']);
        assert.equal(closed.recommended,null,'Mapped building hours must cover the arrival time.');
        assert.match(closed.reasons[0],/opening hours/);
    }
    const strict=planJourney(bundle.graph.nodes,bundle.graph.edges,bundle.walking,request(place,{require_rests:true,rest_interval_min:5}),[],null,['direct']);
    assert.equal(strict.recommended,null,'Mapped benches are not currently checked rest stops.');
});

test('real coverage gaps stay explicit and original place names remain searchable',()=>{
    assert.ok(bundle.context.coverage.components>1);assert.ok(bundle.context.coverage.unconnected_places>0);
    const unconnected=bundle.walking.assets.find(a=>['rest','toilet','water','shelter'].includes(a.kind)&&a.edge_id===null);
    assert.ok(unconnected);
    assert.equal(planJourney(bundle.graph.nodes,bundle.graph.edges,bundle.walking,request(unconnected),[],null,['direct']).recommended,null);
    assert.ok(placeSearchText(destination('way:446256442')).includes('jalan petaling'));
    assert.ok(placeSearchText(destination('way:480717734')).includes('masjid jamek'));
    assert.notEqual(destination('way:28224155').name,destination('way:141466517').name,'MRT and LRT stations need distinct labels.');
});
