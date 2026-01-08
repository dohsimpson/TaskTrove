import { NextResponse } from "next/server"
import type { Label } from "@tasktrove/types/core"
import { DeleteLabelRequestSchema } from "@tasktrove/types/api-requests"
import {
  CreateLabelResponse,
  UpdateLabelResponse,
  DeleteLabelResponse,
  GetLabelsResponse,
} from "@tasktrove/types/api-responses"
import { ApiErrorCode } from "@tasktrove/types/api-errors"
import { ErrorResponse } from "@tasktrove/types/api-responses"
import { DataFileSerializationSchema } from "@tasktrove/types/data-file"
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
import { LabelSerializationSchema } from "@tasktrove/types/serialization"
import { z } from "zod"

/**
 * GET /api/v1/labels
 *
 * Fetches only labels data with metadata.
 * Returns labels array with count, timestamp, and version information.
 */
async function getLabels(
  request: EnhancedRequest,
): Promise<NextResponse<GetLabelsResponse | ErrorResponse>> {
  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-label-data-file",
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
    "labels_fetched",
    {
      labelsCount: serializedData.labels.length,
    },
    request.context,
  )

  // Build response with only labels and metadata
  const response: GetLabelsResponse = {
    labels: serializedData.labels,
    meta: {
      count: serializedData.labels.length,
      timestamp: new Date().toISOString(),
      version: serializedData.version || "v0.7.0",
    },
  }

  return NextResponse.json<GetLabelsResponse>(response, {
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
      withApiLogging(getLabels, {
        endpoint: "/api/v1/labels",
        module: "api-v1-labels",
      }),
      { allowApiToken: true },
    ),
  ),
)

/**
 * POST /api/v1/labels
 *
 * Creates a new label with the provided data.
 * This endpoint persists the label to the data file.
 */
async function createLabel(
  request: EnhancedRequest,
): Promise<NextResponse<CreateLabelResponse | ErrorResponse>> {
  // Validate request body - expects fully constructed label payload
  const validation = await validateRequestBody(request, LabelSerializationSchema)
  if (!validation.success) {
    return validation.error
  }

  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-label-data-file",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse(
      "Failed to read data file",
      "File operation failed",
      500,
      ApiErrorCode.DATA_FILE_READ_ERROR,
    )
  }

  const newLabel: Label = validation.data
  fileData.labels.push(newLabel)

  const writeSuccess = await withPerformanceLogging(
    () => safeWriteDataFile({ data: fileData }),
    "write-label-data-file",
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
    "label_created",
    {
      labelId: newLabel.id,
      name: newLabel.name,
      color: newLabel.color,
      totalLabels: fileData.labels.length,
    },
    request.context,
  )

  const response: CreateLabelResponse = {
    success: true,
    labelIds: [newLabel.id],
    message: "Label created successfully",
  }

  return NextResponse.json<CreateLabelResponse>(response)
}

export const POST = withApiVersion(
  withMutexProtection(
    withAuthentication(
      withApiLogging(createLabel, {
        endpoint: "/api/v1/labels",
        module: "api-v1-labels",
      }),
      { allowApiToken: true },
    ),
  ),
)

/**
 * PATCH /api/v1/labels
 *
 * Updates labels. Accepts an array of label updates.
 * Replaces the entire labels array (allows for deletions).
 * Uses typed responses for consistency.
 */
async function updateLabels(
  request: EnhancedRequest,
): Promise<NextResponse<UpdateLabelResponse | ErrorResponse>> {
  // Validate request body - expect full label objects array
  const validation = await validateRequestBody(request, z.array(LabelSerializationSchema))
  if (!validation.success) {
    return validation.error
  }

  const updates: Label[] = validation.data

  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-label-data-file",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse(
      "Failed to update labels",
      "File reading or validation failed",
      500,
      ApiErrorCode.DATA_FILE_READ_ERROR,
    )
  }

  // Client provides final label objects; replace existing labels in provided order
  const updatedFileData = {
    ...fileData,
    labels: updates,
  }

  const writeSuccess = await withPerformanceLogging(
    () => safeWriteDataFile({ data: updatedFileData }),
    "write-label-data-file",
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

  // Get the actual updated labels from finalLabels (same pattern as projects)
  const updatedLabels = updates

  logBusinessEvent(
    "labels_updated",
    {
      labelCount: updates.length,
      updatedLabels: updates.map((u) => ({ id: u.id })),
      totalLabels: updates.length,
    },
    request.context,
  )

  const response: UpdateLabelResponse = {
    success: true,
    labels: updatedLabels,
    count: updates.length,
    message: `${updates.length} label(s) updated successfully`,
  }

  return NextResponse.json<UpdateLabelResponse>(response)
}

export const PATCH = withApiVersion(
  withMutexProtection(
    withAuthentication(
      withApiLogging(updateLabels, {
        endpoint: "/api/v1/labels",
        module: "api-v1-labels",
      }),
      { allowApiToken: true },
    ),
  ),
)

/**
 * DELETE /api/v1/labels
 *
 * Deletes a label by ID. Accepts a single label ID.
 * Uses proper Zod schema validation and typed responses.
 */
async function deleteLabel(
  request: EnhancedRequest,
): Promise<NextResponse<DeleteLabelResponse | ErrorResponse>> {
  // Validate request body using Zod schema
  const validation = await validateRequestBody(request, DeleteLabelRequestSchema)
  if (!validation.success) {
    return validation.error
  }

  const { id: labelId } = validation.data

  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-label-data-file",
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

  // Filter out the label to be deleted
  const originalLabelCount = fileData.labels.length
  fileData.labels = fileData.labels.filter((label: Label) => label.id !== labelId)
  const deletedCount = originalLabelCount - fileData.labels.length

  // Always write the file, even if no label was deleted

  const writeSuccess = await withPerformanceLogging(
    () => safeWriteDataFile({ data: fileData }),
    "write-label-data-file",
    request.context,
    500, // 500ms threshold for slow file writes
  )

  if (!writeSuccess) {
    return createErrorResponse(
      "Failed to save changes",
      "File writing failed",
      500,
      ApiErrorCode.DATA_FILE_WRITE_ERROR,
    )
  }

  logBusinessEvent(
    "label_deleted",
    {
      labelId,
      deletedCount,
      remainingLabels: fileData.labels.length,
    },
    request.context,
  )

  const response: DeleteLabelResponse = {
    success: true,
    labelIds: [labelId],
    message: `${deletedCount} label(s) deleted successfully`,
  }

  return NextResponse.json<DeleteLabelResponse>(response)
}

export const DELETE = withApiVersion(
  withMutexProtection(
    withAuthentication(
      withApiLogging(deleteLabel, {
        endpoint: "/api/v1/labels",
        module: "api-v1-labels",
      }),
      { allowApiToken: true },
    ),
  ),
)
