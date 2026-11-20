'use client';

import dynamic from 'next/dynamic';
import { useCallback, useMemo, useState } from 'react';
import { Layers } from 'lucide-react';
import { sitePath } from '@/lib/site';
import type { PilotId } from '@/lib/pilots';
import { environmentCoverage, environmentSegments, type EnvironmentLayer } from '@/lib/environment';
import type { InteractiveMapProps } from './InteractiveMap';
import './resident-map.css';

const Map2D = dynamic(() => import('./InteractiveMap'), { ssr: false });
const Map3D = dynamic(() => import('./ResidentMap3D'), { ssr: false });

export default function ResidentMap({
    area, informationLayer = 'routes', onInformationLayerChange, ...mapProps
}: InteractiveMapProps & { area: PilotId }) {
    const [flat, setFlat] = useState(false);
    const [failed, setFailed] = useState(false);
    const fallback = useCallback(() => setFailed(true), []);
    const mode = flat || failed ? '2d' : '3d';
    const { edges, records, at } = mapProps.environment ?? {};
    const segments = useMemo(() => informationLayer !== 'routes' && edges && records && at
        ? environmentSegments(edges, records, at, informationLayer) : [],
    [informationLayer, edges, records, at]);
    const coverage = environmentCoverage(segments);

    return (
        <div data-map-mode={mode} className="resident-map absolute inset-0 bg-[#e8ede6]" aria-label="Walking map">
            {failed
                ? <Map2D {...mapProps} informationLayer={informationLayer} showLayerControls={false} localBasemap={sitePath(`/map-area/${area}.geojson`)} />
                : <Map3D {...mapProps} area={area} segments={segments} flat={flat} informationLayer={informationLayer} onUnavailable={fallback} />}
            <div className="tg-map-controls">
                <div className="tg-map-toggle" role="group" aria-label="Map view">
                    <button type="button" aria-pressed={mode === '3d'} onClick={() => { setFailed(false); setFlat(false); }}>3D</button>
                    <button type="button" aria-pressed={mode === '2d'} onClick={() => setFlat(true)}>2D</button>
                </div>
                {mapProps.environment && (
                    <label className="tg-map-layer">
                        <Layers size={16} aria-hidden />
                        <span className="sr-only">Map information</span>
                        <select value={informationLayer} onChange={event => onInformationLayerChange?.(event.target.value as EnvironmentLayer | 'routes')}>
                            <option value="routes">Routes</option>
                            <option value="paths">Footpaths</option>
                            <option value="cover">Roof cover</option>
                            <option value="shade">Shade</option>
                            <option value="lighting">Lighting</option>
                            <option value="observations">Field checks</option>
                        </select>
                    </label>
                )}
                {failed && <p role="status" className="tg-map-status">3D is unavailable on this device.</p>}
                {!failed && informationLayer !== 'routes' && <p role="status" className="tg-map-status">
                    {informationLayer === 'paths' ? `${coverage.total} mapped paths`
                        : `${coverage.known} of ${coverage.total} paths with data · dashed gray means unknown`}
                </p>}
            </div>
        </div>
    );
}
