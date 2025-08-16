import { NextResponse } from "next/server"
import {
  withApiLogging,
  logBusinessEvent,
  withFileOperationLogging,
  withPerformanceLogging,
  type EnhancedRequest,
} from "@/lib/middleware/api-logger"
import { withMutexProtection } from "@/lib/utils/api-mutex"
import { safeReadDataFile, safeWriteDataFile } from "@/lib/utils/safe-file-operations"
import { createErrorResponse } from "@/lib/utils/validation"
import {
  OrderingUpdateRequestSchema,
  OrderingUpdateResponse,
  ErrorResponse,
  DataFileSerializationSchema,
  DataFileSerialization,
} from "@/lib/types"

/**
 * GET /api/ordering
 *
 * Fetches all ordering data including tasks, projects, and labels.
 * This API route provides the complete data structure that matches
 * the Jotai atoms used for state management.
 */
async function getOrdering(
  request: EnhancedRequest,
): Promise<NextResponse<DataFileSerialization | ErrorResponse>> {
  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-ordering-data-file",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse("Failed to read data file", "File reading or validation failed", 500)
  }

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
  withApiLogging(getOrdering, {
    endpoint: "/api/ordering",
    module: "api-ordering",
  }),
)

/**
 * PATCH /api/ordering
 *
 * Updates ordering data for projects and labels.
 */
async function updateOrdering(
  request: EnhancedRequest,
): Promise<NextResponse<OrderingUpdateResponse | ErrorResponse>> {
  const updates = await request.json()

  // Validate using proper schema
  const validation = OrderingUpdateRequestSchema.safeParse(updates)
  if (!validation.success) {
    return createErrorResponse("Invalid ordering update data", validation.error.message, 400)
  }

  const validatedUpdates = validation.data

  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-ordering-data-file",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse(
      "Failed to update orderings",
      "File reading or validation failed",
      500,
    )
  }

  // Update the ordering data
  const updatedOrdering = {
    projects: validatedUpdates.projects || fileData.ordering?.projects || [],
    labels: validatedUpdates.labels || fileData.ordering?.labels || [],
  }

  // Update the file data with new ordering
  const updatedFileData = {
    ...fileData,
    ordering: updatedOrdering,
  }

  const writeSuccess = await withPerformanceLogging(
    () => safeWriteDataFile({ data: updatedFileData }),
    "write-ordering-data-file",
    request.context,
    500, // 500ms threshold for slow file writes
  )

  if (!writeSuccess) {
    return createErrorResponse("Failed to save data", "File writing failed", 500)
  }

  logBusinessEvent(
    "ordering_updated",
    {
      projectsCount: updatedOrdering.projects.length,
      labelsCount: updatedOrdering.labels.length,
      hasProjects: !!validatedUpdates.projects,
      hasLabels: !!validatedUpdates.labels,
    },
    request.context,
  )

  const response: OrderingUpdateResponse = {
    success: true,
    ordering: updatedOrdering,
    message: "Ordering updated successfully",
  }

  return NextResponse.json<OrderingUpdateResponse>(response, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  })
}

export const PATCH = withMutexProtection(
  withApiLogging(updateOrdering, {
    endpoint: "/api/ordering",
    module: "api-ordering",
  }),
)
