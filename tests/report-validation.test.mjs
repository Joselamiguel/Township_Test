import assert from 'node:assert/strict';
import test from 'node:test';
import { validateReport, validateReportId, RequestError } from '../lib/server/validation.ts';

const valid = { lat: 3.1223, lng: 101.658, kind: 'broken_surface' };

test('report validation preserves a pedestrian report and normalizes its notes', () => {
    assert.deepEqual(validateReport({ ...valid, edge_id: 11, description: '  Cracked pavement  ', reported_by_proxy: true }), {
        ...valid, edge_id: 11, description: 'Cracked pavement', reported_by_proxy: true,
    });
});

for (const [name, input] of [
    ['missing body', null], ['array body', []], ['missing coordinates', { kind: 'blocked' }],
    ['latitude out of range', { ...valid, lat: 91 }], ['longitude out of range', { ...valid, lng: -181 }],
    ['nonfinite coordinate', { ...valid, lat: Infinity }], ['string coordinates', { ...valid, lat: '3.12' }],
    ['unsupported problem', { ...valid, kind: 'car_traffic' }], ['invalid edge', { ...valid, edge_id: -1 }],
    ['fractional edge', { ...valid, edge_id: 1.5 }], ['oversized notes', { ...valid, description: 'a'.repeat(2001) }],
    ['nontext notes', { ...valid, description: {} }], ['invalid proxy flag', { ...valid, reported_by_proxy: 'yes' }],
]) {
    test(`invalid reports are rejected: ${name}`, () => {
        assert.throws(() => validateReport(input), (error) => error instanceof RequestError && error.status === 400);
    });
}

test('missing optional fields have predictable defaults', () => {
    const result = validateReport(valid);
    assert.equal(result.description, '');
    assert.equal(result.reported_by_proxy, false);
    assert.equal(result.edge_id, undefined);
});

test('report IDs accept database identifiers and reject query injection', () => {
    assert.equal(validateReportId('123'), '123');
    for (const id of ['0', '-1', '1.5', "1 OR 1=1", 'nope', '9'.repeat(19)]) {
        assert.throws(() => validateReportId(id), RequestError);
    }
});
