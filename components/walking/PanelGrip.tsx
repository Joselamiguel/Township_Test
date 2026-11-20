'use client';

import { useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function PanelGrip({ minimized, walk, onChange }: { minimized: boolean; walk: boolean; onChange: (minimized: boolean) => void }) {
    const startY = useRef<number | null>(null);
    const handledDrag = useRef(false);
    const Icon = minimized ? ChevronUp : ChevronDown;
    const label = minimized ? (walk ? 'Show walk controls' : 'Show panel') : 'Minimize panel';
    return (
        <button type="button" className="tg-panel-grip" aria-controls="walking-panel" aria-expanded={!minimized}
            onPointerDown={event => {
                if (!event.isPrimary || event.button !== 0) return;
                startY.current = event.clientY;
                handledDrag.current = false;
                event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerUp={event => {
                if (startY.current === null) return;
                const displacement = event.clientY - startY.current;
                startY.current = null;
                if (Math.abs(displacement) < 30) return;
                handledDrag.current = true;
                onChange(displacement > 0);
            }}
            onPointerCancel={() => { startY.current = null; handledDrag.current = false; }}
            onClick={event => {
                if (handledDrag.current && event.detail !== 0) {
                    handledDrag.current = false;
                    return;
                }
                onChange(!minimized);
            }}
        >
            <span className="tg-panel-grip-bar" aria-hidden />
            <span><Icon size={15} aria-hidden />{label}</span>
        </button>
    );
}
