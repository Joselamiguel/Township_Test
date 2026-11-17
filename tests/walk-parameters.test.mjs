import assert from 'node:assert/strict';
import test from 'node:test';
import { readWalkParameters } from '../lib/walk-parameters.ts';

const destinations = ['lrt_universiti', 'kl_gateway_mall'];
const origin = [3.1223, 101.6580];
const read = (query) => readWalkParameters(new URLSearchParams(query), destinations, origin);

test('a new walk uses the default origin, destination and profile', () => {
    assert.deepEqual(read(''), {
        origin, destination: destinations[0], profile: 'senior', mode: null, fromLink: false,
    });
});

test('a shared walk preserves its route mode, origin, destination and mobility profile', () => {
    assert.deepEqual(read('startLat=3.1&startLng=101.6&destId=kl_gateway_mall&profile=wheelchair&mode=direct'), {
        origin: [3.1, 101.6], destination: 'kl_gateway_mall', profile: 'wheelchair', mode: 'direct', fromLink: true,
    });
});

test('zero coordinates are valid', () => {
    assert.deepEqual(read('startLat=0&startLng=0').origin, [0, 0]);
});

for (const query of [
    'startLat=91&startLng=0',
    'startLat=0&startLng=-181',
    'startLat=Infinity&startLng=0',
    'startLat=oops&startLng=0',
    'startLat=0',
]) {
    test(`invalid coordinates fall back safely: ${query}`, () => {
        const result = read(query);
        assert.deepEqual(result.origin, origin);
        assert.equal(result.fromLink, false);
    });
}

test('unrecognized destinations, profiles and modes fall back safely', () => {
    const result = read('destId=unknown&profile=unknown&mode=unknown');
    assert.equal(result.destination, destinations[0]);
    assert.equal(result.profile, 'senior');
    assert.equal(result.mode, null);
    assert.equal(result.fromLink, false);
});
