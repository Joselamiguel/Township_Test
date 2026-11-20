'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair } from 'lucide-react';
import {
    Map as LibreMap, AttributionControl, LngLatBounds, Marker, NavigationControl, Popup,
    type GeoJSONSource, type StyleSpecification, type MapMouseEvent,
} from 'maplibre-gl';
import type { Feature, FeatureCollection, LineString } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import { PILOTS, type PilotId } from '@/lib/pilots';
import { sitePath } from '@/lib/site';
import type { EnvironmentSegment } from '@/lib/environment';
import { DEFAULT_ORIGIN } from '@/lib/precinct';
import type { InteractiveMapProps } from './InteractiveMap';

const empty: FeatureCollection = { type: 'FeatureCollection', features: [] };
const lngLat = ([lat, lng]: [number, number]): [number, number] => [lng, lat];
const RAIN_COLOUR = '#0e766e';
const layerIds = ['walking-conditions', 'walking-routes'];

function mapStyle(area: PilotId): StyleSpecification {
    return {
        version: 8,
        light: { anchor: 'map', color: '#fffaf0', intensity: 0.45, position: [1.8, 230, 42] },
        sources: {
            area: { type: 'geojson', data: sitePath(`/map-area/${area}.geojson`),
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' },
            conditions: { type: 'geojson', data: empty },
            routes: { type: 'geojson', data: empty },
        },
        layers: [
            { id: 'ground', type: 'background', paint: { 'background-color': '#eeeae2' } },
            { id: 'open-spaces', type: 'fill', source: 'area', filter: ['in', ['get', 'kind'], ['literal', ['green', 'water']]],
                paint: { 'fill-color': ['match', ['get', 'kind'], 'water', '#b6dbe0', '#cfdcc6'] } },
            { id: 'streets-outline', type: 'line', source: 'area', filter: ['==', ['get', 'kind'], 'street'],
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: { 'line-color': '#dddad1', 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 2.5, 18, 12] } },
            { id: 'streets', type: 'line', source: 'area', filter: ['==', ['get', 'kind'], 'street'],
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: { 'line-color': '#faf9f6', 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1.5, 18, 9] } },
            { id: 'reference-paths', type: 'line', source: 'area', filter: ['==', ['get', 'kind'], 'path'],
                paint: { 'line-color': '#a8a392', 'line-width': 1.2, 'line-opacity': 0.55, 'line-dasharray': [2, 2] } },
            { id: 'building-footprints', type: 'fill', source: 'area', filter: ['==', ['get', 'kind'], 'building'],
                paint: { 'fill-color': '#c2c4ca', 'fill-outline-color': '#a9acb4' } },
            { id: 'building-volumes', type: 'fill-extrusion', source: 'area', filter: ['==', ['get', 'kind'], 'building'], minzoom: 15, paint: {
                'fill-extrusion-color': '#c2c9d0', 'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-base': ['get', 'base'], 'fill-extrusion-opacity': 0.92,
            } },
            { id: 'conditions-unknown', type: 'line', source: 'conditions', filter: ['!', ['get', 'known']], paint: {
                'line-color': '#64748b', 'line-width': 2, 'line-opacity': 0.48, 'line-dasharray': [1, 2.5],
            } },
            { id: 'walking-conditions', type: 'line', source: 'conditions', filter: ['get', 'known'],
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: { 'line-width': 3.5, 'line-opacity': 0.87, 'line-color': ['get', 'colour'] } },
            { id: 'route-outline', type: 'line', source: 'routes', layout: {
                'line-cap': 'round', 'line-join': 'round', 'line-sort-key': ['get', 'order'],
            }, paint: { 'line-color': '#ffffff', 'line-width': ['case', ['get', 'active'], 10, 6] } },
            { id: 'walking-routes', type: 'line', source: 'routes', layout: {
                'line-cap': 'round', 'line-join': 'round', 'line-sort-key': ['get', 'order'],
            }, paint: { 'line-color': ['get', 'colour'], 'line-width': ['case', ['get', 'active'], 6, 3] } },
        ],
    };
}

function popupContent(title: string, detail?: string) {
    const panel = document.createElement('div');
    const heading = document.createElement('strong');
    heading.textContent = title;
    panel.append(heading);
    if (detail) {
        const description = document.createElement('p');
        description.textContent = detail;
        panel.append(description);
    }
    return panel;
}

function pin(map: LibreMap, position: [number, number], kind: string, symbol: string, label: string, detail?: string) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = `tg-map-pin tg-map-pin-${kind}`;
    element.setAttribute('aria-label', label);
    element.textContent = symbol;
    const popup = new Popup({ offset: 17, maxWidth: '245px' }).setDOMContent(popupContent(label, detail));
    return new Marker({ element }).setLngLat(lngLat(position)).setPopup(popup).addTo(map);
}

type Props = InteractiveMapProps & { area: PilotId; segments: EnvironmentSegment[]; flat: boolean; onUnavailable: () => void };

export default function ResidentMap3D({
    area, segments, flat, onUnavailable, startCoords = DEFAULT_ORIGIN, endCoords, startLabel = 'Start', routes,
    activeRouteId, reports, assets, liveLocation, focusLocation, reduceMotion, highContrast,
    selectedLocation, onLocationSelect, informationLayer,
}: Props) {
    const container = useRef<HTMLDivElement>(null);
    const mapRef = useRef<LibreMap | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!container.current) return;
        let map: LibreMap;
        try {
            map = new LibreMap({
                container: container.current, style: mapStyle(area),
                center: lngLat(PILOTS[area].centre), zoom: 17, pitch: 47, bearing: -12,
                maxPitch: 70, maxZoom: 20, attributionControl: false,
            });
        } catch {
            onUnavailable();
            return;
        }
        mapRef.current = map;
        map.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-left');
        map.addControl(new AttributionControl({ compact: false }), 'bottom-left');
        map.once('style.load', () => setLoaded(true));
        map.once('webglcontextlost', onUnavailable);
        const observer = new ResizeObserver(() => map.resize());
        observer.observe(container.current);
        return () => {
            observer.disconnect();
            map.remove();
            mapRef.current = null;
        };
    }, [area, onUnavailable]);

    const active = routes?.find(route => route.id === activeRouteId) ?? routes?.[0];
    const activeCoordinates = active?.coordinates;
    const [startLat, startLng] = startCoords;
    const endLat = endCoords?.[0], endLng = endCoords?.[1];
    const fit = useMemo(() => {
        const points = activeCoordinates ?? [];
        const bounds = new LngLatBounds(lngLat([startLat, startLng]), lngLat([startLat, startLng]));
        for (const point of points) bounds.extend(lngLat(point));
        if (endLat !== undefined && endLng !== undefined) bounds.extend(lngLat([endLat, endLng]));
        return bounds;
    }, [activeCoordinates, startLat, startLng, endLat, endLng]);
    const focusLat = focusLocation?.[0], focusLng = focusLocation?.[1];

    useEffect(() => {
        const map = mapRef.current;
        if (!loaded || !map) return;
        map.setLayoutProperty('building-volumes', 'visibility', flat ? 'none' : 'visible');
        map.setMaxPitch(flat ? 0 : 70);
        if (flat) {
            map.dragRotate.disable();
            map.touchZoomRotate.disableRotation();
        } else {
            map.dragRotate.enable();
            map.touchZoomRotate.enableRotation();
        }
        map.easeTo({ pitch: flat ? 0 : 47, bearing: flat ? 0 : -12, duration: reduceMotion ? 0 : 280 });
    }, [loaded, flat, reduceMotion]);

    useEffect(() => {
        const map = mapRef.current;
        if (!loaded || !map) return;
        const duration = reduceMotion ? 0 : 330;
        if (focusLat !== undefined && focusLng !== undefined) {
            map.easeTo({ center: lngLat([focusLat, focusLng]), zoom: Math.max(17, map.getZoom()), duration });
        } else {
            map.fitBounds(fit, { padding: { top: 54, left: 35, right: 45, bottom: 65 }, maxZoom: 17.8,
                duration, pitch: map.getPitch(), bearing: map.getBearing() });
        }
    }, [loaded, fit, focusLat, focusLng, reduceMotion]);

    useEffect(() => {
        const map = mapRef.current;
        if (!loaded || !map) return;
        const features = (routes ?? []).filter(route => route.coordinates.length > 1).map<Feature<LineString>>(route => {
            const selected = route.id === active?.id;
            const colour = selected ? (route.id === 'sheltered' ? RAIN_COLOUR : highContrast ? '#53128a' : '#533ed3') : '#6a7183';
            return { type: 'Feature', geometry: { type: 'LineString', coordinates: route.coordinates.map(lngLat) },
                properties: { active: selected, colour, order: Number(selected), name: route.name } };
        });
        (map.getSource('routes') as GeoJSONSource).setData({ type: 'FeatureCollection', features });
    }, [loaded, routes, active?.id, highContrast]);

    useEffect(() => {
        const map = mapRef.current;
        if (!loaded || !map) return;
        const features = segments.map<Feature<LineString>>(segment => {
            const colour = informationLayer === 'paths' ? '#475569' : informationLayer === 'observations' ? '#5b55a1'
                : segment.source !== 'reported' && Number(segment.value) >= 0.65 ? RAIN_COLOUR : '#b45309';
            return { type: 'Feature', geometry: { type: 'LineString', coordinates: segment.geometry },
                properties: { known: segment.value !== null, colour, name: segment.name, detail: segment.detail } };
        });
        (map.getSource('conditions') as GeoJSONSource).setData({ type: 'FeatureCollection', features });
    }, [loaded, segments, informationLayer]);

    useEffect(() => {
        const map = mapRef.current;
        if (!loaded || !map) return;
        const markers: Marker[] = [];
        for (const asset of (assets ?? []).slice(0, 40)) {
            const symbol = ({ toilet: 'WC', water: 'W', rest: 'S', shelter: '☂', transit: 'T', entrance: 'E' })[asset.kind as string];
            if (symbol) markers.push(pin(map, [asset.lat, asset.lng], 'asset', symbol, asset.name, 'Mapped facility or access point'));
        }
        for (const report of reports ?? []) {
            const lat = report.lat ?? report.latitude, lng = report.lng ?? report.longitude;
            if (lat !== undefined && lng !== undefined) markers.push(pin(map, [lat, lng], 'hazard', '!', report.category || 'Reported hazard', report.description ?? undefined));
        }
        if (endLat !== undefined && endLng !== undefined) markers.push(pin(map, [endLat, endLng], 'destination', '●', 'Destination'));
        markers.push(pin(map, [startLat, startLng], 'origin', '●', startLabel));
        if (selectedLocation) markers.push(pin(map, selectedLocation, 'hazard', '+', 'Selected hazard location'));
        if (liveLocation) markers.push(pin(map, liveLocation, 'live', '●', 'Last recorded GPS position'));
        return () => { for (const marker of markers) marker.remove(); };
    }, [loaded, assets, reports, startLat, startLng, startLabel, endLat, endLng, selectedLocation, liveLocation]);

    useEffect(() => {
        const map = mapRef.current;
        if (!loaded || !map) return;
        const popup = new Popup({ maxWidth: '245px' });
        const onClick = (event: MapMouseEvent) => {
            if (onLocationSelect) {
                onLocationSelect(event.lngLat.lat, event.lngLat.lng);
                return;
            }
            const feature = map.queryRenderedFeatures(event.point, { layers: [...layerIds, 'conditions-unknown'] })[0];
            if (feature?.properties.name) popup.setLngLat(event.lngLat).setDOMContent(popupContent(feature.properties.name, feature.properties.detail)).addTo(map);
        };
        map.on('click', onClick);
        map.getCanvas().style.cursor = onLocationSelect ? 'crosshair' : '';
        return () => { map.off('click', onClick); popup.remove(); };
    }, [loaded, onLocationSelect]);

    return (
        <>
            <div ref={container} style={{ position: 'absolute', inset: 0 }} data-map-canvas />
            {loaded && <button type="button" className="tg-map-fit" onClick={() => mapRef.current?.fitBounds(fit, {
                padding: { top: 54, left: 35, right: 45, bottom: 65 }, maxZoom: 17.8,
                duration: reduceMotion ? 0 : 330,
            })}><Crosshair size={17} aria-hidden /> Recenter</button>}
        </>
    );
}
