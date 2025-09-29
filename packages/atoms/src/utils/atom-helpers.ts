/**
 * Utility functions for atoms package
 */

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { playSound, type SoundType } from "@tasktrove/dom-utils/audio";
import { toast } from "@tasktrove/dom-utils/toast";
import { showServiceWorkerNotification } from "@tasktrove/dom-utils/notifications";

// Storage key prefix for the app
export const STORAGE_PREFIX = "tasktrove-";

/**
 * Creates an atom with localStorage persistence
 * @param key - Storage key (will be prefixed with STORAGE_PREFIX)
 * @param initialValue - Initial value for the atom
 * @param options - Additional options for storage
 */
export function createAtomWithStorage<T>(
  key: string,
  initialValue: T,
  options?: {
    getOnInit?: boolean;
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  },
) {
  // Use default localStorage for Jotai, but wrap in SSR check
  if (typeof window === "undefined") {
    // Return a simple atom for SSR
    return atom(initialValue);
  }

  return atomWithStorage(
    `${STORAGE_PREFIX}${key}`,
    initialValue,
    undefined, // Use default localStorage
    options,
  );
}

// Simple logging function - could be replaced with proper logging later
export const log = {
  info: (...args: any[]) => console.log(...args),
  warn: (...args: any[]) => console.warn(...args),
  error: (...args: any[]) => console.error(...args),
};

// Simple date filter function - this should be moved to @tasktrove/utils
export function matchesDueDateFilter(
  dueDate: Date | null,
  completed: boolean,
  preset: string,
  customRange: any,
): boolean {
  // For now, return true to not break functionality
  // TODO: Move proper implementation from web app to @tasktrove/utils
  return true;
}

// Simple error handler
export function handleAtomError(error: any, context?: string) {
  console.error(`Atom error${context ? ` in ${context}` : ""}:`, error);
}

/**
 * Atom for playing sounds with DOM environment support
 * Automatically handles browser compatibility and Web Audio API
 */
export const playSoundAtom = atom(
  null,
  async (
    get,
    _set,
    { soundType, volume = 1.0 }: { soundType: SoundType; volume?: number },
  ) => {
    try {
      // Check if we're in a DOM environment
      if (typeof window === "undefined") {
        // Server-side rendering or non-DOM environment
        return;
      }

      await playSound(soundType, volume);
    } catch (error) {
      console.warn(`Failed to play ${soundType} sound:`, error);
    }
  },
);
playSoundAtom.debugLabel = "playSoundAtom";

// Re-export toast from dom-utils with DOM environment support
export { toast };

// Re-export service worker notification from dom-utils with DOM environment support
export { showServiceWorkerNotification };
