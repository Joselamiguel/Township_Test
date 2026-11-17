'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadWalkingData } from '@/lib/api';
import type { WalkingData } from '@/lib/walking';
import PreviewNotice from './PreviewNotice';

export default function VerificationPreview() {
    const [data, setData] = useState<WalkingData | null>(null);
    const [error, setError] = useState('');
    useEffect(() => { loadWalkingData().then(setData).catch(() => setError('The mapped places could not be loaded. Please reload this page.')); }, []);
    return <main className="min-h-screen bg-slate-50 px-4 py-8 font-sans text-slate-900">
        <div className="mx-auto max-w-3xl space-y-6">
            <h1 className="text-3xl font-extrabold">Mapped places and verification coverage</h1>
            <PreviewNotice />
            <nav className="flex flex-wrap gap-4 font-bold text-[#7F1D22] underline"><Link href="/resident">Plan a walk</Link><Link href="/">TownshipGo home</Link></nav>
            <p>This public map contains mapped access points, with no field verification records. Route confidence stays yellow until relevant conditions are actually checked. Required rest intervals cannot rely on unverified seating.</p>
            {error && <p role="alert">{error}</p>}
            {!data && !error && <p role="status">Loading mapped places…</p>}
            <ul className="space-y-3">{data?.assets.map(a => <li key={a.id} className="rounded-xl border border-slate-300 bg-white p-4">
                <strong>{a.name}</strong><p className="mt-1 text-sm">{a.kind === 'entrance' ? 'Mapped access point' : 'Walking destination'} · Unverified</p>
                <a href={a.source_ref} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-semibold text-[#7F1D22] underline">View OpenStreetMap source</a>
            </li>)}</ul>
            <p className="text-sm text-slate-600">The full TownshipGo server version provides shared facility mapping, dated observations and maintenance reports. This preview does not submit or publish observations.</p>
        </div>
    </main>;
}
