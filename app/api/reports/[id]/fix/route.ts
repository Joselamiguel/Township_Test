import { fixReport } from '@/lib/server/repository';
import { apiError, json } from '@/lib/server/http';
import { validateReportId } from '@/lib/server/validation';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try { return json({ report: await fixReport(validateReportId((await params).id)) }); }
    catch (error) { return apiError(error); }
}
