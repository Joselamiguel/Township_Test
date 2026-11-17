import type { Mode, Profile } from './routing';

export function readWalkParameters(
    params: Pick<URLSearchParams, 'get'>,
    destinationIds: readonly string[],
    defaultOrigin: [number, number],
) {
    const lat = Number.parseFloat(params.get('startLat') ?? '');
    const lng = Number.parseFloat(params.get('startLng') ?? '');
    const hasOrigin = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    const destination = params.get('destId');
    const hasDestination = destination !== null && destinationIds.includes(destination);
    const profile = params.get('profile');
    const mode = params.get('mode');

    return {
        origin: hasOrigin ? [lat, lng] as [number, number] : defaultOrigin,
        destination: hasDestination ? destination : destinationIds[0],
        profile: (['senior', 'cane_walker', 'wheelchair'].includes(profile ?? '') ? profile : 'senior') as Profile,
        mode: (['direct', 'coolest', 'safest'].includes(mode ?? '') ? mode : null) as Mode | null,
        fromLink: hasOrigin || hasDestination,
    };
}
