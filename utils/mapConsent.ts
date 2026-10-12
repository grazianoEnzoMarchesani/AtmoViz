import { useSyncExternalStore } from 'react';

// Consent to load the base map from OpenFreeMap (tiles + fonts). Until it is granted the app
// makes no request to any third party. The choice is kept in localStorage for six months.
// If the privacy notice's storage section changes, change it there in the same commit.

export type MapConsent = 'unset' | 'granted' | 'denied';

const KEY = 'atmoviz.mapConsent';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 183;

const read = (): MapConsent => {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return 'unset';
    const { value, at } = JSON.parse(raw) as { value: MapConsent; at: number };
    if ((value !== 'granted' && value !== 'denied') || Date.now() - at > MAX_AGE_MS) return 'unset';
    return value;
  } catch {
    return 'unset';
  }
};

let current: MapConsent = read();
const listeners = new Set<() => void>();

export const setMapConsent = (value: 'granted' | 'denied') => {
  current = value;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ value, at: Date.now() }));
  } catch {
    // Storage blocked: the choice still holds until the tab is closed
  }
  listeners.forEach(l => l());
};

export const useMapConsent = (): MapConsent =>
  useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb); },
    () => current,
  );
