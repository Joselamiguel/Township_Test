'use client';

import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams,useRouter } from 'next/navigation';
import {
    MapPin, Navigation, LocateFixed, Thermometer, Moon, Sun, X, Send, Share2, Check,
    Circle, CheckCircle2, ArrowLeft, Footprints, Umbrella, Lightbulb, Ban, Accessibility,
    AlertTriangle, Phone, MessageCircle, Copy, Volume2, Compass, Bookmark, Route as RouteIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { loadGraph as fetchGraph, loadHazards, loadReports, submitReport, loadWalkingData, loadWeather,loadPilotContext } from '@/lib/api';
import { IS_PAGES_PREVIEW, sitePath } from '@/lib/site';
import type { ReportMarker } from '@/lib/types';
import { useClientReady } from '@/lib/use-client-ready';
import { readWalkParameters } from '@/lib/walk-parameters';
import { DESTINATIONS } from '@/lib/precinct';
import { normaliseNeeds } from '@/lib/journeys';
import { malaysiaHour } from '@/lib/verification';
import { forecastAt, type WalkingWeather } from '@/lib/comfort';
import type { WalkingData, WalkingAsset, JourneyPlan } from '@/lib/walking';
import RouteQualityBar from '@/components/walking/RouteQualityBar';
import WalkingRequirements from '@/components/walking/WalkingRequirements';
import DepartureControl from '@/components/walking/DepartureControl';
import RouteDetails from '@/components/walking/RouteDetails';
import PlaceDiscovery from '@/components/walking/PlaceDiscovery';
import WalkingConditions from '@/components/walking/WalkingConditions';
import ComfortBreakdown from '@/components/walking/ComfortBreakdown';
import type { EnvironmentLayer } from '@/lib/environment';
import {
    buildGraph, nearestEdge, slotForHour, PROFILES,
    type Profile, type Mode, type TimeSlot, type PathNode, type PathEdge,
    type HazardReport, type HazardKind, type RouteResult,
} from '@/lib/routing';
import { createWalkPack, emptyLibrary, readLibrary, writeLibrary, readWalkDraft, withPersonalUpdates,
    type WalkLibrary, type WalkPack, type ConditionUpdate, type CompletedWalk, type WalkFeedback, type WalkSession } from '@/lib/walk-library';
import { emptyTrack } from '@/lib/walk-tracking';
import { downloadPack, enableOfflineViewer } from '@/lib/offline-walk';
import ExploreWalks from '@/components/walking/ExploreWalks';
import SavedWalks from '@/components/walking/SavedWalks';
import WalkRecorder from '@/components/walking/WalkRecorder';
import WalkTimeline from '@/components/walking/WalkTimeline';
import PaceCalibration from '@/components/walking/PaceCalibration';
import QuickConditionUpdate from '@/components/walking/QuickConditionUpdate';
import PilotSelector from '@/components/walking/PilotSelector';
import PilotSources from '@/components/walking/PilotSources';
import PilotUnavailable from '@/components/walking/PilotUnavailable';
import { PILOTS,pilotFromParams,isPilotAvailable,type PilotId,type PilotContext } from '@/lib/pilots';
import { usePlannerResult } from '@/lib/use-planner';
import { metres } from '@/lib/walking-geometry';


const InteractiveMap = dynamic(() => import('@/components/map/InteractiveMap'), { ssr: false });

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const EMERGENCY_NUMBER = '999'; // Malaysia. Remove the "Call for help" button if you don't want it.

const MODES: Mode[] = ['direct', 'coolest', 'safest'];

// Plain-language names for residents
const MODE_LABEL: Record<Mode, string> = { direct: 'Shortest', coolest: 'Shadiest', safest: 'Best lit' };
const MODE_ICON: Record<Mode, LucideIcon> = { direct: Footprints, coolest: Umbrella, safest: Lightbulb };

// capexCat + severity are still saved exactly as before; residents just see plain wording
const HAZARD_OPTIONS: {
    kind: HazardKind; label: string; hint: string; Icon: LucideIcon;
    capexCat: string; severity: 'blocker' | 'comfort';
}[] = [
    { kind: 'blocked', label: 'Path is blocked', hint: 'Something is in the way', Icon: Ban, capexCat: 'Access Barrier', severity: 'blocker' },
    { kind: 'no_ramp', label: 'No ramp at the kerb', hint: 'Hard for wheelchairs and walkers', Icon: Accessibility, capexCat: 'Universal Design', severity: 'blocker' },
    { kind: 'light_out', label: 'Streetlight is not working', hint: 'Too dark to walk safely', Icon: Lightbulb, capexCat: 'Safety Electrical', severity: 'comfort' },
    { kind: 'broken_surface', label: 'Pavement is broken', hint: 'Cracked or uneven ground', Icon: AlertTriangle, capexCat: 'Pavement Renewal', severity: 'comfort' },
    { kind: 'no_shade', label: 'No shade here', hint: 'Too hot, no cover from the sun', Icon: Sun, capexCat: 'Shade Infrastructure', severity: 'comfort' },
];

type Step = 'where' | 'route' | 'walking';
type TextScale = 'normal' | 'large' | 'xlarge';
type Prefs = { scale: TextScale; highContrast: boolean; reduceMotion: boolean; vibrate: boolean; speak: boolean };

const DEFAULT_PREFS: Prefs = { scale: 'normal', highContrast: false, reduceMotion: false, vibrate: true, speak: false };
const PREFS_KEY = 'townshipgo:prefs';
const SCALE_PCT: Record<TextScale, string> = { normal: '100%', large: '112.5%', xlarge: '125%' };

/* ------------------------------------------------------------------ */
/* Styles (kept in one place so the look is easy to tweak)             */
/* ------------------------------------------------------------------ */

const STYLES = `
.tg{
  --brand:#A4262C; --brand-ink:#7F1D22; --brand-soft:#F8ECEC;
  --bg:#F3F4F6; --surface:#fff; --ink:#1B1F23; --muted:#444B55; --line:#B8BFC9;
  --warn:#F2B400; --warn-ink:#2B2100; --wa:#176B3F; --bw:2px;
  font-size:1rem; line-height:1.4; color:var(--ink); background:var(--bg);
}
.tg.hc{
  --brand:#7A0F14; --brand-ink:#560A0E; --brand-soft:#fff;
  --bg:#fff; --ink:#000; --muted:#000; --line:#000; --bw:3px; --wa:#0B4A28;
}
.tg *{box-sizing:border-box}
.tg :focus-visible{outline:4px solid #1A56DB; outline-offset:3px}

.tg-header{background:var(--brand); color:#fff; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between;
  gap:.75rem; padding:.35rem .75rem; min-height:3.25rem}
.tg-iconbtn{min-height:2.75rem; padding:0 .7rem; border-radius:14px; border:2px solid rgba(255,255,255,.85);
  background:transparent; color:#fff; font-weight:700; font-size:.9rem; display:flex; align-items:center; gap:.4rem; cursor:pointer}

.tg-banner{display:flex; align-items:center; gap:.55rem; padding:.45rem .8rem; background:#fff;
  border-bottom:var(--bw) solid var(--line); font-size:.9rem; font-weight:600; line-height:1.3}

.tg-map{position:relative; z-index:0; flex:1 1 0; min-height:10rem}

.tg-sheet{flex:0 1 auto; min-height:0; max-height:58dvh; overflow-y:auto; background:var(--surface);
  border-top:var(--bw) solid var(--line); border-radius:20px 20px 0 0; padding:.8rem .85rem .9rem;
  box-shadow:0 -6px 18px rgba(0,0,0,.12)}

.tg-h2{font-size:1.25rem; font-weight:800; line-height:1.2; margin:0}
.tg-label{font-size:.9rem; font-weight:700; color:var(--muted); margin:0}
.tg-small{font-size:.875rem; color:var(--muted); line-height:1.35}
.tg-stack{display:flex; flex-direction:column; gap:.6rem}
.tg-tabs{flex:none;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.2rem;background:#fff;border-top:2px solid var(--line);padding:.35rem .3rem max(.35rem,env(safe-area-inset-bottom));z-index:2}
.tg-tabs button{min-height:3.2rem;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.15rem;border-radius:10px;font:inherit;font-size:.75rem;font-weight:800;color:var(--muted);border:2px solid transparent}
.tg-tabs button[aria-current="page"]{color:var(--brand-ink);background:var(--brand-soft);border-color:var(--brand)}
@media (max-width:1023px){
  .tg[data-view="saved"] .tg-map,.tg[data-expanded="true"] .tg-map{display:none}
  .tg[data-view="saved"] .tg-sheet,.tg[data-expanded="true"] .tg-sheet{flex:1 1 auto;max-height:none;border-radius:0}
}

.tg-btn{width:100%; min-height:3rem; padding:.5rem .9rem; border-radius:14px; border:var(--bw) solid var(--line);
  background:#fff; color:var(--ink); font:inherit; font-weight:700; display:flex; align-items:center; justify-content:center;
  gap:.5rem; cursor:pointer; text-decoration:none; text-align:center}
.tg-btn:active{background:#E9ECF0}
.tg-btn-primary{background:var(--brand); border-color:var(--brand); color:#fff; min-height:3.25rem}
.tg-btn-primary:active{background:var(--brand-ink)}
.tg-btn-wa{background:var(--wa); border-color:var(--wa); color:#fff}
.tg-btn-outline{border-color:var(--brand); color:var(--brand)}
.tg-btn[disabled]{background:#DDE1E6; border-color:#DDE1E6; color:#3B424B; cursor:not-allowed}

.tg-card{width:100%; min-height:3.5rem; padding:.55rem .75rem; border-radius:16px; border:var(--bw) solid var(--line);
  background:#fff; color:var(--ink); font:inherit; text-align:left; display:flex; align-items:center; gap:.65rem; cursor:pointer}
.tg-card[aria-checked="true"]{border-color:var(--brand); background:var(--brand-soft); box-shadow:0 0 0 2px var(--brand)}
.tg-card-center{justify-content:center; text-align:center; min-height:3rem; font-weight:700}

.tg-badge{display:inline-block; font-size:.8rem; font-weight:800; line-height:1.2; padding:.15rem .6rem;
  border-radius:999px; border:2px solid var(--brand); color:var(--brand); background:#fff}
.tg-state{font-size:.875rem; font-weight:800; padding:.2rem .7rem; border-radius:999px; border:2px solid var(--line); background:#fff}
.tg-card[aria-checked="true"] .tg-state{background:var(--brand); border-color:var(--brand); color:#fff}

.tg-backdrop{position:fixed; inset:0; z-index:2000; background:rgba(0,0,0,.6); display:flex; align-items:flex-end; justify-content:center}
.tg-modal{width:100%; max-width:28rem; max-height:92dvh; overflow-y:auto; background:#fff; color:var(--ink);
  border-radius:20px 20px 0 0; padding:.9rem .85rem 1.1rem}

.tg-note{padding:.55rem .75rem; border-radius:12px; border:var(--bw) solid var(--line); background:#fff; font-weight:600; font-size:.9rem}
.tg-warnbox{background:#FFF6D6; border-color:var(--warn); color:var(--warn-ink)}
.tg-input{width:100%; min-height:3.75rem; padding:.55rem .7rem; border-radius:12px; border:var(--bw) solid var(--line);
  font:inherit; font-size:1rem; resize:vertical; background:#fff; color:var(--ink)}

.tg.rm *, .tg.rm *::before, .tg.rm *::after{animation:none !important; transition:none !important}
@media (prefers-reduced-motion:reduce){ .tg *{animation:none !important; transition:none !important} }
@media (max-width:1023px) and (max-height:600px){
  .tg{height:auto;min-height:100dvh;overflow:visible}
  .tg-map{height:45dvh;min-height:12rem;flex:none}
  .tg-sheet{max-height:none;overflow:visible;flex:none}
  .tg-tabs{position:sticky;bottom:0}
}
@media (min-width:1024px){
  .tg{max-width:none;display:grid;grid-template-columns:25rem minmax(0,1fr);grid-template-rows:auto minmax(0,1fr) auto;box-shadow:none}
  .tg-topbar{grid-column:1 / -1}
  .tg-tabs{grid-column:1 / -1}
  .tg-header{padding:.65rem 1.2rem}
  .tg-map{grid-column:2;grid-row:2;min-height:0}
  .tg-sheet{grid-column:1;grid-row:2;max-height:none;min-height:0;border-top:0;border-right:2px solid var(--line);border-radius:0;padding:1.15rem;box-shadow:none}
  .tg-backdrop{align-items:center}
  .tg-modal{border-radius:20px}
  .tg[data-view="saved"] .tg-map{display:none}
  .tg[data-view="saved"] .tg-sheet{grid-column:1 / -1;width:100%;max-width:52rem;justify-self:center;border-right:0}
}
`;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function copyText(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch { /* fall through to the old method */ }
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch {
        return false;
    }
}

function getFreshPosition(fallback: [number, number]): Promise<[number, number]> {
    return new Promise((resolve) => {
        if (!('geolocation' in navigator)) return resolve(fallback);
        navigator.geolocation.getCurrentPosition(
            (p) => resolve([p.coords.latitude, p.coords.longitude]),
            () => resolve(fallback),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 },
        );
    });
}

const minutesOf = (r: RouteResult & { total_min?: number }) => Math.max(1, Math.ceil(r.total_min ?? r.walk_min));

function reasonFor(m: Mode, r: RouteResult, night: boolean): string {
    const sun = Math.round(r.sun_exposed_min * 10) / 10;
    const dark = Math.round(r.dark_m);
    const base = night
        ? (dark < 10 ? 'Well lit all the way' : `${dark} m poorly lit`)
        : (sun < 0.5 ? 'Almost all in shade' : `${sun} min in the sun`);
    return m === 'direct' ? `Quickest way. ${base}` : base;
}

/* ------------------------------------------------------------------ */
/* Small shared components                                             */
/* ------------------------------------------------------------------ */

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
    return (
        <div className="tg-backdrop" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-label={title} className="tg-modal" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between gap-3 mb-3">
                    <h2 className="tg-h2">{title}</h2>
                    <button className="tg-btn" style={{ width: 'auto' }} onClick={onClose} autoFocus>
                        <X size={22} aria-hidden /> Close
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

function SettingSwitch({ label, hint, checked, onChange }: {
    label: string; hint: string; checked: boolean; onChange: (v: boolean) => void;
}) {
    return (
        <button role="switch" aria-checked={checked} className="tg-card" onClick={() => onChange(!checked)}>
            <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 800 }}>{label}</span>
                <span className="tg-small" style={{ display: 'block' }}>{hint}</span>
            </span>
            <span className="tg-state">{checked ? 'On' : 'Off'}</span>
        </button>
    );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function ResidentPageContent() {
    const searchParams = useSearchParams();
    const router=useRouter();
    const [boot]=useState(()=>{
        try {const collection=readLibrary(localStorage),draft=readWalkDraft(localStorage);const active=draft&&!collection.library.history.some(w=>w.id===draft.id)?draft:null;
            return {collection,draft:active,area:active?(active.pack.area_id??'elmina'):pilotFromParams(searchParams)};
        }catch{return {collection:{library:emptyLibrary(),warning:'Device storage is unavailable. You can still plan and download walk packs.'},draft:null,area:pilotFromParams(searchParams)};}
    });
    const area=boot.area,configuration=PILOTS[area];
    const initialWalk = readWalkParameters(searchParams, area==='elmina'?DESTINATIONS.map(d=>d.id):[], configuration.centre);
    const initialOriginUsed=useRef(initialWalk.fromLink);

    const [userCoords, setUserCoords] = useState<[number, number]>(initialWalk.origin);
    const [usingGPS, setUsingGPS] = useState(false);
    const [geoBusy, setGeoBusy] = useState(false);
    const [geoMsg, setGeoMsg] = useState<string | null>(null);
    const [destId, setDestId] = useState<string>(searchParams.get('destId') || initialWalk.destination || '');
    const [placeQuery,setPlaceQuery]=useState(''),[placeLimit,setPlaceLimit]=useState(12);
    const [pilotData,setPilotData]=useState<PilotContext|null>(null);
    const [startingWalk,setStartingWalk]=useState(false);
    const [profile, setProfile] = useState<Profile>(() => {
        if (searchParams.has('profile')) return initialWalk.profile;
        try { const saved=localStorage.getItem('townshipgo:selected-profile:v1');return saved && Object.keys(PROFILES).includes(saved) ? saved as Profile : initialWalk.profile; } catch { return initialWalk.profile; }
    });

    const [initialTime] = useState(() => new Date().toISOString());
    const [planningNow,setPlanningNow]=useState(initialTime);
    const [departure, setDeparture] = useState<string | null>(() => {
        const raw = searchParams.get('departure');
        return raw && Number.isFinite(Date.parse(raw)) && Date.parse(raw) >= Date.now() - 900000 ? raw : null;
    });
    const [entranceId, setEntranceId] = useState(searchParams.get('entrance') || '');
    const [sourceWalkingData, setWalkingData] = useState<WalkingData | null>(null);
    const [networkSnapshot, setNetworkSnapshot] = useState<string | null>(null);
    const [exactDestination, setExactDestination] = useState<string | null>(searchParams.get('destId')?'Requested place':null);
    const [needs, setNeeds] = useState(() => {
        try {
            const parsed=normaliseNeeds(JSON.parse(searchParams.get('needs') || localStorage.getItem('townshipgo:walking-needs:v1') || '{}'));
            const previous=localStorage.getItem('townshipgo:selected-profile:v1');
            return !searchParams.has('needs') && previous && previous !== profile ? { ...parsed, speed_mps: null } : parsed;
        }
        catch { return normaliseNeeds({}); }
    });

    const [nodes, setNodes] = useState<PathNode[]>([]);
    const [edges, setEdges] = useState<PathEdge[]>([]);
    const [hazards, setHazards] = useState<HazardReport[]>([]);
    const [reports, setReports] = useState<ReportMarker[]>([]);
    const [loadingDb, setLoadingDb] = useState(true);
    const [dataError, setDataError] = useState(false);
    const [reloadVersion, setReloadVersion] = useState(0);

    const [weather, setWeather] = useState<WalkingWeather | null>(null);
    const [chosenMode, setChosenMode] = useState<Mode | null>(initialWalk.mode);
    const [step, setStep] = useState<Step>(initialWalk.fromLink||searchParams.get('destId') ? 'route' : 'where');
    const initialLibrary=boot.collection;
    const [library, setLibrary] = useState<WalkLibrary>(initialLibrary.library);
    const libraryRef = useRef(library);
    const [libraryMessage, setLibraryMessage] = useState<string | null>(initialLibrary.warning);
    const [walkSession, setWalkSession] = useState<WalkSession | null>(boot.draft);
    const [sessionFinished, setSessionFinished] = useState(false);
    const [view, setView] = useState<'explore' | 'plan' | 'walk' | 'saved'>(walkSession && !initialWalk.fromLink ? 'walk' : 'plan');
    const [returning, setReturning] = useState(searchParams.get('return') === '1');
    const [savingPack, setSavingPack] = useState(false);
    const [panelExpanded, setPanelExpanded] = useState(false);
    const [livePoint, setLivePoint] = useState<[number, number] | null>(null);
    const [mapFocus, setMapFocus] = useState<[number, number] | undefined>();
    const isNavigating = view === 'walk' && !!walkSession && !sessionFinished;

    // Hazard reporting
    const [showReportModal, setShowReportModal] = useState(false);
    const [informationLayer, setInformationLayer] = useState<EnvironmentLayer | 'routes'>('routes');
    const [selectedKind, setSelectedKind] = useState<HazardKind>('broken_surface');
    const [reportNotes, setReportNotes] = useState('');
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);
    const [reportMsg, setReportMsg] = useState<string | null>(null);

    // Settings, sharing, confirmation
    const [prefs, setPrefs] = useState<Prefs>(() => {
        let stored: Partial<Prefs> | null = null;
        try {
            const raw = localStorage.getItem(PREFS_KEY);
            if (raw) stored = JSON.parse(raw);
        } catch { /* ignore inaccessible storage */ }
        const systemReduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        return { ...DEFAULT_PREFS, reduceMotion: systemReduce, ...(stored ?? {}) };
    });
    const [showSettings, setShowSettings] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [shareNote, setShareNote] = useState<string | null>(null);
    const canShare = typeof navigator.share === 'function';
    const canSpeak = 'speechSynthesis' in window;

    /* ---------- Preferences ---------- */
    useEffect(() => {
        try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
    }, [prefs]);

    useEffect(() => {
        try { localStorage.setItem('townshipgo:walking-needs:v1', JSON.stringify(needs)); } catch { /* storage may be unavailable */ }
    }, [needs]);
    useEffect(() => { try { localStorage.setItem('townshipgo:selected-profile:v1', profile); } catch { /* storage may be unavailable */ } }, [profile]);
    useEffect(()=>{const refresh=()=>setPlanningNow(new Date().toISOString());const timer=setInterval(refresh,60000);const visible=()=>{if(document.visibilityState==='visible')refresh();};document.addEventListener('visibilitychange',visible);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);};},[]);

    // Text size scales the whole page because everything is sized in rem
    useEffect(() => {
        const root = document.documentElement;
        const previous = root.style.fontSize;
        root.style.fontSize = SCALE_PCT[prefs.scale];
        return () => { root.style.fontSize = previous; };
    }, [prefs.scale]);

    function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
        setPrefs((p) => ({ ...p, [key]: value }));
    }

    function buzz(ms = 40) {
        if (prefs.vibrate && typeof navigator.vibrate === 'function') navigator.vibrate(ms);
    }

    function speak(text: string, force = false) {
        if (!force && !prefs.speak) return;
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
    }

    /* ---------- Data ---------- */
    useEffect(() => {
        async function refreshWeather() {
            try {
                setWeather(await loadWeather(area));
            } catch {
                setWeather(null);
            }
        }

        async function loadGraph() {
            try {
                const [graphData, hazardData, reportData, walking,context] = await Promise.all([
                    fetchGraph(area), loadHazards(area), loadReports('all',area), loadWalkingData(area),loadPilotContext(area),
                ]);
                setPilotData(context);
                if(!initialOriginUsed.current){setUserCoords(graphData.source.origin?.coordinates??context.origin.coordinates);initialOriginUsed.current=true;}
                setNodes(graphData.nodes);
                setNetworkSnapshot(graphData.source.snapshot_at ?? null);
                setWalkingData({...walking,area_id:area,dataset_id:walking.dataset_id??graphData.source.dataset_id});
                setEdges(graphData.edges);
                setHazards(hazardData.hazards);
                setReports(reportData.reports);
                setDataError(false);
            } catch (error) {
                console.error("Could not load pedestrian data:", error);
                setDataError(true);
            } finally {
                setLoadingDb(false);
            }
        }

        void refreshWeather();
        void loadGraph();
    }, [reloadVersion,area]);

    /* ---------- Routing ---------- */
    const planningTime = departure ?? planningNow;
    const walkingData = useMemo(() => sourceWalkingData ? withPersonalUpdates(sourceWalkingData, library.updates, planningTime) : null, [sourceWalkingData, library.updates, planningTime]);
    const slot: TimeSlot = slotForHour(malaysiaHour(planningTime));
    const isNight = slot === 'night';
    const graph = useMemo(() => buildGraph(nodes, edges), [nodes, edges]);
    const places = useMemo(() => walkingData?.assets.filter(a => ['destination', 'transit', 'toilet', 'water', 'rest', 'shelter'].includes(a.kind)) ?? [], [walkingData]);
    const destination = places.find(a => a.id === destId || a.external_id === destId) ?? (exactDestination ? null : places.find(a=>a.id===pilotData?.featured_ids[0])??places[0]) ?? null;
    const currentDest = destination ? { id: destination.external_id || destination.id, name: destination.name, coords: [destination.lat, destination.lng] as [number, number] } : {id:'',name:exactDestination||'Choose a mapped place',coords:configuration.centre};
    const entrances = walkingData?.assets.filter(a => a.kind === 'entrance' && a.parent_id === destination?.id) ?? [];
    const forecast = forecastAt(weather, planningTime);
    const toolRequest = useMemo(() => ({ origin: userCoords, profile, needs, departure_at: planningTime }), [userCoords, profile, needs, planningTime]);
    const planningSnapshot=useMemo(()=>walkingData&&nodes.length?{nodes,edges,walking:walkingData,hazards}:null,[nodes,edges,walkingData,hazards]);
    const journeySearch=usePlannerResult<JourneyPlan>(planningSnapshot,returning?{type:'return',input:toolRequest,feels_like:forecast?.feels_like_c}:destination?{
        type:'journey',input:{...toolRequest,destination,entrance_id:entranceId||undefined},feels_like:forecast?.feels_like_c}:null);
    const plan=journeySearch.result;
    const matchingPlaces=useMemo(()=>places.filter(a=>!placeQuery||`${a.name} ${a.category}`.toLowerCase().includes(placeQuery.toLowerCase()))
        .sort((a,b)=>{const rank=(id:string)=>{const index=pilotData?.featured_ids.indexOf(id)??-1;return index<0?100:index;};return rank(a.id)-rank(b.id)||a.name.localeCompare(b.name);}),[places,placeQuery,pilotData]);
    const shownPlaces=matchingPlaces.slice(0,placeLimit);
    const mapAssets=useMemo(()=>walkingData?.assets.filter(a=>['rest','toilet','water','shelter','transit'].includes(a.kind)||(a.kind==='entrance'&&a.parent_id===destination?.id))
        .sort((a,b)=>metres([a.lng,a.lat],[userCoords[1],userCoords[0]])-metres([b.lng,b.lat],[userCoords[1],userCoords[0]])).slice(0,80)??[],[walkingData,destination,userCoords]);
    const recommended: Mode = plan?.recommended ?? (isNight ? 'safest' : 'coolest');

    const visibleModes: Mode[] = isNight ? ['direct', 'safest'] : ['direct', 'coolest', 'safest'];

    const activeMode = chosenMode && !(isNight && chosenMode === 'coolest') ? chosenMode : recommended;

    const activeRoute = view === 'walk' && walkSession ? walkSession.pack.route :
        plan?.routes[activeMode] ?? plan?.routes.direct ?? Object.values(plan?.routes ?? {})[0];
    const shownMode: Mode = (activeRoute?.mode as Mode | undefined) ?? activeMode;

    const mapRoutes = useMemo(
        () =>
            view === 'walk' && walkSession ? [{ id: walkSession.pack.route.mode, name: 'Your recorded walk plan', route_type: walkSession.pack.route.mode, coordinates: walkSession.pack.route.coordinates }] : MODES.flatMap((m) => {
                const r = plan?.routes[m];
                return r
                    ? [{
                        id: m,
                        name: MODE_LABEL[m],
                        route_type: m === 'safest' ? 'night_safe' : m,
                        coordinates: r.coordinates,
                        shade_factor: isNight ? r.avg_lit : r.avg_shade,
                        surface_temp_base_c: 0,
                        length_meters: Math.round(r.length_m),
                    }]
                    : [];
            }),
        [plan, isNight, view, walkSession],
    );

    /* ---------- Things the person does ---------- */
    function chooseDest(id: string) {
        setMapFocus(undefined);
        setReturning(false);
        setChosenMode(null);
        setDestId(id);
        setExactDestination(places.find(a => a.id === id || a.external_id === id)?.name ?? 'Selected place');
        setEntranceId('');
        buzz();
    }
    function chooseProfile(p: Profile) {
        setChosenMode(null);
        if (p !== profile) setNeeds(n => ({ ...n, speed_mps: null }));
        setProfile(p);
        buzz();
    }
    function chooseMode(m: Mode) {
        setChosenMode(m);
        buzz();
    }

    function handleGetLocation() {
        setGeoMsg(null);
        if (!('geolocation' in navigator)) {
            setGeoMsg(`This device cannot share its location. You can use the ${configuration.origin_label}.`);
            return;
        }
        setGeoBusy(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                initialOriginUsed.current=true;
                setUserCoords([pos.coords.latitude, pos.coords.longitude]);
                setUsingGPS(true);
                setGeoBusy(false);
            },
            () => {
                setGeoBusy(false);
                setGeoMsg(`We could not find your location. Check that location is turned on, or use the ${configuration.origin_label}.`);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
        );
    }

    function useDefaultOrigin() {
        setUserCoords(pilotData?.origin.coordinates??configuration.centre);
        setUsingGPS(false);
        setGeoMsg(null);
        buzz();
    }

    async function startWalk() {
        if (walkSession && !sessionFinished) { setView('walk'); setLibraryMessage('Your current walk is still in progress. Finish it before starting another.'); return; }
        if (!activeRoute || !walkingData) return;
        const now = new Date().toISOString();
        setStartingWalk(true);
        let fresh:JourneyPlan|null=null;
        try { fresh=await journeySearch.run<JourneyPlan>({type:returning?'return':'journey',input:{...toolRequest,...(destination?{destination}:{}),entrance_id:entranceId||undefined,departure_at:now}}); }
        catch{setLibraryMessage('The current route could not be checked. Please refresh and try again.');return;}finally{setStartingWalk(false);}
        const route = fresh?.routes[shownMode];
        if (!route) { setLibraryMessage('This route no longer matches your needs for a walk starting now. Refresh and review the route before setting out.'); return; }
        const pack = createWalkPack(route, profile, needs, userCoords, edges, walkingData, undefined, networkSnapshot);
        setWalkSession({ id: crypto.randomUUID(), pack, started_at: now, elapsed_ms: 0, track: emptyTrack() });
        setSessionFinished(false); setLivePoint(null); setView('walk');
        buzz(80);
        setStep('walking');
        speak(`Your walk has started. About ${minutesOf(route)} minutes. ${route.return_walk ? 'Return to your starting point.' : `To ${route.destination.name}.`}`);
    }

    function changeLibrary(next: WalkLibrary) {
        try { writeLibrary(next, localStorage); libraryRef.current = next; setLibrary(next); return true; }
        catch (error) { setLibraryMessage(error instanceof Error ? error.message : 'Device storage is unavailable.'); return false; }
    }
    function finishRecording(walk: CompletedWalk) {
        const ok = changeLibrary({ ...libraryRef.current, history: [walk, ...libraryRef.current.history.filter(w => w.id !== walk.id)] });
        if (ok) setSessionFinished(true); return ok;
    }
    function saveFeedback(id: string, feedback: WalkFeedback) {
        if (!libraryRef.current.history.some(w => w.id === id)) return false;
        return changeLibrary({ ...libraryRef.current, history: libraryRef.current.history.map(w => w.id === id ? { ...w, feedback } : w) });
    }
    function planReturn(minutes: number) { setReturning(true); setNeeds(n => ({ ...n, budget_min: minutes })); setEntranceId(''); setChosenMode(null); setStep('route'); setView('plan'); }
    function focusWalkPoint(point: [number, number]) { setMapFocus(point); setPanelExpanded(false); requestAnimationFrame(()=>document.querySelector('.tg-map')?.scrollIntoView({block:'center',behavior:prefs.reduceMotion?'auto':'smooth'})); }
    function chooseFacility(asset: WalkingAsset) { chooseDest(asset.external_id || asset.id); setStep('route'); setView('plan'); }
    function replanPack(pack: WalkPack) {
        const target=pack.area_id??'elmina';
        if(target!==area){if(walkSession&&!sessionFinished){setLibraryMessage('Finish the current walk before switching areas.');return;}
            router.replace('/resident?'+new URLSearchParams({area:target,startLat:String(pack.origin[0]),startLng:String(pack.origin[1]),destId:pack.route.destination.external_id||pack.route.destination.id,profile:pack.profile,needs:JSON.stringify(pack.needs),...(pack.route.return_walk?{return:'1'}:{entrance:pack.route.entrance.id})}));return;}
        setUserCoords(pack.origin); setUsingGPS(false); setProfile(pack.profile); setNeeds(normaliseNeeds(pack.needs));
        setMapFocus(undefined);
        setExactDestination(pack.route.destination.name);
        setReturning(!!pack.route.return_walk); setDestId(pack.route.destination.external_id || pack.route.destination.id); setEntranceId(pack.route.return_walk ? '' : pack.route.entrance.id);
        setDeparture(new Date().toISOString()); setChosenMode(null); setStep('route'); setView('plan'); setReloadVersion(v => v + 1); }
    async function savePack() {
        if (!activeRoute || !walkingData) return;
        const pack = createWalkPack(activeRoute, profile, needs, userCoords, edges, walkingData, undefined, networkSnapshot);
        if (!changeLibrary({ ...libraryRef.current, packs: [pack, ...libraryRef.current.packs] })) return;
        setSavingPack(true);
        const ready = await enableOfflineViewer(); setSavingPack(false);
        setLibraryMessage(ready ? 'Walk saved. Your offline collection is ready in Saved.' : 'Walk saved on this device. Download a walk pack in Saved for dependable offline access.');
    }
    function saveUpdate(update: ConditionUpdate) { const ok=changeLibrary({ ...libraryRef.current, updates: [update, ...libraryRef.current.updates] });if(ok&&!departure)setPlanningNow(update.observed_at);return ok; }
    function changeArea(next:PilotId){if(walkSession&&!sessionFinished){setLibraryMessage('Finish the current walk before switching areas.');return;}router.replace(`/resident?area=${next}`);}
    async function shareUpdate(update: ConditionUpdate) {
        if (IS_PAGES_PREVIEW) return false;
        try {
            const response = await fetch(sitePath('/api/condition-updates'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(update) });
            if (!response.ok) return false;
            const next = { ...libraryRef.current, updates: libraryRef.current.updates.map(u => u.id === update.id ? { ...u, shared_at: new Date().toISOString() } : u) };
            if (!changeLibrary(next)) { libraryRef.current = next; setLibrary(next); setLibraryMessage('The report was shared, but this browser could not update its device copy.'); }
            setReloadVersion(v => v + 1); return true;
        } catch { return false; }
    }

    function readRouteAloud() {
        if (!activeRoute) return;
        speak(
            `${activeRoute.return_walk ? 'Return to your starting point' : `To ${activeRoute.destination.name}`}. ${MODE_LABEL[shownMode]} route. About ${minutesOf(activeRoute)} minutes, ` +
            `${Math.round(activeRoute.length_m)} metres. ${activeRoute.verified_rest_stops} verified rest stops. ` +
            `${Math.round(activeRoute.uncovered_m)} metres uncovered, estimated. ${activeRoute.unverified_crossings} crossings need checks. ` +
            `Arrival at ${activeRoute.entrance.name}. ${activeRoute.suitability === 'green' ? 'This route meets your needs and current checks.' : 'This route needs confirmation.'}`,
            true,
        );
    }

    /* ---------- Sharing ---------- */
    const walkMin = activeRoute ? minutesOf(activeRoute) : null;
    const shareMessage =
        `${activeRoute?.return_walk ? 'I am taking a return walk' : `I'm walking to ${activeRoute?.destination.name ?? currentDest.name}`} on the ${MODE_LABEL[shownMode].toLowerCase()} route` +
        `${walkMin ? `, about ${walkMin} minutes` : ''}. Here is my route:`;

    function openShare() {
        const captured = view === 'walk' ? walkSession?.pack : undefined;
        const origin = captured?.origin ?? userCoords;
        const sharedRoute = captured?.route ?? activeRoute;
        const params = new URLSearchParams({
            area,
            startLat: origin[0].toFixed(5),
            startLng: origin[1].toFixed(5),
            destId: sharedRoute?.destination.external_id || sharedRoute?.destination.id || destId,
            mode: shownMode,
            profile: captured?.profile ?? profile,
            needs: JSON.stringify(captured?.needs ?? needs),
            departure: sharedRoute?.departure_at ?? planningTime,
            ...(sharedRoute?.return_walk ? { return: '1' } : {}),
            ...(sharedRoute && !sharedRoute.return_walk ? { entrance: sharedRoute.entrance.id } : {}),
        });
        setShareUrl(`${window.location.origin}${window.location.pathname}?${params.toString()}`);
        setCopied(false);
        setShareNote(null);
        setShowShare(true);
        buzz();
    }

    async function nativeShare() {
        try {
            await navigator.share({ title: 'My walk on TownshipGo', text: shareMessage, url: shareUrl });
        } catch (err) {
            if ((err as DOMException)?.name !== 'AbortError') {
                setShareNote('Sharing did not work. Try "Copy message" instead.');
            }
        }
    }

    async function copyShare() {
        const ok = await copyText(`${shareMessage} ${shareUrl}`);
        setCopied(ok);
        setShareNote(ok ? null : 'Copying did not work. Press and hold the message above to copy it.');
        if (ok) buzz();
    }

    /* ---------- Reporting a problem ---------- */
    async function submitCapexDefect() {
        setReportMsg(null);
        setIsSubmittingReport(true);

        try {
            // While walking with GPS, report where the person is now, not where they started
            const here: [number, number] = usingGPS ? await getFreshPosition(userCoords) : userCoords;
            const near = nearestEdge(graph, here[0], here[1]);

            if (!near || near.distance_m > 150) {
                setReportMsg('You seem to be away from the mapped footpaths. Move closer to the path and try again.');
                return;
            }

            const matchedEdge = edges.find((e) => e.id === near.edge_id);
            const edgeName = matchedEdge?.name || `Walkway Edge #${near.edge_id}`;

            const { hazard, report } = await submitReport({
                area_id:area,
                edge_id: near.edge_id,
                lat: here[0], lng: here[1], kind: selectedKind, description: reportNotes,
            });
            setHazards((prev) => [...prev, hazard]);
            setReports((prev) => [...prev, report]);

            setReportMsg(`Thank you. Your report was sent for ${edgeName}.`);
            buzz(120);
            speak('Thank you. Your report was sent.');
            setTimeout(() => {
                setShowReportModal(false);
                setReportNotes('');
                setReportMsg(null);
            }, 2200);

        } catch (err) {
            console.error('Submission failed:', err);
            setReportMsg('We could not send your report. Check your internet connection and try again.');
        } finally {
            setIsSubmittingReport(false);
        }
    }

    /* ---------- Close dialogs with Escape ---------- */
    const anyDialog = showSettings || showShare || showReportModal;
    useEffect(() => {
        if (!anyDialog) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowSettings(false);
                setShowShare(false);
                setShowReportModal(false);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [anyDialog]);

    /* ---------- Keep the screen on while walking ---------- */
    useEffect(() => {
        if (step !== 'walking') return;
        let lock: WakeLockSentinel | null = null;
        let cancelled = false;

        const acquire = async () => {
            try {
                const wl = navigator.wakeLock;
                if (!wl) return;
                lock = await wl.request('screen');
                if (cancelled) lock.release?.();
            } catch { /* not supported or refused */ }
        };
        const onVisible = () => { if (document.visibilityState === 'visible') acquire(); };

        acquire();
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', onVisible);
            try { lock?.release?.(); } catch { /* ignore */ }
        };
    }, [step]);

    /* ---------- Derived display values ---------- */
    const temp = forecast?.feels_like_c;
    const defaultOrigin=pilotData?.origin.coordinates??configuration.centre;
    const isDefaultOrigin = userCoords[0] === defaultOrigin[0] && userCoords[1] === defaultOrigin[1];
    const originLabel = usingGPS ? 'Your chosen GPS position' : isDefaultOrigin ? configuration.origin_label : 'Your chosen starting point';
    const banner = isNight ? { Icon: Moon, text: 'Night-time plan. Compare lighting and check access-point hours.' }
        : temp == null ? { Icon: Sun, text: 'Weather unavailable for this time. Shade and shelter include path-based estimates.' }
            : { Icon: Thermometer, text: `Departure forecast feels like ${Math.round(temp)}°C${forecast?.rain_probability == null ? '' : ` · rain probability ${Math.round(forecast.rain_probability)}%`}.` };
    const planningControls = <div className="space-y-3">
        <WalkingRequirements needs={needs} profile={profile} onChange={value => { setNeeds(normaliseNeeds(value)); setChosenMode(null); }} />
        <DepartureControl departure={planningTime} onChange={value => { setDeparture(value); setChosenMode(null); }} onNow={() => { setDeparture(null);setPlanningNow(new Date().toISOString()); setReloadVersion(v => v + 1); }} forecast={forecast} />
    </div>;

    const quickUpdate = <QuickConditionUpdate area={area} dataset={walkingData?.dataset_id} edges={edges.filter(e => activeRoute?.edge_ids.includes(e.id))} facilities={walkingData?.assets ?? []} onSave={saveUpdate} onShare={shareUpdate} />;

    /* ---------------------------------------------------------------- */

    return (
        <div data-view={view} data-expanded={panelExpanded} className={`tg font-sans relative w-full max-w-md mx-auto h-[100dvh] flex flex-col overflow-hidden shadow-2xl ${prefs.highContrast ? 'hc' : ''} ${prefs.reduceMotion ? 'rm' : ''}`}>
            <style dangerouslySetInnerHTML={{ __html: STYLES }} />

            {/* Top bar */}
            <div className="tg-topbar">
            <a href="#walk-planning" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[3000] focus:rounded-xl focus:bg-white focus:p-3 focus:font-bold focus:text-slate-900">Skip to walk planning</a>
            <header className="tg-header">
                <Link href="/" className="flex min-h-11 items-center gap-2 text-white no-underline" aria-label="TownshipGo home">
                    <Footprints size={24} aria-hidden />
                    <span style={{ fontWeight: 800, fontSize: '1.15rem' }}>TownshipGo</span>
                    <span className="ml-2 hidden text-sm font-medium opacity-90 sm:inline">A walk that fits your day</span>
                </Link>
                <button className="tg-iconbtn" onClick={() => setShowSettings(true)} aria-label="Text size and display settings">
                    <span style={{ fontSize: '1.15rem', fontWeight: 800 }} aria-hidden>Aa</span>
                    <span>Display</span>
                </button>
            </header>

            {IS_PAGES_PREVIEW && view !== 'saved' && <div className="tg-banner" style={{ fontSize: '.75rem' }}>
                <span>{configuration.short_name} · OSM {networkSnapshot?new Date(networkSnapshot).toLocaleDateString('en-MY'):'source date pending'} · shared reports unavailable</span>
            </div>}

            {/* Friendly weather line */}
            {!isNavigating && view === 'plan' && (
                <div className="tg-banner" role="status">
                    <banner.Icon size={24} aria-hidden style={{ flexShrink: 0 }} />
                    <span>{banner.text}</span>
                </div>
            )}

            {dataError && (
                <div role="alert" className="tg-banner">
                    <span>We could not load the walking paths.</span>
                    <button className="tg-btn" style={{ width: 'auto' }} onClick={() => {
                        setLoadingDb(true); setReloadVersion((version) => version + 1);
                    }}>Try again</button>
                    {library.packs.length > 0 && <a href={sitePath('/offline-walks.html')} className="font-bold underline">Open offline walks</a>}
                </div>
            )}
            </div>

            {/* Map */}
            <div className="tg-map">
                <div style={{ position: 'absolute', inset: 0 }}>
                    <InteractiveMap
                        routes={mapRoutes}
                        activeRouteId={activeRoute?.mode ?? ''}
                        reports={reports}
                        assets={mapAssets}
                        startCoords={view === 'walk' && walkSession ? walkSession.pack.origin : userCoords}
                        endCoords={activeRoute ? [activeRoute.entrance.lat, activeRoute.entrance.lng] : destination?currentDest.coords:undefined}
                        startLabel={usingGPS ? 'You' : 'Start'}
                        reduceMotion={prefs.reduceMotion}
                        highContrast={prefs.highContrast}
                        environment={walkingData ? { edges, records: walkingData.verifications, at: planningTime } : undefined}
                        informationLayer={informationLayer}
                        onInformationLayerChange={setInformationLayer}
                        focusLocation={mapFocus}
                        liveLocation={livePoint ?? undefined}
                    />
                </div>
            </div>

            {/* ---------------- Bottom panel ---------------- */}
            <section id="walk-planning" aria-label="Walk planning" tabIndex={-1} className="tg-sheet">
                <div className="mb-3"><PilotSelector area={area} onChange={changeArea}/><p className="mt-1 text-xs text-slate-600">{configuration.description}</p></div>
                {view !== 'saved' && <button className="mb-3 min-h-11 text-sm font-bold underline lg:hidden" aria-expanded={panelExpanded} aria-controls="walk-planning" onClick={() => setPanelExpanded(v => !v)}>{panelExpanded ? 'Show map' : 'Expand panel'}</button>}
                {libraryMessage && <div role="status" className="tg-note mb-3"><p>{libraryMessage}</p><button className="min-h-11 text-sm font-bold underline" onClick={() => setLibraryMessage(null)}>Dismiss message</button></div>}
                {view === 'explore' && <ExploreWalks nodes={nodes} edges={edges} data={walkingData} request={toolRequest} hazards={hazards} onChoose={chooseFacility} onReturn={planReturn}
                    onLocate={handleGetLocation} locating={geoBusy} locationLabel={originLabel} locationMessage={geoMsg}
                    onLastPosition={livePoint ? () => { setUserCoords(livePoint); setUsingGPS(true); setGeoMsg('Using your last recorded GPS fix. Refresh your location if you have moved since then.'); } : undefined} />}
                {view === 'saved' && <SavedWalks library={library} profile={profile} pace={needs.speed_mps} onChange={changeLibrary} onReplan={replanPack} onFeedback={saveFeedback}
                    onUsePace={speed => { setNeeds(n => ({ ...n, speed_mps: speed })); setLibraryMessage('Your personal pace is selected for this walking profile.'); }} onShare={shareUpdate} />}
                {view === 'walk' && !walkSession && <div className="tg-stack"><h1 className="tg-h2">Ready when you are</h1><p className="tg-small">Choose and review a route first. During the walk you can pause, optionally record GPS, and save how it felt.</p><button className="tg-btn tg-btn-primary" onClick={() => { setView('plan'); setStep('where'); }}>Plan a walk</button></div>}

                {/* STEP 1: where to */}
                {view === 'plan' && step === 'where' && (
                    <div className="tg-stack">
                        <h1 className="tg-h2">Where are you going?</h1>
                        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Walk type"><button className="tg-btn" aria-pressed={!returning} onClick={() => setReturning(false)}>Go to a place</button><button className="tg-btn" aria-pressed={returning} onClick={() => setReturning(true)}>Return to start</button></div>
                        {returning && <p className="tg-note">Finish where you start. Choose a total budget in My walking needs, or try a quick return walk below.</p>}
                        {returning && <div className="grid grid-cols-2 gap-2">{[15,30].map(n => <button className="tg-btn" key={n} onClick={() => planReturn(n)}>Up to {n} min</button>)}</div>}

                        {!returning&&<label className="tg-label">Find a place<input type="search" className="tg-input mt-1" value={placeQuery} onChange={e=>{setPlaceQuery(e.target.value);setPlaceLimit(12);}} placeholder="Attraction, food, clinic or station" /></label>}
                        {!returning && <div role="radiogroup" aria-label="Destination" className="tg-stack">
                            {shownPlaces.map((place) => { const d = { ...place, id: place.external_id || place.id }; return (
                                <button
                                    key={d.id}
                                    role="radio"
                                    aria-checked={destination?.id === place.id}
                                    className="tg-card"
                                    onClick={() => chooseDest(d.id)}
                                >
                                    {destination?.id === place.id
                                        ? <CheckCircle2 size={24} aria-hidden style={{ flexShrink: 0 }} />
                                        : <Circle size={24} aria-hidden style={{ flexShrink: 0 }} />}
                                    <span style={{ flex: 1, fontWeight: 800 }}>{d.name}</span>
                                    <MapPin size={24} aria-hidden style={{ flexShrink: 0 }} />
                                </button>
                            ); })}
                        </div>}
                        {!returning&&matchingPlaces.length>shownPlaces.length&&<button className="min-h-11 text-left text-sm font-bold underline" onClick={()=>setPlaceLimit(n=>n+12)}>Show more mapped places</button>}
                        {!returning&&placeQuery&&!matchingPlaces.length&&<p role="status" className="text-sm">No mapped places match this search.</p>}

                        <div className="tg-stack" style={{ gap: '.4rem' }}>
                            <div className="flex items-center justify-between gap-2">
                                <div style={{ minWidth: 0 }}>
                                    <p className="tg-label">Starting from</p>
                                    <p style={{ fontWeight: 800, margin: 0 }}>{originLabel}</p>
                                </div>
                                {usingGPS || !isDefaultOrigin ? (
                                    <button className="tg-btn" style={{ width: 'auto', flexShrink: 0 }} onClick={useDefaultOrigin}>
                                        Use area start
                                    </button>
                                ) : (
                                    <button className="tg-btn" style={{ width: 'auto', flexShrink: 0 }} onClick={handleGetLocation} disabled={geoBusy}>
                                        <LocateFixed size={22} aria-hidden />
                                        {geoBusy ? 'Finding…' : 'My location'}
                                    </button>
                                )}
                            </div>
                            {geoMsg && <p className="tg-note tg-warnbox" role="alert">{geoMsg}</p>}
                        </div>

                        <div className="tg-stack" style={{ gap: '.4rem' }}>
                            <p className="tg-label">Who is walking?</p>
                            <div role="radiogroup" aria-label="Who is walking" className="grid grid-cols-2 gap-2">
                                {(Object.keys(PROFILES) as Profile[]).map((p) => (
                                    <button
                                        key={p}
                                        role="radio"
                                        aria-checked={profile === p}
                                        className="tg-card tg-card-center"
                                        onClick={() => chooseProfile(p)}
                                    >
                                        {profile === p && <Check size={22} aria-hidden />}
                                        {PROFILES[p].label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {planningControls}
                        <PaceCalibration history={library.history} profile={profile} current={needs.speed_mps} onUse={speed => setNeeds(n => ({ ...n, speed_mps: speed }))} />
                        <WalkingConditions night={isNight} forecast={forecast} onCompare={mode => { setChosenMode(mode); setStep('route'); }}
                            onInspectCover={() => { setInformationLayer('cover'); setStep('route'); }} />
                        <PlaceDiscovery snapshot={planningSnapshot} request={toolRequest} budget={needs.budget_min} onChoose={(asset: WalkingAsset) => {
                            chooseDest(asset.external_id || asset.id); setStep('route');
                        }} />
                        <div className="flex flex-wrap gap-3 text-sm font-bold">
                            <button type="button" onClick={() => setReloadVersion(v => v + 1)} className="min-h-11 underline">Refresh paths & checks</button>
                            <Link href={`/verification?area=${area}`} className="inline-flex min-h-11 items-center underline">Places and verification coverage</Link>
                        </div>
                        <PilotSources area={area} context={pilotData??undefined} onFocus={focusWalkPoint}/>
                        <button className="tg-btn tg-btn-primary" onClick={() => { buzz(); setStep('route'); }}>
                            Show my routes
                        </button>
                    </div>
                )}

                {/* STEP 2: choose a route */}
                {view === 'plan' && step === 'route' && (
                    <div className="tg-stack">
                        <div className="flex items-center gap-3">
                            <button className="tg-btn" style={{ width: 'auto' }} onClick={() => setStep('where')}>
                                <ArrowLeft size={22} aria-hidden /> Back
                            </button>
                            <p className="tg-small" style={{ margin: 0, flex: 1 }}>
                                {returning ? <>Back to <b>your starting point</b></> : <>To <b>{currentDest.name}</b></>}
                            </p>
                        </div>

                        <h1 className="tg-h2">Choose your route</h1>
                        {planningControls}
                        {!returning && entrances.length > 0 && <label className="tg-label" htmlFor="arrival-entrance">Arrival access point
                            <select id="arrival-entrance" className="tg-input" style={{ minHeight: '3rem' }} value={entranceId} onChange={e => { setEntranceId(e.target.value); setChosenMode(null); }}>
                                <option value="">Best available access point</option>
                                {entrances.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </label>}


                        {loadingDb||journeySearch.pending ? (
                            <p className="tg-note" role="status">{loadingDb?'Loading footpaths…':'Checking routes and your walking needs…'}</p>
                        ) : !plan || !activeRoute ? (
                            <div className="tg-note tg-warnbox" role="alert">
                                <RouteQualityBar />
                                {plan?.reasons.map(reason => <span key={reason} style={{ display: 'block', marginTop: '.5rem' }}>{reason}</span>)}
                                {!plan && (journeySearch.error||'Load walking data and choose a mapped place to plan a trip.')}
                            </div>
                        ) : (
                            <>
                                <RouteQualityBar route={activeRoute} best={shownMode === recommended} />
                                <div role="radiogroup" aria-label="Route choices" className="tg-stack">
                                    {visibleModes.map((m) => {
                                        const r = plan.routes[m];
                                        if (!r) return null;
                                        const isActive = shownMode === m;
                                        const Icon = MODE_ICON[m];
                                        return (
                                            <button
                                                key={m}
                                                role="radio"
                                                aria-checked={isActive}
                                                className="tg-card"
                                                onClick={() => chooseMode(m)}
                                            >
                                                {isActive
                                                    ? <CheckCircle2 size={24} aria-hidden style={{ flexShrink: 0 }} />
                                                    : <Circle size={24} aria-hidden style={{ flexShrink: 0 }} />}
                                                <span style={{ flex: 1, minWidth: 0 }}>
                                                    <span className="flex flex-wrap items-center gap-2">
                                                        <Icon size={22} aria-hidden />
                                                        <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>{MODE_LABEL[m]}</span>
                                                        {m === recommended && <span className="tg-badge">Recommended</span>}
                                                    </span>
                                                    <span className="mt-2 block"><RouteQualityBar route={r} best={m === recommended} compact /></span>
                                                    <span className="tg-small" style={{ display: 'block', marginTop: 2 }}>
                                                        {reasonFor(m, r, isNight)}
                                                    </span>
                                                </span>
                                                <span style={{ textAlign: 'right', flexShrink: 0 }}>
                                                    <span style={{ display: 'block', fontWeight: 800, fontSize: '1.3rem', lineHeight: 1.1 }}>
                                                        {minutesOf(r)} min
                                                    </span>
                                                    <span className="tg-small" style={{ display: 'block' }}>{Math.round(r.length_m)} m</span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <ComfortBreakdown route={activeRoute} edges={edges} records={walkingData?.verifications ?? []} night={isNight} />
                                <WalkTimeline route={activeRoute} edges={edges} records={walkingData?.verifications ?? []} onFocus={focusWalkPoint} />
                                <RouteDetails route={activeRoute} />
                                <p className="tg-small" style={{ margin: 0 }}>
                                    On the map: solid line is Shortest, dashed is Shadiest, dotted is Best lit. Your chosen route is thicker.
                                </p>
                            </>
                        )}
                        {activeRoute && <details className="rounded-xl border-2 border-slate-300 p-3">
                            <summary className="min-h-8 cursor-pointer font-bold">Keep this walk</summary>
                            <div className="mt-3 tg-stack">
                                <button className="tg-btn" disabled={savingPack} onClick={() => void savePack()}><Bookmark size={20} aria-hidden />{savingPack ? 'Preparing offline access…' : 'Save walk for offline'}</button>
                                <button className="tg-btn" onClick={() => { if (walkingData) downloadPack(createWalkPack(activeRoute,profile,needs,userCoords,edges,walkingData,undefined,networkSnapshot)); }}>Download a walk pack</button>
                                <p className="tg-small">Saved packs include a route sketch, instructions, mapped facilities and dated conditions. Recheck before setting out.</p>
                            </div>
                        </details>}
                        {quickUpdate}

                        <div className={`grid gap-2 ${canSpeak ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {canSpeak && (
                                <button className="tg-btn" onClick={readRouteAloud} disabled={!activeRoute}>
                                    <Volume2 size={22} aria-hidden /> Read aloud
                                </button>
                            )}
                            <button className="tg-btn" onClick={openShare} disabled={!activeRoute}>
                                <Share2 size={22} aria-hidden /> Share plan
                            </button>
                        </div>

                        <button className="tg-btn tg-btn-primary" onClick={startWalk} disabled={loadingDb ||journeySearch.pending||startingWalk|| !activeRoute}>
                            <Navigation size={24} aria-hidden />{startingWalk?'Checking before you start…':'Start walking'}
                        </button>
                    </div>
                )}

                {/* STEP 3: walking */}
                {walkSession && <div style={{ display: view === 'walk' ? 'block' : 'none' }}>
                    <WalkRecorder key={walkSession.id} session={walkSession} onComplete={finishRecording} onFeedback={saveFeedback} onPosition={setLivePoint}
                        onNewWalk={() => { setWalkSession(null); setLivePoint(null); setView('plan'); setStep('where'); }} />
                    {!sessionFinished && <div className="tg-stack mt-4">
                        <details className="rounded-xl border border-slate-300 p-3"><summary className="min-h-8 cursor-pointer font-bold">Your original walk plan</summary><p className="tg-small mt-2">Planned at {new Date(walkSession.pack.route.departure_at).toLocaleTimeString('en-MY',{timeZone:'Asia/Kuala_Lumpur',hour:'2-digit',minute:'2-digit'})} Malaysia time. This plan stays fixed while you record; pause and review if conditions change.</p><RouteQualityBar route={walkSession.pack.route} /><WalkTimeline route={walkSession.pack.route} edges={walkSession.pack.edges} records={walkingData?.verifications ?? []} onFocus={focusWalkPoint} /></details>
                        {quickUpdate}
                        <button disabled={IS_PAGES_PREVIEW} className="tg-btn" onClick={() => { setShowReportModal(true); setReportMsg(null); buzz(); }}><AlertTriangle size={22} aria-hidden />Report a problem</button>
                        {IS_PAGES_PREVIEW && <p className="tg-small">Shared reporting is unavailable in this public preview. Quick condition updates can still be saved on this device.</p>}
                        <div className="grid grid-cols-2 gap-2"><button className="tg-btn" onClick={openShare}><Share2 size={20} aria-hidden />Share</button><a className="tg-btn" href={`tel:${EMERGENCY_NUMBER}`}><Phone size={20} aria-hidden />Call for help</a></div>
                    </div>}
                </div>}
            </section>
            <nav className="tg-tabs" aria-label="Walking sections">{([
                ['explore','Explore',Compass],['plan','Plan',RouteIcon],['walk','Walk',Navigation],['saved','Saved',Bookmark],
            ] as const).map(([id,label,Icon]) => <button key={id} aria-current={view === id ? 'page' : undefined} onClick={() => { setView(id); if (id === 'plan' && step === 'walking') setStep('route'); requestAnimationFrame(() => document.getElementById('walk-planning')?.focus({preventScroll:true})); }}><Icon size={21} aria-hidden />{label}{id === 'walk' && walkSession && !sessionFinished ? ' •' : ''}</button>)}</nav>

            {/* ---------------- Dialogs ---------------- */}

            {showSettings && (
                <Sheet title="Text and display" onClose={() => setShowSettings(false)}>
                    <div className="tg-stack">
                        <p className="tg-label">Text size</p>
                        <div role="radiogroup" aria-label="Text size" className="grid grid-cols-3 gap-2">
                            {([['normal', 'Normal'], ['large', 'Large'], ['xlarge', 'Extra large']] as [TextScale, string][]).map(([v, label]) => (
                                <button
                                    key={v}
                                    role="radio"
                                    aria-checked={prefs.scale === v}
                                    className="tg-card tg-card-center"
                                    style={{ padding: '.6rem .4rem' }}
                                    onClick={() => setPref('scale', v)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <SettingSwitch
                            label="High contrast"
                            hint="Black text, white background, thicker borders"
                            checked={prefs.highContrast}
                            onChange={(v) => setPref('highContrast', v)}
                        />
                        <SettingSwitch
                            label="Reduce movement"
                            hint="The map jumps instead of gliding"
                            checked={prefs.reduceMotion}
                            onChange={(v) => setPref('reduceMotion', v)}
                        />
                        <SettingSwitch
                            label="Vibrate when I tap"
                            hint="A short buzz to confirm a tap"
                            checked={prefs.vibrate}
                            onChange={(v) => setPref('vibrate', v)}
                        />
                        {canSpeak && (
                            <SettingSwitch
                                label="Speak updates"
                                hint="Says out loud when your walk starts, ends or a report is sent"
                                checked={prefs.speak}
                                onChange={(v) => setPref('speak', v)}
                            />
                        )}
                        <p className="tg-small" style={{ margin: 0 }}>Your choices are saved on this device.</p>
                    </div>
                </Sheet>
            )}

            {showShare && (
                <Sheet title="Share your walk" onClose={() => setShowShare(false)}>
                    <div className="tg-stack">
                        <p className="tg-note" style={{ margin: 0, userSelect: 'text' }}>
                            {shareMessage}
                            <br />
                            <span style={{ wordBreak: 'break-all', fontWeight: 500 }}>{shareUrl}</span>
                        </p>

                        <a
                            className="tg-btn tg-btn-wa"
                            href={`https://wa.me/?text=${encodeURIComponent(`${shareMessage} ${shareUrl}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <MessageCircle size={24} aria-hidden /> Send on WhatsApp
                        </a>

                        {canShare && (
                            <button className="tg-btn" onClick={nativeShare}>
                                <Share2 size={22} aria-hidden /> More ways to share
                            </button>
                        )}

                        <button className="tg-btn" onClick={copyShare}>
                            {copied ? <Check size={22} aria-hidden /> : <Copy size={22} aria-hidden />}
                            {copied ? 'Copied' : 'Copy message'}
                        </button>

                        <div role="status" aria-live="polite">
                            {copied && <p className="tg-note" style={{ margin: 0 }}>Copied. You can paste it into any chat.</p>}
                            {shareNote && <p className="tg-note tg-warnbox" style={{ margin: 0 }}>{shareNote}</p>}
                        </div>

                        <p className="tg-small" style={{ margin: 0 }}>
                            Whoever opens the link sees the same route you chose. It does not track you live.
                        </p>
                    </div>
                </Sheet>
            )}

            {showReportModal && isNavigating && (
                <Sheet title="Report a problem" onClose={() => setShowReportModal(false)}>
                    <div className="tg-stack">
                        <p className="tg-label">What is the problem?</p>
                        <div role="radiogroup" aria-label="Type of problem" className="tg-stack" style={{ gap: '.5rem' }}>
                            {HAZARD_OPTIONS.map((o) => (
                                <button
                                    key={o.kind}
                                    role="radio"
                                    aria-checked={selectedKind === o.kind}
                                    className="tg-card"
                                    onClick={() => { setSelectedKind(o.kind); buzz(); }}
                                >
                                    <o.Icon size={26} aria-hidden style={{ flexShrink: 0 }} />
                                    <span style={{ flex: 1 }}>
                                        <span style={{ display: 'block', fontWeight: 800 }}>{o.label}</span>
                                        <span className="tg-small" style={{ display: 'block' }}>{o.hint}</span>
                                    </span>
                                    {selectedKind === o.kind && <CheckCircle2 size={24} aria-hidden style={{ flexShrink: 0 }} />}
                                </button>
                            ))}
                        </div>

                        <label htmlFor="report-notes" className="tg-label">Add details (optional)</label>
                        <textarea
                            id="report-notes"
                            className="tg-input"
                            value={reportNotes}
                            onChange={(e) => setReportNotes(e.target.value)}
                            placeholder="For example: near the bus stop, left side of the path"
                        />

                        <p className="tg-small" style={{ margin: 0 }}>We will use your current position as the place of the problem.</p>

                        <div role="status" aria-live="polite">
                            {reportMsg && <p className="tg-note" style={{ margin: 0 }}>{reportMsg}</p>}
                        </div>

                        <button className="tg-btn tg-btn-primary" onClick={submitCapexDefect} disabled={isSubmittingReport}>
                            <Send size={22} aria-hidden /> {isSubmittingReport ? 'Sending…' : 'Send report'}
                        </button>
                    </div>
                </Sheet>
            )}

        </div>
    );
}

function ResidentPageWithParams() {
    const searchParams = useSearchParams();
    const ready = useClientReady();
    const area=pilotFromParams(searchParams);
    if(!isPilotAvailable(area))return <PilotUnavailable area={area}/>;
    return ready ? <ResidentPageContent key={searchParams.toString()} /> : <div role="status">Loading your walk…</div>;
}

export default function ResidentPage() {
    return (
        <Suspense fallback={<div role="status" style={{ padding: '1.5rem', textAlign: 'center', fontSize: '1rem', fontWeight: 700, color: '#444B55' }} className="font-sans">Loading your walk…</div>}>
            <ResidentPageWithParams />
        </Suspense>
    );
}
