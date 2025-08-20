import { NextResponse } from "next/server"
import {
  SettingsFile,
  SettingsFileSerializationSchema,
  SettingsFileSerialization,
  UpdateSettingsRequestSchema,
  UpdateSettingsResponse,
  ErrorResponse,
  UserSettings,
} from "@/lib/types"
import { validateRequestBody, createErrorResponse } from "@/lib/utils/validation"
import { safeReadSettingsFile, safeWriteSettingsFile } from "@/lib/utils/safe-file-operations"
import {
  withApiLogging,
  logBusinessEvent,
  withFileOperationLogging,
  withPerformanceLogging,
  type EnhancedRequest,
} from "@/lib/middleware/api-logger"
import { withMutexProtection } from "@/lib/utils/api-mutex"

/**
 * GET /api/settings
 *
 * Fetches the current user settings from settings.json file.
 * Returns the complete settings structure with defaults if file doesn't exist.
 */
async function getSettings(
  request: EnhancedRequest,
): Promise<NextResponse<SettingsFileSerialization | ErrorResponse>> {
  const settingsData = await withFileOperationLogging(
    () => safeReadSettingsFile(),
    "read-settings-file",
    request.context,
  )

  if (!settingsData) {
    return createErrorResponse(
      "Failed to read settings file",
      "File reading or validation failed",
      500,
    )
  }

  logBusinessEvent(
    "settings_fetched",
    {
      settingsVersion: settingsData.version,
    },
    request.context,
  )

  const serializationResult = SettingsFileSerializationSchema.safeParse(settingsData)
  if (!serializationResult.success) {
    return createErrorResponse("Failed to serialize settings", "Serialization failed", 500)
  }

  const serializedData = serializationResult.data

  return NextResponse.json<SettingsFileSerialization>(serializedData, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  })
}

export const GET = withMutexProtection(
  withApiLogging(getSettings, {
    endpoint: "/api/settings",
    module: "api-settings",
  }),
)

/**
 * PATCH /api/settings
 *
 * Updates user settings by merging provided settings with existing ones.
 * Supports partial updates for any category of settings.
 */
async function updateSettings(
  request: EnhancedRequest,
): Promise<NextResponse<UpdateSettingsResponse | ErrorResponse>> {
  // Validate request body
  const validation = await validateRequestBody(request, UpdateSettingsRequestSchema)
  if (!validation.success) {
    return validation.error
  }

  const { settings: partialSettings } = validation.data

  // Read current settings
  const currentSettingsFile = await withFileOperationLogging(
    () => safeReadSettingsFile(),
    "read-settings-file",
    request.context,
  )

  if (!currentSettingsFile) {
    return createErrorResponse("Failed to read current settings", "File reading failed", 500)
  }

  // Merge partial settings with current settings (simplified to only integrations)
  const updatedSettings: UserSettings = {
    integrations: {
      imports: {
        ...currentSettingsFile.userSettings.integrations.imports,
        ...partialSettings.integrations?.imports,
      },
    },
    // Future settings will be merged here when implemented:
    // appearance: { ... },
    // behavior: { ... },
    // notifications: { ... },
    // data: { ... },
    // productivity: { ... },
  }

  // Create updated settings file
  const updatedSettingsFile: SettingsFile = {
    userSettings: updatedSettings,
    version: currentSettingsFile.version,
    lastModified: new Date(),
  }

  // Write updated settings to file
  const writeSuccess = await withPerformanceLogging(
    () => safeWriteSettingsFile({ data: updatedSettingsFile }),
    "write-settings-file",
    request.context,
    500, // 500ms threshold for slow file writes
  )

  if (!writeSuccess) {
    return createErrorResponse("Failed to save settings", "File writing failed", 500)
  }

  logBusinessEvent(
    "settings_updated",
    {
      settingsVersion: updatedSettingsFile.version,
      categoriesUpdated: Object.keys(partialSettings),
    },
    request.context,
  )

  const response: UpdateSettingsResponse = {
    success: true,
    settings: updatedSettings,
    message: "Settings updated successfully",
  }

  return NextResponse.json<UpdateSettingsResponse>(response)
}

export const PATCH = withMutexProtection(
  withApiLogging(updateSettings, {
    endpoint: "/api/settings",
    module: "api-settings",
  }),
)
