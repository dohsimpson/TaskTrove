/**
 * Custom hook for playing sounds in TaskTrove
 */

import { useAtomValue } from "jotai"
import { useCallback } from "react"
import { soundSettingsAtom } from "@/lib/atoms/ui/sound-settings-atom"
import {
  playInteractionSound,
  playTaskCompleteSound,
  playErrorSound,
  playAchievementSound,
  playInteractionSoundSequence,
} from "@/lib/utils/sound-player"
import type { InteractionType } from "@/lib/utils/audio-suites"

export function useSound() {
  const settings = useAtomValue(soundSettingsAtom)

  const playSound = useCallback(
    async (interaction: InteractionType) => {
      await playInteractionSound(interaction, settings)
    },
    [settings],
  )

  const playTaskComplete = useCallback(async () => {
    await playTaskCompleteSound(settings)
  }, [settings])

  const playError = useCallback(async () => {
    await playErrorSound(settings)
  }, [settings])

  const playAchievement = useCallback(async () => {
    await playAchievementSound(settings)
  }, [settings])

  const playSoundSequence = useCallback(
    async (interactions: InteractionType[], delayMs?: number) => {
      await playInteractionSoundSequence(interactions, settings, delayMs)
    },
    [settings],
  )

  return {
    playSound,
    playTaskComplete,
    playError,
    playAchievement,
    playSoundSequence,
    soundEnabled: settings.enabled,
    currentSuite: settings.suite,
    volume: settings.volume,
  }
}
