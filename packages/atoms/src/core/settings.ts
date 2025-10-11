/**
 * Settings management atoms for TaskTrove Jotai migration
 *
 * This file contains all settings-related atoms following the same patterns
 * as tasks, projects, and labels. Uses base atoms and adds settings-specific
 * functionality with consistent error handling, logging, and toast notifications.
 */

import { atom } from "jotai";
import { handleAtomError, playSoundAtom, log } from "../utils/atom-helpers";
import { recordOperationAtom } from "./history";
import { settingsAtom } from "../data/base/atoms";
import { settingsQueryAtom } from "../data/base/query";
import { updateSettingsMutationAtom } from "../mutations/settings";
import type { UserSettings, PartialUserSettings } from "@tasktrove/types";
import {
  DEFAULT_AUTO_BACKUP_ENABLED,
  DEFAULT_BACKUP_TIME,
  DEFAULT_MAX_BACKUPS,
} from "@tasktrove/constants";

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
      const updateSettingsMutation = get(updateSettingsMutationAtom);

      // Execute the mutation - this will handle optimistic updates and API persistence
      await updateSettingsMutation.mutateAsync({ settings: partialSettings });

      // Record the operation for undo/redo feedback
      const settingsKeys = Object.keys(partialSettings).join(", ");
      set(recordOperationAtom, `Updated settings: ${settingsKeys}`);

      // Play settings update sound
      set(playSoundAtom, { soundType: "confirm" });

      log.info({ settingsKeys, module: "settings" }, "Settings updated");
    } catch (error) {
      handleAtomError(error, "updateSettingsAtom");
      throw error; // Re-throw so the UI can handle the error
    }
  },
);
updateSettingsAtom.debugLabel = "updateSettingsAtom";

// =============================================================================
// DERIVED READ ATOMS
// =============================================================================

/**
 * Data settings (simplified read access)
 */
export const dataSettingsAtom = atom((get) => {
  try {
    const settings = get(settingsAtom);
    return settings.data;
  } catch (error) {
    handleAtomError(error, "dataSettingsAtom");
    return {
      autoBackup: {
        enabled: DEFAULT_AUTO_BACKUP_ENABLED,
        backupTime: DEFAULT_BACKUP_TIME,
        maxBackups: DEFAULT_MAX_BACKUPS,
      },
    };
  }
});
dataSettingsAtom.debugLabel = "dataSettingsAtom";

// =============================================================================
// UTILITY ATOMS
// =============================================================================

/**
 * Updates specific data settings
 */
export const updateDataSettingsAtom = atom(
  null,
  (get, set, dataUpdates: Partial<UserSettings["data"]>) => {
    try {
      const updatedSettings: PartialUserSettings = {
        data: {
          ...dataUpdates,
        },
      };
      set(updateSettingsAtom, updatedSettings);
    } catch (error) {
      handleAtomError(error, "updateDataSettingsAtom");
    }
  },
);
updateDataSettingsAtom.debugLabel = "updateDataSettingsAtom";

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
    updateSettingsMutation: updateSettingsMutationAtom,
  },

  // Derived read atoms
  derived: {
    dataSettings: dataSettingsAtom,
  },

  // Query atoms
  queries: {
    settingsQuery: settingsQueryAtom,
  },
};

// Note: settingsAtom, settingsQueryAtom, and updateSettingsMutationAtom are imported from their respective source files
