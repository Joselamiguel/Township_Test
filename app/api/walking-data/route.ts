import { walkingData } from '@/lib/server/walking-data';
import { apiError, json } from '@/lib/server/http';
import { requestArea } from '@/lib/server/pilots';
export async function GET(request:Request) {
    try { return json(await walkingData(requestArea(request))); } catch (error) { return apiError(error); }
}
