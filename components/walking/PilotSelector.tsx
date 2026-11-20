'use client';
import { PILOTS,isPilotAvailable,type PilotId } from '@/lib/pilots';
export default function PilotSelector({area,onChange}:{area:PilotId;onChange:(id:PilotId)=>void}){
    return <label className="block min-w-0 text-sm font-bold text-slate-900"><span className="sr-only">Walking area</span><select value={area} onChange={e=>onChange(e.target.value as PilotId)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 font-semibold">
        {Object.values(PILOTS).map(pilot => (
            <option key={pilot.id} value={pilot.id} disabled={!isPilotAvailable(pilot.id)}>
                {pilot.short_name}{isPilotAvailable(pilot.id) ? '' : ' · data pending'}
            </option>
        ))}
    </select></label>;
}
