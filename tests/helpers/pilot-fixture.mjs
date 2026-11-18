// Synthetic geometry for automated tests only. Never a production pilot source.
import { createPilotSnapshot } from '../../scripts/pilot-snapshot.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync,writeFileSync,readFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function pilotFixture(){
    const point=(id,lat,lon,tags={})=>({type:'node',id,lat,lon,tags});
    const path=[point(990000000001,3.1425,101.694),point(990000000002,3.1425,101.696),point(990000000003,3.1425,101.698)];
    const detached=[point(990000000004,3.15,101.702),point(990000000005,3.15,101.703)];
    const way=(id,points,tags)=>({type:'way',id,nodes:points.map(p=>p.id),geometry:points.map(p=>({lat:p.lat,lon:p.lon})),tags});
    const door=point(990000000050,3.1425,101.695,{entrance:'main'});
    const corners=[door,point(990000000051,3.1428,101.695),point(990000000052,3.1428,101.6952),point(990000000053,3.1425,101.6952),door];
    const station=point(990000000060,3.1426,101.697,{railway:'station',name:'Test station'});
    const entrance=point(990000000061,3.1425,101.697,{railway:'subway_entrance',ref:'Test A'});
    const unrelated=point(990000000062,3.1425,101.6969,{railway:'subway_entrance',ref:'Test other station'});
    const osm={osm3s:{timestamp_osm_base:'2026-11-18T00:00:00Z'},elements:[...path,...detached,door,
        way(990000001,path,{highway:'footway',name:'Test public path',covered:'yes'}),way(990000002,detached,{highway:'footway',name:'Test disconnected path'}),
        way(990000003,corners,{building:'yes',amenity:'clinic',name:'Test clinic'}),
        point(990000000070,3.14251,101.696,{tourism:'attraction',name:'Test Central Market'}),
        point(990000000071,3.1425,101.6945,{amenity:'bench'}),point(990000000072,3.153,101.704,{amenity:'toilets'}),
        point(990000000073,3.1425,101.6946,{amenity:'restaurant',name:'Test cafe',access:'customers'}),
        point(990000000074,3.1425,101.6947,{amenity:'bench',access:'private'}),station,entrance,unrelated,
        {type:'relation',id:990000004,tags:{public_transport:'stop_area'},members:[{type:'node',ref:station.id},{type:'node',ref:entrance.id}]},
    ]};
    const directory=mkdtempSync(join(tmpdir(),'township-pilot-fixture-'));
    let graph;
    try{
        writeFileSync(join(directory,'source.json'),JSON.stringify(osm));
        execFileSync(process.execPath,['scripts/osm-to-graph.mjs','--in',join(directory,'source.json'),'--out-json',join(directory,'graph.json')]);
        graph=JSON.parse(readFileSync(join(directory,'graph.json'),'utf8'));
    }finally{rmSync(directory,{recursive:true,force:true});}
    const sources=[{id:'osm',name:'Synthetic automated test source',url:'https://www.openstreetmap.org/copyright',license:'Test fixture only',status:'loaded',fetched_at:'2026-11-18T00:00:00Z',data_at:'2026-11-18T00:00:00Z',records:graph.edges.length,note:'Synthetic automated test source. Never publish.'}];
    return {osm,graph,bundle:createPilotSnapshot(graph,osm,{sources},'2026-11-18T01:00:00Z')};
}
