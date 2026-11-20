'use client';

import { useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function PanelGrip({ expanded, onChange }: { expanded: boolean; onChange: (expanded: boolean) => void }) {
    const startY = useRef<number | null>(null);
    const handledDrag = useRef(false);
    const Icon = expanded ? ChevronDown : ChevronUp;
    return (
        <button type="button" className="tg-panel-grip" aria-controls="walking-panel" aria-expanded={expanded}
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
                onChange(displacement < 0);
            }}
            onPointerCancel={() => { startY.current = null; handledDrag.current = false; }}
            onClick={event => {
                if (handledDrag.current && event.detail !== 0) {
                    handledDrag.current = false;
                    return;
                }
                onChange(!expanded);
            }}
        >
            <span className="tg-panel-grip-bar" aria-hidden />
            <span><Icon size={15} aria-hidden />{expanded ? 'Show map' : 'Expand panel'}</span>
        </button>
    );
}
