import { createReport, readReports } from '@/lib/server/repository';
import { apiError, json, readJson } from '@/lib/server/http';
import { RequestError, validateReport } from '@/lib/server/validation';

export async function GET(request: Request) {
    try {
        const status = new URL(request.url).searchParams.get('status') ?? 'open';
        if (!['open', 'all'].includes(status)) throw new RequestError('Status must be open or all.');
        return json({ reports: await readReports(status === 'all') });
    } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
    try { return json(await createReport(validateReport(await readJson(request))), 201); }
    catch (error) { return apiError(error); }
}
