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
import { SETTINGS_QUERY_KEY } from "@tasktrove/constants";
import { createMutation } from "./factory";

// =============================================================================
// SETTINGS MUTATION ATOMS
// =============================================================================

/**
 * Mutation atom for updating settings with optimistic updates
 *
 * Updates user settings and optimistically applies the full settings payload.
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
    return {
      success: true,
      settings: variables.settings,
      message: "Settings updated successfully (test mode)",
    };
  },
  optimisticUpdateFn: (
    variables: UpdateSettingsRequest,
    oldSettings: UserSettings,
  ): UserSettings => {
    void oldSettings;
    return variables.settings;
  },
});
updateSettingsMutationAtom.debugLabel = "updateSettingsMutationAtom";
