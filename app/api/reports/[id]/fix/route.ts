import { fixReport } from '@/lib/server/repository';
import { apiError, json } from '@/lib/server/http';
import { validateReportId } from '@/lib/server/validation';
import { requestArea } from '@/lib/server/pilots';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try { return json({ report: await fixReport(validateReportId((await params).id),requestArea(request)) }); }
    catch (error) { return apiError(error); }
}
