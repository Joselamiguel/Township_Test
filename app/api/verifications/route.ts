import { addVerification } from '@/lib/server/walking-data';
import { apiError, json, readJson } from '@/lib/server/http';
export async function POST(request: Request) {
    try { return json(await addVerification(await readJson(request)), 201); } catch (error) { return apiError(error); }
}
