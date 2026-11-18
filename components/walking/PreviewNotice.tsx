import { IS_PAGES_PREVIEW } from '@/lib/site';
import { DEFAULT_PILOT,type PilotId } from '@/lib/pilots';

export default function PreviewNotice({area=DEFAULT_PILOT}:{area?:PilotId}) {
    if (!IS_PAGES_PREVIEW) return null;
    return <aside aria-label="Public preview" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-relaxed text-amber-950">
        <strong>{area==='elmina'?'Elmina guided example.':'Central KL walking pilot.'}</strong> Routes use a dated OpenStreetMap source snapshot.
        Shared reports and verification edits are unavailable here. Mapped features have not been field-verified.
    </aside>;
}
