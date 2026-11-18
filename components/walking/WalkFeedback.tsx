'use client';
import { useState } from 'react';
import type { ComfortRating, WalkFeedback as Feedback } from '@/lib/walk-library';

export default function WalkFeedback({ initial, onSave }: { initial: Feedback | null; onSave: (value: Feedback) => boolean }) {
    const [value, setValue] = useState<Omit<Feedback, 'recorded_at'>>(() => initial ?? { heat: 'not_sure', effort: 'not_sure', access: 'not_sure', notes: '' });
    const [message, setMessage] = useState('');
    const fields = [['heat','Heat and exposure'],['effort','Walking effort'],['access','Access and obstacles']] as const;
    return <form className="tg-stack rounded-xl border border-slate-300 bg-white p-3 text-slate-900" onSubmit={e => { e.preventDefault(); setMessage(onSave({ ...value, recorded_at: new Date().toISOString() }) ? 'Your feedback is saved on this device.' : 'Feedback could not be saved. Please try again.'); }}>
        <h2 className="text-lg font-bold">How did the walk feel?</h2><p className="text-sm">Optional feedback helps you compare expectations with experience. It does not verify a path condition.</p>
        {fields.map(([field,label]) => <label className="block text-sm font-bold" key={field}>{label}
            <select className="mt-1 min-h-11 w-full rounded border border-slate-400 bg-white px-2 font-normal" value={value[field]} onChange={e => setValue({ ...value, [field]: e.target.value as ComfortRating })}>
                <option value="not_sure">Not sure / skip</option><option value="easier">Better than expected</option><option value="as_expected">As expected</option><option value="harder">Harder than expected</option>
            </select>
        </label>)}
        <label className="text-sm font-bold">Anything to remember? (optional)<textarea className="tg-input mt-1" maxLength={500} value={value.notes} onChange={e => setValue({ ...value, notes: e.target.value })} /></label>
        <button className="tg-btn" type="submit">Save comfort feedback</button><p role="status" className="text-sm">{message}</p>
    </form>;
}
