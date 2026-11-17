import { IS_PAGES_PREVIEW } from '@/lib/site';

export default function PreviewNotice() {
    if (!IS_PAGES_PREVIEW) return null;
    return <aside aria-label="Public preview" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-relaxed text-amber-950">
        <strong>Interactive walking preview.</strong> Routes use the included Elmina OpenStreetMap snapshot (18 October 2026).
        Shared reports and verification edits are unavailable here. Mapped features have not been field-verified.
    </aside>;
}
