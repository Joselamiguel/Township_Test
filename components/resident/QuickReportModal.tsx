'use client';

import { useState } from 'react';
import { Sun, Lightbulb, AlertTriangle, Accessibility, CheckCircle2, X } from 'lucide-react';
import { submitReport } from '@/lib/api';
import type { HazardKind } from '@/lib/routing';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmitted: () => void;
    coords?: [number, number];
}

export default function QuickReportModal({ isOpen, onClose, onSubmitted, coords }: Props) {
    const [category, setCategory] = useState<HazardKind | null>(null);
    const [description, setDescription] = useState('');
    const [isProxy, setIsProxy] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!category) return;

        setLoading(true);
        setError(null);
        try {
            const location = coords ?? await new Promise<[number, number]>((resolve, reject) => {
                if (!navigator.geolocation) return reject(new Error('Location access is needed to place this report.'));
                navigator.geolocation.getCurrentPosition(
                    (position) => resolve([position.coords.latitude, position.coords.longitude]),
                    () => reject(new Error('Enable location access to place this report on a footpath.')),
                    { timeout: 10000 },
                );
            });
            await submitReport({ lat: location[0], lng: location[1], kind: category, description, reported_by_proxy: isProxy });
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setCategory(null);
                setDescription('');
                onSubmitted();
                onClose();
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'We could not send the report. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative animate-in slide-in-from-bottom duration-200">
                <button onClick={onClose} aria-label="Close report" className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
                    <X className="w-6 h-6" />
                </button>

                {success ? (
                    <div className="py-8 text-center space-y-3">
                        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                        <h3 className="text-xl font-bold text-slate-900">Report Submitted!</h3>
                        <p className="text-sm text-slate-500">Township management has received your location flag.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <h2 className="text-xl font-extrabold text-slate-900">Snap & Flag Walking Issue</h2>
                            <p className="text-xs text-slate-500 mt-1">Tap an issue icon to notify SDP township maintenance.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'no_shade', label: 'Extreme Heat / No Shade', icon: Sun, color: 'border-amber-200 bg-amber-50 text-amber-700' },
                                { id: 'light_out', label: 'Broken Streetlight', icon: Lightbulb, color: 'border-blue-200 bg-blue-50 text-blue-700' },
                                { id: 'broken_surface', label: 'Uneven Walkway', icon: AlertTriangle, color: 'border-rose-200 bg-rose-50 text-rose-700' },
                                { id: 'no_ramp', label: 'Missing Kerb Ramp', icon: Accessibility, color: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
                            ].map((item) => {
                                const Icon = item.icon;
                                const isSelected = category === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setCategory(item.id as HazardKind)}
                                        className={`p-4 rounded-2xl border-2 text-left flex flex-col justify-between h-28 transition-all ${isSelected ? 'border-emerald-600 ring-2 ring-emerald-600/20 bg-emerald-50/50' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                                            }`}
                                    >
                                        <Icon className={`w-6 h-6 ${item.color.split(' ')[2]}`} />
                                        <span className="text-xs font-bold text-slate-800 leading-tight">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <textarea
                            placeholder="Add details (optional e.g., near shoplot entrance)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            rows={2}
                        />

                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                            <input
                                type="checkbox"
                                checked={isProxy}
                                onChange={(e) => setIsProxy(e.target.checked)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>Filing as Caregiver / Volunteer on behalf of senior</span>
                        </label>

                        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

                        <button
                            type="submit"
                            disabled={!category || loading}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition"
                        >
                            {loading ? 'Submitting...' : 'Send Location Flag'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
