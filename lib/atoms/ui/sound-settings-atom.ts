import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

/**
 * Sound settings stored in localStorage
 */
export interface SoundSettings {
  enabled: boolean
  suite: string
  volume: number
  interactions: {
    taskComplete: boolean
    taskCreate: boolean
    taskDelete: boolean
    projectSwitch: boolean
    achievementUnlock: boolean
    error: boolean
    // Add more as needed
  }
}

/**
 * Default sound settings
 */
const defaultSoundSettings: SoundSettings = {
  enabled: true,
  suite: "minimalist",
  volume: 0.3,
  interactions: {
    taskComplete: true,
    taskCreate: true,
    taskDelete: true,
    projectSwitch: true,
    achievementUnlock: true,
    error: true,
  },
}

/**
 * Sound settings atom with localStorage persistence
 */
export const soundSettingsAtom = atomWithStorage<SoundSettings>(
  "tasktrove-sound-settings",
  defaultSoundSettings,
)

/**
 * Action atom to toggle sound on/off
 */
export const toggleSoundAtom = atom(null, (get, set) => {
  const settings = get(soundSettingsAtom)
  set(soundSettingsAtom, {
    ...settings,
    enabled: !settings.enabled,
  })
})

/**
 * Action atom to change sound suite
 */
export const changeSoundSuiteAtom = atom(null, (get, set, suite: string) => {
  const settings = get(soundSettingsAtom)
  set(soundSettingsAtom, {
    ...settings,
    suite,
  })
})

/**
 * Action atom to change volume
 */
export const changeSoundVolumeAtom = atom(null, (get, set, volume: number) => {
  const settings = get(soundSettingsAtom)
  set(soundSettingsAtom, {
    ...settings,
    volume: Math.max(0, Math.min(1, volume)),
  })
})

/**
 * Action atom to toggle specific interaction sound
 */
export const toggleInteractionSoundAtom = atom(
  null,
  (get, set, interaction: keyof SoundSettings["interactions"]) => {
    const settings = get(soundSettingsAtom)
    set(soundSettingsAtom, {
      ...settings,
      interactions: {
        ...settings.interactions,
        [interaction]: !settings.interactions[interaction],
      },
    })
  },
)
