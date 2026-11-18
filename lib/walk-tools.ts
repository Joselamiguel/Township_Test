import { planJourney } from './journeys.ts';
import { evidenceFor, openingAt } from './verification.ts';
import type { PlanningInput, WalkingData, WalkingAsset } from './walking.ts';
import type { HazardReport, PathEdge, PathNode } from './routing.ts';

export const FACILITY_LABELS = { rest: 'Seats', toilet: 'Toilets', water: 'Drinking water', shelter: 'Shelters' } as const;
export type FacilityKind = keyof typeof FACILITY_LABELS;

export function findFacilities(nodes: PathNode[], edges: PathEdge[], data: WalkingData,
    request: Omit<PlanningInput, 'destination' | 'entrance_id'>, kind: FacilityKind, hazards: HazardReport[] = [],ids?:string[]) {
    return data.assets.filter(a => a.kind === kind&&(!ids||ids.includes(a.id))).map(asset => {
        const plan = planJourney(nodes, edges, data, { ...request, destination: asset }, hazards, null, ['direct']);
        let route = plan.routes.direct ?? null;
        const at = route?.arrival_at ?? request.departure_at;
        const checks = evidenceFor(data.verifications, 'facility', asset.id, at);
        const facts = { ...asset.properties, ...Object.fromEntries(Object.entries(checks).map(([k, v]) => [k, v.value])) };
        const required = ['available', 'path_connection', 'opening_hours', ...(request.needs.step_free || request.profile === 'wheelchair' ? ['step_free'] : []),
            ...(kind === 'rest' ? [request.profile === 'wheelchair' ? 'wheelchair_space' : 'has_seat'] : []),
            ...(kind === 'water' ? ['water_available'] : []), ...(kind === 'shelter' ? ['sheltered'] : []),
            ...(kind === 'toilet' && (request.needs.step_free || request.profile === 'wheelchair') ? ['accessible_toilet'] : [])];
        const missing = required.filter(f => checks[f]?.status !== 'verified');
        const unavailable = required.some(field => field !== 'opening_hours' && facts[field] === false) || openingAt(facts.opening_hours, at) === false;
        if (unavailable || (request.needs.verified_only && missing.length)) route = null;
        return { asset, route, checked: !missing.length && !unavailable, note: unavailable ? 'Reported unavailable or closed at arrival'
            : missing.length ? 'Mapped facility · availability needs checking' : 'Current facility checks available', reasons: plan.reasons };
    }).sort((a, b) => (a.route?.total_min ?? Infinity) - (b.route?.total_min ?? Infinity));
}

export function facilityName(asset: WalkingAsset) { return asset.name || FACILITY_LABELS[asset.kind as FacilityKind] || 'Mapped facility'; }
