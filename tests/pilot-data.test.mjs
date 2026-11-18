import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,writeFile,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pilotFixture } from './helpers/pilot-fixture.mjs';
import { csvObjects } from '../lib/data/csv.ts';
import { csvFile,gtfsFiles } from '../scripts/data-download.mjs';
import { transitContext,railDemand,districtPopulation,wikidataLandmarks,satelliteScenes } from '../lib/data/context.ts';
import { preparePilotGraph,mappedAssets } from '../lib/data/osm.ts';
import { createPilotSnapshot,gisLayers } from '../scripts/pilot-snapshot.mjs';
import { validatePilotSnapshot,writePublicPilot } from '../scripts/pilot-export.mjs';
import { DEFAULT_NEEDS } from '../lib/walking.ts';
import { planJourney } from '../lib/journeys.ts';
import { withPersonalUpdates } from '../lib/walk-library.ts';
import { pilotFromParams } from '../lib/pilots.ts';

const fixture=pilotFixture();
test('central KL is the default; old shared bridge links retain Elmina',()=>{
    assert.equal(pilotFromParams(new URLSearchParams()),'pasar-seni');
    assert.equal(pilotFromParams(new URLSearchParams('area=elmina')),'elmina');
    assert.equal(pilotFromParams(new URLSearchParams('destId=elmina_rainbow_bridge')),'elmina');
});
test('OSM import preserves explicit entrance associations and never guesses a station from proximity',()=>{
    const {bundle}=fixture;validatePilotSnapshot(bundle);
    const station=bundle.walking.assets.find(a=>a.name==='Test station');
    const doors=bundle.walking.assets.filter(a=>a.parent_id===station.id);
    assert.equal(doors.length,1);assert.match(doors[0].name,/Test A/);
    const clinic=bundle.walking.assets.find(a=>a.name==='Test clinic');
    assert.equal(bundle.walking.assets.find(a=>a.parent_id===clinic.id).properties.connection_model,'mapped_entrance');
    const market=bundle.walking.assets.find(a=>a.name==='Test Central Market');
    assert.equal(bundle.walking.assets.find(a=>a.parent_id===market.id).properties.connection_model,'approximate_approach');
    assert.ok(bundle.walking.assets.some(a=>a.name==='Test cafe'));
    assert.equal(bundle.walking.assets.filter(a=>a.kind==='rest').length,1);
    assert.equal(bundle.walking.assets.find(a=>a.kind==='toilet').edge_id,null);
    assert.deepEqual(bundle.walking.verifications,[]);
});
test('source IDs survive element reordering; disconnected paths stay disconnected',()=>{
    const {graph,osm,bundle}=fixture;
    const reordered=createPilotSnapshot(graph,{...osm,elements:osm.elements.toReversed()});
    const identities=assets=>new Map(assets.map(a=>[a.external_id,a.id]));
    assert.deepEqual(identities(reordered.walking.assets),identities(bundle.walking.assets));
    assert.deepEqual(reordered.graph.edges.map(e=>e.id),bundle.graph.edges.map(e=>e.id));
    assert.equal(reordered.context.dataset_id,bundle.context.dataset_id);
    assert.equal(bundle.context.coverage.components,2);
    assert.equal(bundle.context.coverage.largest_component_paths,1);
});
test('known conflicting levels are excluded from a geometric facility connection',()=>{
    const {graph,osm}=fixture;
    const prepared=preparePilotGraph(graph,osm,'pasar-seni');
    const assets=mappedAssets({elements:[{type:'node',id:999,lat:3.1425,lon:101.6945,tags:{amenity:'bench',level:'-1'}}]},prepared.edges.map(e=>({...e,level:'1'})),'pasar-seni');
    assert.equal(assets[0].edge_id,null);
});
test('mapped destinations route with uncertainty; a mapped bench cannot fulfil a required checked rest',()=>{
    const {bundle}=fixture;const destination=bundle.walking.assets.find(a=>a.name==='Test Central Market');
    const input={origin:[3.1425,101.694],destination,profile:'senior',departure_at:bundle.walking.as_of,needs:{...DEFAULT_NEEDS,budget_min:30}};
    const route=planJourney(bundle.graph.nodes,bundle.graph.edges,bundle.walking,input).routes.direct;
    assert.ok(route);assert.equal(route.suitability,'yellow');assert.equal(route.verified_rest_stops,0);
    const strict=planJourney(bundle.graph.nodes,bundle.graph.edges,bundle.walking,{...input,needs:{...input.needs,require_rests:true,rest_interval_min:1}});
    assert.equal(strict.recommended,null);
});
test('one-way pedestrian restrictions survive mid-edge entrance and origin splitting',()=>{
    const {graph,osm}=fixture;
    const paths=preparePilotGraph({nodes:graph.nodes.filter(n=>n.id<=990000000003),edges:[graph.edges[0]]},osm,'pasar-seni');
    paths.edges[0].foot_direction='forward';
    const assets=mappedAssets({elements:[{type:'node',id:1234,lat:3.1425,lon:101.6945,tags:{shop:'convenience',name:'Test reverse destination'}}]},paths.edges,'pasar-seni');
    const data={assets,verifications:[],as_of:'2026-11-18T01:00:00Z'};
    const input={origin:[3.1425,101.6955],destination:assets[0],profile:'senior',needs:DEFAULT_NEEDS,departure_at:data.as_of};
    assert.equal(planJourney(paths.nodes,paths.edges,data,input).recommended,null);
    paths.edges[0].foot_direction='backward';
    assert.ok(planJourney(paths.nodes,paths.edges,data,input).routes.direct);
});
test('CSV parsers handle quoted commas, escaped quotes, BOMs and multiline values',async t=>{
    const csv='\uFEFFid,name\r\n1,"Test, station"\r\n2,"a ""quoted""\nlabel"\r\n';
    const expected=[{id:'1',name:'Test, station'},{id:'2',name:'a "quoted"\nlabel'}];
    assert.deepEqual(csvObjects(csv),expected);
    assert.throws(()=>csvObjects('id,id\n1,2'),/unique/);
    assert.throws(()=>csvObjects('id,name\n1'),/column/);
    const dir=await mkdtemp(join(tmpdir(),'township-csv-'));t.after(()=>rm(dir,{recursive:true,force:true}));
    const path=join(dir,'rows.csv');await writeFile(path,csv);
    const rows=[];for await(const row of csvFile(path))rows.push(row);assert.deepEqual(rows,expected);
});
test('GTFS archives are clipped to local stops and retain routes without inventing arrivals',async t=>{
    const dir=await mkdtemp(join(tmpdir(),'township-gtfs-'));t.after(()=>rm(dir,{recursive:true,force:true}));
    const zip=join(dir,'feed.zip');
    execFileSync('python',['-c',`import zipfile,sys
with zipfile.ZipFile(sys.argv[1],'w') as z:
 for name,text in {'stops.txt':'stop_id,stop_name,stop_lat,stop_lon\\n1,Test local,3.1425,101.695\\n2,Test outside,4,102\\n','routes.txt':'route_id,route_short_name\\nr,Test rail\\n','trips.txt':'trip_id,route_id,service_id\\nt,r,s\\n','stop_times.txt':'trip_id,stop_id,arrival_time,departure_time,stop_sequence\\nt,1,09:00:00,09:00:00,1\\nt,2,09:02:00,09:02:00,2\\n','calendar.txt':'service_id,start_date,end_date\\ns,20260101,20261231\\n'}.items(): z.writestr(name,text)`,zip]);
    const files=await gtfsFiles(zip,[3.133,101.685,3.157,101.708]);
    assert.equal(files['stops.txt'].length,1);assert.equal(files['stop_times.txt'].length,1);
    const context=transitContext(files,'test','pasar-seni');assert.equal(context.stops[0].routes[0],'test:r');
    assert.equal(context.routes[0].name,'Test rail');assert.deepEqual(context.service_dates,['20260101–20261231']);
});
test('demand uses latest-day station journeys and district population converts source thousands',()=>{
    const demand=railDemand([{date:'2026-11-17',origin:'Pasar Seni',destination:'Masjid Jamek',ridership:'12'},{date:'2026-11-18',origin:'Pasar Seni',destination:'Masjid Jamek',ridership:'5'},{date:'2026-11-18',origin:'Unknown',destination:'Pasar Seni',ridership:'3'}],[]);
    assert.equal(demand.data_at,'2026-11-18');assert.deepEqual(demand.stations.find(s=>s.name==='Pasar Seni'),{name:'Pasar Seni',entries:5,exits:3});
    const row=(age,population,extra={})=>({district:'W.P. Kuala Lumpur',sex:'both',ethnicity:'overall',date:'2026-01-01',age,population,...extra});
    const context=districtPopulation([row('overall','100'),row('65-69','5'),row('70+','4'),row('overall','999',{sex:'male'})],'pasar-seni');
    assert.equal(context.population,100000);assert.equal(context.older_population,9000);assert.equal(context.older_share,.09);
    assert.equal(districtPopulation([],'pasar-seni').population,null);
});
test('Wikidata and satellite layers retain geographic context without creating shade checks',()=>{
    const result=wikidataLandmarks({results:{bindings:[{item:{value:'http://www.wikidata.org/entity/Q123'},itemLabel:{value:'Test landmark'},location:{value:'Point(101.695 3.1425)'}},{item:{value:'http://www.wikidata.org/entity/Q124'},itemLabel:{value:'Outside'},location:{value:'Point(0 0)'}}]}},'pasar-seni');
    assert.equal(result.length,1);assert.deepEqual(result[0].coordinates,[3.1425,101.695]);
    const scenes=satelliteScenes({features:[{id:'test',collection:'esa-worldcover',bbox:[101,3,102,4],properties:{datetime:'2021-01-01T00:00:00Z'}}]});
    assert.equal(scenes.length,1);assert.equal(scenes[0].cloud_percent,null);
    const copy=structuredClone(fixture.bundle);copy.context.environment.scenes=scenes;
    const layers=gisLayers(copy);assert.equal(layers.paths.features.length,copy.graph.edges.length);
    assert.equal(layers.satellite.features[0].properties.evidence,'scene footprint; not measured footpath shade');
    assert.deepEqual(copy.walking.verifications,[]);
});
test('personal reports are isolated by area, dataset and planning time',()=>{
    const update={id:'test',kind:'blocked',target_type:'path',target_id:'1',observed_at:'2026-11-18T01:00:00Z',valid_until:'2026-11-19T00:00:00Z',notes:'',name:'Test'};
    const data={assets:[],verifications:[],as_of:'2026-11-18T02:00:00Z',area_id:'pasar-seni',dataset_id:'new'};
    assert.equal(withPersonalUpdates(data,[update],data.as_of).verifications.length,0);
    assert.equal(withPersonalUpdates(data,[{...update,area_id:'pasar-seni',dataset_id:'old'}],data.as_of).verifications.length,0);
    assert.equal(withPersonalUpdates(data,[{...update,area_id:'pasar-seni',dataset_id:'new'}],data.as_of).verifications.length,1);
    assert.equal(withPersonalUpdates(data,[{...update,area_id:'pasar-seni'}],'2026-11-18T00:00:00Z').verifications.length,0);
});
test('public export includes GIS layers and rejects private checks or cross-graph references',async t=>{
    const dir=await mkdtemp(join(tmpdir(),'township-export-'));t.after(()=>rm(dir,{recursive:true,force:true}));
    await writePublicPilot(dir,fixture.bundle);
    const layer=JSON.parse(await readFile(join(dir,'gis/places.geojson'),'utf8'));assert.equal(layer.features.length,fixture.bundle.walking.assets.length);
    const privateCopy=structuredClone(fixture.bundle);privateCopy.walking.verifications.push({reviewer:'Private test'});assert.throws(()=>validatePilotSnapshot(privateCopy),/field-auditor/);
    const broken=structuredClone(fixture.bundle);broken.walking.assets[1].edge_id=123;assert.throws(()=>validatePilotSnapshot(broken),/another graph/);
});
