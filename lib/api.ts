import type { PathNode, PathEdge, HazardReport, HazardKind } from './routing';
import type { MaintenanceDefect } from './types';
import type { WalkingData } from './walking';

export interface GraphData {
    nodes: PathNode[];
    edges: PathEdge[];
    source: { name: string; pedestrian_only: boolean; attribution: string };
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
    const response = await fetch(url, { cache: 'no-store', ...options });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'The request failed. Please try again.');
    return data as T;
}

export const loadGraph = () => request<GraphData>('/api/graph');
export const loadWalkingData = () => request<WalkingData>('/api/walking-data');
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
