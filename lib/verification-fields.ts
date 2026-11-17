import type { VerificationTarget } from './walking';
export interface ObservationField { key: string; label: string; kind: 'boolean' | 'number' | 'text' | 'choice'; min?: number; max?: number; percent?: boolean; options?: string[]; crossingOnly?: boolean }
const PATH_FIELDS: ObservationField[] = [
    { key: 'path_open', label: 'Path is open and passable', kind: 'boolean' },
    { key: 'has_steps', label: 'Steps are present', kind: 'boolean' },
    { key: 'surface_rating', label: 'Surface: 1 smooth, 2 uneven, 3 broken', kind: 'number', min: 1, max: 3 },
    { key: 'slope_pct', label: 'Measured slope (%)', kind: 'number', min: 0, max: 100 },
    { key: 'crossing_type', label: 'Crossing type', kind: 'choice', options: ['signalised', 'zebra', 'uncontrolled'], crossingOnly: true },
    { key: 'has_kerb_ramp', label: 'Kerb ramps are present', kind: 'boolean', crossingOnly: true },
    { key: 'crossing_width_m', label: 'Crossing width (metres)', kind: 'number', min: .1, max: 100, crossingOnly: true },
    { key: 'ped_green_s', label: 'Pedestrian green phase (seconds)', kind: 'number', min: 0, max: 300, crossingOnly: true },
    { key: 'has_refuge', label: 'Crossing refuge is present', kind: 'boolean', crossingOnly: true },
    { key: 'covered', label: 'Entire segment has roof cover', kind: 'boolean' },
    { key: 'shade_morning', label: 'Morning shade (%)', kind: 'number', min: 0, max: 100, percent: true },
    { key: 'shade_midday', label: 'Midday shade (%)', kind: 'number', min: 0, max: 100, percent: true },
    { key: 'shade_afternoon', label: 'Afternoon shade (%)', kind: 'number', min: 0, max: 100, percent: true },
    { key: 'lit_ratio', label: 'Lit portion (%)', kind: 'number', min: 0, max: 100, percent: true },
];
const ASSET_FIELDS: ObservationField[] = [
    { key: 'available', label: 'Access point or facility is available', kind: 'boolean' },
    { key: 'path_connection', label: 'Physical connection to the mapped footpath checked', kind: 'boolean' },
    { key: 'step_free', label: 'Connection and access point are step-free', kind: 'boolean' },
    { key: 'has_seat', label: 'Usable seating is present', kind: 'boolean' },
    { key: 'wheelchair_space', label: 'Level space for a wheelchair to rest', kind: 'boolean' },
    { key: 'sheltered', label: 'Shelter is present', kind: 'boolean' },
    { key: 'backrest', label: 'Seat has a backrest', kind: 'boolean' },
    { key: 'armrests', label: 'Seat has armrests', kind: 'boolean' },
    { key: 'accessible_toilet', label: 'Toilet access checked', kind: 'boolean' },
    { key: 'water_available', label: 'Drinking water available', kind: 'boolean' },
    { key: 'opening_hours', label: 'Hours: 24/7, or Mo-Fr 09:00-17:00', kind: 'text' },
    { key: 'connection_length_m', label: 'Measured connection length (metres)', kind: 'number', min: 0, max: 100 },
];
export function observationFields(target: VerificationTarget) {
    return target === 'path' || target === 'crossing' ? PATH_FIELDS.filter(f => !f.crossingOnly || target === 'crossing') : ASSET_FIELDS;
}
