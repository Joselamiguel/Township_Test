import type { FieldEvidence, VerificationRecord, VerificationTarget } from './walking.ts';

export function evidenceFor(
    records: VerificationRecord[], targetType: VerificationTarget, id: string | number, at: string,
): Record<string, FieldEvidence> {
    const instant = Date.parse(at);
    const ordered = records.filter((record) => record.target_type === targetType && record.target_id === String(id)
        && Date.parse(record.observed_at) <= instant).sort((a, b) =>
        Date.parse(b.observed_at) - Date.parse(a.observed_at) || Date.parse(b.created_at) - Date.parse(a.created_at)
        || Number(b.id) - Number(a.id));
    const result: Record<string, FieldEvidence> = {};
    for (const record of ordered) {
        for (const [field, value] of Object.entries(record.attributes)) {
            if (result[field]) continue;
            const current = record.valid_until && Date.parse(record.valid_until) > instant;
            result[field] = { value, status: (record.status === 'verified' && !current) || (record.valid_until && !current) ? 'stale' : record.status,
                observed_at: record.observed_at, valid_until: record.valid_until, reviewer: record.reviewer,
                method: record.method, record_id: record.id };
        }
    }
    return result;
}

export function isConfirmed(evidence: Record<string, FieldEvidence>, field: string) {
    return evidence[field]?.status === 'verified';
}

export function malaysiaHour(instant: string): number {
    return new Date(Date.parse(instant) + 8 * 3600000).getUTCHours();
}

/** Conservative support for OSM-style daily/weekday hours; unsupported rules stay unknown. */
export function openingAt(hours: unknown, instant: string): boolean | null {
    if (typeof hours !== 'string' || !hours.trim()) return null;
    if (hours.trim() === '24/7') return true;
    if (['closed', 'off'].includes(hours.trim().toLowerCase())) return false;
    const local = new Date(Date.parse(instant) + 8 * 3600000);
    const day = (local.getUTCDay() + 6) % 7;
    const minute = local.getUTCHours() * 60 + local.getUTCMinutes();
    const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    let open = false;
    for (const rule of hours.split(';')) {
        const match = /^\s*(?:(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?\s+)?(\d{2}):(\d{2})-(\d{2}):(\d{2})\s*$/.exec(rule);
        if (!match) return null;
        const [, first, last, hh, mm, eh, em] = match;
        const start = Number(hh) * 60 + Number(mm), end = Number(eh) * 60 + Number(em);
        if (Number(hh) > 23 || Number(eh) > 24 || Number(mm) > 59 || Number(em) > 59 || (Number(eh) === 24 && Number(em) !== 0)) return null;
        const permitted = (d: number) => {
            if (!first) return true;
            const a = days.indexOf(first), b = days.indexOf(last || first);
            return a <= b ? d >= a && d <= b : d >= a || d <= b;
        };
        if (start < end) open ||= permitted(day) && minute >= start && minute < end;
        else if (start > end) open ||= (permitted(day) && minute >= start) || (permitted((day + 6) % 7) && minute < end);
        else return null;
    }
    return open;
}
