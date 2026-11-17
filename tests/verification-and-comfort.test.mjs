import assert from 'node:assert/strict';
import test from 'node:test';
import {evidenceFor,openingAt} from '../lib/verification.ts';
import {parseWeather,unavailableWeather,forecastAt,fromMalaysiaInput,malaysiaInput} from '../lib/comfort.ts';
import {record,AT} from './helpers/journey-fixture.mjs';

test('the newest observation for each field wins without erasing other fields',()=>{
    const old=record('path',1,{path_open:true,slope_pct:2});const recent=record('path',1,{path_open:false},{status:'reported',observed_at:'2026-11-16T00:00:00Z'});
    const evidence=evidenceFor([old,recent],'path',1,AT);
    assert.equal(evidence.path_open.value,false);assert.equal(evidence.path_open.status,'reported');assert.equal(evidence.slope_pct.value,2);
});
test('expired and future observations are not current verified evidence',()=>{
    const expired=record('path',1,{has_steps:false},{valid_until:'2026-11-16T00:00:00Z'});
    const future=record('path',1,{has_steps:true},{observed_at:'2026-11-18T00:00:00Z'});
    const e=evidenceFor([expired,future],'path',1,AT);assert.equal(e.has_steps.value,false);assert.equal(e.has_steps.status,'stale');
});
test('Malaysia opening hours handle weekdays, overnight periods and unknown formats',()=>{
    assert.equal(openingAt('24/7',AT),true);assert.equal(openingAt('Mo-Fr 09:00-17:00',AT),true);
    assert.equal(openingAt('Sa 09:00-17:00',AT),false);assert.equal(openingAt('Mo 22:00-06:00','2026-11-16T21:00:00Z'),true);
    assert.equal(openingAt('Mo-Fr 09:00-17:00; PH off',AT),null);assert.equal(openingAt('sunrise-sunset',AT),null);
    assert.equal(openingAt('09:00-25:00',AT),null);assert.equal(openingAt('',AT),null);
});
test('weather outages carry no invented temperatures or forecasts',()=>{
    const weather=unavailableWeather(AT);assert.equal(weather.source,'unavailable');assert.equal(weather.feels_like_c,null);
    assert.deepEqual(weather.hourly,[]);assert.equal(forecastAt(weather,AT),null);
});
test('forecast selection uses departure hour and refuses unavailable hours',()=>{
    const weather=parseWeather({current:{temperature_2m:30,apparent_temperature:34,time:'2026-11-17T09:00'},hourly:{time:['2026-11-17T09:00','2026-11-17T10:00'],temperature_2m:[30,32],apparent_temperature:[34,37],precipitation_probability:[20,80],precipitation:[0,2]}},AT);
    assert.equal(forecastAt(weather,'2026-11-17T01:30:00Z').feels_like_c,34);assert.equal(forecastAt(weather,'2026-11-17T02:30:00Z').rain_probability,80);
    assert.equal(forecastAt(weather,'2026-11-18T01:30:00Z'),null);
});
test('departure controls round-trip explicit Malaysian time',()=>{
    assert.equal(malaysiaInput(AT),'2026-11-17T09:00');assert.equal(fromMalaysiaInput('2026-11-17T09:00'),AT);
    assert.equal(fromMalaysiaInput('nonsense'),null);
});
