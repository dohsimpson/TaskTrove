import { NextResponse } from "next/server"
import {
  Group,
  ProjectGroup,
  LabelGroup,
  DeleteGroupRequestSchema,
  CreateGroupRequestSchema,
  CreateGroupResponse,
  UpdateGroupResponse,
  DeleteGroupResponse,
  DataFileSerializationSchema,
  createGroupId,
  createProjectId,
  ErrorResponse,
  ApiErrorCode,
  GroupUpdateUnionSchema,
  GroupUpdateUnion,
  BulkGroupUpdateSchema,
  BulkGroupUpdate,
  GroupId,
  GetGroupsResponse,
} from "@/lib/types"
import { validateRequestBody, createErrorResponse } from "@/lib/utils/validation"
import { safeReadDataFile, safeWriteDataFile } from "@/lib/utils/safe-file-operations"
import { v4 as uuidv4 } from "uuid"
import { createSafeProjectGroupNameSlug, createSafeLabelGroupNameSlug } from "@/lib/utils/routing"
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
import { isGroup } from "@/lib/types"

/**
 * GET /api/v1/groups
 *
 * Fetches only groups data with metadata.
 * Returns both project and label group hierarchies with count, timestamp, and version information.
 */
async function getGroups(
  request: EnhancedRequest,
): Promise<NextResponse<GetGroupsResponse | ErrorResponse>> {
  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-groups-data-file",
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
    "groups_fetched",
    {
      projectGroupsCount: 1,
      labelGroupsCount: 1,
    },
    request.context,
  )

  // Build response with only groups and metadata
  const response: GetGroupsResponse = {
    projectGroups: serializedData.projectGroups,
    labelGroups: serializedData.labelGroups,
    meta: {
      count: 2, // One root group for projects, one for labels
      timestamp: new Date().toISOString(),
      version: serializedData.version || "v0.7.0",
    },
  }

  return NextResponse.json<GetGroupsResponse>(response, {
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
      withApiLogging(getGroups, {
        endpoint: "/api/v1/groups",
        module: "api-v1-groups",
      }),
      { allowApiToken: true },
    ),
  ),
)

/**
 * Utility function to find a group by ID in any tree
 */
function findGroupInTrees(
  projectGroups: ProjectGroup,
  labelGroups: LabelGroup,
  groupId: GroupId,
): { group: Group; tree: "project" | "label"; parent?: Group } | null {
  function searchInGroup(
    rootGroup: Group,
    treeType: "project" | "label",
    parent?: Group,
  ): { group: Group; tree: "project" | "label"; parent?: Group } | null {
    if (rootGroup.id === groupId) {
      return { group: rootGroup, tree: treeType, parent }
    }

    // Search in nested groups - filter for Group objects in items array
    const nestedGroups = rootGroup.items.filter(isGroup<Group>)

    for (const group of nestedGroups) {
      const found = searchInGroup(group, treeType, rootGroup)
      if (found) {
        return found
      }
    }
    return null
  }

  return searchInGroup(projectGroups, "project") || searchInGroup(labelGroups, "label")
}

/**
 * POST /api/v1/groups
 *
 * Creates a new group with the provided data.
 * This endpoint adds the group to the appropriate tree based on parentId.
 */
async function createGroup(
  request: EnhancedRequest,
): Promise<NextResponse<CreateGroupResponse | ErrorResponse>> {
  // Validate request body using partial schema to allow defaults
  const validation = await validateRequestBody(request, CreateGroupRequestSchema)
  if (!validation.success) {
    return validation.error
  }

  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-groups-data-file",
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

  const { type, name, description, color, parentId } = validation.data

  // Handle root-level groups (no parent)
  if (!parentId) {
    // Create new group at root level
    const newGroupId = createGroupId(uuidv4())
    let newGroup: Group

    if (type === "project") {
      const newProjectGroup: ProjectGroup = {
        type: "project",
        id: newGroupId,
        name,
        slug: createSafeProjectGroupNameSlug(name, fileData.projectGroups),
        description,
        color: color ?? DEFAULT_LABEL_COLORS[0],
        items: [],
      }
      // Add to root projectGroups items
      fileData.projectGroups.items.push(newProjectGroup)
      newGroup = newProjectGroup
    } else {
      const newLabelGroup: LabelGroup = {
        type: "label",
        id: newGroupId,
        name,
        slug: createSafeLabelGroupNameSlug(name, fileData.labelGroups),
        description,
        color: color ?? DEFAULT_LABEL_COLORS[0],
        items: [],
      }
      // Add to root labelGroups items
      fileData.labelGroups.items.push(newLabelGroup)
      newGroup = newLabelGroup
    }

    const writeSuccess = await withPerformanceLogging(
      () => safeWriteDataFile({ data: fileData }),
      "write-groups-data-file",
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
      "group_created",
      {
        groupId: newGroup.id,
        name: newGroup.name,
        type: newGroup.type,
        parentId: null,
        totalGroups: {
          project: 1,
          label: 1,
        },
      },
      request.context,
    )

    const response: CreateGroupResponse = {
      success: true,
      groupIds: [newGroup.id],
      message: "Group created successfully",
    }

    return NextResponse.json<CreateGroupResponse>(response)
  }

  // Find parent group in appropriate tree
  const parentResult = findGroupInTrees(fileData.projectGroups, fileData.labelGroups, parentId)

  if (!parentResult) {
    return createErrorResponse(
      "Parent group not found",
      `Parent group with ID ${parentId} not found`,
      404,
    )
  }

  // Ensure the parent group type matches the new group type
  const parentGroup = parentResult.group
  if (parentGroup.type !== type) {
    return createErrorResponse(
      "Type mismatch",
      `Cannot add ${type} group to ${parentGroup.type} group`,
      400,
    )
  }

  // Create new group with discriminated union narrowing
  const newGroupId = createGroupId(uuidv4())
  let newGroup: Group

  if (parentGroup.type === "project") {
    const newProjectGroup: ProjectGroup = {
      type: "project",
      id: newGroupId,
      name,
      slug: createSafeProjectGroupNameSlug(name, fileData.projectGroups),
      description,
      color: color ?? DEFAULT_LABEL_COLORS[0],
      items: [],
    }
    parentGroup.items.push(newProjectGroup)
    newGroup = newProjectGroup
  } else {
    const newLabelGroup: LabelGroup = {
      type: "label",
      id: newGroupId,
      name,
      slug: createSafeLabelGroupNameSlug(name, fileData.labelGroups),
      description,
      color: color ?? DEFAULT_LABEL_COLORS[0],
      items: [],
    }
    parentGroup.items.push(newLabelGroup)
    newGroup = newLabelGroup
  }

  const writeSuccess = await withPerformanceLogging(
    () => safeWriteDataFile({ data: fileData }),
    "write-groups-data-file",
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
    "group_created",
    {
      groupId: newGroup.id,
      name: newGroup.name,
      type: newGroup.type,
      parentId: parentId,
      totalGroups: {
        project: 1,
        label: 1,
      },
    },
    request.context,
  )

  const response: CreateGroupResponse = {
    success: true,
    groupIds: [newGroup.id],
    message: "Group created successfully",
  }

  return NextResponse.json<CreateGroupResponse>(response)
}

export const POST = withApiVersion(
  withMutexProtection(
    withAuthentication(
      withApiLogging(createGroup, {
        endpoint: "/api/v1/groups",
        module: "api-v1-groups",
      }),
      { allowApiToken: true },
    ),
  ),
)

/**
 * PATCH /api/v1/groups
 *
 * Updates groups. Supports two modes:
 * 1. Bulk update: Replace entire projectGroups or labelGroups array (for reordering)
 * 2. Individual updates: Update specific group properties
 */
async function updateGroups(
  request: EnhancedRequest,
): Promise<NextResponse<UpdateGroupResponse | ErrorResponse>> {
  const requestBody = await request.json()

  // Try bulk update first (for reordering)
  const bulkValidation = BulkGroupUpdateSchema.safeParse(requestBody)
  if (bulkValidation.success) {
    return handleBulkGroupUpdate(bulkValidation.data, request)
  }

  // Fallback to individual updates
  const individualValidation = GroupUpdateUnionSchema.safeParse(requestBody)
  if (!individualValidation.success) {
    return createErrorResponse(
      "Invalid request format",
      "Request must be either bulk group update or individual group updates",
      400,
    )
  }

  return handleIndividualGroupUpdates(individualValidation.data, request)
}

/**
 * Handle bulk group updates (replace entire array)
 */
async function handleBulkGroupUpdate(
  bulkUpdate: BulkGroupUpdate,
  request: EnhancedRequest,
): Promise<NextResponse<UpdateGroupResponse | ErrorResponse>> {
  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-groups-data-file",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse(
      "Failed to update groups",
      "File reading or validation failed",
      500,
      ApiErrorCode.DATA_FILE_READ_ERROR,
    )
  }

  // Replace ROOT group's items based on type
  if (bulkUpdate.type === "project") {
    fileData.projectGroups.items = bulkUpdate.groups
  } else {
    fileData.labelGroups.items = bulkUpdate.groups
  }

  const writeSuccess = await withPerformanceLogging(
    () => safeWriteDataFile({ data: fileData }),
    "write-groups-data-file",
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
    "groups_bulk_updated",
    {
      type: bulkUpdate.type,
      groupCount: bulkUpdate.groups.length,
      totalGroups: {
        project: 1,
        label: 1,
      },
    },
    request.context,
  )

  const response: UpdateGroupResponse = {
    success: true,
    groups: bulkUpdate.groups,
    count: bulkUpdate.groups.length,
    message: `${bulkUpdate.groups.length} ${bulkUpdate.type} group(s) updated successfully`,
  }

  return NextResponse.json<UpdateGroupResponse>(response)
}

/**
 * Handle individual group updates (existing behavior)
 */
async function handleIndividualGroupUpdates(
  requestData: GroupUpdateUnion,
  request: EnhancedRequest,
): Promise<NextResponse<UpdateGroupResponse | ErrorResponse>> {
  // Normalize to array format
  const updates: GroupUpdateUnion = Array.isArray(requestData) ? requestData : [requestData]

  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-groups-data-file",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse(
      "Failed to update groups",
      "File reading or validation failed",
      500,
      ApiErrorCode.DATA_FILE_READ_ERROR,
    )
  }

  const updatedGroups: Group[] = []
  const updatedGroupIds: GroupId[] = []

  for (const update of updates) {
    const groupResult = findGroupInTrees(fileData.projectGroups, fileData.labelGroups, update.id)

    if (!groupResult) {
      return createErrorResponse(`Group not found: ${update.id}`, "GROUP_NOT_FOUND", 404)
    }

    const group = groupResult.group

    // Type consistency check - verify client type matches stored type
    if (group.type !== update.type) {
      return createErrorResponse(
        `Type mismatch: group ${update.id} is type "${group.type}" but update specifies "${update.type}"`,
        "TYPE_MISMATCH",
        400,
      )
    }

    // Update group properties in-place
    if (update.name !== undefined) {
      group.name = update.name
      // If name is being updated but slug is not explicitly provided, regenerate slug
      if (update.slug === undefined) {
        if (group.type === "project") {
          group.slug = createSafeProjectGroupNameSlug(update.name, fileData.projectGroups)
        } else {
          group.slug = createSafeLabelGroupNameSlug(update.name, fileData.labelGroups)
        }
      }
    }
    if (update.slug !== undefined) {
      group.slug = update.slug
    }
    if (update.description !== undefined) {
      group.description = update.description
    }
    if (update.color !== undefined) {
      group.color = update.color
    }
    if (update.items !== undefined) {
      // Direct assignment - items already validated by discriminated union
      // Type consistency was already validated above
      group.items = update.items
    }

    updatedGroups.push(group)
    updatedGroupIds.push(update.id)
  }

  const writeSuccess = await withPerformanceLogging(
    () => safeWriteDataFile({ data: fileData }),
    "write-groups-data-file",
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
    "groups_updated",
    {
      groupCount: updatedGroups.length,
      updatedGroups: updatedGroups.map((group) => ({
        id: group.id,
        name: group.name,
        type: group.type,
        itemsCount: group.items.length,
      })),
      totalGroups: {
        project: 1,
        label: 1,
      },
    },
    request.context,
  )

  const response: UpdateGroupResponse = {
    success: true,
    groups: updatedGroups,
    count: updatedGroups.length,
    message: `${updatedGroups.length} group(s) updated successfully`,
  }

  return NextResponse.json<UpdateGroupResponse>(response)
}

export const PATCH = withApiVersion(
  withMutexProtection(
    withAuthentication(
      withApiLogging(updateGroups, {
        endpoint: "/api/v1/groups",
        module: "api-v1-groups",
      }),
      { allowApiToken: true },
    ),
  ),
)

/**
 * Utility function to remove a group from a ROOT group (recursively)
 */
function removeGroupFromRootGroup(rootGroup: Group, groupId: GroupId): boolean {
  // Check if we're trying to delete the ROOT group itself (not allowed)
  if (rootGroup.id === groupId) {
    return false // Cannot delete ROOT groups
  }

  // Remove from immediate children
  const nestedGroups = rootGroup.items.filter(isGroup<Group>)
  for (let i = 0; i < nestedGroups.length; i++) {
    const group = nestedGroups[i]
    if (!group) continue

    if (group.id === groupId) {
      // Remove from ROOT group's items with proper type narrowing
      if (rootGroup.type === "project") {
        rootGroup.items = rootGroup.items.filter(
          (item) => typeof item === "string" || item.id !== groupId,
        )
      } else {
        rootGroup.items = rootGroup.items.filter(
          (item) => typeof item === "string" || item.id !== groupId,
        )
      }
      return true
    }

    // Recursively search in nested groups - group is guaranteed to be defined here
    if (removeGroupFromRootGroup(group, groupId)) {
      return true
    }
  }

  return false
}

/**
 * DELETE /api/v1/groups
 *
 * Deletes a group by ID. Accepts a single group ID.
 * Removes the group and all its children (cascade delete).
 * Uses proper Zod schema validation and typed responses.
 */
async function deleteGroup(
  request: EnhancedRequest,
): Promise<NextResponse<DeleteGroupResponse | ErrorResponse>> {
  // Validate request body using Zod schema
  const validation = await validateRequestBody(request, DeleteGroupRequestSchema)
  if (!validation.success) {
    return validation.error
  }

  const { id: groupId } = validation.data

  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-groups-data-file",
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

  // Find the group to be deleted to extract contained projects
  const groupResult = findGroupInTrees(fileData.projectGroups, fileData.labelGroups, groupId)

  if (groupResult && groupResult.group.type === "project") {
    // Extract any contained projects (string items) from the group being deleted
    const containedProjects: string[] = groupResult.group.items.filter(
      (item) => typeof item === "string",
    )

    // Move contained projects to the root project group
    if (containedProjects.length > 0) {
      fileData.projectGroups.items.push(...containedProjects.map((id) => createProjectId(id)))
    }
  }

  // Try to remove from each ROOT group
  let deleted = false

  deleted = removeGroupFromRootGroup(fileData.projectGroups, groupId)

  if (!deleted) {
    deleted = removeGroupFromRootGroup(fileData.labelGroups, groupId)
  }

  const writeSuccess = await withPerformanceLogging(
    () => safeWriteDataFile({ data: fileData }),
    "write-groups-data-file",
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

  const deletedCount = deleted ? 1 : 0

  logBusinessEvent(
    "group_deleted",
    {
      groupId,
      deletedCount,
      remainingGroups: {
        project: 1,
        label: 1,
      },
    },
    request.context,
  )

  const response: DeleteGroupResponse = {
    success: true,
    groupIds: [groupId],
    message: `${deletedCount} group(s) deleted successfully`,
  }

  return NextResponse.json<DeleteGroupResponse>(response)
}

export const DELETE = withApiVersion(
  withMutexProtection(
    withAuthentication(
      withApiLogging(deleteGroup, {
        endpoint: "/api/v1/groups",
        module: "api-v1-groups",
      }),
      { allowApiToken: true },
    ),
  ),
)
