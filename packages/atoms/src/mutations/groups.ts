/**
 * Group mutation atoms
 *
 * Contains mutation atoms for group operations:
 * - Creating project/label groups
 * - Updating project/label groups
 * - Deleting project groups
 * - Bulk updating groups (reordering)
 *
 * Note: Groups use a special nested tree structure (not flat arrays),
 * so they use createMutation directly instead of createEntityMutation.
 */

import { atom } from "jotai";
import { v4 as uuidv4 } from "uuid";
import type { ProjectGroup, LabelGroup, Group } from "@tasktrove/types/group";
import { type GroupId, createGroupId } from "@tasktrove/types/id";
import {
  type CreateGroupRequest,
  type DeleteGroupRequest,
  type UpdateProjectGroupRequest,
  type UpdateLabelGroupRequest,
  type BulkGroupUpdate,
  type GroupCreatePayload,
  GroupCreatePayloadSchema,
  UpdateProjectGroupRequestSchema,
  UpdateLabelGroupRequestSchema,
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
  DEFAULT_LABEL_COLORS,
  getRandomPaletteColor,
} from "@tasktrove/constants";
import { clearNullValues } from "@tasktrove/utils";
import { queryClientAtom } from "@tasktrove/atoms/data/base/query";
import { createMutation } from "./factory";

// Type for groups cache structure
type GroupsResource = { projectGroups: ProjectGroup; labelGroups: LabelGroup };

// Default empty groups structure for cache fallback
const DEFAULT_GROUPS_RESOURCE: GroupsResource = {
  projectGroups: DEFAULT_PROJECT_GROUP,
  labelGroups: DEFAULT_LABEL_GROUP,
};

// =============================================================================
// GROUP HELPERS
// =============================================================================

type GroupTree = ProjectGroup | LabelGroup;

const findGroupInTree = (
  rootGroup: GroupTree,
  groupId: GroupId,
): Group | null => {
  if (rootGroup.id === groupId) return rootGroup;

  for (const item of rootGroup.items) {
    if (typeof item === "string") continue;
    const found = findGroupInTree(item, groupId);
    if (found) return found;
  }

  return null;
};

const assertParentGroup = (
  parentId: GroupId | undefined,
  type: "project" | "label",
  groups: GroupsResource,
): void => {
  if (!parentId) return;
  const rootGroup =
    type === "project" ? groups.projectGroups : groups.labelGroups;
  const parentGroup = findGroupInTree(rootGroup, parentId);

  if (!parentGroup) {
    throw new Error(`Parent group with ID ${parentId} not found`);
  }

  if (parentGroup.type !== type) {
    throw new Error(`Cannot add ${type} group to ${parentGroup.type} group`);
  }
};

const insertProjectGroupIntoTree = (
  rootGroup: ProjectGroup,
  group: ProjectGroup,
  parentId?: GroupId,
): ProjectGroup => {
  if (!parentId || rootGroup.id === parentId) {
    return {
      ...rootGroup,
      items: [...rootGroup.items, group],
    };
  }

  return {
    ...rootGroup,
    items: rootGroup.items.map((item) => {
      if (typeof item === "string") return item;
      if (item.id === parentId) {
        return {
          ...item,
          items: [...item.items, group],
        };
      }
      return insertProjectGroupIntoTree(item, group, parentId);
    }),
  };
};

const insertLabelGroupIntoTree = (
  rootGroup: LabelGroup,
  group: LabelGroup,
  parentId?: GroupId,
): LabelGroup => {
  if (!parentId || rootGroup.id === parentId) {
    return {
      ...rootGroup,
      items: [...rootGroup.items, group],
    };
  }

  return {
    ...rootGroup,
    items: rootGroup.items.map((item) => {
      if (typeof item === "string") return item;
      if (item.id === parentId) {
        return {
          ...item,
          items: [...item.items, group],
        };
      }
      return insertLabelGroupIntoTree(item, group, parentId);
    }),
  };
};

const buildGroupCreatePayload = (
  request: CreateGroupRequest,
): GroupCreatePayload => {
  if (request.type !== "project" && request.type !== "label") {
    throw new Error(`Unsupported group type "${request.type}"`);
  }

  const color =
    request.color ??
    getRandomPaletteColor(
      request.type === "project"
        ? DEFAULT_PROJECT_COLORS
        : DEFAULT_LABEL_COLORS,
    );

  const group: ProjectGroup | LabelGroup = {
    type: request.type,
    id: createGroupId(uuidv4()),
    name: request.name,
    description: request.description,
    color,
    items: [],
  };

  return {
    group,
    parentId: request.parentId,
  };
};

const prepareProjectGroupUpdate = (
  update: UpdateProjectGroupRequest,
): UpdateProjectGroupRequest => {
  return clearNullValues(update);
};

const prepareLabelGroupUpdate = (
  update: UpdateLabelGroupRequest,
): UpdateLabelGroupRequest => {
  return clearNullValues(update);
};

// =============================================================================
// GROUP MUTATION ATOMS
// =============================================================================

const createGroupMutationAtomBase = createMutation<
  CreateGroupResponse,
  GroupCreatePayload,
  GroupsResource,
  Group
>({
  method: "POST",
  operationName: "Created group",
  apiEndpoint: API_ROUTES.V1_GROUPS,
  resourceQueryKey: GROUPS_QUERY_KEY,
  defaultResourceValue: DEFAULT_GROUPS_RESOURCE,
  responseSchema: CreateGroupResponseSchema,
  serializationSchema: GroupCreatePayloadSchema,
  logModule: "groups",
  testResponseFactory: (request: GroupCreatePayload) => ({
    success: true,
    groupIds: [request.group.id],
    message: "Group created successfully (test mode)",
  }),
  optimisticDataFactory: (request: GroupCreatePayload) => request.group,
  optimisticUpdateFn: (
    request: GroupCreatePayload,
    oldGroups: GroupsResource,
    optimisticGroup?: Group,
  ): GroupsResource => {
    if (!optimisticGroup) throw new Error("Optimistic group not provided");

    if (optimisticGroup.type === "project") {
      return {
        ...oldGroups,
        projectGroups: insertProjectGroupIntoTree(
          oldGroups.projectGroups,
          optimisticGroup,
          request.parentId,
        ),
      };
    }

    return {
      ...oldGroups,
      labelGroups: insertLabelGroupIntoTree(
        oldGroups.labelGroups,
        optimisticGroup,
        request.parentId,
      ),
    };
  },
});

/**
 * Mutation atom for creating project groups
 *
 * Creates a new project group and optimistically adds it to the group tree.
 * The ID/color are generated on the client.
 */
export const createProjectGroupMutationAtom = atom((get) => {
  const baseMutation = get(createGroupMutationAtomBase);
  const queryClient = get(queryClientAtom);

  const buildPayload = (request: CreateGroupRequest): GroupCreatePayload => {
    if (request.type !== "project") {
      throw new Error(
        "Create project group mutation received non-project group request",
      );
    }
    const groups =
      queryClient.getQueryData<GroupsResource>(GROUPS_QUERY_KEY) ??
      DEFAULT_GROUPS_RESOURCE;
    assertParentGroup(request.parentId, "project", groups);
    return buildGroupCreatePayload(request);
  };

  return {
    ...baseMutation,
    mutateAsync: async (
      request: CreateGroupRequest,
      options?: Parameters<typeof baseMutation.mutateAsync>[1],
    ) => baseMutation.mutateAsync(buildPayload(request), options),
    mutate: (
      request: CreateGroupRequest,
      options?: Parameters<typeof baseMutation.mutate>[1],
    ) => baseMutation.mutate(buildPayload(request), options),
  };
});
createProjectGroupMutationAtom.debugLabel = "createProjectGroupMutationAtom";

/**
 * Mutation atom for creating label groups
 *
 * Creates a new label group and optimistically adds it to the group tree.
 * The ID/color are generated on the client.
 */
export const createLabelGroupMutationAtom = atom((get) => {
  const baseMutation = get(createGroupMutationAtomBase);
  const queryClient = get(queryClientAtom);

  const buildPayload = (request: CreateGroupRequest): GroupCreatePayload => {
    if (request.type !== "label") {
      throw new Error(
        "Create label group mutation received non-label group request",
      );
    }
    const groups =
      queryClient.getQueryData<GroupsResource>(GROUPS_QUERY_KEY) ??
      DEFAULT_GROUPS_RESOURCE;
    assertParentGroup(request.parentId, "label", groups);
    return buildGroupCreatePayload(request);
  };

  return {
    ...baseMutation,
    mutateAsync: async (
      request: CreateGroupRequest,
      options?: Parameters<typeof baseMutation.mutateAsync>[1],
    ) => baseMutation.mutateAsync(buildPayload(request), options),
    mutate: (
      request: CreateGroupRequest,
      options?: Parameters<typeof baseMutation.mutate>[1],
    ) => baseMutation.mutate(buildPayload(request), options),
  };
});
createLabelGroupMutationAtom.debugLabel = "createLabelGroupMutationAtom";

/**
 * Mutation atom for updating project groups
 *
 * Updates one or more project groups and optimistically applies changes.
 * Recursively updates groups within the ROOT group structure.
 */
const updateProjectGroupMutationAtomBase = createMutation<
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
    const updateRequest = [request];

    // Helper function to recursively update groups within ROOT structure
    const updateGroupInTree = (group: ProjectGroup): ProjectGroup => {
      const update = updateRequest.find((u) => u.id === group.id);
      if (update) {
        return {
          ...group,
          ...(update.name !== undefined && { name: update.name }),
          ...(update.description !== undefined && {
            description: update.description,
          }),
          ...(update.color !== undefined && { color: update.color }),
          ...(update.items !== undefined && { items: update.items }),
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
export const updateProjectGroupMutationAtom = atom((get) => {
  const baseMutation = get(updateProjectGroupMutationAtomBase);

  const prepareUpdate = (
    update: UpdateProjectGroupRequest,
  ): UpdateProjectGroupRequest => {
    return prepareProjectGroupUpdate(update);
  };

  return {
    ...baseMutation,
    mutateAsync: async (
      update: UpdateProjectGroupRequest,
      options?: Parameters<typeof baseMutation.mutateAsync>[1],
    ) => baseMutation.mutateAsync(prepareUpdate(update), options),
    mutate: (
      update: UpdateProjectGroupRequest,
      options?: Parameters<typeof baseMutation.mutate>[1],
    ) => baseMutation.mutate(prepareUpdate(update), options),
  };
});
updateProjectGroupMutationAtom.debugLabel = "updateProjectGroupMutationAtom";

/**
 * Mutation atom for updating label groups
 *
 * Updates label group properties and optimistically applies changes.
 */
const updateLabelGroupMutationAtomBase = createMutation<
  UpdateGroupResponse,
  UpdateLabelGroupRequest,
  GroupsResource
>({
  method: "PATCH",
  operationName: "Updated group",
  apiEndpoint: API_ROUTES.V1_GROUPS,
  resourceQueryKey: GROUPS_QUERY_KEY,
  defaultResourceValue: DEFAULT_GROUPS_RESOURCE,
  responseSchema: UpdateGroupResponseSchema,
  serializationSchema: UpdateLabelGroupRequestSchema,
  logModule: "groups",
  testResponseFactory: (
    request: UpdateLabelGroupRequest,
  ): UpdateGroupResponse => {
    return {
      success: true,
      groups: [
        {
          type: "label",
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
    request: UpdateLabelGroupRequest,
    oldGroups: GroupsResource,
  ): GroupsResource => {
    const updateRequest = [request];

    const updateGroupInTree = (group: LabelGroup): LabelGroup => {
      const update = updateRequest.find((u) => u.id === group.id);
      if (update) {
        return {
          ...group,
          ...(update.name !== undefined && { name: update.name }),
          ...(update.description !== undefined && {
            description: update.description,
          }),
          ...(update.color !== undefined && { color: update.color }),
          ...(update.items !== undefined && { items: update.items }),
        };
      }

      return {
        ...group,
        items: group.items.map((item) => {
          if (typeof item === "string") {
            return item;
          }
          return updateGroupInTree(item);
        }),
      };
    };

    return {
      ...oldGroups,
      labelGroups: updateGroupInTree(oldGroups.labelGroups),
    };
  },
});

export const updateLabelGroupMutationAtom = atom((get) => {
  const baseMutation = get(updateLabelGroupMutationAtomBase);

  const prepareUpdate = (
    update: UpdateLabelGroupRequest,
  ): UpdateLabelGroupRequest => {
    return prepareLabelGroupUpdate(update);
  };

  return {
    ...baseMutation,
    mutateAsync: async (
      update: UpdateLabelGroupRequest,
      options?: Parameters<typeof baseMutation.mutateAsync>[1],
    ) => baseMutation.mutateAsync(prepareUpdate(update), options),
    mutate: (
      update: UpdateLabelGroupRequest,
      options?: Parameters<typeof baseMutation.mutate>[1],
    ) => baseMutation.mutate(prepareUpdate(update), options),
  };
});
updateLabelGroupMutationAtom.debugLabel = "updateLabelGroupMutationAtom";

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
