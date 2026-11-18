import test from 'node:test';
import assert from 'node:assert/strict';
import { planJourney, planReturnWalk } from '../lib/journeys.ts';
import { findFacilities } from '../lib/walk-tools.ts';
import { walkTimeline } from '../lib/walk-timeline.ts';
import { addTrackFix, emptyTrack, suggestedPace } from '../lib/walk-tracking.ts';
import { createWalkPack, emptyLibrary, readLibrary, writeLibrary, withPersonalUpdates, readWalkDraft, DRAFT_KEY } from '../lib/walk-library.ts';
import { packHtml } from '../lib/offline-walk.ts';
import { evidenceFor } from '../lib/verification.ts';
import { conditionUpdateRecord } from '../lib/condition-updates.ts';
import { nodes, edges, data, input, record, AT } from './helpers/journey-fixture.mjs';

test('return walks really end at their origin, stay in budget and expose ordered traversal steps', () => {
    const request=input({budget_min:5});
    const result=planReturnWalk(nodes,edges,data(),request);
    assert.ok(result.routes.direct);
    for(const route of Object.values(result.routes)){
        assert.deepEqual(route.coordinates[0],request.origin);assert.deepEqual(route.coordinates.at(-1),request.origin);
        assert.equal(route.return_walk,true);assert.ok(route.total_min<=5);assert.ok(route.length_m>100);
        assert.ok(Math.abs(route.steps.reduce((s,e)=>s+e.distance_m,0)-route.length_m)<.1);
        assert.ok(Math.abs(route.steps.at(-1).end_min-route.total_min)<.001);
        assert.ok(route.steps.every((s,i)=>!i||s.start_min>=route.steps[i-1].end_min-.00001));
    }
});
test('turning around does not reset continuous walking time or invent a rest', () => {
    const shortNodes=[nodes[0],{id:2,lat:3,lng:101.0004}];
    const shortEdges=[{...edges[0],length_m:45,geometry:[[101,3],[101.0004,3]]}];
    const request=input({budget_min:5,speed_mps:1,require_rests:true,rest_interval_min:1});
    const noSeats={assets:[],verifications:[],as_of:AT};
    const constrained=planReturnWalk(shortNodes,shortEdges,noSeats,request);
    assert.ok(Object.values(constrained.routes).every(r=>r.total_min<=1.00001&&r.rest_min===0));
    assert.ok(planReturnWalk(shortNodes,shortEdges,noSeats,{...request,needs:{...request.needs,require_rests:false}}).routes.direct);
});
test('a long footway supports a real partial-edge return instead of requiring a distant junction', () => {
    const longNodes=[nodes[0],{id:2,lat:3,lng:101.02}];
    const longEdges=[{...edges[0],length_m:2220,geometry:[[101,3],[101.02,3]]}];
    const result=planReturnWalk(longNodes,longEdges,{assets:[],verifications:[],as_of:AT},input({budget_min:5}));
    assert.ok(result.routes.direct);assert.ok(result.routes.direct.total_min<=5);assert.ok(result.routes.direct.steps.some(s=>s.kind==='turn'));
    assert.deepEqual(result.routes.direct.coordinates.at(-1),[3,101]);
});
test('a return walk can revisit a genuinely verified rest without exceeding the interval', () => {
    const result=planReturnWalk(nodes,edges,data(),input({budget_min:5,require_rests:true,rest_interval_min:1,rest_duration_min:1}));
    assert.ok(result.routes.direct);assert.ok(result.routes.direct.rest_stops.length>=1);
    assert.ok(result.routes.direct.longest_without_rest_min<=1.0001);assert.ok(result.routes.direct.total_min<=5);
    assert.equal(result.routes.direct.rest_min,result.routes.direct.rest_stops.length);
});
test('return walks honour blocked paths, step-free needs and required current checks', () => {
    const closed=data();closed.verifications.push(...edges.map(e=>record('path',e.id,{path_open:false},{observed_at:AT})));
    assert.equal(planReturnWalk(nodes,edges,closed,input()).recommended,null);
    assert.equal(planReturnWalk(nodes,edges.map(e=>({...e,has_steps:true})),data(false),input()).recommended,null);
    assert.equal(planReturnWalk(nodes,edges,data(false),input({verified_only:true})).recommended,null);
    assert.equal(planReturnWalk(nodes,edges,data(),input({verified_only:true})).routes.direct.suitability,'green');
});
test('return planner does not route over carriageways or starts far from the network', () => {
    assert.equal(planReturnWalk(nodes,edges.map(e=>({...e,kind:'street'})),data(),input()).recommended,null);
    assert.equal(planReturnWalk(nodes,edges,data(),{...input(),origin:[4,102]}).recommended,null);
});
test('facility search follows the network and rejects unavailable seats without inventing facilities', () => {
    assert.equal(findFacilities(nodes,edges,data(),input(),'rest').filter(x=>x.route).length,2);
    const changed=data();changed.verifications.push(record('facility',201,{available:false},{status:'reported',observed_at:AT}));
    const result=findFacilities(nodes,edges,changed,input(),'rest');
    assert.equal(result.find(i=>i.asset.id==='201').route,null);assert.ok(result.find(i=>i.asset.id==='202').route);
    assert.deepEqual(findFacilities(nodes,edges,data(),input(),'shelter'),[]);
    assert.ok(findFacilities(nodes,edges,data(false),input({verified_only:true}),'rest').every(i=>!i.route));
});
test('a destination seat cannot become green without its seat condition being checked', () => {
    const walking=data();walking.verifications=walking.verifications.map(r=>{
        if(r.target_type!=='facility'||r.target_id!=='201')return r;
        const attributes={...r.attributes};delete attributes.has_seat;return {...r,attributes};
    });
    const seat=walking.assets.find(a=>a.id==='201');
    assert.equal(planJourney(nodes,edges,walking,{...input(),destination:seat}).routes.direct.suitability,'yellow');
    walking.verifications.push(record('facility',201,{has_seat:false},{observed_at:AT}));
    assert.equal(planJourney(nodes,edges,walking,{...input(),destination:seat}).recommended,null);
});
test('timeline follows route order and labels unknown cover independently of sun exposure assumptions', () => {
    const route=planJourney(nodes,edges,data(),input()).routes.direct;
    const items=walkTimeline(route,edges.map(e=>({...e,covered:null})),[]);
    assert.match(items[0].detail,/Roof cover unknown/);assert.equal(items.at(-1).kind,'arrival');
    assert.deepEqual(items.at(-1).point,route.coordinates.at(-1));
    assert.ok(items.every((i,n)=>!n||i.start_min>=items[n-1].start_min));
});
const base=Date.parse(AT);
function recordedTrack(){let track=emptyTrack();for(let i=0;i<16;i++){const fix={lat:3,lng:101+i*.00009,accuracy:2,at:base+i*10000};track=addTrackFix(track,fix,fix.at);}return track;}
test('GPS recording excludes imprecise fixes, jumps, old timestamps and stationary jitter', () => {
    let track=emptyTrack();const fix={lat:3,lng:101,accuracy:2,at:base};track=addTrackFix(track,fix,base);
    assert.equal(addTrackFix(track,{...fix,accuracy:100,at:base+1000},base+1000).distance_m,0);
    assert.equal(addTrackFix(track,{...fix,lng:102,at:base+1000},base+1000).distance_m,0);
    assert.equal(addTrackFix(track,{...fix,lng:101.000001,at:base+1000},base+1000).distance_m,0);
    assert.equal(addTrackFix(track,{...fix,lng:101.00009,at:base-1000},base).distance_m,0);
    assert.equal(addTrackFix(track,{...fix,lng:101.00009,at:base+60000},base+60000).distance_m,0);
    assert.ok(recordedTrack().distance_m>140);
});
test('pace learning needs two usable recordings in the same profile and never uses planned distance', () => {
    const walk={profile:'senior',track:recordedTrack(),active_ms:150000};
    assert.equal(suggestedPace([walk],'senior'),null);
    assert.equal(suggestedPace([walk,{...walk,profile:'wheelchair'}],'senior'),null);
    assert.equal(suggestedPace([{...walk,track:emptyTrack()},walk],'senior'),null);
    const suggestion=suggestedPace([walk,walk],'senior');assert.equal(suggestion.walks,2);assert.ok(suggestion.speed_mps>.95&&suggestion.speed_mps<1.05);
});
test('an overdue personal blockage remains unverified and cannot reveal an older positive check', () => {
    const update={id:'local-1',kind:'blocked',target_type:'path',target_id:'1',name:'Path 1',notes:'',observed_at:AT,valid_until:'2026-11-18T01:00:00Z'};
    const at='2026-11-19T01:00:00Z';const combined=withPersonalUpdates(data(),[update],at);
    const evidence=evidenceFor(combined.verifications,'path',1,at);
    assert.equal(evidence.path_open.value,false);assert.equal(evidence.path_open.status,'stale');
    assert.equal(combined.verifications.at(-1).status,'reported');
});
test('quick shared reports cannot promote themselves to verified or refresh an old timestamp', () => {
    const value={kind:'blocked',target_type:'path',target_id:'1',observed_at:AT,notes:'Test',status:'verified',reviewer:'Spoof',valid_until:'2029-01-01'};
    const result=conditionUpdateRecord(value,base);assert.equal(result.status,'reported');assert.notEqual(result.reviewer,'Spoof');
    assert.equal(result.valid_until,'2026-11-18T01:00:00.000Z');assert.equal(result.observed_at,AT);
    assert.throws(()=>conditionUpdateRecord({...value,target_type:'facility'},base));
    assert.throws(()=>conditionUpdateRecord({...value,target_id:'-1'},base));
    assert.throws(()=>conditionUpdateRecord(value,base+8*86400000));
});
test('saved packs preserve instructions and dates without auditor names; portable HTML needs no external assets', () => {
    const walking=data(),route=planJourney(nodes,edges,walking,input()).routes.direct;
    const pack=createWalkPack(route,'senior',input().needs,input().origin,edges,walking,AT);
    assert.ok(pack.checks.length);assert.equal(pack.checks[0].reviewer,undefined);assert.ok(pack.route.steps.length);
    const html=packHtml({...pack,title:'<script>alert("title")</script>'});
    assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script|<link|<img|<iframe/);assert.match(html,/Saved snapshot, not live navigation/);
    assert.match(html,/Saved condition records/);assert.match(html,/review due/);
});
test('storage errors are surfaced, corrupt data is not silently written and unfinished walks restore paused', () => {
    let writes=0;const invalid={getItem:()=>'{bad',setItem:()=>writes++};
    assert.ok(readLibrary(invalid).warning);assert.equal(writes,0);
    assert.throws(()=>writeLibrary(emptyLibrary(),{setItem:()=>{throw Error('quota');}}),/could not save/);
    const route=planJourney(nodes,edges,data(),input()).routes.direct;
    const pack=createWalkPack(route,'senior',input().needs,input().origin,edges,data(),AT);
    const draft={id:'test',pack,started_at:AT,elapsed_ms:3000,track:recordedTrack()};
    const restored=readWalkDraft({getItem:key=>key===DRAFT_KEY?JSON.stringify(draft):null});
    assert.equal(restored.restored,true);assert.equal(restored.elapsed_ms,3000);assert.equal(restored.track.last,null);
});
test('saved collections round-trip and malformed route geometry is rejected without a write', () => {
    const walking=data(),route=planJourney(nodes,edges,walking,input()).routes.direct;
    const pack=createWalkPack(route,'senior',input().needs,input().origin,edges,walking,AT,'2026-10-18T18:50:06Z');
    let raw='';const storage={setItem:(_key,value)=>{raw=value;},getItem:()=>raw};
    writeLibrary({...emptyLibrary(),packs:[pack]},storage);
    assert.equal(readLibrary(storage).library.packs[0].network_snapshot_at,'2026-10-18T18:50:06Z');
    const broken=JSON.parse(raw);broken.packs[0].route.coordinates=[null,null];raw=JSON.stringify(broken);
    assert.ok(readLibrary(storage).warning);assert.deepEqual(readLibrary(storage).library.packs,[]);
});
