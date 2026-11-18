import { RequestError, validateReportId } from './server/validation.ts';

/** The quick-report endpoint never accepts a client's verification status or reviewer. */
export function conditionUpdateRecord(body: unknown, now = Date.now()) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new RequestError('A condition report is required.');
    const value = body as Record<string, unknown>;
    if (!['blocked','light_out','seat_unavailable'].includes(String(value.kind))) throw new RequestError('Choose a supported condition change.');
    if (!(value.kind === 'seat_unavailable' ? value.target_type === 'facility' : ['path','crossing'].includes(String(value.target_type)))) throw new RequestError('Choose the matching path or facility.');
    const target_id = validateReportId(String(value.target_id));
    const at = Date.parse(String(value.observed_at));
    if (!Number.isFinite(at) || at > now + 300000 || at < now - 7 * 86400000) throw new RequestError('Share an observation from the last seven days. Older reports remain on your device.');
    if (value.notes !== undefined && (typeof value.notes !== 'string' || value.notes.length > 500)) throw new RequestError('Details must be at most 500 characters.');
    return { target_type: value.target_type, target_id, status: 'reported', method: 'site_visit', reviewer: 'Community condition report', source_ref: '',
        observed_at: new Date(at).toISOString(), valid_until: new Date(at + 86400000).toISOString(), notes: typeof value.notes === 'string' ? value.notes.trim() : '',
        attributes: value.kind === 'blocked' ? { path_open: false } : value.kind === 'light_out' ? { lit_ratio: 0 } : { available: false } };
}
