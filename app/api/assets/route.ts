import { addAsset } from '@/lib/server/walking-data';
import { apiError, json, readJson } from '@/lib/server/http';
export async function POST(request: Request) {
    try { return json(await addAsset(await readJson(request)), 201); } catch (error) { return apiError(error); }
}
