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
  DataFileSerialization,
  ErrorResponse,
  LabelUpdateUnionSchema,
  LabelUpdateUnion,
  LabelId,
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
import { DEFAULT_LABEL_COLORS } from "@/lib/constants/defaults"

/**
 * GET /api/labels
 *
 * Fetches all labels data including tasks, projects, and labels.
 * This API route provides the complete data structure that matches
 * the Jotai atoms used for state management.
 */
async function getLabels(
  request: EnhancedRequest,
): Promise<NextResponse<DataFileSerialization | ErrorResponse>> {
  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-label-data-file",
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
  withApiLogging(getLabels, {
    endpoint: "/api/labels",
    module: "api-labels",
  }),
)

/**
 * POST /api/labels
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
    return createErrorResponse("Failed to read data file", "File operation failed", 500)
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
    return createErrorResponse("Failed to save data", "File writing failed", 500)
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

export const POST = withMutexProtection(
  withApiLogging(createLabel, {
    endpoint: "/api/labels",
    module: "api-labels",
  }),
)

/**
 * PATCH /api/labels
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
    return createErrorResponse("Failed to update labels", "File reading or validation failed", 500)
  }

  // Update existing labels with the provided data (partial updates)
  const labelMap: Map<LabelId, Label> = new Map(
    fileData.labels.map((label: Label) => [label.id, label]),
  )
  const updatedLabels: Label[] = []
  const updatedLabelIds: LabelId[] = []

  for (const update of updates) {
    const existingLabel = labelMap.get(update.id)
    if (existingLabel) {
      // Merge update with existing label (partial update)
      const updatedLabel: Label = {
        ...existingLabel,
        ...(update.name !== undefined && { name: update.name }),
        ...(update.color !== undefined && { color: update.color }),
        ...(update.slug !== undefined && { slug: update.slug }),
      }

      // If name is being updated but slug is not explicitly provided, regenerate slug
      if (update.name && update.name !== existingLabel.name && update.slug === undefined) {
        // Filter out current label from slug generation to avoid self-collision
        const otherLabels = fileData.labels.filter((l) => l.id !== update.id)
        updatedLabel.slug = createSafeLabelNameSlug(update.name, otherLabels)
      }

      updatedLabels.push(updatedLabel)
      updatedLabelIds.push(update.id)
      labelMap.set(update.id, updatedLabel)
    }
  }

  // Update the file data with merged labels
  const updatedFileData = {
    ...fileData,
    labels: Array.from(labelMap.values()),
  }

  const writeSuccess = await withPerformanceLogging(
    () => safeWriteDataFile({ data: updatedFileData }),
    "write-label-data-file",
    request.context,
    500, // 500ms threshold for slow file writes
  )

  if (!writeSuccess) {
    return createErrorResponse("Failed to save data", "File writing failed", 500)
  }

  logBusinessEvent(
    "labels_updated",
    {
      labelCount: updatedLabels.length,
      updatedLabels: updatedLabels.map((label) => ({ id: label.id, name: label.name })),
      totalLabels: updatedFileData.labels.length,
    },
    request.context,
  )

  const response: UpdateLabelResponse = {
    success: true,
    labels: updatedLabels,
    count: updatedLabels.length,
    message: `${updatedLabels.length} label(s) updated successfully`,
  }

  return NextResponse.json<UpdateLabelResponse>(response)
}

export const PATCH = withMutexProtection(
  withApiLogging(updateLabels, {
    endpoint: "/api/labels",
    module: "api-labels",
  }),
)

/**
 * DELETE /api/labels
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
    return createErrorResponse("Failed to read data file", "File reading or validation failed", 500)
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
    return createErrorResponse("Failed to save changes", "File writing failed", 500)
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

export const DELETE = withMutexProtection(
  withApiLogging(deleteLabel, {
    endpoint: "/api/labels",
    module: "api-labels",
  }),
)
