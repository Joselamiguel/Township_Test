import 'server-only';
import { getPool } from './postgres.ts';
import { RequestError } from './validation.ts';
import { isPilot, type PilotId, type PilotContext } from '../pilots.ts';
import { DEFAULT_ORIGIN } from '../precinct.ts';

export function validateArea(value: unknown, fallback: PilotId = 'elmina'): PilotId {
    if(value===undefined||value===null||value==='')return fallback;
    if(!isPilot(value))throw new RequestError('Choose a supported walking area.');return value;
}
export function requestArea(request: Request) { return validateArea(new URL(request.url).searchParams.get('area')); }
export async function pilotContext(area: PilotId): Promise<PilotContext> {
    const result=await getPool().query('SELECT value FROM app_metadata WHERE key=$1',[`pilot:${area}:context`]);
    if(result.rows[0])return JSON.parse(result.rows[0].value);
    if(area!=='elmina')throw new RequestError('The central KL dataset has not been imported into this server yet.',503);
    const [paths,places]=await Promise.all([
        getPool().query('SELECT count(*)::int AS paths,(SELECT count(*)::int FROM path_nodes WHERE area_id=$1) AS nodes,count(*) FILTER(WHERE is_crossing)::int AS crossings FROM path_edges WHERE area_id=$1',[area]),
        getPool().query('SELECT kind,count(*)::int AS count FROM walking_assets WHERE area_id=$1 GROUP BY kind',[area]),
    ]);
    const count=(k:string)=>places.rows.filter(r=>r.kind===k).reduce((s,r)=>s+r.count,0);
    return {area_id:area,dataset_id:'elmina-original',built_at:'2026-10-18T18:50:06Z',origin:{coordinates:DEFAULT_ORIGIN,label:'Elmina sample start',source_ref:'https://www.openstreetmap.org/node/8447864418'},featured_ids:[],
        coverage:{...paths.rows[0],components:0,largest_component_paths:0,destinations:count('destination')+count('transit'),facilities:count('rest')+count('water')+count('toilet')+count('shelter'),entrances:count('entrance'),approximate_approaches:0,unconnected_places:0},
        sources:[{id:'osm',name:'Elmina OpenStreetMap example',url:'https://www.openstreetmap.org/copyright',license:'ODbL',status:'loaded',fetched_at:null,data_at:'2026-10-18T18:50:06Z',records:paths.rows[0].paths,note:'Original example snapshot. Field checks are separate from mapped features.'}],
        transit:{stops:[],routes:[],service_dates:[]},demand:{data_at:null,stations:[],note:'No transit-demand dataset is attached to this example.'},demographics:{district:'Petaling',year:null,population:null,older_population:null,older_share:null,note:'No population dataset is attached to this example.'},landmarks:[],environment:{scenes:[],note:'No imagery analysis is attached to this example.'}};
}
