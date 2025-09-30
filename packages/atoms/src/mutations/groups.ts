/**
 * Group mutation atoms
 *
 * Contains mutation atoms for group operations:
 * - Creating project groups
 * - Updating project groups
 * - Deleting project groups
 * - Bulk updating groups (reordering)
 */

import { v4 as uuidv4 } from "uuid";
import {
  type ProjectGroup,
  type GroupId,
  type CreateGroupRequest,
  type CreateGroupResponse,
  CreateGroupResponseSchema,
  CreateGroupRequestSchema,
  type UpdateProjectGroupRequest,
  type UpdateGroupResponse,
  UpdateProjectGroupRequestSchema,
  UpdateGroupResponseSchema,
  type DeleteGroupRequest,
  type DeleteGroupResponse,
  DeleteGroupResponseSchema,
  DeleteGroupRequestSchema,
  type BulkGroupUpdate,
  BulkGroupUpdateSchema,
  createGroupId,
} from "@tasktrove/types";
import type { DataFile } from "@tasktrove/types";
import { createSafeProjectGroupNameSlug } from "@tasktrove/utils/routing";
import { createEntityMutation } from "./entity-factory";

// =============================================================================
// GROUP MUTATION ATOMS
// =============================================================================

/**
 * Mutation atom for creating project groups
 *
 * Creates a new project group and optimistically adds it to the group tree.
 * The temporary ID will be replaced with the server-generated ID on success.
 */
export const createProjectGroupMutationAtom = createEntityMutation<
  ProjectGroup,
  CreateGroupRequest,
  CreateGroupResponse
>({
  entity: "group",
  operation: "create",
  schemas: {
    request: CreateGroupRequestSchema,
    response: CreateGroupResponseSchema,
  },
  // Custom optimistic data factory for group-specific validation and defaults
  optimisticDataFactory: (request: CreateGroupRequest): ProjectGroup => {
    if (request.type !== "project") {
      throw new Error(
        "Create project group mutation received non-project group request",
      );
    }
    return {
      type: "project",
      id: createGroupId(uuidv4()),
      name: request.name,
      slug: createSafeProjectGroupNameSlug(request.name, undefined),
      description: request.description,
      color: request.color,
      items: [],
    };
  },
  // Custom optimistic update for nested projectGroups structure
  optimisticUpdateFn: (
    request: CreateGroupRequest,
    oldData: DataFile,
    optimisticGroup?: ProjectGroup,
  ) => {
    if (!optimisticGroup) throw new Error("Optimistic group not provided");

    return {
      ...oldData,
      projectGroups: {
        ...oldData.projectGroups,
        items: [...oldData.projectGroups.items, optimisticGroup],
      },
    };
  },
});
createProjectGroupMutationAtom.debugLabel = "createProjectGroupMutationAtom";

/**
 * Mutation atom for updating project groups
 *
 * Updates one or more project groups and optimistically applies changes.
 * Recursively updates groups within the ROOT group structure.
 */
export const updateProjectGroupMutationAtom = createEntityMutation<
  ProjectGroup,
  UpdateProjectGroupRequest,
  UpdateGroupResponse
>({
  entity: "group",
  operation: "update",
  schemas: {
    request: UpdateProjectGroupRequestSchema,
    response: UpdateGroupResponseSchema,
  },
  // Custom test response for group-specific structure
  testResponseFactory: (
    request: UpdateProjectGroupRequest,
  ): UpdateGroupResponse => {
    return {
      success: true,
      groups: [
        {
          type: "project" as const,
          id: request.id,
          name: request.name || "Updated Group",
          slug: request.slug || "updated-group",
          description: request.description,
          color: request.color,
          items: request.items || [],
        },
      ] as ProjectGroup[],
      count: 1,
      message: "Group updated successfully (test mode)",
    };
  },
  // Custom optimistic update for recursive group tree structure
  optimisticUpdateFn: (
    request: UpdateProjectGroupRequest,
    oldData: DataFile,
  ) => {
    const updateRequest = Array.isArray(request) ? request : [request];

    // Helper function to recursively update groups within ROOT structure
    const updateGroupInTree = (group: ProjectGroup): ProjectGroup => {
      const update = updateRequest.find((u) => u.id === group.id);
      if (update) {
        return {
          ...group,
          ...(update.name && { name: update.name }),
          ...(update.description && { description: update.description }),
          ...(update.color && { color: update.color }),
          ...(update.items && { items: update.items }),
        };
      }

      // Recursively update nested groups in items
      return {
        ...group,
        items: group.items.map((item) => {
          if (typeof item === "string") {
            return item; // ProjectId, leave unchanged
          } else {
            return updateGroupInTree(item); // Nested ProjectGroup, recurse
          }
        }),
      };
    };

    return {
      ...oldData,
      projectGroups: updateGroupInTree(oldData.projectGroups),
    };
  },
});
updateProjectGroupMutationAtom.debugLabel = "updateProjectGroupMutationAtom";

/**
 * Mutation atom for deleting project groups
 *
 * Deletes a project group and optimistically removes it from the group tree.
 * Recursively removes the group from nested structures.
 * Cannot delete the ROOT group itself.
 */
export const deleteProjectGroupMutationAtom = createEntityMutation<
  ProjectGroup,
  DeleteGroupRequest,
  DeleteGroupResponse
>({
  entity: "group",
  operation: "delete",
  schemas: {
    request: DeleteGroupRequestSchema,
    response: DeleteGroupResponseSchema,
  },
  // Custom test response for group-specific structure
  testResponseFactory: (request: DeleteGroupRequest) => ({
    success: true,
    groupIds: [request.id],
    message: "Group deleted successfully (test mode)",
  }),
  // Custom optimistic update for recursive group deletion
  optimisticUpdateFn: (request: DeleteGroupRequest, oldData: DataFile) => {
    // Cannot delete the ROOT group itself
    if (oldData.projectGroups.id === request.id) {
      return oldData;
    }

    // Remove the group recursively from ROOT group structure
    const removeGroupFromTree = (
      group: ProjectGroup,
      targetId: GroupId,
    ): ProjectGroup => {
      return {
        ...group,
        items: group.items
          .filter((item) => {
            if (typeof item === "string") return true; // Keep project IDs
            return item.id !== targetId; // Remove matching groups
          })
          .map((item) => {
            if (typeof item === "string") return item; // ProjectId, leave unchanged
            return removeGroupFromTree(item, targetId); // Recursively clean nested groups
          }),
      };
    };

    return {
      ...oldData,
      projectGroups: removeGroupFromTree(oldData.projectGroups, request.id),
    };
  },
});
deleteProjectGroupMutationAtom.debugLabel = "deleteProjectGroupMutationAtom";

/**
 * Mutation atom for bulk group updates (reordering)
 *
 * Replaces the entire items array of the ROOT group with a new structure.
 * Used primarily for reordering groups and projects.
 */
export const bulkUpdateGroupsMutationAtom = createEntityMutation<
  ProjectGroup,
  BulkGroupUpdate,
  UpdateGroupResponse
>({
  entity: "group",
  operation: "update",
  schemas: {
    request: BulkGroupUpdateSchema,
    response: UpdateGroupResponseSchema,
  },
  operationName: "Bulk updated groups",
  // Custom test response for bulk update structure
  testResponseFactory: (request: BulkGroupUpdate): UpdateGroupResponse => ({
    success: true,
    groups: request.groups as ProjectGroup[],
    count: request.groups.length,
    message: `${request.groups.length} ${request.type} group(s) bulk updated successfully (test mode)`,
  }),
  // Custom optimistic update for bulk group reordering
  optimisticUpdateFn: (request: BulkGroupUpdate, oldData: DataFile) => {
    // Replace ROOT group's items array based on type
    if (request.type === "project") {
      return {
        ...oldData,
        projectGroups: {
          ...oldData.projectGroups,
          items: request.groups,
        },
      };
    } else {
      return {
        ...oldData,
        labelGroups: {
          ...oldData.labelGroups,
          items: request.groups,
        },
      };
    }
  },
});
bulkUpdateGroupsMutationAtom.debugLabel = "bulkUpdateGroupsMutationAtom";
