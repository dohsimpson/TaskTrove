/**
 * Sound player utility that integrates sound suites with user settings
 */

import { playSoundFromDefinition } from "./audio"
import { getSoundFromSuite, type InteractionType } from "./audio-suites"
import type { SoundSettings } from "@/lib/atoms/ui/sound-settings-atom"
import { log } from "@/lib/utils/logger"

/**
 * Play a sound for a specific interaction based on user settings
 */
export const playInteractionSound = async (
  interaction: InteractionType,
  settings: SoundSettings,
) => {
  // Check if sounds are enabled globally
  if (!settings.enabled) return

  // Check if this specific interaction is enabled
  // Type-safe interaction key access - only check for interactions that exist in settings
  if (interaction in settings.interactions) {
    // Use a type guard to safely narrow the type
    const hasInteractionSetting = (key: string): key is keyof typeof settings.interactions => {
      return key in settings.interactions
    }

    if (hasInteractionSetting(interaction)) {
      const interactionEnabled = settings.interactions[interaction]
      if (interactionEnabled === false) return
    }
  }
  // Note: Some interactions like 'ambient' may not have settings toggles
  // They're controlled by the global 'enabled' setting only

  // Get the sound definition from the selected suite
  const soundDef = getSoundFromSuite(settings.suite, interaction)
  if (!soundDef) {
    log.warn(
      { interaction, suite: settings.suite, module: "sound" },
      `No sound defined for ${interaction} in ${settings.suite} suite`,
    )
    return
  }

  // Play the sound with user's volume setting
  try {
    await playSoundFromDefinition(soundDef, settings.volume)
  } catch (error) {
    log.warn({ interaction, error, module: "sound" }, `Failed to play ${interaction} sound`)
  }
}

/**
 * Helper to play task complete sound with special handling
 */
export const playTaskCompleteSound = async (settings: SoundSettings) => {
  await playInteractionSound("taskComplete", settings)
}

/**
 * Helper to play error sound
 */
export const playErrorSound = async (settings: SoundSettings) => {
  await playInteractionSound("error", settings)
}

/**
 * Helper to play achievement sound
 */
export const playAchievementSound = async (settings: SoundSettings) => {
  await playInteractionSound("achievementUnlock", settings)
}

/**
 * Batch play multiple sounds with slight delays
 */
export const playInteractionSoundSequence = async (
  interactions: InteractionType[],
  settings: SoundSettings,
  delayMs: number = 100,
) => {
  for (let i = 0; i < interactions.length; i++) {
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    await playInteractionSound(interactions[i], settings)
  }
}
