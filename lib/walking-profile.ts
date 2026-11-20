import { DEFAULT_NEEDS, type WalkingNeeds } from './walking.ts';
import type { Profile } from './routing.ts';

/**
 * First-run walking profile. The answers map onto the planner's existing profile and walking needs,
 * so a saved profile is just the usual settings, filled in once and reused for every walk.
 */

export type Walker = Profile | 'everyday';
export type SlopeLimit = 5 | 8 | 12;

export interface ProfileAnswers {
    walker: Walker;
    stepFree: boolean;
    markedCrossings: boolean;
    smoothSurfaces: boolean;
    rests: boolean;
    restEveryMin: 5 | 10 | 15;
    seatWithBack: boolean;
    sheltered: boolean;
    budgetMin: 15 | 30 | 60 | 90 | 120;
    maxSlope: SlopeLimit;
}

export const WALKERS: { id: Walker; label: string; hint: string }[] = [
    { id: 'everyday', label: 'None of these', hint: 'I walk at an everyday pace' },
    { id: 'senior', label: 'Older walker', hint: 'I take it a bit slower' },
    { id: 'cane_walker', label: 'Cane or walking frame', hint: 'Steps and long stretches are hard' },
    { id: 'wheelchair', label: 'Wheelchair user', hint: 'I need step-free paths and ramps' },
];

/** The planner has no everyday profile; it uses the senior profile with a typical adult pace instead. */
export const EVERYDAY_PACE_MPS = 1.25;
const EVERYDAY_MIN_MPS = 1.1;

export const SETUP_KEY = 'townshipgo:profile-setup:v1';

export function defaultAnswers(walker: Walker = 'everyday'): ProfileAnswers {
    const wheelchair = walker === 'wheelchair';
    const slow = walker === 'cane_walker' || walker === 'senior';
    return {
        walker, stepFree: wheelchair, markedCrossings: slow || wheelchair, smoothSurfaces: wheelchair || walker === 'cane_walker',
        rests: walker === 'cane_walker', restEveryMin: walker === 'cane_walker' ? 5 : 10, seatWithBack: walker === 'cane_walker', sheltered: false,
        budgetMin: walker === 'everyday' ? 30 : 15, maxSlope: wheelchair ? 5 : 8,
    };
}

/** Turns the answers into the planner's profile and needs. Wheelchair users are always step-free. */
export function applyAnswers(answers: ProfileAnswers, previous: WalkingNeeds = DEFAULT_NEEDS, previousWalker?: Walker): { profile: Profile; needs: WalkingNeeds } {
    const profile: Profile = answers.walker === 'everyday' ? 'senior' : answers.walker;
    // Keep a pace the person calibrated, unless they changed who is walking.
    const speed = answers.walker === 'everyday' ? EVERYDAY_PACE_MPS
        : previousWalker === answers.walker ? previous.speed_mps : null;
    return {
        profile,
        needs: {
            ...previous,
            step_free: answers.walker === 'wheelchair' || answers.stepFree,
            avoid_uncontrolled_crossings: answers.markedCrossings,
            avoid_uneven_surfaces: answers.smoothSurfaces,
            require_rests: answers.rests,
            rest_interval_min: answers.restEveryMin,
            rest_backrest: answers.rests && answers.seatWithBack,
            rest_shelter: answers.rests && answers.sheltered,
            budget_min: answers.budgetMin,
            max_slope_pct: answers.maxSlope,
            speed_mps: speed,
        },
    };
}

/** Reads the current settings back as answers, so editing the profile starts from what is set now. */
export function answersFrom(profile: Profile, needs: WalkingNeeds): ProfileAnswers {
    const walker: Walker = profile === 'senior' && (needs.speed_mps ?? 0) >= EVERYDAY_MIN_MPS ? 'everyday' : profile;
    const nearest = <T extends number>(value: number, options: readonly T[]) =>
        options.reduce((best, option) => Math.abs(option - value) < Math.abs(best - value) ? option : best, options[0]);
    return {
        walker, stepFree: needs.step_free, markedCrossings: needs.avoid_uncontrolled_crossings, smoothSurfaces: needs.avoid_uneven_surfaces,
        rests: needs.require_rests, restEveryMin: nearest(needs.rest_interval_min, [5, 10, 15] as const),
        seatWithBack: needs.rest_backrest, sheltered: needs.rest_shelter,
        budgetMin: nearest(needs.budget_min, [15, 30, 60, 90, 120] as const), maxSlope: nearest(needs.max_slope_pct, [5, 8, 12] as const),
    };
}

/** Short line for the "Walking as" card, e.g. "Wheelchair user · step-free · rests every 10 min". */
export function profileSummary(profile: Profile, needs: WalkingNeeds): { title: string; details: string } {
    const answers = answersFrom(profile, needs);
    const title = WALKERS.find(walker => walker.id === answers.walker)?.label ?? 'Walker';
    const parts = [
        needs.step_free && 'step-free',
        needs.avoid_uncontrolled_crossings && 'marked crossings',
        needs.avoid_uneven_surfaces && 'smooth paths',
        needs.require_rests && `rests every ${needs.rest_interval_min} min`,
        `up to ${needs.budget_min} min`,
    ].filter(Boolean) as string[];
    return { title: answers.walker === 'everyday' ? 'Everyday walker' : title, details: parts.join(' · ') };
}

/** Whether the first-run setup should open: never set up, and not opening a shared walk that brings its own settings. */
export function shouldOfferSetup(storedFlag: string | null, linkHasSettings: boolean): boolean {
    return storedFlag === null && !linkHasSettings;
}
