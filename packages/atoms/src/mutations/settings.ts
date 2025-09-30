/**
 * Settings mutation atoms
 *
 * Contains mutation atoms for settings operations:
 * - Updating user settings
 */

import {
  type UpdateSettingsRequest,
  type UpdateSettingsResponse,
  UpdateSettingsResponseSchema,
  UpdateSettingsRequestSchema,
  type UserSettings,
} from "@tasktrove/types";
import {
  DEFAULT_AUTO_BACKUP_ENABLED,
  DEFAULT_BACKUP_TIME,
  DEFAULT_MAX_BACKUPS,
} from "@tasktrove/constants";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_GENERAL_SETTINGS,
} from "@tasktrove/types/defaults";
import type { DataFile } from "@tasktrove/types";
import { createEntityMutation } from "./entity-factory";

// =============================================================================
// SETTINGS MUTATION ATOMS
// =============================================================================

/**
 * Mutation atom for updating settings with optimistic updates
 *
 * Updates user settings and optimistically applies partial changes.
 * Merges partial settings with current settings, preserving existing values.
 */
export const updateSettingsMutationAtom = createEntityMutation<
  UserSettings,
  UpdateSettingsRequest,
  UpdateSettingsResponse
>({
  entity: "setting",
  operation: "update",
  schemas: {
    request: UpdateSettingsRequestSchema,
    response: UpdateSettingsResponseSchema,
  },
  // Custom test response for settings-specific structure
  testResponseFactory: (variables: UpdateSettingsRequest) => {
    // For test mode, construct a complete UserSettings from the partial updates
    const testUserSettings: UserSettings = {
      data: {
        autoBackup: {
          enabled:
            variables.settings.data?.autoBackup?.enabled ??
            DEFAULT_AUTO_BACKUP_ENABLED,
          backupTime:
            variables.settings.data?.autoBackup?.backupTime ??
            DEFAULT_BACKUP_TIME,
          maxBackups:
            variables.settings.data?.autoBackup?.maxBackups ??
            DEFAULT_MAX_BACKUPS,
        },
      },
      notifications: {
        enabled:
          variables.settings.notifications?.enabled ??
          DEFAULT_NOTIFICATION_SETTINGS.enabled,
        requireInteraction:
          variables.settings.notifications?.requireInteraction ??
          DEFAULT_NOTIFICATION_SETTINGS.requireInteraction,
      },
      general: {
        startView:
          variables.settings.general?.startView ??
          DEFAULT_GENERAL_SETTINGS.startView,
        soundEnabled:
          variables.settings.general?.soundEnabled ??
          DEFAULT_GENERAL_SETTINGS.soundEnabled,
        linkifyEnabled:
          variables.settings.general?.linkifyEnabled ??
          DEFAULT_GENERAL_SETTINGS.linkifyEnabled,
        popoverHoverOpen:
          variables.settings.general?.popoverHoverOpen ??
          DEFAULT_GENERAL_SETTINGS.popoverHoverOpen,
      },
    };
    return {
      success: true,
      settings: testUserSettings,
      message: "Settings updated successfully (test mode)",
    };
  },
  // Custom optimistic update for nested settings merge
  optimisticUpdateFn: (variables: UpdateSettingsRequest, oldData: DataFile) => {
    // Merge partial settings with current settings, preserving existing values
    const updatedSettings: UserSettings = {
      data: {
        autoBackup: {
          enabled:
            variables.settings.data?.autoBackup?.enabled ??
            oldData.settings.data.autoBackup.enabled,
          backupTime:
            variables.settings.data?.autoBackup?.backupTime ??
            oldData.settings.data.autoBackup.backupTime,
          maxBackups:
            variables.settings.data?.autoBackup?.maxBackups ??
            oldData.settings.data.autoBackup.maxBackups,
        },
      },
      notifications: {
        enabled:
          variables.settings.notifications?.enabled ??
          oldData.settings.notifications.enabled,
        requireInteraction:
          variables.settings.notifications?.requireInteraction ??
          oldData.settings.notifications.requireInteraction,
      },
      general: {
        startView:
          variables.settings.general?.startView ??
          oldData.settings.general.startView,
        soundEnabled:
          variables.settings.general?.soundEnabled ??
          oldData.settings.general.soundEnabled,
        linkifyEnabled:
          variables.settings.general?.linkifyEnabled ??
          oldData.settings.general.linkifyEnabled,
        popoverHoverOpen:
          variables.settings.general?.popoverHoverOpen ??
          oldData.settings.general.popoverHoverOpen,
      },
    };

    return {
      ...oldData,
      settings: updatedSettings,
    };
  },
});
updateSettingsMutationAtom.debugLabel = "updateSettingsMutationAtom";
