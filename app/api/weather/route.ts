import { DEFAULT_ORIGIN } from '@/lib/precinct';
import { weatherUrl, parseWeather, unavailableWeather } from '@/lib/comfort';

export async function GET() {
    const now = new Date().toISOString();
    try {
        const response = await fetch(weatherUrl(DEFAULT_ORIGIN), { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) });
        if (!response.ok) throw new Error('Weather upstream unavailable');
        return Response.json(parseWeather(await response.json(), now));
    } catch { return Response.json(unavailableWeather(now)); }
}
