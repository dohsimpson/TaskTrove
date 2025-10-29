/**
 * Settings mutation atoms
 *
 * Contains mutation atoms for settings operations:
 * - Updating user settings
 *
 * Note: Settings use a single object structure (not arrays),
 * so they use createMutation directly instead of createEntityMutation.
 */

import {
  type UpdateSettingsRequest,
  UpdateSettingsRequestSchema,
} from "@tasktrove/types/api-requests";
import {
  type UpdateSettingsResponse,
  UpdateSettingsResponseSchema,
} from "@tasktrove/types/api-responses";
import { type UserSettings } from "@tasktrove/types/settings";
import { API_ROUTES } from "@tasktrove/types/constants";
import { DEFAULT_USER_SETTINGS } from "@tasktrove/types/defaults";
import {
  DEFAULT_AUTO_BACKUP_ENABLED,
  DEFAULT_BACKUP_TIME,
  DEFAULT_MAX_BACKUPS,
  SETTINGS_QUERY_KEY,
} from "@tasktrove/constants";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_GENERAL_SETTINGS,
} from "@tasktrove/types/defaults";
import { createMutation } from "./factory";

// =============================================================================
// SETTINGS MUTATION ATOMS
// =============================================================================

/**
 * Mutation atom for updating settings with optimistic updates
 *
 * Updates user settings and optimistically applies partial changes.
 * Merges partial settings with current settings, preserving existing values.
 */
export const updateSettingsMutationAtom = createMutation<
  UpdateSettingsResponse,
  UpdateSettingsRequest,
  UserSettings
>({
  method: "PATCH",
  operationName: "Updated settings",
  apiEndpoint: API_ROUTES.V1_SETTINGS,
  resourceQueryKey: SETTINGS_QUERY_KEY,
  defaultResourceValue: DEFAULT_USER_SETTINGS,
  responseSchema: UpdateSettingsResponseSchema,
  serializationSchema: UpdateSettingsRequestSchema,
  logModule: "settings",
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
  optimisticUpdateFn: (
    variables: UpdateSettingsRequest,
    oldSettings: UserSettings,
  ): UserSettings => {
    // Merge partial settings with current settings, preserving existing values
    const updatedSettings: UserSettings = {
      data: {
        autoBackup: {
          enabled:
            variables.settings.data?.autoBackup?.enabled ??
            oldSettings.data.autoBackup.enabled,
          backupTime:
            variables.settings.data?.autoBackup?.backupTime ??
            oldSettings.data.autoBackup.backupTime,
          maxBackups:
            variables.settings.data?.autoBackup?.maxBackups ??
            oldSettings.data.autoBackup.maxBackups,
        },
      },
      notifications: {
        enabled:
          variables.settings.notifications?.enabled ??
          oldSettings.notifications.enabled,
        requireInteraction:
          variables.settings.notifications?.requireInteraction ??
          oldSettings.notifications.requireInteraction,
      },
      general: {
        startView:
          variables.settings.general?.startView ??
          oldSettings.general.startView,
        soundEnabled:
          variables.settings.general?.soundEnabled ??
          oldSettings.general.soundEnabled,
        linkifyEnabled:
          variables.settings.general?.linkifyEnabled ??
          oldSettings.general.linkifyEnabled,
        popoverHoverOpen:
          variables.settings.general?.popoverHoverOpen ??
          oldSettings.general.popoverHoverOpen,
      },
    };

    return updatedSettings;
  },
});
updateSettingsMutationAtom.debugLabel = "updateSettingsMutationAtom";
