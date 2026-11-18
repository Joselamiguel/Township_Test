import { metres } from './walking-geometry.ts';
import type { Profile } from './routing.ts';

export interface TrackFix { lat: number; lng: number; accuracy: number; at: number }
export interface TrackState { last: TrackFix | null; fixes: TrackFix[]; distance_m: number; pace_distance_m: number; moving_s: number; rejected: number }
export const emptyTrack = (): TrackState => ({ last: null, fixes: [], distance_m: 0, pace_distance_m: 0, moving_s: 0, rejected: 0 });

/** Accuracy gates, time gaps and jumps are deliberately excluded from pace learning. */
export function addTrackFix(track: TrackState, fix: TrackFix, now = Date.now()): TrackState {
    if (![fix.lat, fix.lng, fix.accuracy, fix.at].every(Number.isFinite) || Math.abs(fix.lat) > 90 || Math.abs(fix.lng) > 180
        || fix.accuracy < 0 || fix.accuracy > 25 || Math.abs(now - fix.at) > 30000 || (track.last && fix.at <= track.last.at)) return { ...track, rejected: track.rejected + 1 };
    if (!track.last) return { ...track, last: fix, fixes: [...track.fixes.slice(-1499), fix] };
    const seconds = (fix.at - track.last.at) / 1000;
    const distance = metres([track.last.lng, track.last.lat], [fix.lng, fix.lat]);
    if (seconds > 45 || distance / seconds > 2.5) return { ...track, last: fix, rejected: track.rejected + 1 };
    if (distance < Math.max(4, (track.last.accuracy + fix.accuracy) / 2) || distance / seconds < .3) return track;
    return { ...track, last: fix, fixes: [...track.fixes.slice(-1499), fix], distance_m: track.distance_m + distance,
        pace_distance_m: track.pace_distance_m + (distance / seconds <= 1.8 ? distance : 0),
        moving_s: track.moving_s + (distance / seconds <= 1.8 ? seconds : 0), rejected: track.rejected + (distance / seconds > 1.8 ? 1 : 0) };
}

export interface PaceSample { profile: Profile; track: TrackState; active_ms: number }
export function suggestedPace(walks: PaceSample[], profile: Profile) {
    const usable = walks.filter(w => w.profile === profile && w.track.pace_distance_m >= 100 && w.track.moving_s >= 120
        && w.track.moving_s * 1000 <= w.active_ms * 1.05 && w.track.rejected <= Math.max(2, w.track.fixes.length * .15))
        .map(w => w.track.pace_distance_m / w.track.moving_s).filter(v => v >= .3 && v <= 1.8).slice(0, 10).sort((a, b) => a - b);
    if (usable.length < 2) return null;
    const midpoint = Math.floor(usable.length / 2);
    return { speed_mps: Math.round((usable.length % 2 ? usable[midpoint] : (usable[midpoint - 1] + usable[midpoint]) / 2) * 100) / 100, walks: usable.length };
}
