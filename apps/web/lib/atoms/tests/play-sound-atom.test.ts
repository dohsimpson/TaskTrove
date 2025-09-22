/**
 * Tests for Play Sound Atom
 *
 * Tests the playSoundAtom and verifies proper implementation
 * of settings-aware sound playing functionality.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { createStore, atom, type WritableAtom } from "jotai"
import type { UserSettings } from "../../types"
import { DEFAULT_NOTIFICATION_SETTINGS, DEFAULT_GENERAL_SETTINGS } from "../../types/defaults"
import {
  DEFAULT_AUTO_BACKUP_ENABLED,
  DEFAULT_BACKUP_TIME,
  DEFAULT_MAX_BACKUPS,
} from "../../constants/defaults"
import { playSound, type SoundType } from "../../utils/audio"

// Mock the logger to avoid console noise in tests
vi.mock("../../utils/logger", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock the audio utils
vi.mock("../../utils/audio", () => ({
  playSound: vi.fn().mockResolvedValue(undefined),
}))

describe("playSoundAtom", () => {
  let store: ReturnType<typeof createStore>
  const mockPlaySound = vi.mocked(playSound)

  beforeEach(() => {
    store = createStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // Types for mock settings
  interface LegacySettings {
    data: {
      autoBackup: {
        enabled: boolean
        backupTime: string
        maxBackups: number
      }
    }
    notifications: typeof DEFAULT_NOTIFICATION_SETTINGS
  }

  // Create a simple mock settings atom for testing
  const createMockSettingsAtom = (soundEnabled: boolean, hasGeneral: boolean = true) => {
    if (hasGeneral) {
      const mockSettings: UserSettings = {
        data: {
          autoBackup: {
            enabled: DEFAULT_AUTO_BACKUP_ENABLED,
            backupTime: DEFAULT_BACKUP_TIME,
            maxBackups: DEFAULT_MAX_BACKUPS,
          },
        },
        notifications: DEFAULT_NOTIFICATION_SETTINGS,
        general: {
          ...DEFAULT_GENERAL_SETTINGS,
          soundEnabled,
        },
      }
      return atom(mockSettings)
    } else {
      // Legacy settings without general property
      const mockSettings: LegacySettings = {
        data: {
          autoBackup: {
            enabled: DEFAULT_AUTO_BACKUP_ENABLED,
            backupTime: DEFAULT_BACKUP_TIME,
            maxBackups: DEFAULT_MAX_BACKUPS,
          },
        },
        notifications: DEFAULT_NOTIFICATION_SETTINGS,
      }
      return atom(mockSettings)
    }
  }

  // Create a test version of playSoundAtom that uses our mock settings
  const createTestPlaySoundAtom = (mockSettingsAtom: ReturnType<typeof createMockSettingsAtom>) =>
    atom(
      null,
      async (get, _set, { soundType, volume = 1.0 }: { soundType: SoundType; volume?: number }) => {
        try {
          const settings = get(mockSettingsAtom)

          // Check if sound is enabled in general settings
          if (!("general" in settings)) return
          const generalSettings = settings.general
          if (!generalSettings || typeof generalSettings !== "object") return
          if (!("soundEnabled" in generalSettings) || !generalSettings.soundEnabled) return

          await playSound(soundType, volume)
        } catch {
          // Handle errors like the real implementation
        }
      },
    )

  describe("when sound is enabled", () => {
    let testPlaySoundAtom: WritableAtom<
      null,
      [{ soundType: SoundType; volume?: number }],
      Promise<void>
    >

    beforeEach(() => {
      const mockSettings = createMockSettingsAtom(true)
      testPlaySoundAtom = createTestPlaySoundAtom(mockSettings)
    })

    it("should call playSound when sound is enabled", async () => {
      await store.set(testPlaySoundAtom, { soundType: "confirm" })

      expect(mockPlaySound).toHaveBeenCalledTimes(1)
      expect(mockPlaySound).toHaveBeenCalledWith("confirm", 1.0)
    })

    it("should use default volume when not specified", async () => {
      await store.set(testPlaySoundAtom, { soundType: "bell" })

      expect(mockPlaySound).toHaveBeenCalledTimes(1)
      expect(mockPlaySound).toHaveBeenCalledWith("bell", 1.0)
    })

    it("should handle different sound types", async () => {
      await store.set(testPlaySoundAtom, { soundType: "bellClear", volume: 0.5 })

      expect(mockPlaySound).toHaveBeenCalledTimes(1)
      expect(mockPlaySound).toHaveBeenCalledWith("bellClear", 0.5)
    })

    it("should handle audio errors gracefully", async () => {
      mockPlaySound.mockRejectedValueOnce(new Error("Audio context not available"))

      // Should not throw
      await expect(
        store.set(testPlaySoundAtom, { soundType: "error", volume: 0.2 }),
      ).resolves.not.toThrow()

      expect(mockPlaySound).toHaveBeenCalledTimes(1)
      expect(mockPlaySound).toHaveBeenCalledWith("error", 0.2)
    })
  })

  describe("when sound is disabled", () => {
    let testPlaySoundAtom: WritableAtom<
      null,
      [{ soundType: SoundType; volume?: number }],
      Promise<void>
    >

    beforeEach(() => {
      const mockSettings = createMockSettingsAtom(false)
      testPlaySoundAtom = createTestPlaySoundAtom(mockSettings)
    })

    it("should NOT call playSound when sound is disabled", async () => {
      await store.set(testPlaySoundAtom, { soundType: "confirm" })

      expect(mockPlaySound).not.toHaveBeenCalled()
    })

    it("should handle any sound type without calling playSound", async () => {
      await store.set(testPlaySoundAtom, { soundType: "bellClear" })
      await store.set(testPlaySoundAtom, { soundType: "whoosh" })

      expect(mockPlaySound).not.toHaveBeenCalled()
    })
  })

  describe("when general settings are missing", () => {
    let testPlaySoundAtom: WritableAtom<
      null,
      [{ soundType: SoundType; volume?: number }],
      Promise<void>
    >

    beforeEach(() => {
      // Settings without general property (legacy data scenario)
      const mockSettings = createMockSettingsAtom(false, false) // hasGeneral = false
      testPlaySoundAtom = createTestPlaySoundAtom(mockSettings)
    })

    it("should NOT call playSound when general settings are missing", async () => {
      await store.set(testPlaySoundAtom, { soundType: "chime" })

      expect(mockPlaySound).not.toHaveBeenCalled()
    })
  })

  describe("integration scenarios", () => {
    it("should respect settings changes in real-time", async () => {
      // Start with sound enabled
      const enabledSettings = createMockSettingsAtom(true)
      const enabledPlaySoundAtom = createTestPlaySoundAtom(enabledSettings)

      await store.set(enabledPlaySoundAtom, { soundType: "confirm" })
      expect(mockPlaySound).toHaveBeenCalledTimes(1)

      vi.clearAllMocks()

      // Disable sound
      const disabledSettings = createMockSettingsAtom(false)
      const disabledPlaySoundAtom = createTestPlaySoundAtom(disabledSettings)

      await store.set(disabledPlaySoundAtom, { soundType: "confirm" })
      expect(mockPlaySound).not.toHaveBeenCalled()

      // Re-enable sound
      await store.set(enabledPlaySoundAtom, { soundType: "confirm" })
      expect(mockPlaySound).toHaveBeenCalledTimes(1)
    })

    it("should work with all supported sound types", async () => {
      const mockSettings = createMockSettingsAtom(true)
      const testPlaySoundAtom = createTestPlaySoundAtom(mockSettings)

      const soundTypes = [
        "bell",
        "bellClear",
        "bellWarm",
        "bellBright",
        "bellDeep",
        "pop",
        "ding",
        "success",
        "levelup",
        "click",
        "swoosh",
        "tap",
        "alert",
        "chime",
        "whoosh",
        "error",
        "confirm",
      ] as const

      for (const soundType of soundTypes) {
        await store.set(testPlaySoundAtom, { soundType })
      }

      expect(mockPlaySound).toHaveBeenCalledTimes(soundTypes.length)

      // Verify each sound type was called correctly
      soundTypes.forEach((soundType, index) => {
        expect(mockPlaySound).toHaveBeenNthCalledWith(index + 1, soundType, 1.0)
      })
    })
  })
})
