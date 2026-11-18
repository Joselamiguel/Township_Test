'use client';
import { PILOTS,isPilotAvailable,type PilotId } from '@/lib/pilots';
export default function PilotSelector({area,onChange}:{area:PilotId;onChange:(id:PilotId)=>void}){
    return <label className="block text-sm font-bold text-slate-900">Walking area<select aria-label="Walking area" value={area} onChange={e=>onChange(e.target.value as PilotId)} className="mt-1 min-h-11 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 font-semibold">
        <option value="pasar-seni" disabled={!isPilotAvailable('pasar-seni')}>{PILOTS['pasar-seni'].name} · {isPilotAvailable('pasar-seni')?'pilot':'data pending'}</option><option value="elmina">Elmina bridges · guided example</option>
    </select></label>;
}
