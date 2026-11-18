'use client';
import { useState } from 'react';
import { walkTimeline } from '@/lib/walk-timeline';
import type { JourneyRoute, VerificationRecord } from '@/lib/walking';
import type { PathEdge } from '@/lib/routing';

export default function WalkTimeline({ route, edges, records, onFocus }: { route: JourneyRoute; edges: PathEdge[]; records: VerificationRecord[]; onFocus?: (point: [number, number]) => void }) {
    const [all, setAll] = useState(false);
    const items = walkTimeline(route, edges, records);
    return <details className="rounded-xl border-2 border-slate-300 bg-white p-3 text-slate-900">
        <summary className="min-h-8 cursor-pointer font-bold">Along your walk <span className="text-sm font-normal">· crossings, cover and rests</span></summary>
        <ol className="mt-3 space-y-3 border-l-2 border-emerald-200 pl-3">{(all ? items : items.slice(0, 8)).map(item => <li key={item.id} className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs font-bold text-emerald-900">{Math.round(item.start_min)}{item.end_min > item.start_min ? `–${Math.ceil(item.end_min)}` : ''} min{item.distance_m > 0 ? ` · ${Math.round(item.distance_m)} m` : ''}</p>
            <button type="button" disabled={!onFocus} onClick={() => onFocus?.(item.point)} className="min-h-11 text-left text-sm font-bold underline disabled:no-underline">{item.title}</button>
            <p className="text-xs leading-relaxed text-slate-600">{item.detail}</p>
        </li>)}</ol>
        {!all && items.length > 8 && <button type="button" className="mt-2 min-h-11 font-bold underline" onClick={() => setAll(true)}>Show all {items.length} sections</button>}
    </details>;
}
