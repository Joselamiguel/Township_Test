'use client';
import { useState } from 'react';
import type { WalkingAsset, JourneyRoute } from '@/lib/walking';

export default function PlaceDiscovery({ items, budget, onChoose }: { items: Array<{ destination: WalkingAsset; route: JourneyRoute | null; reasons: string[] }>; budget: number; onChoose: (asset: WalkingAsset) => void }) {
    const [category, setCategory] = useState('all');
    const [showUnavailable, setShowUnavailable] = useState(false);
    const matching = items.filter(i => category === 'all' || (category === 'facilities' ? ['toilet', 'water'].includes(i.destination.kind) : i.destination.category === category));
    const shown = matching.filter(i => i.route || showUnavailable);
    return <details className="rounded-xl border-2 border-slate-300 bg-white p-3 text-slate-900">
        <summary className="cursor-pointer font-bold">What can I reach? <span className="text-sm font-normal">{matching.filter(i => i.route).length} places within {budget} min</span></summary>
        <div className="mt-3 space-y-3">
            <label className="block text-sm font-semibold" htmlFor="place-category">Everyday destinations</label>
            <select id="place-category" value={category} onChange={e => setCategory(e.target.value)} className="min-h-11 w-full rounded border border-slate-400 bg-white px-2">
                {[['all','All places'],['healthcare','Clinics & healthcare'],['food','Food & markets'],['shopping','Shops'],['community','Community activities'],['park','Parks & walking places'],['transport','Transit stops'],['facilities','Toilets & water']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={showUnavailable} onChange={e => setShowUnavailable(e.target.checked)} />Include places with no matching route</label>
            {shown.length === 0 && <p className="text-sm">{matching.length ? 'No mapped places meet these walking needs and budget. Include unmatched places to see why.' : 'No places in this category have been mapped in this pilot yet.'}</p>}
            <ul className="space-y-2">{shown.map(({ destination, route, reasons }) => <li key={destination.id} className="rounded-lg border border-slate-200 p-3">
                <button type="button" onClick={() => onChoose(destination)} className="min-h-11 w-full text-left font-bold underline">{destination.name}</button>
                <p className="text-sm">{route ? `${Math.ceil(route.total_min)} min including rests · ${route.suitability === 'green' ? 'Meets needs and current checks' : 'Needs confirmation'}` : reasons[0]}</p>
            </li>)}</ul>
            <p className="text-xs text-slate-600">Reachability follows the pedestrian network and usable access points, including your pace, rest interval and total trip budget. Unmapped places are not counted.</p>
        </div>
    </details>;
}
