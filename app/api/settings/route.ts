import { NextResponse } from "next/server"
import {
  DataFileSerializationSchema,
  DataFileSerialization,
  UpdateSettingsRequestSchema,
  UpdateSettingsResponse,
  ErrorResponse,
  UserSettings,
} from "@/lib/types"
import { validateRequestBody, createErrorResponse } from "@/lib/utils/validation"
import { safeReadDataFile, safeWriteDataFile } from "@/lib/utils/safe-file-operations"
import {
  withApiLogging,
  logBusinessEvent,
  withFileOperationLogging,
  withPerformanceLogging,
  type EnhancedRequest,
} from "@/lib/middleware/api-logger"
import { withMutexProtection } from "@/lib/utils/api-mutex"
import {
  DEFAULT_AUTO_BACKUP_ENABLED,
  DEFAULT_BACKUP_TIME,
  DEFAULT_MAX_BACKUPS,
} from "@/lib/constants/defaults"

/**
 * GET /api/settings
 *
 * Fetches the current user settings from data.json file.
 * Returns the complete data file structure including settings.
 */
async function getSettings(
  request: EnhancedRequest,
): Promise<NextResponse<DataFileSerialization | ErrorResponse>> {
  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-data-file",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse("Failed to read data file", "File reading or validation failed", 500)
  }

  logBusinessEvent(
    "settings_fetched",
    {
      settingsVersion: fileData.version,
    },
    request.context,
  )

  const serializationResult = DataFileSerializationSchema.safeParse(fileData)
  if (!serializationResult.success) {
    return createErrorResponse("Failed to serialize data file", "Serialization failed", 500)
  }

  const serializedData = serializationResult.data

  return NextResponse.json<DataFileSerialization>(serializedData, {
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

  // Read current data file
  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-data-file",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse("Failed to read data file", "File reading failed", 500)
  }

  // Merge partial settings with current settings (simplified to only integrations)
  const updatedSettings: UserSettings = {
    integrations: {
      imports: {
        ...fileData.settings.integrations.imports,
        ...partialSettings.integrations?.imports,
      },
      autoBackup: {
        enabled:
          partialSettings.integrations?.autoBackup?.enabled ??
          fileData.settings.integrations.autoBackup?.enabled ??
          DEFAULT_AUTO_BACKUP_ENABLED,
        backupTime:
          partialSettings.integrations?.autoBackup?.backupTime ??
          fileData.settings.integrations.autoBackup?.backupTime ??
          DEFAULT_BACKUP_TIME,
        maxBackups:
          partialSettings.integrations?.autoBackup?.maxBackups ??
          fileData.settings.integrations.autoBackup?.maxBackups ??
          DEFAULT_MAX_BACKUPS,
      },
    },
    // Future settings will be merged here when implemented:
    // appearance: { ... },
    // behavior: { ... },
    // notifications: { ... },
    // data: { ... },
    // productivity: { ... },
  }

  // Update the data file with new settings
  const updatedFileData = {
    ...fileData,
    settings: updatedSettings,
  }

  // Write updated data to file
  const writeSuccess = await withPerformanceLogging(
    () => safeWriteDataFile({ data: updatedFileData }),
    "write-data-file",
    request.context,
    500, // 500ms threshold for slow file writes
  )

  if (!writeSuccess) {
    return createErrorResponse("Failed to save data", "File writing failed", 500)
  }

  logBusinessEvent(
    "settings_updated",
    {
      settingsVersion: updatedFileData.version,
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
