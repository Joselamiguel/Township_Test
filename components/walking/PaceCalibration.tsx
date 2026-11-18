'use client';
import { suggestedPace } from '@/lib/walk-tracking';
import type { CompletedWalk } from '@/lib/walk-library';
import type { Profile } from '@/lib/routing';

export default function PaceCalibration({ history, profile, current, onUse }: { history: CompletedWalk[]; profile: Profile; current: number | null; onUse: (speed: number) => void }) {
    const suggestion = suggestedPace(history, profile);
    return <details className="rounded-xl border-2 border-slate-300 bg-white p-3 text-slate-900">
        <summary className="min-h-8 cursor-pointer font-bold">Learn my comfortable pace</summary>
        {suggestion ? <div className="mt-3 space-y-3"><p className="text-sm">Your recent usable GPS recordings suggest about <strong>{suggestion.speed_mps} m/s</strong> for this walking profile, using {suggestion.walks} walks. Pauses, large location errors and jumps are excluded.</p>
            <button className="tg-btn" disabled={current === suggestion.speed_mps} onClick={() => onUse(suggestion.speed_mps)}>{current === suggestion.speed_mps ? 'Using this personal pace' : 'Use this pace for planning'}</button></div>
            : <p className="mt-3 text-sm">Complete two walks with GPS recording in this profile. Each needs at least 100 metres and two minutes of usable moving data. Timer-only walks and inaccurate fixes do not change your pace.</p>}
        <p className="mt-2 text-xs">You choose whether to apply a suggestion. Your pace history stays on this device; it is an estimate, not a fitness assessment.</p>
    </details>;
}
