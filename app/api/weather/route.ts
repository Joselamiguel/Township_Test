import { PILOTS } from '@/lib/pilots';
import { weatherUrl, parseWeather, unavailableWeather } from '@/lib/comfort';
import { requestArea } from '@/lib/server/pilots';
import { apiError } from '@/lib/server/http';
import { RequestError } from '@/lib/server/validation';

export async function GET(request:Request) {
    const now = new Date().toISOString();
    try {
        const area=requestArea(request);
        const response = await fetch(weatherUrl(PILOTS[area].centre), { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) });
        if (!response.ok) throw new Error('Weather upstream unavailable');
        return Response.json(parseWeather(await response.json(), now));
    } catch(error) { if(error instanceof RequestError)return apiError(error);return Response.json(unavailableWeather(now)); }
}
