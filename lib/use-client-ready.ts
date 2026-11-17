'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Defer browser-only initial state until hydration has completed. */
export function useClientReady() {
    return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
