import { NextResponse } from "next/server"
import { DataFileSerializationSchema } from "@tasktrove/types/data-file"
import { UpdateSettingsRequestSchema } from "@tasktrove/types/api-requests"
import { UpdateSettingsResponse, GetSettingsResponse } from "@tasktrove/types/api-responses"
import { ApiErrorCode } from "@tasktrove/types/api-errors"
import { ErrorResponse } from "@tasktrove/types/api-responses"
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
import { withAuthentication } from "@/lib/middleware/auth"
import { withApiVersion } from "@/lib/middleware/api-version"
import { refreshSchedulerJobs } from "@/lib/scheduler/bootstrap"

/**
 * GET /api/v1/settings
 *
 * Fetches only user settings data with metadata.
 * Returns settings object with count, timestamp, and version information.
 */
async function getSettings(
  request: EnhancedRequest,
): Promise<NextResponse<GetSettingsResponse | ErrorResponse>> {
  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-data-file",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse(
      "Failed to read data file",
      "File reading or validation failed",
      500,
      ApiErrorCode.DATA_FILE_READ_ERROR,
    )
  }

  const serializationResult = DataFileSerializationSchema.safeParse(fileData)
  if (!serializationResult.success) {
    return createErrorResponse(
      "Failed to serialize data file",
      "Serialization failed",
      500,
      ApiErrorCode.DATA_FILE_VALIDATION_ERROR,
    )
  }

  const serializedData = serializationResult.data

  logBusinessEvent(
    "settings_fetched",
    {
      settingsVersion: serializedData.version,
    },
    request.context,
  )

  // Build response with only settings and metadata
  const response: GetSettingsResponse = {
    settings: serializedData.settings,
    meta: {
      count: 1, // One settings object
      timestamp: new Date().toISOString(),
      version: serializedData.version || "v0.7.0",
    },
  }

  return NextResponse.json<GetSettingsResponse>(response, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  })
}

export const GET = withApiVersion(
  withMutexProtection(
    withAuthentication(
      withApiLogging(getSettings, {
        endpoint: "/api/v1/settings",
        module: "api-v1-settings",
      }),
      { allowApiToken: true },
    ),
  ),
)

/**
 * PATCH /api/v1/settings
 *
 * Updates user settings by replacing the full settings payload.
 * The client is responsible for merging partial updates.
 */
async function updateSettings(
  request: EnhancedRequest,
): Promise<NextResponse<UpdateSettingsResponse | ErrorResponse>> {
  // Validate request body
  const validation = await validateRequestBody(request, UpdateSettingsRequestSchema)
  if (!validation.success) {
    return validation.error
  }

  const { settings: updatedSettings } = validation.data

  // Read current data file
  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-data-file",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse(
      "Failed to read data file",
      "File reading failed",
      500,
      ApiErrorCode.DATA_FILE_READ_ERROR,
    )
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
    return createErrorResponse(
      "Failed to save data",
      "File writing failed",
      500,
      ApiErrorCode.DATA_FILE_WRITE_ERROR,
    )
  }

  logBusinessEvent(
    "settings_updated",
    {
      settingsVersion: updatedFileData.version,
      categoriesUpdated: Object.keys(updatedSettings),
    },
    request.context,
  )

  const response: UpdateSettingsResponse = {
    success: true,
    settings: updatedSettings,
    message: "Settings updated successfully",
  }

  try {
    await refreshSchedulerJobs()
  } catch (error) {
    console.error("Failed to refresh scheduler after settings update", error)
  }

  return NextResponse.json<UpdateSettingsResponse>(response)
}

export const PATCH = withApiVersion(
  withMutexProtection(
    withAuthentication(
      withApiLogging(updateSettings, {
        endpoint: "/api/v1/settings",
        module: "api-v1-settings",
      }),
      { allowApiToken: true },
    ),
  ),
)
