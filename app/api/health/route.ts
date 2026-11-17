import { databaseHealth } from '@/lib/server/repository';
import { apiError, json } from '@/lib/server/http';

export async function GET() {
    try { return json(await databaseHealth()); }
    catch (error) { return apiError(error); }
}
