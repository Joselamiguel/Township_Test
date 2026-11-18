'use client';
import { useMemo,useState } from 'react';
import { usePlannerResult } from '@/lib/use-planner';
import { metres } from '@/lib/walking-geometry';
import type { PlanningSnapshot } from '@/lib/planning-dispatch';
import type { WalkingAsset,JourneyRoute,PlanningInput } from '@/lib/walking';

export default function PlaceDiscovery({ snapshot,request, budget, onChoose }: { snapshot:PlanningSnapshot|null;request:Omit<PlanningInput,'destination'|'entrance_id'>; budget: number; onChoose: (asset: WalkingAsset) => void }) {
    const [category, setCategory] = useState('all');
    const [showUnavailable, setShowUnavailable] = useState(false);
    const [opened,setOpened]=useState(false),[limit,setLimit]=useState(8);
    const matching=useMemo(()=>snapshot?.walking.assets.filter(a=>['destination','transit','toilet','water'].includes(a.kind)&&(category==='all'||(category==='facilities'?['toilet','water'].includes(a.kind):a.category===category)))
        .sort((a,b)=>metres([a.lng,a.lat],[request.origin[1],request.origin[0]])-metres([b.lng,b.lat],[request.origin[1],request.origin[0]]))??[],[snapshot,category,request.origin]);
    const search=usePlannerResult<Array<{destination:WalkingAsset;route:JourneyRoute|null;reasons:string[]}>>(snapshot,{type:'discover',input:request,ids:matching.slice(0,limit).map(a=>a.id)},opened);
    const items=search.result??[],shown=items.filter(i=>i.route||showUnavailable);
    return <details className="rounded-xl border-2 border-slate-300 bg-white p-3 text-slate-900" onToggle={e=>setOpened(e.currentTarget.open)}>
        <summary className="cursor-pointer font-bold">What can I reach? <span className="text-sm font-normal">within {budget} min</span></summary>
        <div className="mt-3 space-y-3">
            <label className="block text-sm font-semibold" htmlFor="place-category">Everyday destinations</label>
            <select id="place-category" value={category} onChange={e => {setCategory(e.target.value);setLimit(8);}} className="min-h-11 w-full rounded border border-slate-400 bg-white px-2">
                {[['all','All places'],['healthcare','Clinics & healthcare'],['food','Food & markets'],['shopping','Shops'],['community','Community activities'],['park','Parks & walking places'],['transport','Transit stops'],['facilities','Toilets & water']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={showUnavailable} onChange={e => setShowUnavailable(e.target.checked)} />Include places with no matching route</label>
            {search.pending&&<p role="status">Checking pedestrian routes and your walking needs…</p>}{search.error&&<p role="alert">{search.error}</p>}
            {!search.pending&&shown.length === 0 && <p className="text-sm">{matching.length ? 'No matching places in the checked candidates. Include unmatched places to see why, or check more places.' : 'No places in this category have been mapped in this pilot yet.'}</p>}
            <ul className="space-y-2">{shown.map(({ destination, route, reasons }) => <li key={destination.id} className="rounded-lg border border-slate-200 p-3">
                <button type="button" onClick={() => onChoose(destination)} className="min-h-11 w-full text-left font-bold underline">{destination.name}</button>
                <p className="text-sm">{route ? `${Math.ceil(route.total_min)} min including rests · ${route.suitability === 'green' ? 'Meets needs and current checks' : 'Needs confirmation'}` : reasons[0]}</p>
            </li>)}</ul>
            {matching.length>limit&&<button className="min-h-11 font-bold underline" disabled={search.pending} onClick={()=>setLimit(n=>n+8)}>Check more nearby places</button>}
            <p className="text-xs text-slate-600">Checking {Math.min(limit,matching.length)} of {matching.length} mapped candidates, nearest first. Routes use the pedestrian network, access points, pace, rests and budget.</p>
        </div>
    </details>;
}
