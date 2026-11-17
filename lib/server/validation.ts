import type { HazardKind } from '../routing.ts';

export class RequestError extends Error {
    readonly status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.status = status;
    }
}

export interface NewReport {
    lat: number;
    lng: number;
    kind: HazardKind;
    edge_id?: number;
    description: string;
    reported_by_proxy: boolean;
}

const HAZARD_KINDS = ['blocked', 'no_ramp', 'light_out', 'no_shade', 'broken_surface'];

export function validateReport(body: unknown): NewReport {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new RequestError('A report object is required.');
    const input = body as Record<string, unknown>;
    const { lat, lng, kind, edge_id, description, reported_by_proxy } = input;
    if (typeof lat !== 'number' || !Number.isFinite(lat) || Math.abs(lat) > 90 ||
        typeof lng !== 'number' || !Number.isFinite(lng) || Math.abs(lng) > 180) {
        throw new RequestError('A valid latitude and longitude are required.');
    }
    if (typeof kind !== 'string' || !HAZARD_KINDS.includes(kind)) throw new RequestError('Choose a supported pedestrian problem.');
    if (edge_id !== undefined && (typeof edge_id !== 'number' || !Number.isSafeInteger(edge_id) || edge_id <= 0)) {
        throw new RequestError('The footpath identifier must be a positive integer.');
    }
    if (description !== undefined && (typeof description !== 'string' || description.length > 2000)) {
        throw new RequestError('Report details must be text of at most 2000 characters.');
    }
    if (reported_by_proxy !== undefined && typeof reported_by_proxy !== 'boolean') {
        throw new RequestError('The proxy reporting flag must be a boolean.');
    }
    return { lat, lng, kind: kind as HazardKind, edge_id: edge_id as number | undefined,
        description: (description as string | undefined)?.trim() ?? '', reported_by_proxy: reported_by_proxy === true };
}

export function validateReportId(id: string): string {
    if (!/^[1-9]\d{0,17}$/.test(id)) throw new RequestError('The report identifier is invalid.');
    return id;
}
