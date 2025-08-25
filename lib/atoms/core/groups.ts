import { atom } from "jotai"
import { atomWithQuery } from "jotai-tanstack-query"
import type {
  GroupId,
  ProjectGroup,
  ProjectId,
  DataFileSerialization,
  CreateGroupRequest,
  UpdateProjectGroupRequest,
  DeleteGroupRequest,
} from "@/lib/types"
import { isGroup } from "@/lib/types"
import { TEST_GROUPS_DATA } from "@/lib/utils/test-constants"
import { log } from "@/lib/utils/logger"
import {
  createProjectGroupMutationAtom,
  updateProjectGroupMutationAtom,
  deleteProjectGroupMutationAtom,
} from "./base"
import { visibleProjectsAtom } from "./projects"

// Base query atom to fetch all groups data
export const groupsQueryAtom = atomWithQuery(() => ({
  queryKey: ["groups"],
  queryFn: async (): Promise<DataFileSerialization> => {
    // Check if we're in a test environment first
    if (typeof window === "undefined" || process.env.NODE_ENV === "test") {
      log.info({ module: "test" }, "Test environment: Using test groups data")
      // Return the test data immediately
      return Promise.resolve(TEST_GROUPS_DATA)
    }

    const response = await fetch("/api/groups")
    if (!response.ok) {
      throw new Error(`Failed to fetch groups: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  },
  staleTime: 1000,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchInterval: false,
  // Add test-specific configuration
  enabled: typeof window !== "undefined" && process.env.NODE_ENV !== "test",
  initialData:
    typeof window === "undefined" || process.env.NODE_ENV === "test" ? TEST_GROUPS_DATA : undefined,
}))

// Derived atoms for each group type
export const allGroupsAtom = atom((get) => {
  const result = get(groupsQueryAtom)

  // Handle TanStack Query result structure
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

// Utility function to find a project group by ID recursively
function findProjectGroupById(groups: ProjectGroup[], groupId: GroupId): ProjectGroup | null {
  for (const group of groups) {
    if (group.id === groupId) {
      return group
    }

    // Search in nested project groups
    const nestedGroups = group.items.filter(
      (item): item is ProjectGroup => isGroup<ProjectGroup>(item) && item.type === "project",
    )
    const found = findProjectGroupById(nestedGroups, groupId)
    if (found) {
      return found
    }
  }
  return null
}

// Find project group by ID atom
export const findProjectGroupByIdAtom = atom((get) => (groupId: GroupId): ProjectGroup | null => {
  const projectGroups = get(projectGroupsAtom)
  return findProjectGroupById(projectGroups, groupId)
})

// Flatten project groups into a flat array (for easier iteration)
export const flattenProjectGroupsAtom = atom((get) => {
  const projectGroups = get(projectGroupsAtom)

  function flatten(groups: ProjectGroup[]): ProjectGroup[] {
    const result: ProjectGroup[] = []

    for (const group of groups) {
      result.push(group)

      // Add nested project groups
      const nestedGroups = group.items.filter(
        (item): item is ProjectGroup => isGroup<ProjectGroup>(item) && item.type === "project",
      )
      result.push(...flatten(nestedGroups))
    }

    return result
  }

  return flatten(projectGroups)
})

// Get all project IDs that are direct members of any project group
export const projectsInGroupsAtom = atom((get) => {
  const projectGroups = get(projectGroupsAtom)
  const projectIds = new Set<ProjectId>()

  function extractProjectIds(groups: ProjectGroup[]) {
    for (const group of groups) {
      for (const item of group.items) {
        if (typeof item === "string") {
          projectIds.add(item)
        } else if (isGroup<ProjectGroup>(item) && item.type === "project") {
          extractProjectIds([item])
        }
      }
    }
  }

  extractProjectIds(projectGroups)
  return Array.from(projectIds)
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
      const projectGroups = get(projectGroupsAtom)

      // Find which group contains this project
      function findGroupContainingProject(groups: ProjectGroup[]): ProjectGroup | null {
        for (const group of groups) {
          if (group.items.includes(projectId)) {
            return group
          }

          // Search in nested groups
          const nestedGroups = group.items.filter(
            (item): item is ProjectGroup => isGroup<ProjectGroup>(item) && item.type === "project",
          )
          const found = findGroupContainingProject(nestedGroups)
          if (found) {
            return found
          }
        }
        return null
      }

      const containingGroup = findGroupContainingProject(projectGroups)
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

// Get breadcrumb path for a specific project group
export const projectGroupBreadcrumbsAtom = atom((get) => (groupId: GroupId): ProjectGroup[] => {
  const tree = get(projectGroupTreeAtom)

  interface TreeNode {
    group: ProjectGroup
    children: TreeNode[]
    depth: number
    path: GroupId[]
  }

  function findPath(
    nodes: TreeNode[],
    targetId: GroupId,
    path: ProjectGroup[] = [],
  ): ProjectGroup[] | null {
    for (const node of nodes) {
      const currentPath = [...path, node.group]

      if (node.group.id === targetId) {
        return currentPath
      }

      const found = findPath(node.children, targetId, currentPath)
      if (found) {
        return found
      }
    }
    return null
  }

  return findPath(tree, groupId) ?? []
})

// Count projects in a group and all its subgroups (recursive)
export const projectGroupProjectCountAtom = atom((get) => (groupId: GroupId): number => {
  const findGroupById = get(findProjectGroupByIdAtom)
  const group = findGroupById(groupId)

  if (!group) {
    return 0
  }

  function countProjects(group: ProjectGroup): number {
    let count = 0

    for (const item of group.items) {
      if (typeof item === "string") {
        // It's a project ID
        count++
      } else if (isGroup<ProjectGroup>(item) && item.type === "project") {
        // It's a nested project group
        count += countProjects(item)
      }
    }

    return count
  }

  return countProjects(group)
})

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
rootProjectGroupsAtom.debugLabel = "rootProjectGroupsAtom"
