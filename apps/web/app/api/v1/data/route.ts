import { NextResponse } from "next/server"
import {
  DataFileSerializationSchema,
  ErrorResponse,
  ApiErrorCode,
  GetDataResponse,
} from "@/lib/types"
import { createErrorResponse } from "@/lib/utils/validation"
import { safeReadDataFile } from "@/lib/utils/safe-file-operations"
import {
  withApiLogging,
  logBusinessEvent,
  withFileOperationLogging,
  type EnhancedRequest,
} from "@/lib/middleware/api-logger"
import { withMutexProtection } from "@/lib/utils/api-mutex"
import { withAuthentication } from "@/lib/middleware/auth"
import { withApiVersion } from "@/lib/middleware/api-version"

/**
 * GET /api/v1/data
 *
 * Fetches the complete data structure with metadata.
 * Returns all tasks, projects, labels, groups, settings, and user with metadata.
 * This endpoint is for clients that need the full data structure.
 */
async function getData(
  request: EnhancedRequest,
): Promise<NextResponse<GetDataResponse | ErrorResponse>> {
  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-complete-data-file",
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

  // Log business event
  logBusinessEvent(
    "complete_data_fetched",
    {
      tasksCount: serializedData.tasks.length,
      projectsCount: serializedData.projects.length,
      labelsCount: serializedData.labels.length,
    },
    request.context,
  )

  // Build response with complete data and metadata
  const response: GetDataResponse = {
    ...serializedData,
    meta: {
      count:
        serializedData.tasks.length +
        serializedData.projects.length +
        serializedData.labels.length +
        3, // +3 for groups root, settings, user
      timestamp: new Date().toISOString(),
      version: serializedData.version || "v0.7.0",
    },
  }

  return NextResponse.json<GetDataResponse>(response, {
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
      withApiLogging(getData, {
        endpoint: "/api/v1/data",
        module: "api-v1-data",
      }),
    ),
  ),
)
