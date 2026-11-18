'use client';
import { useEffect, useRef, useState } from 'react';
import { Pause, Play, LocateFixed, Flag } from 'lucide-react';
import { addTrackFix } from '@/lib/walk-tracking';
import { DRAFT_KEY, type WalkSession, type CompletedWalk, type WalkFeedback as Feedback } from '@/lib/walk-library';
import WalkFeedback from './WalkFeedback';

export default function WalkRecorder({ session, onComplete, onFeedback, onPosition, onNewWalk }: { session: WalkSession;
    onComplete: (walk: CompletedWalk) => boolean; onFeedback: (id: string, feedback: Feedback) => boolean;
    onPosition: (point: [number, number]) => void; onNewWalk: () => void }) {
    const [paused, setPaused] = useState(!!session.restored), [gps, setGps] = useState(false);
    const [base, setBase] = useState(session.elapsed_ms), [started, setStarted] = useState(Date.now), [clock, setClock] = useState(Date.now);
    const [track, setTrack] = useState(session.track), trackRef = useRef(session.track);
    const [message, setMessage] = useState(session.restored ? 'Your unfinished walk was restored and paused. Resume when you are ready.' : 'Timer started. GPS recording is optional and stays on this device.');
    const [confirm, setConfirm] = useState(false), [completed, setCompleted] = useState<CompletedWalk | null>(null), [saved, setSaved] = useState(false);
    const lastSave = useRef(0);
    const elapsed = base + (paused ? 0 : Math.max(0, clock - started));
    function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch { /* Completed history is already saved. */ } }
    function pause(reason = 'Paused. Resume when you are ready.') {
        setBase(base + (paused ? 0 : Math.max(0, Date.now() - started))); setPaused(true);
        trackRef.current = { ...trackRef.current, last: null }; setTrack(trackRef.current); setMessage(reason);
    }
    function resume() { setStarted(Date.now()); setClock(Date.now()); setPaused(false); setMessage('Walk resumed.'); }
    useEffect(() => {
        if (paused) return;
        const timer = setInterval(() => setClock(Date.now()), 1000);
        const visibility = () => { if (document.hidden) { setBase(v => v + Math.max(0, Date.now() - started)); setPaused(true); trackRef.current = { ...trackRef.current, last: null }; setTrack(trackRef.current); setMessage('Paused while this page was hidden. Resume when ready; background tracking is not assumed.'); } };
        document.addEventListener('visibilitychange', visibility);
        return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visibility); };
    }, [paused, started]);
    useEffect(() => {
        const timer=setTimeout(()=>{
            if (completed || (!paused && Date.now() - lastSave.current < 15000)) return;
            lastSave.current = Date.now();
            try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...session, elapsed_ms: elapsed, track, restored: true })); }
            catch { setMessage('The browser could not checkpoint this walk. Keep the page open and download a route pack if needed.'); }
        },0);
        return ()=>clearTimeout(timer);
    }, [elapsed, track, paused, completed, session]);
    useEffect(() => {
        if (completed) return;
        const before = (event: BeforeUnloadEvent) => { event.preventDefault(); };
        window.addEventListener('beforeunload', before); return () => window.removeEventListener('beforeunload', before);
    }, [completed]);
    useEffect(() => {
        if (!gps || paused || completed) return;
        if (!navigator.geolocation) return;
        const watcher = navigator.geolocation.watchPosition(position => {
            const fix = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy, at: position.timestamp };
            const next = addTrackFix(trackRef.current, fix); trackRef.current = next; setTrack(next);
            if (next.last?.at === fix.at) onPosition([fix.lat, fix.lng]);
            setMessage(fix.accuracy <= 25 ? 'Recording usable GPS positions on this device.' : 'Location accuracy is low. This fix is excluded from your distance and pace.');
        }, () => { setGps(false); setMessage('Location recording is unavailable or permission was declined. Your timer still works.'); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 });
        return () => navigator.geolocation.clearWatch(watcher);
    }, [gps, paused, completed, onPosition]);
    function finish() {
        const active = base + (paused ? 0 : Math.max(0, Date.now() - started));
        const result: CompletedWalk = { id: session.id, title: session.pack.title, started_at: session.started_at, finished_at: new Date().toISOString(),
            profile: session.pack.profile, active_ms: active, track: trackRef.current, planned_m: session.pack.route.length_m, planned_min: session.pack.route.total_min, feedback: null };
        pause(); setGps(false); setConfirm(false); setCompleted(result);
        const ok = onComplete(result); setSaved(ok); if (ok) clearDraft();
    }
    if (completed) return <div className="tg-stack">
        <h1 className="tg-h2">Walk finished</h1><p className="tg-note">{Math.floor(completed.active_ms / 60000)} min {Math.floor(completed.active_ms / 1000) % 60} sec active time{completed.track.distance_m ? ` · ${Math.round(completed.track.distance_m)} m recorded by GPS` : ' · timer-only walk'}</p>
        <p className="tg-small">Pauses are excluded. Planned distance was {Math.round(completed.planned_m)} m; a planned route is not proof that you walked that distance.</p>
        {!saved ? <><p className="tg-note tg-warnbox" role="status">This walk has not been saved. You can free space in Saved and retry.</p><button className="tg-btn" onClick={() => { const ok=onComplete(completed);setSaved(ok);if(ok)clearDraft(); }}>Retry saving this walk</button><button className="tg-btn" onClick={() => { if(window.confirm('Leave this finished walk without saving its history or feedback?')) { clearDraft();onNewWalk(); } }}>Finish without saving</button></> : <>
            <p className="tg-small" role="status">Saved in your device walk history.</p>
            <WalkFeedback initial={null} onSave={feedback => onFeedback(completed.id, feedback)} />
            <button className="tg-btn" onClick={onNewWalk}>Plan another walk</button>
        </>}
    </div>;
    return <div className="tg-stack">
        <div className="flex items-center justify-between gap-3"><h1 className="tg-h2">{paused ? 'Walk paused' : 'Your walk'}</h1><span className="tg-badge">{gps && !paused ? 'GPS recording' : 'Timer'}</span></div>
        <p className="font-bold">{session.pack.title}</p>
        <div className="rounded-xl border border-emerald-200 bg-[#edf5f1] p-4 text-slate-900"><p className="text-3xl font-extrabold" aria-label="Active walk duration">{Math.floor(elapsed / 60000)}:{String(Math.floor(elapsed / 1000) % 60).padStart(2,'0')}</p><p className="text-sm">Active time · pauses excluded</p>
            <p className="mt-2 font-bold">{track.distance_m > 0 ? `${Math.round(track.distance_m)} m GPS distance` : 'Distance not recorded yet'}</p><p className="text-xs">Planned walk: {Math.ceil(session.pack.route.total_min)} min · {Math.round(session.pack.route.length_m)} m</p></div>
        <p className="tg-small" role="status">{message}</p>
        <button className="tg-btn tg-btn-primary" onClick={() => paused ? resume() : pause()}>{paused ? <Play size={22} aria-hidden /> : <Pause size={22} aria-hidden />}{paused ? 'Resume walk' : 'Pause walk'}</button>
        <button className="tg-btn" onClick={() => { if (gps) { setGps(false); trackRef.current={...trackRef.current,last:null};setTrack(trackRef.current);setMessage('GPS recording stopped. Your timer continues.'); } else if (!navigator.geolocation) setMessage('This browser cannot record GPS. The timer is still available.'); else setGps(true); }}><LocateFixed size={20} aria-hidden />{gps ? 'Stop GPS recording' : 'Record GPS on this device'}</button>
        <p className="tg-small">Keep this page open for recording. Changing app sections is fine. Hiding the browser pauses the walk; reliable background recording is not assumed.</p>
        {confirm ? <div className="tg-note"><p>Finish and save this walk?</p><div className="mt-2 grid gap-2"><button className="tg-btn" onClick={() => setConfirm(false)}>Keep walking</button><button className="tg-btn tg-btn-primary" onClick={finish}>Save finished walk</button></div></div>
            : <button className="tg-btn" onClick={() => setConfirm(true)}><Flag size={20} aria-hidden />Finish walk</button>}
    </div>;
}
