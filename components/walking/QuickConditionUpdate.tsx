'use client';
import { useState } from 'react';
import type { ConditionUpdate } from '@/lib/walk-library';
import type { PathEdge } from '@/lib/routing';
import type { WalkingAsset } from '@/lib/walking';
import { IS_PAGES_PREVIEW } from '@/lib/site';
import type { PilotId } from '@/lib/pilots';

export default function QuickConditionUpdate({ edges, facilities, onSave, onShare,area='elmina',dataset }: { edges: PathEdge[]; facilities: WalkingAsset[];area?:PilotId;dataset?:string;
    onSave: (value: ConditionUpdate) => boolean; onShare: (value: ConditionUpdate) => Promise<boolean> }) {
    const [kind, setKind] = useState<ConditionUpdate['kind']>('blocked');
    const [target, setTarget] = useState(''); const [notes, setNotes] = useState(''); const [message, setMessage] = useState(''); const [pending, setPending] = useState(false);
    const choices = kind === 'seat_unavailable' ? facilities.filter(a => a.kind === 'rest').map(a => ({ id: a.id, name: a.name, type: 'facility' as const }))
        : edges.filter(e => e.pedestrian_access !== false && e.kind !== 'street').map(e => ({ id: String(e.id), name: e.name || `Footpath ${e.id}`, type: e.is_crossing ? 'crossing' as const : 'path' as const }));
    async function save(shared: boolean) {
        const choice = choices.find(c => c.id === target); if (!choice) { setMessage('Choose the exact path or seat you observed.'); return; }
        const now = new Date().toISOString();
        const update: ConditionUpdate = { id: crypto.randomUUID(),area_id:area,dataset_id:dataset, kind, target_type: choice.type, target_id: choice.id, name: choice.name,
            observed_at: now, valid_until: new Date(Date.parse(now) + 86400000).toISOString(), notes: notes.trim() };
        if (!onSave(update)) { setMessage('The report could not be saved on this device.'); return; }
        if (!shared) { setMessage('Saved on this device as an unverified report. It has not been shared.'); return; }
        setPending(true);
        try { setMessage(await onShare(update) ? 'Shared as a report awaiting review. It has not been marked verified.' : 'Saved on this device. Sharing failed; retry from Saved when connected.'); }
        finally { setPending(false); }
    }
    return <details className="rounded-xl border-2 border-slate-300 bg-white p-3 text-slate-900">
        <summary className="min-h-8 cursor-pointer font-bold">Update a path or seat condition</summary>
        <div className="mt-3 space-y-3">
            <p className="text-sm">Tell us what you observed now. Choose the exact location; a report is separate from a field verification.</p>
            <label className="block text-sm font-bold">What changed?<select className="tg-input mt-1" value={kind} onChange={e => { setKind(e.target.value as ConditionUpdate['kind']); setTarget(''); setMessage(''); }}><option value="blocked">Path blocked now</option><option value="light_out">Light not working</option><option value="seat_unavailable">Seat unavailable</option></select></label>
            <label className="block text-sm font-bold">Observed location<select className="tg-input mt-1" value={target} onChange={e => setTarget(e.target.value)}><option value="">Choose a mapped location</option>{choices.map(c => <option key={c.id} value={c.id}>{c.name} · {c.type} {c.id}</option>)}</select></label>
            {!choices.length && <p className="text-sm">No matching facilities or paths are mapped here yet.</p>}
            <label className="block text-sm font-bold">Details (optional)<textarea className="tg-input mt-1" maxLength={500} value={notes} onChange={e => setNotes(e.target.value)} /></label>
            <button className="tg-btn" disabled={pending || !target} onClick={() => void save(false)}>Save on this device</button>
            {!IS_PAGES_PREVIEW && <button className="tg-btn" disabled={pending || !target} onClick={() => void save(true)}>{pending ? 'Sharing…' : 'Save and share report'}</button>}
            <p className="text-xs">Time is recorded when you save. Review is due after 24 hours; an overdue report does not automatically mean a blocked path has reopened.{IS_PAGES_PREVIEW ? ' Shared reporting is unavailable on GitHub Pages.' : ''}</p>
            <p role="status" className="text-sm">{message}</p>
        </div>
    </details>;
}
