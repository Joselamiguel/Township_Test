import { DEFAULT_ORIGIN } from '@/lib/precinct';
import { parseWeather, unavailableWeather } from '@/lib/comfort';

export async function GET() {
    const now = new Date().toISOString();
    try {
        const query = new URLSearchParams({ latitude: String(DEFAULT_ORIGIN[0]), longitude: String(DEFAULT_ORIGIN[1]),
            current: 'temperature_2m,relative_humidity_2m,apparent_temperature,shortwave_radiation',
            hourly: 'temperature_2m,apparent_temperature,precipitation_probability,precipitation',
            forecast_days: '3', timezone: 'Asia/Kuala_Lumpur' });
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) });
        if (!response.ok) throw new Error('Weather upstream unavailable');
        return Response.json(parseWeather(await response.json(), now));
    } catch { return Response.json(unavailableWeather(now)); }
}
