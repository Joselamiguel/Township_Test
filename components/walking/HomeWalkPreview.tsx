'use client';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowUpRight, MapPin, Clock3 } from 'lucide-react';
import { loadGraph, loadWalkingData, loadHazards, type GraphData } from '@/lib/api';
import { DEFAULT_ORIGIN, DESTINATIONS } from '@/lib/precinct';
import { DEFAULT_NEEDS, type WalkingData } from '@/lib/walking';
import type { HazardReport } from '@/lib/routing';
import { planJourney } from '@/lib/journeys';

const Map = dynamic(() => import('@/components/map/InteractiveMap'), { ssr: false,
    loading: () => <div role="status" className="flex h-full items-center justify-center text-sm text-[#3f5a49]">Loading the map…</div> });

export default function HomeWalkPreview() {
    const [data, setData] = useState<{ graph: GraphData; walking: WalkingData; hazards: HazardReport[] } | null>(null);
    const [error, setError] = useState(false);
    useEffect(() => {
        Promise.all([loadGraph(), loadWalkingData(), loadHazards()])
            .then(([graph, walking, hazards]) => setData({ graph, walking, hazards: hazards.hazards }))
            .catch(() => setError(true));
    }, []);
    const place = data?.walking.assets.find(a => a.external_id === DESTINATIONS[0].id);
    const route = useMemo(() => data && place ? planJourney(data.graph.nodes, data.graph.edges, data.walking,
        { origin: DEFAULT_ORIGIN, destination: place, profile: 'senior', needs: DEFAULT_NEEDS, departure_at: data.walking.as_of }, data.hazards).routes.direct : undefined,
    [data, place]);
    return <section aria-label="Elmina sample walk" className="relative isolate overflow-hidden rounded-[2rem] border border-[#d3ddd6] bg-[#e8eee8] shadow-[0_18px_60px_rgba(31,58,43,.10)]">
        <div className="flex items-center justify-between gap-3 border-b border-[#d3ddd6] bg-white/95 px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#254c3c]"><MapPin size={18} aria-hidden />A walk around Elmina</div>
            <span className="rounded-full border border-[#d5dfd5] bg-[#f3f6f1] px-3 py-1 text-xs font-semibold text-[#3f5a49]">Pedestrian network</span>
        </div>
        <div className="relative h-[22rem] sm:h-[27rem]">
            {data ? <Map startCoords={DEFAULT_ORIGIN} endCoords={route ? [route.entrance.lat, route.entrance.lng] : DESTINATIONS[0].coords}
                routes={route ? [{ id: 'direct', name: 'Sample walk', route_type: 'direct', coordinates: route.coordinates }] : []}
                activeRouteId="direct" reduceMotion />
                : <div role="status" className="flex h-full items-center justify-center px-8 text-center text-sm text-[#3f5a49]">{error ? 'The map preview is unavailable. You can still open the walking planner.' : 'Loading the local pedestrian network…'}</div>}
        </div>
        <div className="relative border-t border-[#d3ddd6] bg-white p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600"><span className="rounded-full bg-[#edf5f1] px-2 py-1 text-emerald-900">Example walk</span>Profile pace · conditions need checking</div>
            <h2 className="text-lg font-extrabold text-[#24392f]">{place?.name || DESTINATIONS[0].name}</h2>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm text-slate-700"><Clock3 size={17} aria-hidden />{route ? `${Math.ceil(route.total_min)} min · ${Math.round(route.length_m)} m` : 'Choose your pace and requirements'}</span>
                <Link href="/resident" className="inline-flex min-h-11 items-center gap-2 font-bold text-[#7f1d22] underline">Plan for me<ArrowUpRight size={18} aria-hidden /></Link>
            </div>
        </div>
    </section>;
}
