import { atom } from "jotai"
import type {
  GroupId,
  ProjectGroup,
  ProjectId,
  CreateGroupRequest,
  UpdateProjectGroupRequest,
  DeleteGroupRequest,
} from "@/lib/types"
import { isGroup } from "@/lib/types"
import { log } from "@/lib/utils/logger"
import {
  createProjectGroupMutationAtom,
  updateProjectGroupMutationAtom,
  deleteProjectGroupMutationAtom,
  dataQueryAtom,
} from "./base"
import { visibleProjectsAtom } from "./projects"

// Groups data comes from dataQueryAtom, following same pattern as projectsAtom

// Derived atoms for each group type
export const allGroupsAtom = atom((get) => {
  const result = get(dataQueryAtom)

  // Handle TanStack Query result structure - follow same pattern as projectsAtom
  if ("data" in result && result.data) {
    return {
      projectGroups: result.data.projectGroups ?? [],
      labelGroups: result.data.labelGroups ?? [],
    }
  }

  return {
    projectGroups: [],
    labelGroups: [],
  }
})

export const projectGroupsAtom = atom((get) => {
  const groups = get(allGroupsAtom)
  return groups.projectGroups.filter(
    (group): group is ProjectGroup => isGroup(group) && group.type === "project",
  )
})

export const labelGroupsAtom = atom((get) => {
  const groups = get(allGroupsAtom)
  return groups.labelGroups
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

// 🗑️ REMOVED: Old utility function - replaced by O(1) hash map lookup in groupAnalysisAtom

// 🚀 OPTIMIZED: O(n×d) → O(1) - Uses hash map index instead of recursive search
export const findProjectGroupByIdAtom = atom((get) => (groupId: GroupId): ProjectGroup | null => {
  const analysis = get(groupAnalysisAtom)
  return analysis.groupIndex.get(groupId) ?? null
})

// 🚀 OPTIMIZED: O(n×d) → O(1) - Uses pre-computed flat list instead of recursive flattening
export const flattenProjectGroupsAtom = atom((get) => {
  const analysis = get(groupAnalysisAtom)
  return analysis.flatGroups
})

// 🚀 OPTIMIZED: O(n×m) → O(1) - Uses pre-computed project list instead of traversal
export const projectsInGroupsAtom = atom((get) => {
  const analysis = get(groupAnalysisAtom)
  return Array.from(analysis.projectToGroup.keys())
})
// Get projects that are NOT in any group
// TODO: this is a temporary workaround until we have automatic migration figured out, ideally, no project should be without a group
export const ungroupedProjectsAtom = atom((get) => {
  const allVisibleProjects = get(visibleProjectsAtom)
  const projectsInGroups = get(projectsInGroupsAtom)
  const projectsInGroupsSet = new Set(projectsInGroups)

  return allVisibleProjects.filter((project) => !projectsInGroupsSet.has(project.id))
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

// 🚀 OPTIMIZED: O(n×d²) → O(1) - Uses pre-computed paths instead of tree search
export const projectGroupBreadcrumbsAtom = atom((get) => (groupId: GroupId): ProjectGroup[] => {
  const analysis = get(groupAnalysisAtom)
  return analysis.groupPaths.get(groupId) ?? []
})

// 🚀 OPTIMIZED: O(m×d) → O(1) - Uses pre-computed count instead of recursive counting
export const projectGroupProjectCountAtom = atom((get) => (groupId: GroupId): number => {
  const analysis = get(groupAnalysisAtom)
  return analysis.groupCounts.get(groupId) ?? 0
})

// 🚀 PERFORMANCE OPTIMIZATION: Single-pass analysis with O(1) lookups
// This atom does ONE traversal and creates all indices we need, instead of 5+ separate traversals
export const groupAnalysisAtom = atom((get) => {
  const groups = get(projectGroupsAtom)

  // Pre-allocated maps for O(1) lookups
  const groupIndex = new Map<GroupId, ProjectGroup>()
  const projectToGroup = new Map<ProjectId, ProjectGroup>()
  const groupCounts = new Map<GroupId, number>()
  const flatGroups: ProjectGroup[] = []
  const groupPaths = new Map<GroupId, ProjectGroup[]>()

  // Single recursive traversal to populate all indices
  function traverse(group: ProjectGroup, ancestors: ProjectGroup[] = []) {
    // Add to flat list and group index
    flatGroups.push(group)
    groupIndex.set(group.id, group)
    groupPaths.set(group.id, [...ancestors, group])

    let projectCount = 0

    // Process each item in the group
    for (const item of group.items) {
      if (typeof item === "string") {
        // It's a project ID
        projectToGroup.set(item, group)
        projectCount++
      } else if (isGroup<ProjectGroup>(item) && item.type === "project") {
        // It's a nested group - traverse recursively
        const nestedCount = traverse(item, [...ancestors, group])
        projectCount += nestedCount
      }
    }

    groupCounts.set(group.id, projectCount)
    return projectCount
  }

  // Single traversal for all groups
  groups.forEach((group) => traverse(group))

  return {
    groupIndex, // O(1) group lookup by ID
    projectToGroup, // O(1) project → containing group lookup
    groupCounts, // O(1) group project count lookup
    flatGroups, // Flattened group list
    groupPaths, // O(1) breadcrumb paths lookup
  }
})

// 🚀 OPTIMIZED: O(n×m×d) → O(1) - Now uses hash map instead of linear search
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
projectGroupTreeAtom.debugLabel = "projectGroupTreeAtom"
projectGroupBreadcrumbsAtom.debugLabel = "projectGroupBreadcrumbsAtom"
projectGroupProjectCountAtom.debugLabel = "projectGroupProjectCountAtom"
groupAnalysisAtom.debugLabel = "groupAnalysisAtom"
findGroupContainingProjectAtom.debugLabel = "findGroupContainingProjectAtom"
rootProjectGroupsAtom.debugLabel = "rootProjectGroupsAtom"
