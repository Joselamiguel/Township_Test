import { pilotContext,requestArea } from '@/lib/server/pilots';
import { apiError,json } from '@/lib/server/http';
export async function GET(request:Request){try{return json(await pilotContext(requestArea(request)));}catch(error){return apiError(error);}}
