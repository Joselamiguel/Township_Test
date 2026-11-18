import type { PilotContext, PilotId, TransitStop } from '../pilots.ts';
import { PILOTS, pointInPilot } from '../pilots.ts';

export function transitContext(files: Record<string,Record<string,string>[]>, agency: string, area: PilotId) {
    const stops = files['stops.txt'] ?? [];
    const routes = new Map((files['routes.txt']??[]).map(r=>[r.route_id,r]));
    const trips = new Map((files['trips.txt']??[]).map(t=>[t.trip_id,t.route_id]));
    const serviceByStop = new Map<string,Set<string>>();
    for(const t of files['stop_times.txt']??[]){const id=trips.get(t.trip_id);if(!id||!routes.has(id))continue;if(!serviceByStop.has(t.stop_id))serviceByStop.set(t.stop_id,new Set());serviceByStop.get(t.stop_id)!.add(id);}
    const chosen: TransitStop[] = stops.filter(s=>s.stop_lat?.trim()&&s.stop_lon?.trim()&&pointInPilot([Number(s.stop_lat),Number(s.stop_lon)],area)).map(s=>({
        id:`${agency}:${s.stop_id}`,name:s.stop_name,lat:Number(s.stop_lat),lng:Number(s.stop_lon),agency,parent_station:s.parent_station||'',location_type:s.location_type||'0',routes:[...(serviceByStop.get(s.stop_id)??[])].map(id=>`${agency}:${id}`),
    }));
    const used=new Set(chosen.flatMap(s=>s.routes));
    return { stops:chosen, routes:[...routes.values()].filter(r=>used.has(`${agency}:${r.route_id}`)).map(r=>({id:`${agency}:${r.route_id}`,name:[r.route_short_name,r.route_long_name].filter(Boolean).join(' · '),agency})),
        service_dates:(files['calendar.txt']??[]).map(c=>`${c.start_date}–${c.end_date}`) };
}

export function railDemand(rows: Record<string,string>[], stopNames: string[]) {
    const normalise=(v:string)=>v.normalize('NFKD').replace(/[^a-z0-9]/gi,'').toLowerCase();
    const wanted=new Set([...stopNames,'Pasar Seni','Masjid Jamek','Merdeka'].map(normalise));
    const dates=rows.map(r=>r.date).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d));const date=dates.sort().at(-1)??null;
    const stations=new Map<string,{name:string;entries:number;exits:number}>();
    for(const r of rows){const count=Number(r.ridership);if(r.date!==date||!Number.isFinite(count)||count<0||!r.ridership?.trim())continue;
        for(const [field,measure] of [['origin','entries'],['destination','exits']] as const){const name=r[field];if(!name||!wanted.has(normalise(name)))continue;
            if(!stations.has(name))stations.set(name,{name,entries:0,exits:0});stations.get(name)![measure]+=count;
        }
    }
    return {data_at:date,stations:[...stations.values()],note:'Station tap-in/tap-out journeys are a transit-demand measure. They do not measure pavement traffic or accessibility.'};
}

export function districtPopulation(rows: Record<string,string>[], area: PilotId): PilotContext['demographics'] {
    const district=PILOTS[area].district;
    const chosen=rows.filter(r=>r.district===district&&r.sex==='both'&&r.ethnicity==='overall');
    const year=chosen.map(r=>r.date?.slice(0,4)).filter(y=>/^\d{4}$/.test(y??'')).sort().at(-1)??null;
    const current=chosen.filter(r=>r.date.startsWith(year||'unavailable'));
    const total=current.find(r=>r.age==='overall');const population=total?.population?.trim()?Math.round(Number(total.population)*1000):null;
    const older=current.filter(r=>r.age!=='overall'&&parseInt(r.age,10)>=65&&r.population.trim());
    const sum=older.reduce((n,r)=>n+Math.round(Number(r.population)*1000),0);
    const olderPopulation=older.length&&Number.isFinite(sum)?sum:null;
    return {district,year,population:Number.isFinite(population)&&population!==null&&population>=0?population:null,older_population:olderPopulation!==null&&olderPopulation>=0?olderPopulation:null,
        older_share:population&&olderPopulation!==null?olderPopulation/population:null,
        note:'DOSM figures are district-level estimates, in thousands in the source. They are not neighbourhood counts or evidence about an individual walker.'};
}

export function wikidataLandmarks(value: unknown, area: PilotId): PilotContext['landmarks'] {
    const result=(value??{}) as {results?:{bindings?:Array<Record<string,{value:string}>>}};
    return (result.results?.bindings??[]).flatMap(r=>{
        const id=r.item?.value?.match(/\/(Q[1-9]\d*)$/)?.[1];
        const point=/^Point\((-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)\)$/.exec(r.location?.value||'');
        if(!id||!point||!pointInPilot([Number(point[2]),Number(point[1])],area)||!r.itemLabel?.value)return [];
        return [{id,name:r.itemLabel.value,description:r.itemDescription?.value||'',url:`https://www.wikidata.org/wiki/${id}`,coordinates:[Number(point[2]),Number(point[1])] as [number,number]}];
    });
}

export function satelliteScenes(value: unknown,area:PilotId='pasar-seni'): PilotContext['environment']['scenes'] {
    const data=(value??{}) as {features?:Array<{id:string;collection:string;bbox:number[];properties:Record<string,unknown>}>};
    const [south,west,north,east]=PILOTS[area].bounds;
    return (data.features??[]).filter(f=>typeof f.id==='string'&&Array.isArray(f.bbox)&&f.bbox.length===4&&f.bbox.every(Number.isFinite)
        &&f.bbox[0]<=east&&f.bbox[2]>=west&&f.bbox[1]<=north&&f.bbox[3]>=south
        &&['sentinel-2-l2a','esa-worldcover'].includes(f.collection)&&typeof (f.properties?.datetime||f.properties?.['start_datetime'])==='string')
        .map(f=>({id:f.id,date:String(f.properties.datetime||f.properties.start_datetime),cloud_percent:typeof f.properties['eo:cloud_cover']==='number'?f.properties['eo:cloud_cover']:null,
            collection:f.collection,bbox:f.bbox,url:`https://planetarycomputer.microsoft.com/dataset/${f.collection}`}));
}
