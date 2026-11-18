import { readGraph } from '@/lib/server/repository';
import { apiError, json } from '@/lib/server/http';
import { requestArea } from '@/lib/server/pilots';

export async function GET(request:Request) {
    try { return json(await readGraph(requestArea(request))); }
    catch (error) { return apiError(error); }
}
