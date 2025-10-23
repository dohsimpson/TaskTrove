/**
 * Audio playback atoms
 * Separated from atom-helpers to avoid circular dependency with settingsAtom
 */

import { atom } from "jotai";
import { playSound, type SoundType } from "@tasktrove/dom-utils/audio";
import { namedAtom } from "@tasktrove/atoms/utils/atom-helpers";
import { settingsAtom } from "@tasktrove/atoms/data/base/atoms";

/**
 * Atom for playing sounds with DOM environment support
 * Automatically handles browser compatibility and Web Audio API
 * Respects user settings for sound enabled/disabled
 */
export const playSoundAtom = namedAtom(
  "playSoundAtom",
  atom(
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

        // Check if sound is enabled in settings
        const settings = get(settingsAtom);
        const generalSettings = settings.general;
        if (!generalSettings.soundEnabled) return;

        await playSound(soundType, volume);
      } catch (error) {
        console.warn(`Failed to play ${soundType} sound:`, error);
      }
    },
  ),
);
