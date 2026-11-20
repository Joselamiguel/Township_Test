import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_NEEDS } from '../lib/walking.ts';
import { applyAnswers, answersFrom, defaultAnswers, profileSummary, shouldOfferSetup } from '../lib/walking-profile.ts';
import { PROFILES } from '../lib/routing.ts';

test('wheelchair users are always routed step-free, even if the box was left unticked', () => {
    const { profile, needs } = applyAnswers({ ...defaultAnswers('wheelchair'), stepFree: false });
    assert.equal(profile, 'wheelchair');
    assert.equal(needs.step_free, true);
});

test('everyday walkers get their own profile at a typical adult pace', () => {
    const { profile, needs } = applyAnswers(defaultAnswers('everyday'));
    assert.equal(profile, 'everyday');
    assert.equal(needs.speed_mps, null);
    assert.ok(PROFILES.everyday.speed_mps > PROFILES.senior.speed_mps);
    assert.equal(PROFILES.everyday.hard_steps, false);
    assert.equal(answersFrom(profile, needs).walker, 'everyday');
    assert.equal(profileSummary(profile, needs).title, 'Everyday walker');
});

test('an older save of a fast senior is read back as an everyday walker', () => {
    assert.equal(answersFrom('senior', { ...DEFAULT_NEEDS, speed_mps: 1.25 }).walker, 'everyday');
    assert.equal(answersFrom('senior', { ...DEFAULT_NEEDS, speed_mps: 0.8 }).walker, 'senior');
});

test('answers fill in the planner needs and keep settings the setup does not ask about', () => {
    const previous = { ...DEFAULT_NEEDS, verified_only: true, rest_duration_min: 4, rest_armrests: true };
    const { needs } = applyAnswers({ ...defaultAnswers('cane_walker'), rests: true, restEveryMin: 10, seatWithBack: true, sheltered: true, budgetMin: 60, maxSlope: 5 }, previous);
    assert.equal(needs.require_rests, true);
    assert.equal(needs.rest_interval_min, 10);
    assert.equal(needs.rest_backrest, true);
    assert.equal(needs.rest_shelter, true);
    assert.equal(needs.budget_min, 60);
    assert.equal(needs.max_slope_pct, 5);
    assert.equal(needs.verified_only, true);
    assert.equal(needs.rest_duration_min, 4);
    assert.equal(needs.rest_armrests, true);
});

test('seat preferences are cleared when rest stops are turned off', () => {
    const { needs } = applyAnswers({ ...defaultAnswers('senior'), rests: false, seatWithBack: true, sheltered: true });
    assert.equal(needs.rest_backrest, false);
    assert.equal(needs.rest_shelter, false);
});

test('a calibrated pace is kept when the walker stays the same, and reset when it changes', () => {
    const previous = { ...DEFAULT_NEEDS, speed_mps: 0.65 };
    assert.equal(applyAnswers(defaultAnswers('cane_walker'), previous, 'cane_walker').needs.speed_mps, 0.65);
    assert.equal(applyAnswers(defaultAnswers('wheelchair'), previous, 'cane_walker').needs.speed_mps, null);
});

test('saving and reading back gives the same answers', () => {
    for (const walker of ['everyday', 'senior', 'cane_walker', 'wheelchair']) {
        const answers = { ...defaultAnswers(walker), rests: true, restEveryMin: 15, budgetMin: 90 };
        const { profile, needs } = applyAnswers(answers);
        const back = answersFrom(profile, needs);
        assert.equal(back.walker, walker);
        assert.equal(back.restEveryMin, 15);
        assert.equal(back.budgetMin, 90);
    }
});

test('the summary lists what the routes will respect', () => {
    const { profile, needs } = applyAnswers({ ...defaultAnswers('wheelchair'), rests: true, restEveryMin: 10 });
    const { title, details } = profileSummary(profile, needs);
    assert.equal(title, 'Wheelchair user');
    assert.match(details, /step-free/);
    assert.match(details, /rests every 10 min/);
});

test('setup is offered once, and not when a shared walk link brings its own settings', () => {
    assert.equal(shouldOfferSetup(null, false), true);
    assert.equal(shouldOfferSetup('done', false), false);
    assert.equal(shouldOfferSetup('skipped', false), false);
    assert.equal(shouldOfferSetup(null, true), false);
});
