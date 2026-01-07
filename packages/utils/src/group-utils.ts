/**
 * Utility functions for working with project groups
 */

import type { ProjectGroup } from "@tasktrove/types/group";
import type { GroupId, ProjectId } from "@tasktrove/types/id";
import { isGroup } from "@tasktrove/types/group";
import { GroupIdSchema } from "@tasktrove/types/id";
import { extractIdFromSlug } from "./routing";

// Helper function to validate if a string is a valid GroupId
function isValidGroupId(id: string): id is GroupId {
  try {
    GroupIdSchema.parse(id);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper function to find a group by ID in the recursive group structure
 * @param group The root group to search in
 * @param id The group ID to find
 * @returns The found group or null if not found
 */
export function findGroupById(
  group: ProjectGroup,
  id: GroupId,
): ProjectGroup | null {
  if (group.id === id) return group;

  for (const item of group.items) {
    if (isGroup<ProjectGroup>(item)) {
      const found = findGroupById(item, id);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Helper function to recursively collect all project IDs from a group and its nested groups
 * @param groups The groups data structure from allGroupsAtom
 * @param groupId The ID of the group to collect project IDs from
 * @returns Array of project IDs found in the group and its nested groups
 */
export function collectProjectIdsFromGroup(
  groups: { projectGroups: ProjectGroup; labelGroups: unknown },
  groupId: GroupId,
): ProjectId[] {
  const projectIds: ProjectId[] = [];

  const targetGroup = findGroupById(groups.projectGroups, groupId);
  if (!targetGroup) return projectIds;

  // Recursively collect project IDs from this group and nested groups
  const collectFromGroup = (group: ProjectGroup) => {
    for (const item of group.items) {
      if (isGroup<ProjectGroup>(item)) {
        // It's a nested group - recurse
        collectFromGroup(item);
      } else {
        // It's a project ID - add it
        projectIds.push(item);
      }
    }
  };

  collectFromGroup(targetGroup);
  return projectIds;
}

/**
 * Helper function to flatten all groups from the recursive structure into a flat array
 * @param group The root group to start from
 * @returns Array of all groups (including nested ones)
 */
export function getAllGroupsFlat(group: ProjectGroup): ProjectGroup[] {
  const allGroups: ProjectGroup[] = [group];

  for (const item of group.items) {
    if (isGroup<ProjectGroup>(item)) {
      allGroups.push(...getAllGroupsFlat(item));
    }
  }

  return allGroups;
}

/**
 * Resolve a group by ID or slug, similar to resolveProject and resolveLabel
 * @param idOrSlug The group ID or slug to search for
 * @param groups The groups data structure from allGroupsAtom
 * @returns The found group or null if not found
 */
export function resolveGroup(
  idOrSlug: string,
  groups: { projectGroups: ProjectGroup; labelGroups: unknown },
): ProjectGroup | null {
  const candidateId = extractIdFromSlug(idOrSlug) ?? idOrSlug;
  if (!isValidGroupId(candidateId)) return null;

  const groupId = GroupIdSchema.parse(candidateId);
  return findGroupById(groups.projectGroups, groupId);
}
