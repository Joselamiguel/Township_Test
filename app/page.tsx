import Link from 'next/link';
import { Footprints, ArrowRight, ArrowUpRight, Sun, Accessibility, ClipboardCheck, MapPin } from 'lucide-react';
import PreviewNotice from '@/components/walking/PreviewNotice';
import { IS_PAGES_PREVIEW } from '@/lib/site';
import HomeWalkPreview from '@/components/walking/HomeWalkPreview';

export default function Home() {
    return (
        <div className="min-h-screen bg-[#f6f7f2] font-sans text-[#24392f]">
            <header className="border-b border-[#dce2d8] bg-[#f6f7f2] px-5 sm:px-8">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 py-4">
                    <Link href="/" className="flex min-h-11 items-center gap-3 text-xl font-extrabold"><span className="rounded-xl bg-[#a4262c] p-2 text-white"><Footprints size={24} aria-hidden /></span>TownshipGo</Link>
                    <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-x-5 text-sm font-bold"><Link href="/resident" className="inline-flex min-h-11 items-center">Walking planner</Link><Link href="/verification" className="inline-flex min-h-11 items-center">Path information</Link><Link href="/dashboard" className="hidden min-h-11 items-center sm:inline-flex">Maintenance</Link></nav>
                </div>
            </header>
            <main className="mx-auto max-w-7xl px-5 pb-12 pt-8 sm:px-8 lg:pt-12">
                <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
                    <section>
                        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#ceddce] bg-[#eaf1e7] px-3 py-2 text-xs font-bold uppercase tracking-widest text-[#3c604a]"><MapPin size={15} aria-hidden />City of Elmina · walking pilot</p>
                        <h1 className="max-w-xl text-[clamp(2.6rem,5vw,4.6rem)] font-extrabold leading-[1.08] tracking-[-.045em]">A better walk,<br /><span className="text-[#47745a]">on your terms.</span></h1>
                        <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#536355]">Your pace. A place to rest. A little more shade. Compare the route and the conditions along it, then choose a walk that fits your day.</p>
                        <div className="mt-7 flex flex-wrap gap-3"><Link href="/resident" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[#A4262C] px-6 py-3 font-bold text-white shadow-sm">Plan a walk<ArrowRight size={20} aria-hidden /></Link>
                            <Link href="/verification" className="inline-flex min-h-14 items-center gap-2 rounded-xl border border-[#c6d2c6] bg-white px-5 py-3 font-bold">Explore path information<ArrowUpRight size={18} aria-hidden /></Link></div>
                        <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[#536355]"><span>Pedestrian routes</span><span>Personal walking needs</span><span>Explainable confidence</span></div>
                    </section>
                    <HomeWalkPreview />
                </div>
                <section aria-label="What shapes your walk" className="mt-10 grid gap-4 md:grid-cols-3 lg:mt-14">
                    {[
                        { Icon: Sun, title: 'Look beyond the distance', text: 'Compare estimated sun exposure and lighting at your departure time. See where comfort data is still missing.' },
                        { Icon: Accessibility, title: 'Make room for your needs', text: 'Choose your pace, step-free requirements and rest interval. A usable arrival point matters as much as the path.' },
                        { Icon: ClipboardCheck, title: 'Know what has been checked', text: 'Route colours separate personal fit from uncertainty. Mapped features, reports and current observations stay distinct.' },
                    ].map(({ Icon, title, text }) => <article key={title} className="rounded-2xl border border-[#dce2d8] bg-white p-6"><Icon size={24} className="text-[#47745a]" aria-hidden /><h2 className="mt-4 text-lg font-extrabold">{title}</h2><p className="mt-2 text-sm leading-relaxed text-[#536355]">{text}</p></article>)}
                </section>
                <div className="mt-7"><PreviewNotice /></div>
                <footer className="mt-8 flex flex-wrap justify-between gap-4 border-t border-[#dce2d8] pt-6 text-xs leading-relaxed text-[#536355]"><p>© OpenStreetMap contributors · {IS_PAGES_PREVIEW ? 'Included Elmina snapshot' : 'Local pedestrian network'}<br />Estimates support planning; current conditions still need checking.</p><div className="flex flex-wrap gap-4"><Link href="/dashboard" className="inline-flex min-h-11 items-center font-bold underline">Maintenance dashboard</Link><Link href="/verification" className="inline-flex min-h-11 items-center font-bold underline">{IS_PAGES_PREVIEW ? 'View mapped places and verification coverage' : 'Verify paths, entrances and rest facilities'}</Link></div></footer>
            </main>
        </div>
    );
}
