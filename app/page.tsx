import Link from 'next/link';
import { Footprints, ArrowRight, ArrowUpRight, Sun, Accessibility, ClipboardCheck, MapPin } from 'lucide-react';
import PreviewNotice from '@/components/walking/PreviewNotice';
import { IS_PAGES_PREVIEW } from '@/lib/site';
import HomeWalkPreview from '@/components/walking/HomeWalkPreview';
import { KL_PILOT_AVAILABLE,DEFAULT_PILOT,PILOTS,isPilotAvailable } from '@/lib/pilots';
import { DESTINATIONS } from '@/lib/precinct';

export default function Home() {
    const umDefault = DEFAULT_PILOT === 'um-campus';
    const plannerHref=`/resident?area=${DEFAULT_PILOT}`;
    const coverageHref=`/verification?area=${DEFAULT_PILOT}`;
    return (
        <div className="min-h-screen bg-[#f6f7f2] font-sans text-[#24392f]">
            <header className="border-b border-[#dce2d8] bg-[#f6f7f2] px-5 sm:px-8">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 py-4">
                    <Link href="/" className="flex min-h-11 items-center gap-3 text-xl font-extrabold"><span className="rounded-xl bg-[#a4262c] p-2 text-white"><Footprints size={24} aria-hidden /></span>TownshipGo</Link>
                    <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-x-5 text-sm font-bold"><Link href={plannerHref} className="inline-flex min-h-11 items-center">Walking planner</Link><Link href={coverageHref} className="inline-flex min-h-11 items-center">Path information</Link><Link href={`/dashboard?area=${DEFAULT_PILOT}`} className="hidden min-h-11 items-center sm:inline-flex">Maintenance</Link></nav>
                </div>
            </header>
            <main className="mx-auto max-w-7xl px-5 pb-12 pt-8 sm:px-8 lg:pt-12">
                <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
                    <section>
                        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#ceddce] bg-[#eaf1e7] px-3 py-2 text-xs font-bold uppercase tracking-widest text-[#3c604a]"><MapPin size={15} aria-hidden />{PILOTS[DEFAULT_PILOT].name}</p>
                        <h1 className="max-w-xl text-[clamp(2.6rem,5vw,4.6rem)] font-extrabold leading-[1.08] tracking-[-.045em]">A better walk,<br /><span className="text-[#47745a]">on your terms.</span></h1>
                        <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#536355]">{KL_PILOT_AVAILABLE?'Discover central KL on foot, from station areas to heritage streets. Find mapped places and facilities, compare the conditions along the route, and see what still needs checking.':umDefault?'Find classes and campus landmarks on the mapped pedestrian network. Compare roof cover and walking conditions before you leave.':'Try a walk between the Elmina bridges. Choose your pace, compare the mapped paths and see which conditions still need checking.'}</p>
                        {!KL_PILOT_AVAILABLE&&<p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">Central KL pilot · data pending. Pasar Seni, Chinatown and Masjid Jamek will open when their real map data is ready.</p>}
                        <div className="mt-7 flex flex-wrap gap-3"><Link href={plannerHref} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[#A4262C] px-6 py-3 font-bold text-white shadow-sm">Plan a walk<ArrowRight size={20} aria-hidden /></Link>
                            <Link href={coverageHref} className="inline-flex min-h-14 items-center gap-2 rounded-xl border border-[#c6d2c6] bg-white px-5 py-3 font-bold">Explore path information<ArrowUpRight size={18} aria-hidden /></Link></div>
                        {isPilotAvailable('um-campus') && !umDefault && <Link href="/resident?area=um-campus" className="mt-3 inline-flex min-h-11 items-center gap-2 font-bold underline"><MapPin size={18} aria-hidden /> Walk at UM campus</Link>}
                        <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[#536355]"><span>Pedestrian routes</span><span>Personal walking needs</span><span>Explainable confidence</span></div>
                        {DEFAULT_PILOT!=='elmina'&&<p className="mt-4 text-sm text-[#536355]">New to the planner? The <a className="inline-flex min-h-11 items-center font-bold underline" href="#elmina-example">Elmina bridges example</a> is available below.</p>}
                    </section>
                    <HomeWalkPreview />
                </div>
                {DEFAULT_PILOT!=='elmina'&&<section id="elmina-example" aria-label="Elmina bridges example" className="mt-8 rounded-2xl border border-[#dce2d8] bg-white p-5">
                    <h2 className="text-lg font-extrabold">Learn with the Elmina bridges example</h2>
                    <p className="mt-2 text-sm text-[#536355]">Try either bridge to see how your pace, walking needs and route information work. These examples use a separate mapped area.</p>
                    <div className="mt-3 flex flex-wrap gap-3">{DESTINATIONS.map(place=><Link key={place.id} href={`/resident?${new URLSearchParams({area:'elmina',destId:place.id})}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#c6d2c6] px-4 py-2 text-sm font-bold underline">{place.name}<ArrowUpRight size={17} aria-hidden/></Link>)}</div>
                </section>}
                <section aria-label="What shapes your walk" className="mt-10 grid gap-4 md:grid-cols-3 lg:mt-14">
                    {[
                        { Icon: Sun, title: 'Look beyond the distance', text: 'Compare estimated sun exposure and lighting at your departure time. See where comfort data is still missing.' },
                        { Icon: Accessibility, title: 'Make room for your needs', text: 'Choose your pace, step-free requirements and rest interval. A usable arrival point matters as much as the path.' },
                        { Icon: ClipboardCheck, title: 'Know what has been checked', text: 'Route colours separate personal fit from uncertainty. Mapped features, reports and current observations stay distinct.' },
                    ].map(({ Icon, title, text }) => <article key={title} className="rounded-2xl border border-[#dce2d8] bg-white p-6"><Icon size={24} className="text-[#47745a]" aria-hidden /><h2 className="mt-4 text-lg font-extrabold">{title}</h2><p className="mt-2 text-sm leading-relaxed text-[#536355]">{text}</p></article>)}
                </section>
                <div className="mt-7"><PreviewNotice /></div>
                <footer className="mt-8 flex flex-wrap justify-between gap-4 border-t border-[#dce2d8] pt-6 text-xs leading-relaxed text-[#536355]"><p>© OpenStreetMap contributors · {IS_PAGES_PREVIEW ? 'Dated source snapshots' : 'Local pedestrian network'}<br />Estimates support planning; current conditions still need checking.</p><div className="flex flex-wrap gap-4"><Link href="/dashboard" className="inline-flex min-h-11 items-center font-bold underline">Maintenance dashboard</Link><Link href="/verification" className="inline-flex min-h-11 items-center font-bold underline">{IS_PAGES_PREVIEW ? 'View mapped places and verification coverage' : 'Verify paths, entrances and rest facilities'}</Link></div></footer>
            </main>
        </div>
    );
}
