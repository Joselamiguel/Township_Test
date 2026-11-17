import 'server-only';
import { RequestError } from './validation.ts';

export async function readJson(request: Request): Promise<unknown> {
    const text = await request.text();
    if (Buffer.byteLength(text) > 16384) throw new RequestError('The report is too large.', 413);
    try {
        return JSON.parse(text);
    } catch {
        throw new RequestError('A valid JSON request body is required.');
    }
}

export function apiError(error: unknown) {
    if (error instanceof RequestError) return Response.json({ error: error.message }, { status: error.status });
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown';
    console.error('Database operation failed:', code);
    return Response.json({ error: 'The walking service is unavailable. Please try again.' }, { status: 503 });
}

export function json(data: unknown, status = 200) {
    return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}
