import { atom } from "jotai"
import type {
  PartialUserSettings,
  DataSettings,
  // Future type imports (not used yet):
  // AppearanceSettings,
  // BehaviorSettings,
  // ProductivitySettings,
  // NotificationSettings,
  // TaskPriority,
} from "@/lib/types"
import { settingsAtom, updateSettingsAtom } from "@/lib/atoms/core/settings"

// =============================================================================
// DERIVED SETTINGS ATOMS
// =============================================================================

// /**
//  * Appearance settings atom - Not implemented yet
//  */
// export const appearanceSettingsAtom = atom(
//   (get) => get(settingsAtom).appearance,
//   async (get, set, updates: Partial<AppearanceSettings>) => {
//     await set(updateSettingsAtom, { appearance: updates })
//   },
// )

// /**
//  * Behavior settings atom - Not implemented yet
//  */
// export const behaviorSettingsAtom = atom(
//   (get) => get(settingsAtom).behavior,
//   async (get, set, updates: Partial<BehaviorSettings>) => {
//     await set(updateSettingsAtom, { behavior: updates })
//   },
// )

// /**
//  * Notification settings atom - Not implemented yet
//  */
// export const notificationSettingsAtom = atom(
//   (get) => get(settingsAtom).notifications,
//   async (get, set, updates: Partial<NotificationSettings>) => {
//     await set(updateSettingsAtom, { notifications: updates })
//   },
// )

// /**
//  * Data settings atom - Not implemented yet
//  */
// export const dataSettingsAtom = atom(
//   (get) => get(settingsAtom).data,
//   async (get, set, updates: Partial<DataSettings>) => {
//     await set(updateSettingsAtom, { data: updates })
//   },
// )

/**
 * Data settings atom with API persistence
 */
export const dataSettingsAtom = atom(
  (get) => get(settingsAtom).integrations,
  async (get, set, updates: Partial<DataSettings>) => {
    await set(updateSettingsAtom, { integrations: updates })
  },
)

// /**
//  * Productivity settings atom - Not implemented yet
//  */
// export const productivitySettingsAtom = atom(
//   (get) => get(settingsAtom).productivity,
//   async (get, set, updates: Partial<ProductivitySettings>) => {
//     await set(updateSettingsAtom, { productivity: updates })
//   },
// )

/**
 * Complete user settings atom - derived from individual setting atoms
 */
export const userSettingsAtom = atom((get) => get(settingsAtom))

// =============================================================================
// APPEARANCE ACTION ATOMS - Not implemented yet
// =============================================================================

// /**
//  * Update theme setting
//  */
// export const updateThemeAtom = atom(null, async (get, set, theme: AppearanceSettings["theme"]) => {
//   await set(updateSettingsAtom, { appearance: { theme } })
// })

// ... other appearance atoms commented out ...

// =============================================================================
// BEHAVIOR ACTION ATOMS - Not implemented yet
// =============================================================================

// /**
//  * Update start view setting
//  */
// export const updateStartViewAtom = atom(null, async (get, set, startView: string) => {
//   ... behavior settings ...
// })

// ... other behavior atoms commented out ...

// =============================================================================
// PRODUCTIVITY ACTION ATOMS - Not implemented yet
// =============================================================================

// /**
//  * Update pomodoro work duration
//  */
// export const updatePomodoroWorkDurationAtom = atom(null, async (get, set, workDuration: number) => {
//   ... productivity settings ...
// })

// ... other productivity atoms commented out ...

// =============================================================================
// GENERIC UPDATE ACTIONS
// =============================================================================

// /**
//  * Generic action to update appearance settings - Not implemented yet
//  */
// export const updateAppearanceSettingsAtom = atom(
//   null,
//   async (get, set, updates: Partial<AppearanceSettings>) => {
//     await set(updateSettingsAtom, { appearance: updates })
//   },
// )

// /**
//  * Generic action to update behavior settings - Not implemented yet
//  */
// export const updateBehaviorSettingsAtom = atom(
//   null,
//   async (get, set, updates: Partial<BehaviorSettings>) => {
//     await set(updateSettingsAtom, { behavior: updates })
//   },
// )

// /**
//  * Generic action to update notification settings - Not implemented yet
//  */
// export const updateNotificationSettingsAtom = atom(
//   null,
//   async (get, set, updates: Partial<NotificationSettings>) => {
//     await set(updateSettingsAtom, { notifications: updates })
//   },
// )

// /**
//  * Generic action to update data settings - Not implemented yet
//  */
// export const updateDataSettingsAtom = atom(
//   null,
//   async (get, set, updates: Partial<DataSettings>) => {
//     await set(updateSettingsAtom, { data: updates })
//   },
// )

/**
 * Generic action to update data settings
 */
export const updateDataSettingsAtom = atom(
  null,
  async (get, set, updates: Partial<DataSettings>) => {
    await set(updateSettingsAtom, { integrations: updates })
  },
)

// /**
//  * Generic action to update productivity settings - Not implemented yet
//  */
// export const updateProductivitySettingsAtom = atom(
//   null,
//   async (get, set, updates: Partial<ProductivitySettings>) => {
//     await set(updateSettingsAtom, { productivity: updates })
//   },
// )

// /**
//  * Reset all settings to defaults - Not implemented yet (only integrations supported)
//  */
// export const resetAllSettingsAtom = atom(null, async (get, set) => {
//   await set(updateSettingsAtom, {
//     integrations: {
//       imports: {
//         supportedSources: ["ticktick", "todoist", "asana", "trello"],
//       },
//     },
//   })
// })

/**
 * Export settings for backup
 */
export const exportSettingsAtom = atom((get) => get(userSettingsAtom))

/**
 * Import settings from backup
 */
export const importSettingsAtom = atom(null, async (get, set, settings: PartialUserSettings) => {
  await set(updateSettingsAtom, settings)
})
