import { readGraph } from '@/lib/server/repository';
import { apiError, json } from '@/lib/server/http';

export async function GET() {
    try { return json(await readGraph()); }
    catch (error) { return apiError(error); }
}
