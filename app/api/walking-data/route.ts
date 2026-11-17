import { walkingData } from '@/lib/server/walking-data';
import { apiError, json } from '@/lib/server/http';
export async function GET() {
    try { return json(await walkingData()); } catch (error) { return apiError(error); }
}
