import Link from 'next/link';
import { Footprints, ClipboardList } from 'lucide-react';
import PreviewNotice from '@/components/walking/PreviewNotice';
import { IS_PAGES_PREVIEW } from '@/lib/site';

export default function Home() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 font-sans text-slate-900">
            <section className="w-full max-w-xl space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <Footprints className="h-10 w-10 text-[#A4262C]" aria-hidden />
                <h1 className="text-3xl font-extrabold">TownshipGo</h1>
                <p className="text-lg leading-relaxed text-slate-600">Plan a pedestrian walk and help improve the footpaths in your township.</p>
                <PreviewNotice />
                <div className="grid gap-3 sm:grid-cols-2">
                    <Link href="/resident" className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#A4262C] px-4 py-3 font-bold text-white">
                        <Footprints aria-hidden /> Plan a walk
                    </Link>
                    <Link href="/dashboard" className="flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-slate-300 px-4 py-3 font-bold">
                        <ClipboardList aria-hidden /> Maintenance dashboard
                    </Link>
                </div>
                <Link href="/verification" className="inline-flex min-h-11 items-center font-bold text-[#7F1D22] underline">{IS_PAGES_PREVIEW ? 'View mapped places and verification coverage' : 'Verify paths, entrances and rest facilities'}</Link>
                <p className="text-sm text-slate-500">Walking network data: © OpenStreetMap contributors. Route colours explain personal fit and data checks.</p>
            </section>
        </main>
    );
}
