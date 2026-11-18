// Public build-time values. DATABASE_URL is never used here.
export const IS_PAGES_PREVIEW = process.env.NEXT_PUBLIC_SITE_MODE === 'pages';
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function sitePath(path: string) {
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('An app-relative path is required.');
    return `${BASE_PATH}${path}`;
}

export function dataPath(apiPath: string,area?:'elmina'|'pasar-seni') {
    if (!IS_PAGES_PREVIEW) return sitePath(area?`${apiPath}${apiPath.includes('?')?'&':'?'}area=${area}`:apiPath);
    const paths: Record<string, string> = { '/api/graph': 'graph', '/api/walking-data': 'walking-data',
        '/api/hazards': 'hazards', '/api/reports': 'reports','/api/pilot-context':'context' };
    const name = paths[apiPath.split('?')[0]];
    if (!name) throw new Error('Shared updates are unavailable in the public preview.');
    return sitePath(`/pilot/${area?`${area}/`:''}${name}.json`);
}
