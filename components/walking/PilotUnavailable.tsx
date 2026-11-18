import Link from 'next/link';
import { PILOTS,type PilotId } from '@/lib/pilots';
import { sitePath } from '@/lib/site';

export default function PilotUnavailable({area}:{area:PilotId}){
    return <main className="min-h-screen bg-[#f6f7f2] px-5 py-12 font-sans text-[#24392f]">
        <div className="mx-auto max-w-xl space-y-5 rounded-2xl border border-[#dce2d8] bg-white p-6">
            <p className="text-sm font-bold">TownshipGo · {PILOTS[area].name}</p>
            <h1 className="text-2xl font-extrabold">Walking data is not ready for this area</h1>
            <p>The central KL pilot will open when its real map data is ready. You can explore the planner now with the Elmina bridge destinations.</p>
            <Link href="/resident?area=elmina" className="inline-flex min-h-12 items-center rounded-xl bg-[#A4262C] px-5 py-3 font-bold text-white">Open Elmina example</Link>
            <div className="flex flex-wrap gap-5 text-sm font-bold underline"><Link href="/" className="inline-flex min-h-11 items-center">TownshipGo home</Link><a className="inline-flex min-h-11 items-center" href={sitePath('/offline-walks.html')}>Open saved offline walks</a></div>
        </div>
    </main>;
}
