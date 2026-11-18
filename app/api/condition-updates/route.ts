import { addVerification } from '@/lib/server/walking-data';
import { conditionUpdateRecord } from '@/lib/condition-updates';
import { apiError, json, readJson } from '@/lib/server/http';

export async function POST(request: Request) {
    try {
        const record = conditionUpdateRecord(await readJson(request));
        const result = await addVerification(record);
        return json({ ...result, status: 'reported' }, 201);
    } catch (error) { return apiError(error); }
}
