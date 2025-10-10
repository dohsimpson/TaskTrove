/**
 * App refresh trigger atom for triggering re-renders on visibility changes
 */
import { atom } from "jotai";

/**
 * Stores a timestamp that gets updated when app should refresh
 * Updated when the page becomes visible and certain conditions are met
 * (e.g., date changed, settings updated, new version available, etc.)
 * Components can subscribe to this atom to trigger re-renders
 */
export const appRefreshTriggerAtom = atom<number>(Date.now());
