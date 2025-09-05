/**
 * Settings management atoms for TaskTrove Jotai migration
 *
 * This file contains all settings-related atoms following the same patterns
 * as tasks, projects, and labels. Uses base atoms and adds settings-specific
 * functionality with consistent error handling, logging, and toast notifications.
 */

import { atom } from "jotai"
import { handleAtomError } from "../utils"
import { recordOperationAtom } from "./history"
import { log } from "../../utils/logger"
import { playSound } from "../../utils/audio"
import { settingsAtom, updateSettingsMutationAtom, dataQueryAtom } from "./base"
import type { UserSettings, PartialUserSettings } from "../../types"
import {
  DEFAULT_AUTO_BACKUP_ENABLED,
  DEFAULT_BACKUP_TIME,
  DEFAULT_MAX_BACKUPS,
} from "../../constants/defaults"

// Use the same supported sources constant from base.ts
const SUPPORTED_IMPORT_SOURCES = ["ticktick", "todoist", "asana", "trello"] as const

/**
 * Core settings management atoms for TaskTrove's Jotai migration
 *
 * This file contains the atomic state management for settings, following
 * the same patterns established by tasks, projects, and labels for
 * consistent behavior across the application.
 */

// =============================================================================
// BASE ATOMS
// =============================================================================

// settingsAtom now imported from './base' to avoid circular dependencies

// =============================================================================
// WRITE-ONLY ACTION ATOMS
// =============================================================================

/**
 * Updates settings with new data
 * Uses the update settings mutation to persist to API
 * Plays confirmation sound when settings are updated
 * History tracking enabled and tracks operation for undo/redo
 */
export const updateSettingsAtom = atom(
  null,
  async (get, set, partialSettings: PartialUserSettings) => {
    try {
      // Get the update settings mutation
      const updateSettingsMutation = get(updateSettingsMutationAtom)

      // Execute the mutation - this will handle optimistic updates and API persistence
      await updateSettingsMutation.mutateAsync({ settings: partialSettings })

      // Record the operation for undo/redo feedback
      const settingsKeys = Object.keys(partialSettings).join(", ")
      set(recordOperationAtom, `Updated settings: ${settingsKeys}`)

      // Play settings update sound
      playSound("confirm").catch((error) => {
        log.warn({ error, module: "settings" }, "Failed to play settings update sound")
      })

      log.info({ settingsKeys, module: "settings" }, "Settings updated")
    } catch (error) {
      handleAtomError(error, "updateSettingsAtom")
      throw error // Re-throw so the UI can handle the error
    }
  },
)
updateSettingsAtom.debugLabel = "updateSettingsAtom"

// =============================================================================
// DERIVED READ ATOMS
// =============================================================================

/**
 * Data settings (simplified read access)
 */
export const dataSettingsAtom = atom((get) => {
  try {
    const settings = get(settingsAtom)
    return settings.integrations
  } catch (error) {
    handleAtomError(error, "dataSettingsAtom")
    return {
      imports: {
        supportedSources: [...SUPPORTED_IMPORT_SOURCES],
      },
      autoBackup: {
        enabled: DEFAULT_AUTO_BACKUP_ENABLED,
        backupTime: DEFAULT_BACKUP_TIME,
        maxBackups: DEFAULT_MAX_BACKUPS,
      },
    }
  }
})
dataSettingsAtom.debugLabel = "dataSettingsAtom"

/**
 * Import settings (specific to imports functionality)
 */
export const importSettingsAtom = atom((get) => {
  try {
    const dataSettings = get(dataSettingsAtom)
    return dataSettings.imports
  } catch (error) {
    handleAtomError(error, "importSettingsAtom")
    return {
      supportedSources: [...SUPPORTED_IMPORT_SOURCES],
    }
  }
})
importSettingsAtom.debugLabel = "importSettingsAtom"

/**
 * Settings file metadata (version, lastModified)
 */
export const settingsMetadataAtom = atom((get) => {
  try {
    const result = get(dataQueryAtom)
    if ("data" in result && result.data) {
      return {
        version: result.data.version || "1.0.0",
        lastModified: new Date(),
      }
    }
    return {
      version: "1.0.0",
      lastModified: new Date(),
    }
  } catch (error) {
    handleAtomError(error, "settingsMetadataAtom")
    return {
      version: "1.0.0",
      lastModified: new Date(),
    }
  }
})
settingsMetadataAtom.debugLabel = "settingsMetadataAtom"

// =============================================================================
// UTILITY ATOMS
// =============================================================================

/**
 * Checks if a specific source is supported for imports
 */
export const isImportSourceSupportedAtom = atom((get) => {
  const importSettings = get(importSettingsAtom)
  return (source: string): boolean => {
    try {
      // Type-safe check without assertion
      return importSettings.supportedSources.some((supportedSource) => supportedSource === source)
    } catch (error) {
      handleAtomError(error, "isImportSourceSupportedAtom")
      return false
    }
  }
})
isImportSourceSupportedAtom.debugLabel = "isImportSourceSupportedAtom"

/**
 * Updates specific data settings
 */
export const updateDataSettingsAtom = atom(
  null,
  (get, set, dataUpdates: Partial<UserSettings["integrations"]>) => {
    try {
      const currentSettings = get(settingsAtom)
      const updatedSettings: PartialUserSettings = {
        integrations: {
          imports: {
            ...currentSettings.integrations.imports,
            ...dataUpdates.imports,
          },
        },
      }
      set(updateSettingsAtom, updatedSettings)
    } catch (error) {
      handleAtomError(error, "updateDataSettingsAtom")
    }
  },
)
updateDataSettingsAtom.debugLabel = "updateDataSettingsAtom"

/**
 * Updates import settings specifically
 */
export const updateImportSettingsAtom = atom(
  null,
  (get, set, importUpdates: Partial<UserSettings["integrations"]["imports"]>) => {
    try {
      const currentSettings = get(settingsAtom)
      const updatedSettings: PartialUserSettings = {
        integrations: {
          imports: {
            ...currentSettings.integrations.imports,
            ...importUpdates,
          },
        },
      }
      set(updateSettingsAtom, updatedSettings)
    } catch (error) {
      handleAtomError(error, "updateImportSettingsAtom")
    }
  },
)
updateImportSettingsAtom.debugLabel = "updateImportSettingsAtom"

// =============================================================================
// EXPORT STRUCTURE
// =============================================================================

/**
 * Organized export of all settings-related atoms
 * Provides clear separation between different types of atoms
 */
export const settingsAtoms = {
  // Base state atoms
  settings: settingsAtom,

  // Action atoms (write-only)
  actions: {
    updateSettings: updateSettingsAtom,
    updateDataSettings: updateDataSettingsAtom,
    updateImportSettings: updateImportSettingsAtom,
    updateSettingsMutation: updateSettingsMutationAtom,
  },

  // Derived read atoms
  derived: {
    dataSettings: dataSettingsAtom,
    importSettings: importSettingsAtom,
    settingsMetadata: settingsMetadataAtom,
    isImportSourceSupported: isImportSourceSupportedAtom,
  },

  // Query atoms (settings now use main dataQueryAtom)
  queries: {
    dataQuery: dataQueryAtom,
  },
}

// Individual exports for backward compatibility
export { settingsAtom, dataQueryAtom, updateSettingsMutationAtom } from "./base"
