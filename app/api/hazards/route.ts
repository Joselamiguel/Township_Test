import { readHazards } from '@/lib/server/repository';
import { apiError, json } from '@/lib/server/http';

export async function GET() {
    try { return json({ hazards: await readHazards() }); }
    catch (error) { return apiError(error); }
}
