import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { JourneyRoute } from '@/lib/walking';

export default function RouteQualityBar({ route, best = false, compact = false }: { route?: JourneyRoute; best?: boolean; compact?: boolean }) {
    const band = route?.suitability ?? 'red';
    const index = { red: 0, yellow: 1, green: 2 }[band];
    const Icon = band === 'green' ? CheckCircle2 : band === 'yellow' ? AlertTriangle : XCircle;
    const title = band === 'green' ? (best ? 'Best available match' : 'Meets your needs')
        : band === 'yellow' ? (best ? 'Best available — checks needed' : 'Needs confirmation') : 'No matching route';
    const colors = ['#B91C1C', '#FACC15', '#15803D'];
    const Container = compact ? 'span' : 'div';
    return (
        <Container className="block w-full space-y-2" data-route-band={band}>
            <span className="flex items-center gap-2 font-bold" style={{ color: band === 'red' ? '#991B1B' : band === 'green' ? '#166534' : '#713F12', fontSize: compact ? '.8rem' : '1rem' }}>
                <Icon size={compact ? 16 : 21} aria-hidden /> {title}
            </span>
            <span role="meter" aria-label="Route suitability" aria-valuemin={0} aria-valuemax={2} aria-valuenow={index} aria-valuetext={title} className="grid grid-cols-3 gap-1">
                {colors.map((color, i) => <span key={color} className="h-3 rounded-sm" style={{ background: color,
                    outline: i === index ? '3px solid #1B1F23' : 'none', outlineOffset: 1, opacity: i === index ? 1 : .35 }} />)}
            </span>
            {!compact && <>
                <div className="flex justify-between text-xs font-semibold text-slate-700"><span>Low match</span><span>Check details</span><span>Meets needs</span></div>
                {route && <p className="text-sm leading-relaxed text-slate-800">
                    {Math.ceil(route.total_min)}-minute trip · {route.verified_rest_stops} verified rest {route.verified_rest_stops === 1 ? 'stop' : 'stops'} · estimated {Math.round(route.uncovered_m)} m uncovered · {route.unverified_crossings} {route.unverified_crossings === 1 ? 'crossing' : 'crossings'} not fully checked
                </p>}
                {route && <p className="text-xs text-slate-600">Longest stretch without a planned rest: {route.longest_without_rest_min.toFixed(1)} min. Green reflects the selected needs and current checks, not a safety guarantee.</p>}
            </>}
        </Container>
    );
}
