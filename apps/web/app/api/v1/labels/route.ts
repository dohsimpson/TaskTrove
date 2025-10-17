import { NextResponse } from "next/server"
import {
  Label,
  DeleteLabelRequestSchema,
  CreateLabelRequestSchema,
  CreateLabelResponse,
  UpdateLabelResponse,
  DeleteLabelResponse,
  DataFileSerializationSchema,
  createLabelId,
  ErrorResponse,
  ApiErrorCode,
  LabelUpdateUnionSchema,
  LabelUpdateUnion,
  LabelId,
  GetLabelsResponse,
} from "@/lib/types"
import { validateRequestBody, createErrorResponse } from "@/lib/utils/validation"
import { safeReadDataFile, safeWriteDataFile } from "@/lib/utils/safe-file-operations"
import { v4 as uuidv4 } from "uuid"
import { createSafeLabelNameSlug } from "@/lib/utils/routing"
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
import { DEFAULT_LABEL_COLORS } from "@tasktrove/constants"

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
  // Validate request body using partial schema to allow defaults
  const validation = await validateRequestBody(request, CreateLabelRequestSchema)
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

  // Apply defaults for fields that weren't provided and generate required fields
  const newLabel: Label = {
    id: createLabelId(uuidv4()),
    name: validation.data.name,
    slug: validation.data.slug ?? createSafeLabelNameSlug(validation.data.name, fileData.labels),
    color: validation.data.color ?? DEFAULT_LABEL_COLORS[0],
  }

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
 * Updates labels. Accepts an array of label updates or single update.
 * Replaces the entire labels array (allows for deletions).
 * Uses typed responses for consistency.
 */
async function updateLabels(
  request: EnhancedRequest,
): Promise<NextResponse<UpdateLabelResponse | ErrorResponse>> {
  // Validate request body using the union schema
  const validation = await validateRequestBody(request, LabelUpdateUnionSchema)
  if (!validation.success) {
    return validation.error
  }

  // Normalize to array format
  const updates: LabelUpdateUnion = Array.isArray(validation.data)
    ? validation.data
    : [validation.data]

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

  // Detect if this is a full array replacement (reordering) vs partial updates
  // Full replacement: all labels present with all fields (name, slug, color)
  const isFullReplacement =
    updates.length === fileData.labels.length &&
    updates.every((u) => u.name !== undefined && u.slug !== undefined && u.color !== undefined)

  let finalLabels: Label[]

  if (isFullReplacement) {
    // Full replacement - validate all IDs exist and use the new order
    const existingIds = new Set(fileData.labels.map((l) => l.id))
    const allIdsValid = updates.every((u) => existingIds.has(u.id))

    if (!allIdsValid) {
      return createErrorResponse(
        "Invalid label IDs in update",
        "Some label IDs do not exist",
        400,
        ApiErrorCode.VALIDATION_ERROR,
      )
    }

    // Use the order from updates (for reordering operations)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Validated above: all fields present
    finalLabels = updates as Label[]
  } else {
    // Partial updates - create maps for efficient O(1) lookups (same pattern as projects)
    const updateMap: Map<LabelId, (typeof updates)[0]> = new Map(
      updates.map((update) => [update.id, update]),
    )

    // Update labels using merge logic (preserves original order)
    finalLabels = fileData.labels.map((label: Label) => {
      const update = updateMap.get(label.id)
      if (!update) return label

      // Merge update into label (partial update)
      const updatedLabel: Label = {
        ...label,
        ...(update.name !== undefined && { name: update.name }),
        ...(update.color !== undefined && { color: update.color }),
        ...(update.slug !== undefined && { slug: update.slug }),
      }

      // If name is being updated but slug is not explicitly provided, regenerate slug
      if (update.name && update.name !== label.name && update.slug === undefined) {
        // Filter out current label from slug generation to avoid self-collision
        const otherLabels = fileData.labels.filter((l) => l.id !== label.id)
        updatedLabel.slug = createSafeLabelNameSlug(update.name, otherLabels)
      }

      return updatedLabel
    })
  }

  // Update the file data with final labels
  const updatedFileData = {
    ...fileData,
    labels: finalLabels,
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
  const updatedLabels = finalLabels.filter((label: Label) =>
    updates.some((update) => update.id === label.id),
  )

  logBusinessEvent(
    "labels_updated",
    {
      labelCount: updates.length,
      updatedLabels: updates.map((u) => ({ id: u.id })),
      totalLabels: finalLabels.length,
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
