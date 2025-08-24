import { NextResponse } from "next/server"
import {
  Group,
  TaskGroup,
  ProjectGroup,
  LabelGroup,
  DeleteGroupRequestSchema,
  CreateGroupRequestSchema,
  CreateGroupResponse,
  UpdateGroupResponse,
  DeleteGroupResponse,
  DataFileSerializationSchema,
  createGroupId,
  DataFileSerialization,
  ErrorResponse,
  GroupUpdateUnionSchema,
  GroupUpdateUnion,
  GroupId,
} from "@/lib/types"
import { validateRequestBody, createErrorResponse } from "@/lib/utils/validation"
import { safeReadDataFile, safeWriteDataFile } from "@/lib/utils/safe-file-operations"
import { v4 as uuidv4 } from "uuid"
import {
  withApiLogging,
  logBusinessEvent,
  withFileOperationLogging,
  withPerformanceLogging,
  type EnhancedRequest,
} from "@/lib/middleware/api-logger"
import { withMutexProtection } from "@/lib/utils/api-mutex"
import { DEFAULT_LABEL_COLORS } from "@/lib/constants/defaults"
import { isGroup } from "@/lib/types"

/**
 * GET /api/groups
 *
 * Fetches all groups data including tasks, projects, labels, and all group trees.
 * This API route provides the complete data structure that matches
 * the Jotai atoms used for state management.
 */
async function getGroups(
  request: EnhancedRequest,
): Promise<NextResponse<DataFileSerialization | ErrorResponse>> {
  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-groups-data-file",
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
  withApiLogging(getGroups, {
    endpoint: "/api/groups",
    module: "api-groups",
  }),
)

/**
 * Utility function to find a group by ID in any tree
 */
function findGroupInTrees(
  taskGroups: TaskGroup[],
  projectGroups: ProjectGroup[],
  labelGroups: LabelGroup[],
  groupId: GroupId,
): { group: Group; tree: "task" | "project" | "label"; parent?: Group } | null {
  function searchInTree(
    groups: Group[],
    treeType: "task" | "project" | "label",
    parent?: Group,
  ): { group: Group; tree: "task" | "project" | "label"; parent?: Group } | null {
    for (const group of groups) {
      if (group.id === groupId) {
        return { group, tree: treeType, parent }
      }

      // Search in nested groups - filter for Group objects in items array
      const nestedGroups = group.items.filter(isGroup<Group>)

      const found = searchInTree(nestedGroups, treeType, group)
      if (found) {
        return found
      }
    }
    return null
  }

  return (
    searchInTree(taskGroups, "task") ||
    searchInTree(projectGroups, "project") ||
    searchInTree(labelGroups, "label")
  )
}

/**
 * POST /api/groups
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
    return createErrorResponse("Failed to read data file", "File operation failed", 500)
  }

  const { type, name, description, color, parentId } = validation.data

  // Find parent group in appropriate tree
  const parentResult = findGroupInTrees(
    fileData.taskGroups || [],
    fileData.projectGroups || [],
    fileData.labelGroups || [],
    parentId,
  )

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

  if (parentGroup.type === "task") {
    const newTaskGroup: TaskGroup = {
      type: "task",
      id: newGroupId,
      name,
      description,
      color: color ?? DEFAULT_LABEL_COLORS[0],
      items: [],
    }
    parentGroup.items.push(newTaskGroup)
    newGroup = newTaskGroup
  } else if (parentGroup.type === "project") {
    const newProjectGroup: ProjectGroup = {
      type: "project",
      id: newGroupId,
      name,
      description,
      color: color ?? DEFAULT_LABEL_COLORS[0],
      items: [],
    }
    parentGroup.items.push(newProjectGroup)
    newGroup = newProjectGroup
  } else if (parentGroup.type === "label") {
    const newLabelGroup: LabelGroup = {
      type: "label",
      id: newGroupId,
      name,
      description,
      color: color ?? DEFAULT_LABEL_COLORS[0],
      items: [],
    }
    parentGroup.items.push(newLabelGroup)
    newGroup = newLabelGroup
  } else {
    // This should never happen due to type validation above, but satisfy TypeScript
    return createErrorResponse("Invalid group type", `Unsupported group type: ${type}`, 400)
  }

  const writeSuccess = await withPerformanceLogging(
    () => safeWriteDataFile({ data: fileData }),
    "write-groups-data-file",
    request.context,
    500, // 500ms threshold for slow file writes
  )

  if (!writeSuccess) {
    return createErrorResponse("Failed to save data", "File writing failed", 500)
  }

  logBusinessEvent(
    "group_created",
    {
      groupId: newGroup.id,
      name: newGroup.name,
      type: newGroup.type,
      parentId: parentId,
      totalGroups: {
        task: fileData.taskGroups?.length || 0,
        project: fileData.projectGroups?.length || 0,
        label: fileData.labelGroups?.length || 0,
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

export const POST = withMutexProtection(
  withApiLogging(createGroup, {
    endpoint: "/api/groups",
    module: "api-groups",
  }),
)

/**
 * PATCH /api/groups
 *
 * Updates groups. Accepts an array of group updates or single update.
 * Updates group properties in-place within the tree structure.
 * Uses typed responses for consistency.
 */
async function updateGroups(
  request: EnhancedRequest,
): Promise<NextResponse<UpdateGroupResponse | ErrorResponse>> {
  // Validate request body using the union schema
  const validation = await validateRequestBody(request, GroupUpdateUnionSchema)
  if (!validation.success) {
    return validation.error
  }

  // Normalize to array format
  const updates: GroupUpdateUnion = Array.isArray(validation.data)
    ? validation.data
    : [validation.data]

  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-groups-data-file",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse("Failed to update groups", "File reading or validation failed", 500)
  }

  const updatedGroups: Group[] = []
  const updatedGroupIds: GroupId[] = []

  for (const update of updates) {
    const groupResult = findGroupInTrees(
      fileData.taskGroups || [],
      fileData.projectGroups || [],
      fileData.labelGroups || [],
      update.id,
    )

    if (groupResult) {
      // Update group properties in-place
      const group = groupResult.group
      if (update.name !== undefined) {
        group.name = update.name
      }
      if (update.description !== undefined) {
        group.description = update.description
      }
      if (update.color !== undefined) {
        group.color = update.color
      }

      updatedGroups.push(group)
      updatedGroupIds.push(update.id)
    }
  }

  const writeSuccess = await withPerformanceLogging(
    () => safeWriteDataFile({ data: fileData }),
    "write-groups-data-file",
    request.context,
    500, // 500ms threshold for slow file writes
  )

  if (!writeSuccess) {
    return createErrorResponse("Failed to save data", "File writing failed", 500)
  }

  logBusinessEvent(
    "groups_updated",
    {
      groupCount: updatedGroups.length,
      updatedGroups: updatedGroups.map((group) => ({
        id: group.id,
        name: group.name,
        type: group.type,
      })),
      totalGroups: {
        task: fileData.taskGroups?.length || 0,
        project: fileData.projectGroups?.length || 0,
        label: fileData.labelGroups?.length || 0,
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

export const PATCH = withMutexProtection(
  withApiLogging(updateGroups, {
    endpoint: "/api/groups",
    module: "api-groups",
  }),
)

/**
 * Utility function to remove a group from any tree (recursively)
 */
function removeGroupFromTree(groups: Group[], groupId: GroupId): boolean {
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]
    if (group.id === groupId) {
      groups.splice(i, 1)
      return true
    }

    // Search in nested groups using type guard
    const nestedGroups = group.items.filter(isGroup<Group>)

    if (removeGroupFromTree(nestedGroups, groupId)) {
      // Update the items array to reflect the removal using discriminated union narrowing
      if (group.type === "task") {
        group.items = group.items.filter((item) => !isGroup<Group>(item) || item.id !== groupId)
      } else if (group.type === "project") {
        group.items = group.items.filter((item) => !isGroup<Group>(item) || item.id !== groupId)
      } else if (group.type === "label") {
        group.items = group.items.filter((item) => !isGroup<Group>(item) || item.id !== groupId)
      }
      return true
    }
  }
  return false
}

/**
 * DELETE /api/groups
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
    return createErrorResponse("Failed to read data file", "File reading or validation failed", 500)
  }

  // Try to remove from each tree
  let deleted = false
  deleted =
    removeGroupFromTree(fileData.taskGroups || [], groupId) ||
    removeGroupFromTree(fileData.projectGroups || [], groupId) ||
    removeGroupFromTree(fileData.labelGroups || [], groupId)

  const writeSuccess = await withPerformanceLogging(
    () => safeWriteDataFile({ data: fileData }),
    "write-groups-data-file",
    request.context,
    500, // 500ms threshold for slow file writes
  )

  if (!writeSuccess) {
    return createErrorResponse("Failed to save changes", "File writing failed", 500)
  }

  const deletedCount = deleted ? 1 : 0

  logBusinessEvent(
    "group_deleted",
    {
      groupId,
      deletedCount,
      remainingGroups: {
        task: fileData.taskGroups?.length || 0,
        project: fileData.projectGroups?.length || 0,
        label: fileData.labelGroups?.length || 0,
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

export const DELETE = withMutexProtection(
  withApiLogging(deleteGroup, {
    endpoint: "/api/groups",
    module: "api-groups",
  }),
)
