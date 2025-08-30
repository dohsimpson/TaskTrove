import { atom } from "jotai"
import type {
  GroupId,
  ProjectGroup,
  LabelGroup,
  ProjectId,
  CreateGroupRequest,
  UpdateProjectGroupRequest,
  DeleteGroupRequest,
} from "@/lib/types"
import { isGroup } from "@/lib/types"
import { ROOT_LABEL_GROUP_ID, ROOT_PROJECT_GROUP_ID } from "@/lib/types/defaults"
import { log } from "@/lib/utils/logger"
import {
  createProjectGroupMutationAtom,
  updateProjectGroupMutationAtom,
  deleteProjectGroupMutationAtom,
  dataQueryAtom,
} from "./base"

// Groups data comes from dataQueryAtom, following same pattern as projectsAtom

// Derived atoms for each group type
export const allGroupsAtom = atom((get) => {
  const result = get(dataQueryAtom)

  // Handle TanStack Query result structure - follow same pattern as projectsAtom
  if ("data" in result && result.data) {
    return {
      projectGroups: result.data.projectGroups ?? {
        type: "project" as const,
        id: ROOT_PROJECT_GROUP_ID,
        name: "All Projects",
        slug: "all-projects",
        items: [],
      },
      labelGroups: result.data.labelGroups ?? {
        type: "label" as const,
        id: ROOT_LABEL_GROUP_ID,
        name: "All Labels",
        slug: "all-labels",
        items: [],
      },
    }
  }

  return {
    projectGroups: {
      type: "project" as const,
      id: ROOT_PROJECT_GROUP_ID,
      name: "All Projects",
      slug: "all-projects",
      items: [],
    },
    labelGroups: {
      type: "label" as const,
      id: ROOT_LABEL_GROUP_ID,
      name: "All Labels",
      slug: "all-labels",
      items: [],
    },
  }
})

export const projectGroupsAtom = atom((get) => {
  const groups = get(allGroupsAtom)
  // Extract the items from the ROOT project group and flatten any nested groups
  const flattenGroups = (group: ProjectGroup): ProjectGroup[] => {
    const result: ProjectGroup[] = []
    for (const item of group.items) {
      if (typeof item === "string") {
        // It's a ProjectId, skip for this function
        continue
      } else {
        // It's a ProjectGroup
        result.push(item)
        result.push(...flattenGroups(item))
      }
    }
    return result
  }
  return flattenGroups(groups.projectGroups)
})

export const labelGroupsAtom = atom((get) => {
  const groups = get(allGroupsAtom)
  // Extract the items from the ROOT label group and flatten any nested groups
  const flattenGroups = (group: LabelGroup): LabelGroup[] => {
    const result: LabelGroup[] = []
    for (const item of group.items) {
      if (typeof item === "string") {
        // It's a LabelId, skip for this function
        continue
      } else {
        // It's a LabelGroup
        result.push(item)
        result.push(...flattenGroups(item))
      }
    }
    return result
  }
  return flattenGroups(groups.labelGroups)
})

// CRUD Mutation atoms are now imported from base.ts

// Action atoms for CRUD operations
export const addProjectGroupAtom = atom(
  null,
  async (
    get,
    set,
    groupData: {
      name: string
      description?: string
      color?: string
      parentId?: GroupId
    },
  ) => {
    const mutation = get(createProjectGroupMutationAtom)

    const request: CreateGroupRequest = {
      type: "project",
      name: groupData.name,
      description: groupData.description,
      color: groupData.color,
      parentId: groupData.parentId,
    }

    return await mutation.mutateAsync(request)
  },
)

export const updateProjectGroupAtom = atom(
  null,
  async (
    get,
    set,
    updateData: {
      id: GroupId
      name?: string
      description?: string
      color?: string
      items?: (ProjectId | ProjectGroup)[]
    },
  ) => {
    const mutation = get(updateProjectGroupMutationAtom)

    const request: UpdateProjectGroupRequest = {
      id: updateData.id,
      type: "project", // Required type field for discriminated union
      name: updateData.name,
      description: updateData.description,
      color: updateData.color,
      items: updateData.items,
    }

    return await mutation.mutateAsync(request)
  },
)

export const deleteProjectGroupAtom = atom(null, async (get, set, groupId: GroupId) => {
  const mutation = get(deleteProjectGroupMutationAtom)

  const request: DeleteGroupRequest = { id: groupId }
  return await mutation.mutateAsync(request)
})

// Find project group by ID atom
export const findProjectGroupByIdAtom = atom((get) => (groupId: GroupId): ProjectGroup | null => {
  const analysis = get(groupAnalysisAtom)
  return analysis.groupIndex.get(groupId) ?? null
})

// Flatten project groups into a flat array (for easier iteration)
export const flattenProjectGroupsAtom = atom((get) => {
  const analysis = get(groupAnalysisAtom)
  return analysis.flatGroups
})

// Get all project IDs that are direct members of any project group
export const projectsInGroupsAtom = atom((get) => {
  const analysis = get(groupAnalysisAtom)
  return Array.from(analysis.projectToGroup.keys())
})

// Project-Group relationship management atoms

// Add a project to a specific project group
export const addProjectToGroupAtom = atom(
  null,
  async (get, set, { projectId, groupId }: { projectId: ProjectId; groupId: GroupId }) => {
    try {
      // First, get the current group structure to find the target group
      const findGroupById = get(findProjectGroupByIdAtom)
      const targetGroup = findGroupById(groupId)

      if (!targetGroup) {
        throw new Error(`Project group with ID ${groupId} not found`)
      }

      // Check if project is already in this group
      if (targetGroup.items.includes(projectId)) {
        log.info({ projectId, groupId }, "Project already in group")
        return
      }

      // Create the updated items array with the new project
      const updatedItems: (ProjectId | ProjectGroup)[] = [...targetGroup.items, projectId]

      // Update the group via the API
      await set(updateProjectGroupAtom, {
        id: groupId,
        items: updatedItems,
      })

      log.info({ projectId, groupId }, "Project successfully added to group")
    } catch (error) {
      log.error({ error, projectId, groupId }, "Failed to add project to group")
      throw error
    }
  },
)

// Remove a project from its current group
export const removeProjectFromGroupAtom = atom(
  null,
  async (get, set, { projectId }: { projectId: ProjectId }) => {
    try {
      const findGroupContaining = get(findGroupContainingProjectAtom)
      const containingGroup = findGroupContaining(projectId)

      if (!containingGroup) {
        log.info({ projectId }, "Project not found in any group")
        return
      }

      // Create updated items array without the project
      const updatedItems = containingGroup.items.filter((item) => item !== projectId)

      // Update the group via the API
      await set(updateProjectGroupAtom, {
        id: containingGroup.id,
        items: updatedItems,
      })

      log.info(
        { projectId, groupId: containingGroup.id },
        "Project successfully removed from group",
      )
    } catch (error) {
      log.error({ error, projectId }, "Failed to remove project from group")
      throw error
    }
  },
)

// Move a project from one group to another
export const moveProjectBetweenGroupsAtom = atom(
  null,
  async (
    get,
    set,
    {
      projectId,
      fromGroupId,
      toGroupId,
    }: {
      projectId: ProjectId
      fromGroupId: GroupId
      toGroupId: GroupId
    },
  ) => {
    try {
      if (fromGroupId === toGroupId) {
        log.info({ projectId, groupId: fromGroupId }, "Source and target groups are the same")
        return
      }

      // First remove from source group, then add to target group
      await set(removeProjectFromGroupAtom, { projectId })
      await set(addProjectToGroupAtom, { projectId, groupId: toGroupId })

      log.info({ projectId, fromGroupId, toGroupId }, "Project moved between groups")
    } catch (error) {
      log.error(
        { error, projectId, fromGroupId, toGroupId },
        "Failed to move project between groups",
      )
      throw error
    }
  },
)

// Move a project from one group to another with specific insertion index
export const moveProjectToGroupAtom = atom(
  null,
  async (
    get,
    set,
    {
      projectId,
      fromGroupId,
      toGroupId,
      insertIndex,
    }: {
      projectId: ProjectId
      fromGroupId?: GroupId
      toGroupId: GroupId
      insertIndex: number
    },
  ) => {
    try {
      // Check if this is a root level operation
      if (toGroupId === ROOT_PROJECT_GROUP_ID) {
        // Moving to root level - use individual update API for root group

        // First remove project from its current group (if any)
        const findGroupContaining = get(findGroupContainingProjectAtom)
        const currentGroup = findGroupContaining(projectId)

        if (currentGroup && currentGroup.id !== ROOT_PROJECT_GROUP_ID) {
          // Remove from current group using individual update
          const updatedItems = currentGroup.items.filter((item) => item !== projectId)
          await set(updateProjectGroupAtom, {
            id: currentGroup.id,
            items: updatedItems,
          })
        }

        // Get current root group items (contains both ProjectIds and nested ProjectGroups)
        const groups = get(allGroupsAtom)
        const rootGroup = groups.projectGroups

        // Create new items array with project inserted at specified index
        const updatedRootItems = [...rootGroup.items]
        let adjustedInsertIndex = insertIndex

        // If project is already in root group, remove it first to avoid duplicates
        const existingIndex = updatedRootItems.indexOf(projectId)
        if (existingIndex !== -1) {
          updatedRootItems.splice(existingIndex, 1)
          // Adjust insert index if removing item before insertion point
          if (existingIndex < insertIndex) {
            adjustedInsertIndex = insertIndex - 1
          }
        }

        const actualInsertIndex =
          adjustedInsertIndex === -1 ? updatedRootItems.length : adjustedInsertIndex
        updatedRootItems.splice(actualInsertIndex, 0, projectId)

        // Use individual update API to update root group's items array
        await set(updateProjectGroupAtom, {
          id: ROOT_PROJECT_GROUP_ID,
          items: updatedRootItems,
        })

        log.info(
          { projectId, insertIndex, adjustedInsertIndex, actualInsertIndex, existingIndex },
          "Project moved to root level using individual update",
        )
        return
      }

      // Regular group operation - use individual update API

      // First, check if project is currently at root level and remove it
      const groups = get(allGroupsAtom)
      const rootGroup = groups.projectGroups
      const isAtRoot = rootGroup.items.includes(projectId)

      if (isAtRoot) {
        // Remove from root level first
        const updatedRootItems = rootGroup.items.filter((item) => item !== projectId)
        await set(updateProjectGroupAtom, {
          id: ROOT_PROJECT_GROUP_ID,
          items: updatedRootItems,
        })
      } else if (fromGroupId) {
        // Remove from source group if not at root
        await set(removeProjectFromGroupAtom, { projectId })
      }

      // Get the target group and add project at specific index
      const findGroupById = get(findProjectGroupByIdAtom)
      const targetGroup = findGroupById(toGroupId)

      if (!targetGroup) {
        throw new Error(`Project group with ID ${toGroupId} not found`)
      }

      // Check if project is already in this group
      if (targetGroup.items.includes(projectId)) {
        log.info({ projectId, toGroupId }, "Project already in target group")
        return
      }

      // Create the updated items array with project inserted at specific index
      const updatedItems = [...targetGroup.items]

      // Handle special case: insertIndex = -1 means append to end
      const actualInsertIndex = insertIndex === -1 ? updatedItems.length : insertIndex
      updatedItems.splice(actualInsertIndex, 0, projectId)

      // Update the group via the API
      await set(updateProjectGroupAtom, {
        id: toGroupId,
        items: updatedItems,
      })

      log.info(
        { projectId, fromGroupId, toGroupId, insertIndex, actualInsertIndex },
        "Project moved to group at specific index",
      )
    } catch (error) {
      log.error(
        { error, projectId, fromGroupId, toGroupId, insertIndex },
        "Failed to move project to group at specific index",
      )
      throw error
    }
  },
)

// Remove a project from group
export const removeProjectFromGroupWithIndexAtom = atom(
  null,
  async (
    get,
    set,
    {
      projectId,
      _insertIndex, // eslint-disable-line @typescript-eslint/no-unused-vars
    }: {
      projectId: ProjectId
      _insertIndex: number // Kept for API compatibility but no longer used
    },
  ) => {
    try {
      const findGroupContaining = get(findGroupContainingProjectAtom)
      const containingGroup = findGroupContaining(projectId)

      if (!containingGroup) {
        log.info({ projectId }, "Project not found in any group")
        return
      }

      // Check if this is a root level operation
      if (containingGroup.id === ROOT_PROJECT_GROUP_ID) {
        // Removing from root level - use individual update API for root group
        const groups = get(allGroupsAtom)
        const rootGroup = groups.projectGroups

        // Check if project is at root level
        if (!rootGroup.items.includes(projectId)) {
          log.info({ projectId }, "Project not found at root level")
          return
        }

        // Create new items array without the project
        const updatedRootItems = rootGroup.items.filter((item) => item !== projectId)

        // Use individual update API to update root group's items array
        await set(updateProjectGroupAtom, {
          id: ROOT_PROJECT_GROUP_ID,
          items: updatedRootItems,
        })

        log.info({ projectId }, "Project removed from root level using individual update")
      } else {
        // Regular group operation - use individual update API
        await set(removeProjectFromGroupAtom, { projectId })
        log.info({ projectId }, "Project removed from group")
      }
    } catch (error) {
      log.error({ error, projectId }, "Failed to remove project from group")
      throw error
    }
  },
)

// Get the hierarchical tree structure of project groups
export const projectGroupTreeAtom = atom((get) => {
  const projectGroups = get(projectGroupsAtom)

  // Build a tree structure that's easier to work with for UI components
  interface ProjectGroupTreeNode {
    group: ProjectGroup
    children: ProjectGroupTreeNode[]
    depth: number
    path: GroupId[]
  }

  function buildTree(
    groups: ProjectGroup[],
    depth = 0,
    path: GroupId[] = [],
  ): ProjectGroupTreeNode[] {
    return groups.map((group) => {
      const currentPath = [...path, group.id]

      // Extract nested project groups
      const nestedGroups = group.items.filter(
        (item): item is ProjectGroup => isGroup<ProjectGroup>(item) && item.type === "project",
      )

      return {
        group,
        children: buildTree(nestedGroups, depth + 1, currentPath),
        depth,
        path: currentPath,
      }
    })
  }

  return buildTree(projectGroups)
})

// Get breadcrumb path for a specific project group
export const projectGroupBreadcrumbsAtom = atom((get) => (groupId: GroupId): ProjectGroup[] => {
  const analysis = get(groupAnalysisAtom)
  return analysis.groupPaths.get(groupId) ?? []
})

// Count projects in a group and all its subgroups (recursive)
export const projectGroupProjectCountAtom = atom((get) => (groupId: GroupId): number => {
  const analysis = get(groupAnalysisAtom)
  return analysis.groupCounts.get(groupId) ?? 0
})

// Central analysis atom that performs single traversal to build all indices
export const groupAnalysisAtom = atom((get) => {
  const groups = get(projectGroupsAtom)

  const groupIndex = new Map<GroupId, ProjectGroup>()
  const projectToGroup = new Map<ProjectId, ProjectGroup>()
  const groupCounts = new Map<GroupId, number>()
  const flatGroups: ProjectGroup[] = []
  const groupPaths = new Map<GroupId, ProjectGroup[]>()

  function traverse(group: ProjectGroup, ancestors: ProjectGroup[] = []) {
    flatGroups.push(group)
    groupIndex.set(group.id, group)
    groupPaths.set(group.id, [...ancestors, group])

    let projectCount = 0

    for (const item of group.items) {
      if (typeof item === "string") {
        projectToGroup.set(item, group)
        projectCount++
      } else if (isGroup<ProjectGroup>(item) && item.type === "project") {
        const nestedCount = traverse(item, [...ancestors, group])
        projectCount += nestedCount
      }
    }

    groupCounts.set(group.id, projectCount)
    return projectCount
  }

  groups.forEach((group) => traverse(group))

  return {
    groupIndex,
    projectToGroup,
    groupCounts,
    flatGroups,
    groupPaths,
  }
})

// Reorder projects within a group's items array
export const reorderProjectWithinGroupAtom = atom(
  null,
  async (
    get,
    set,
    {
      groupId,
      projectId,
      newIndex,
    }: {
      groupId: GroupId
      projectId: ProjectId
      newIndex: number
    },
  ) => {
    try {
      const findGroupById = get(findProjectGroupByIdAtom)
      const group = findGroupById(groupId)

      if (!group) {
        throw new Error(`Project group with ID ${groupId} not found`)
      }

      // Find current index of project in group items
      const currentIndex = group.items.indexOf(projectId)
      if (currentIndex === -1) {
        throw new Error(`Project ${projectId} not found in group ${groupId}`)
      }

      if (currentIndex === newIndex) {
        log.info({ projectId, groupId, currentIndex }, "Project already at target position")
        return
      }

      // Create new items array with project moved to new position
      const newItems = [...group.items]
      const [movedProject] = newItems.splice(currentIndex, 1)
      newItems.splice(newIndex, 0, movedProject)

      // Update the group via the API
      await set(updateProjectGroupAtom, {
        id: groupId,
        items: newItems,
      })

      log.info(
        { projectId, groupId, fromIndex: currentIndex, toIndex: newIndex },
        "Project successfully reordered within group",
      )
    } catch (error) {
      log.error({ error, projectId, groupId, newIndex }, "Failed to reorder project within group")
      throw error
    }
  },
)
//
// Reorder projects within root group's array
export const reorderProjectWithinRootAtom = atom(
  null,
  async (
    get,
    set,
    {
      groupId,
      projectId,
      newIndex,
    }: {
      groupId: GroupId
      projectId: ProjectId
      newIndex: number
    },
  ) => {
    try {
      // Check if this is a root level operation
      if (groupId === ROOT_PROJECT_GROUP_ID) {
        // Moving to root level - use individual update API for root group

        // Get current root group items (contains both ProjectIds and nested ProjectGroups)
        const groups = get(allGroupsAtom)
        const rootGroup = groups.projectGroups

        // Create new items array with project inserted at specified index
        const updatedRootItems = [...rootGroup.items]
        let adjustedInsertIndex = newIndex

        // If project is already in root group, remove it first to avoid duplicates
        const existingIndex = updatedRootItems.indexOf(projectId)
        if (existingIndex !== -1) {
          updatedRootItems.splice(existingIndex, 1)
          // Adjust insert index if removing item before insertion point
          if (existingIndex < newIndex) {
            adjustedInsertIndex = newIndex - 1
          }
        }

        const actualInsertIndex =
          adjustedInsertIndex === -1 ? updatedRootItems.length : adjustedInsertIndex
        updatedRootItems.splice(actualInsertIndex, 0, projectId)

        // Use individual update API to update root group's items array
        await set(updateProjectGroupAtom, {
          id: ROOT_PROJECT_GROUP_ID,
          items: updatedRootItems,
        })

        log.info(
          { projectId, newIndex, adjustedInsertIndex, actualInsertIndex, existingIndex },
          "Project moved within root level using individual update",
        )
        return
      }
    } catch (error) {
      log.error({ error, projectId, groupId, newIndex }, "Failed to reorder project within group")
      throw error
    }
  },
)

// Reorder groups by updating the root groups array directly
export const reorderGroupAtom = atom(
  null,
  async (
    get,
    set,
    {
      groupId,
      fromIndex,
      toIndex,
    }: {
      groupId: GroupId
      fromIndex: number
      toIndex: number
    },
  ) => {
    try {
      if (fromIndex === toIndex) {
        log.info({ groupId, fromIndex }, "Group already at target position")
        return
      }

      // Get current root group items (mixed array of projects and groups)
      const groups = get(allGroupsAtom)
      const rootItems = groups.projectGroups.items

      // Validate the indices and group
      if (fromIndex < 0 || fromIndex >= rootItems.length) {
        throw new Error(`Invalid fromIndex ${fromIndex}`)
      }

      if (toIndex < 0 || toIndex >= rootItems.length) {
        throw new Error(`Invalid toIndex ${toIndex}`)
      }

      // Validate that the item at fromIndex is actually the group we expect
      const itemToMove = rootItems[fromIndex]
      if (typeof itemToMove === "string" || !("id" in itemToMove) || itemToMove.id !== groupId) {
        throw new Error(`Group ${groupId} not found at index ${fromIndex}`)
      }

      // Create new items array with group moved to new position
      const newItems = [...rootItems]
      const [movedItem] = newItems.splice(fromIndex, 1)
      newItems.splice(toIndex, 0, movedItem)

      // Update the root group's items array
      await set(updateProjectGroupAtom, {
        id: ROOT_PROJECT_GROUP_ID,
        items: newItems,
      })

      log.info(
        { groupId, fromIndex, toIndex, newItemsCount: newItems.length },
        "Group successfully reordered in mixed array using individual update",
      )
    } catch (error) {
      log.error({ error, groupId, fromIndex, toIndex }, "Failed to reorder group")
      throw error
    }
  },
)

// Find which group contains a specific project
export const findGroupContainingProjectAtom = atom(
  (get) =>
    (projectId: ProjectId): ProjectGroup | null => {
      const analysis = get(groupAnalysisAtom)
      return analysis.projectToGroup.get(projectId) ?? null
    },
)

// Get all root level project groups (groups without parents)
export const rootProjectGroupsAtom = atom((get) => {
  const projectGroups = get(projectGroupsAtom)
  return projectGroups // Top-level groups in the array are the root groups
})

// Debug labels
allGroupsAtom.debugLabel = "allGroupsAtom"
projectGroupsAtom.debugLabel = "projectGroupsAtom"
labelGroupsAtom.debugLabel = "labelGroupsAtom"
addProjectGroupAtom.debugLabel = "addProjectGroupAtom"
updateProjectGroupAtom.debugLabel = "updateProjectGroupAtom"
deleteProjectGroupAtom.debugLabel = "deleteProjectGroupAtom"
findProjectGroupByIdAtom.debugLabel = "findProjectGroupByIdAtom"
flattenProjectGroupsAtom.debugLabel = "flattenProjectGroupsAtom"
projectsInGroupsAtom.debugLabel = "projectsInGroupsAtom"
addProjectToGroupAtom.debugLabel = "addProjectToGroupAtom"
removeProjectFromGroupAtom.debugLabel = "removeProjectFromGroupAtom"
moveProjectBetweenGroupsAtom.debugLabel = "moveProjectBetweenGroupsAtom"
moveProjectToGroupAtom.debugLabel = "moveProjectToGroupAtom"
removeProjectFromGroupWithIndexAtom.debugLabel = "removeProjectFromGroupWithIndexAtom"
reorderProjectWithinGroupAtom.debugLabel = "reorderProjectWithinGroupAtom"
reorderGroupAtom.debugLabel = "reorderGroupAtom"
projectGroupTreeAtom.debugLabel = "projectGroupTreeAtom"
projectGroupBreadcrumbsAtom.debugLabel = "projectGroupBreadcrumbsAtom"
projectGroupProjectCountAtom.debugLabel = "projectGroupProjectCountAtom"
groupAnalysisAtom.debugLabel = "groupAnalysisAtom"
findGroupContainingProjectAtom.debugLabel = "findGroupContainingProjectAtom"
rootProjectGroupsAtom.debugLabel = "rootProjectGroupsAtom"
