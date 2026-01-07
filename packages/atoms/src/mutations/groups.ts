/**
 * Group mutation atoms
 *
 * Contains mutation atoms for group operations:
 * - Creating project groups
 * - Updating project groups
 * - Deleting project groups
 * - Bulk updating groups (reordering)
 *
 * Note: Groups use a special nested tree structure (not flat arrays),
 * so they use createMutation directly instead of createEntityMutation.
 */

import { v4 as uuidv4 } from "uuid";
import { type ProjectGroup, type LabelGroup } from "@tasktrove/types/group";
import { type GroupId, createGroupId } from "@tasktrove/types/id";
import {
  type CreateGroupRequest,
  type DeleteGroupRequest,
  type UpdateProjectGroupRequest,
  type BulkGroupUpdate,
  CreateGroupRequestSchema,
  UpdateProjectGroupRequestSchema,
  DeleteGroupRequestSchema,
  BulkGroupUpdateSchema,
} from "@tasktrove/types/api-requests";
import {
  type CreateGroupResponse,
  type UpdateGroupResponse,
  type DeleteGroupResponse,
  CreateGroupResponseSchema,
  UpdateGroupResponseSchema,
  DeleteGroupResponseSchema,
} from "@tasktrove/types/api-responses";
import { API_ROUTES } from "@tasktrove/types/constants";
import {
  DEFAULT_PROJECT_GROUP,
  DEFAULT_LABEL_GROUP,
} from "@tasktrove/types/defaults";
import {
  GROUPS_QUERY_KEY,
  DEFAULT_PROJECT_COLORS,
  getRandomPaletteColor,
} from "@tasktrove/constants";
import { createMutation } from "./factory";

// Type for groups cache structure
type GroupsResource = { projectGroups: ProjectGroup; labelGroups: LabelGroup };

// Default empty groups structure for cache fallback
const DEFAULT_GROUPS_RESOURCE: GroupsResource = {
  projectGroups: DEFAULT_PROJECT_GROUP,
  labelGroups: DEFAULT_LABEL_GROUP,
};

// =============================================================================
// GROUP MUTATION ATOMS
// =============================================================================

/**
 * Mutation atom for creating project groups
 *
 * Creates a new project group and optimistically adds it to the group tree.
 * The temporary ID will be replaced with the server-generated ID on success.
 */
export const createProjectGroupMutationAtom = createMutation<
  CreateGroupResponse,
  CreateGroupRequest,
  GroupsResource,
  ProjectGroup
>({
  method: "POST",
  operationName: "Created group",
  apiEndpoint: API_ROUTES.V1_GROUPS,
  resourceQueryKey: GROUPS_QUERY_KEY,
  defaultResourceValue: DEFAULT_GROUPS_RESOURCE,
  responseSchema: CreateGroupResponseSchema,
  serializationSchema: CreateGroupRequestSchema,
  logModule: "groups",
  testResponseFactory: () => ({
    success: true,
    groupIds: [createGroupId(uuidv4())],
    message: "Group created successfully (test mode)",
  }),
  optimisticDataFactory: (request: CreateGroupRequest): ProjectGroup => {
    if (request.type !== "project") {
      throw new Error(
        "Create project group mutation received non-project group request",
      );
    }
    const color =
      request.color ?? getRandomPaletteColor(DEFAULT_PROJECT_COLORS);
    return {
      type: "project",
      id: createGroupId(uuidv4()),
      name: request.name,
      description: request.description,
      color,
      items: [],
    };
  },
  optimisticUpdateFn: (
    _request: CreateGroupRequest,
    oldGroups: GroupsResource,
    optimisticGroup?: ProjectGroup,
  ): GroupsResource => {
    if (!optimisticGroup) throw new Error("Optimistic group not provided");

    return {
      ...oldGroups,
      projectGroups: {
        ...oldGroups.projectGroups,
        items: [...oldGroups.projectGroups.items, optimisticGroup],
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
export const updateProjectGroupMutationAtom = createMutation<
  UpdateGroupResponse,
  UpdateProjectGroupRequest,
  GroupsResource
>({
  method: "PATCH",
  operationName: "Updated group",
  apiEndpoint: API_ROUTES.V1_GROUPS,
  resourceQueryKey: GROUPS_QUERY_KEY,
  defaultResourceValue: DEFAULT_GROUPS_RESOURCE,
  responseSchema: UpdateGroupResponseSchema,
  serializationSchema: UpdateProjectGroupRequestSchema,
  logModule: "groups",
  testResponseFactory: (
    request: UpdateProjectGroupRequest,
  ): UpdateGroupResponse => {
    return {
      success: true,
      groups: [
        {
          type: "project",
          id: request.id,
          name: request.name || "Updated Group",
          description: request.description,
          color: request.color,
          items: request.items || [],
        },
      ],
      count: 1,
      message: "Group updated successfully (test mode)",
    };
  },
  optimisticUpdateFn: (
    request: UpdateProjectGroupRequest,
    oldGroups: GroupsResource,
  ): GroupsResource => {
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
      ...oldGroups,
      projectGroups: updateGroupInTree(oldGroups.projectGroups),
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
export const deleteProjectGroupMutationAtom = createMutation<
  DeleteGroupResponse,
  DeleteGroupRequest,
  GroupsResource
>({
  method: "DELETE",
  operationName: "Deleted group",
  apiEndpoint: API_ROUTES.V1_GROUPS,
  resourceQueryKey: GROUPS_QUERY_KEY,
  defaultResourceValue: DEFAULT_GROUPS_RESOURCE,
  responseSchema: DeleteGroupResponseSchema,
  serializationSchema: DeleteGroupRequestSchema,
  logModule: "groups",
  testResponseFactory: (request: DeleteGroupRequest) => ({
    success: true,
    groupIds: [request.id],
    message: "Group deleted successfully (test mode)",
  }),
  optimisticUpdateFn: (
    request: DeleteGroupRequest,
    oldGroups: GroupsResource,
  ): GroupsResource => {
    // Cannot delete the ROOT group itself
    if (oldGroups.projectGroups.id === request.id) {
      return oldGroups;
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
      ...oldGroups,
      projectGroups: removeGroupFromTree(oldGroups.projectGroups, request.id),
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
export const bulkUpdateGroupsMutationAtom = createMutation<
  UpdateGroupResponse,
  BulkGroupUpdate,
  GroupsResource
>({
  method: "PATCH",
  operationName: "Bulk updated groups",
  apiEndpoint: API_ROUTES.V1_GROUPS,
  resourceQueryKey: GROUPS_QUERY_KEY,
  defaultResourceValue: DEFAULT_GROUPS_RESOURCE,
  responseSchema: UpdateGroupResponseSchema,
  serializationSchema: BulkGroupUpdateSchema,
  logModule: "groups",
  testResponseFactory: (request: BulkGroupUpdate): UpdateGroupResponse => ({
    success: true,
    groups: [],
    count: request.groups.length,
    message: "Groups bulk updated successfully (test mode)",
  }),
  optimisticUpdateFn: (
    request: BulkGroupUpdate,
    oldGroups: GroupsResource,
  ): GroupsResource => {
    if (request.type === "project") {
      return {
        ...oldGroups,
        projectGroups: {
          ...oldGroups.projectGroups,
          items: request.groups,
        },
      };
    } else {
      return {
        ...oldGroups,
        labelGroups: {
          ...oldGroups.labelGroups,
          items: request.groups,
        },
      };
    }
  },
});
bulkUpdateGroupsMutationAtom.debugLabel = "bulkUpdateGroupsMutationAtom";
