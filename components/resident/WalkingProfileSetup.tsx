'use client';

import { useEffect, useRef, useState } from 'react';
import { Accessibility, ArrowLeft, Armchair, Check, Clock, Footprints, PersonStanding, Waves, TrafficCone, Umbrella, Mountain, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { WALKERS, defaultAnswers, type ProfileAnswers, type Walker } from '@/lib/walking-profile';

const WALKER_ICON: Record<Walker, LucideIcon> = { everyday: Footprints, senior: PersonStanding, cane_walker: PersonStanding, wheelchair: Accessibility };
const STEPS = ['Who is walking?', 'Do you need any of these?', 'Your usual walk'] as const;

interface Props {
    initial: ProfileAnswers;
    /** First run shows "Skip for now"; editing later shows a close button instead. */
    firstRun: boolean;
    onSave: (answers: ProfileAnswers) => void;
    onClose: () => void;
}

function Toggle({ checked, disabled, onChange, Icon, title, hint }: { checked: boolean; disabled?: boolean; onChange: (value: boolean) => void; Icon: LucideIcon; title: string; hint: string }) {
    return (
        <button type="button" role="checkbox" aria-checked={checked} disabled={disabled} className="tg-setup-option" onClick={() => onChange(!checked)}>
            <Icon size={22} aria-hidden />
            <span><strong>{title}</strong><small>{hint}</small></span>
            <span className="tg-setup-tick" aria-hidden>{checked && <Check size={16} />}</span>
        </button>
    );
}

function Chips<T extends number>({ label, value, options, format, onChange }: { label: string; value: T; options: readonly T[]; format: (value: T) => string; onChange: (value: T) => void }) {
    return (
        <div role="radiogroup" aria-label={label} className="tg-setup-chips">
            {options.map(option => <button key={option} type="button" role="radio" aria-checked={value === option} onClick={() => onChange(option)}>{format(option)}</button>)}
        </div>
    );
}

export default function WalkingProfileSetup({ initial, firstRun, onSave, onClose }: Props) {
    const dialog = useRef<HTMLDialogElement>(null);
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<ProfileAnswers>(initial);
    const set = <K extends keyof ProfileAnswers>(key: K, value: ProfileAnswers[K]) => setAnswers(current => ({ ...current, [key]: value }));
    const wheelchair = answers.walker === 'wheelchair';

    useEffect(() => {
        const element = dialog.current;
        element?.showModal();
        return () => element?.close();
    }, []);

    function chooseWalker(walker: Walker) {
        // A different walker starts from that walker's usual needs; the next step lets them adjust.
        setAnswers(current => walker === current.walker ? current : { ...defaultAnswers(walker), budgetMin: current.budgetMin });
    }

    const last = step === STEPS.length - 1;
    return (
        <dialog ref={dialog} className="tg-setup" aria-labelledby="tg-setup-title" onCancel={event => { event.preventDefault(); onClose(); }}>
            <div className="tg-setup-panel">
                <div className="tg-setup-top">
                    {step > 0
                        ? <button type="button" className="tg-close" aria-label="Previous question" onClick={() => setStep(step - 1)}><ArrowLeft size={20} aria-hidden /></button>
                        : <span className="tg-setup-spacer" />}
                    <ol className="tg-setup-dots" aria-label={`Question ${step + 1} of ${STEPS.length}`}>
                        {STEPS.map((title, index) => <li key={title} data-done={index <= step} />)}
                    </ol>
                    {firstRun
                        ? <button type="button" className="tg-text-action" onClick={onClose}>Skip for now</button>
                        : <button type="button" className="tg-close" aria-label="Close without saving" onClick={onClose}><X size={20} aria-hidden /></button>}
                </div>

                <div className="tg-setup-body" key={step}>
                    {step === 0 && firstRun && <p className="tg-setup-kicker">Welcome to TownshipGo</p>}
                    <h2 id="tg-setup-title" className="tg-h2">{STEPS[step]}</h2>

                    {step === 0 && <>
                        <p className="tg-small">We’ll use this for every walk, so you don’t have to set it each time.</p>
                        <div role="radiogroup" aria-label="Who is walking" className="tg-stack">
                            {WALKERS.map(({ id, label, hint }) => {
                                const Icon = WALKER_ICON[id];
                                return <button key={id} type="button" role="radio" aria-checked={answers.walker === id} className="tg-setup-option" onClick={() => chooseWalker(id)}>
                                    <Icon size={24} aria-hidden /><span><strong>{label}</strong><small>{hint}</small></span>
                                    <span className="tg-setup-tick tg-setup-radio" aria-hidden>{answers.walker === id && <Check size={16} />}</span>
                                </button>;
                            })}
                        </div>
                    </>}

                    {step === 1 && <div className="tg-stack">
                        <p className="tg-small">Routes will avoid what doesn’t work for you. Choose any that apply.</p>
                        <Toggle Icon={Accessibility} title="No stairs" hint={wheelchair ? 'Always on for wheelchair users' : 'Step-free paths and entrances'}
                            checked={wheelchair || answers.stepFree} disabled={wheelchair} onChange={value => set('stepFree', value)} />
                        <Toggle Icon={TrafficCone} title="Safe crossings" hint="Use marked or signalised crossings" checked={answers.markedCrossings} onChange={value => set('markedCrossings', value)} />
                        <Toggle Icon={Waves} title="Smooth, even paths" hint="Avoid broken or uneven surfaces" checked={answers.smoothSurfaces} onChange={value => set('smoothSurfaces', value)} />
                        <Toggle Icon={Armchair} title="Regular rest stops" hint="Plan around benches and seats" checked={answers.rests} onChange={value => set('rests', value)} />
                        {answers.rests && <div className="tg-setup-sub">
                            <p className="tg-label">Rest at least every</p>
                            <Chips label="Rest interval" value={answers.restEveryMin} options={[5, 10, 15] as const} format={value => `${value} min`} onChange={value => set('restEveryMin', value)} />
                            <Toggle Icon={Armchair} title="Seat with a backrest" hint="Skip benches without one" checked={answers.seatWithBack} onChange={value => set('seatWithBack', value)} />
                            <Toggle Icon={Umbrella} title="Sheltered seats" hint="Rest out of the sun and rain" checked={answers.sheltered} onChange={value => set('sheltered', value)} />
                        </div>}
                    </div>}

                    {step === 2 && <div className="tg-stack">
                        <p className="tg-label flex items-center gap-2"><Clock size={18} aria-hidden /> How long is a comfortable walk for you?</p>
                        <Chips label="Longest walk" value={answers.budgetMin} options={[15, 30, 60, 90, 120] as const}
                            format={value => value < 60 ? `${value} min` : `${value / 60 === 1 ? '1 hr' : value === 90 ? '1½ hr' : '2 hr'}`} onChange={value => set('budgetMin', value)} />
                        {answers.walker !== 'everyday' && <>
                            <p className="tg-label flex items-center gap-2 mt-2"><Mountain size={18} aria-hidden /> How steep can a slope be?</p>
                            <Chips label="Steepest slope" value={answers.maxSlope} options={[5, 8, 12] as const}
                                format={value => value === 5 ? 'Gentle only' : value === 8 ? 'Standard ramp' : 'Steeper is OK'} onChange={value => set('maxSlope', value)} />
                        </>}
                        <p className="tg-note">You can change any of this later by tapping <strong>Walking as…</strong> on the plan screen.</p>
                    </div>}
                </div>

                <button type="button" className="tg-btn tg-btn-primary" onClick={() => last ? onSave(answers) : setStep(step + 1)}>
                    {last ? 'Save my walking profile' : 'Next'}
                </button>
            </div>
        </dialog>
    );
}
