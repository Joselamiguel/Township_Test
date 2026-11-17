import type { PathNode, PathEdge, HazardReport, HazardKind } from './routing';
import type { MaintenanceDefect } from './types';
import type { WalkingData } from './walking';
import { IS_PAGES_PREVIEW, dataPath, sitePath } from './site.ts';
import { weatherUrl, parseWeather, unavailableWeather, type WalkingWeather } from './comfort.ts';
import { DEFAULT_ORIGIN } from './precinct.ts';

export interface GraphData {
    nodes: PathNode[];
    edges: PathEdge[];
    source: { name: string; pedestrian_only: boolean; attribution: string; snapshot_at?: string };
}

export interface ReportInput {
    lat: number;
    lng: number;
    kind: HazardKind;
    edge_id?: number;
    description?: string;
    reported_by_proxy?: boolean;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
    if (IS_PAGES_PREVIEW && options?.method && options.method !== 'GET') {
        throw new Error('Shared updates are unavailable in the public preview. Nothing was submitted.');
    }
    const response = await fetch(dataPath(url), { cache: 'no-store', ...options });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'The request failed. Please try again.');
    return data as T;
}

export const loadGraph = () => request<GraphData>('/api/graph');
export const loadWalkingData = async () => {
    const data = await request<WalkingData>('/api/walking-data');
    // The source is fixed, but the planning clock follows the visit.
    return IS_PAGES_PREVIEW ? { ...data, as_of: new Date().toISOString() } : data;
};
export const createWalkingAsset = (asset: unknown) => request<{ id: string }>('/api/assets', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(asset),
});
export const recordVerification = (record: unknown) => request<{ id: string }>('/api/verifications', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record),
});
export const loadHazards = () => request<{ hazards: HazardReport[] }>('/api/hazards');
export const loadReports = (status: 'all' | 'open' = 'open') => request<{ reports: MaintenanceDefect[] }>(`/api/reports?status=${status}`);
export const submitReport = (report: ReportInput) => request<{ hazard: HazardReport; report: MaintenanceDefect }>('/api/reports', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(report),
});
export const markReportFixed = (id: string) => request<{ report: { id: string; status: string } }>(`/api/reports/${encodeURIComponent(id)}/fix`, { method: 'POST' });

export async function loadWeather(): Promise<WalkingWeather> {
    const now = new Date().toISOString();
    try {
        const response = await fetch(IS_PAGES_PREVIEW ? weatherUrl(DEFAULT_ORIGIN) : sitePath('/api/weather'), { signal: AbortSignal.timeout(6000) });
        if (!response.ok) throw new Error('Weather unavailable');
        const value = await response.json();
        return IS_PAGES_PREVIEW ? parseWeather(value, now) : value as WalkingWeather;
    } catch { return unavailableWeather(now); }
}
