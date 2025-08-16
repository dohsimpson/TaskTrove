/**
 * Ordering atoms for TaskTrove - central source of truth for item ordering
 *
 * This replaces the complex position-based and linked-list ordering systems
 * with simple ordered arrays of IDs.
 */

import { atom } from "jotai"
import { handleAtomError } from "../utils/index"
import type { Project, Label, ProjectId, LabelId } from "../../types/index"
import { INBOX_PROJECT_ID } from "../../types/index"
import { projectsAtom, labelsAtom, dataQueryAtom, updateOrderingMutationAtom } from "./base"
import { log } from "../../utils/logger"

// =============================================================================
// BASE ORDERING ATOM
// =============================================================================

/**
 * Central ordering state - read-only from dataQueryAtom
 */
export const orderingAtom = atom((get) => {
  try {
    const result = get(dataQueryAtom)
    if ("data" in result) {
      return (
        result.data?.ordering ?? {
          projects: [INBOX_PROJECT_ID], // Inbox always comes first
          labels: [],
        }
      )
    }
    return {
      projects: [INBOX_PROJECT_ID],
      labels: [],
    }
  } catch (error) {
    handleAtomError(error, "orderingAtom")
    return {
      projects: [INBOX_PROJECT_ID],
      labels: [],
    }
  }
})
orderingAtom.debugLabel = "orderingAtom"

// =============================================================================
// ORDERED DERIVED ATOMS
// =============================================================================

/**
 * Projects in their ordered sequence
 * Maps the ordered project IDs to actual project objects
 */
export const orderedProjectsAtom = atom<Project[]>((get) => {
  try {
    const ordering = get(orderingAtom)
    const projects = get(projectsAtom)
    const projectsMap = new Map(projects.map((p: Project) => [p.id, p]))

    // Map ordered IDs to project objects, filtering out any missing projects
    return ordering.projects
      .map((id: ProjectId) => projectsMap.get(id))
      .filter((project: Project | undefined): project is Project => project !== undefined)
  } catch (error) {
    handleAtomError(error, "orderedProjectsAtom")
    return []
  }
})
orderedProjectsAtom.debugLabel = "orderedProjectsAtom"

/**
 * Labels in their ordered sequence
 * Maps the ordered label IDs to actual label objects
 * Automatically includes any labels that aren't in the ordering yet
 */
export const orderedLabelsAtom = atom<Label[]>((get) => {
  try {
    const ordering = get(orderingAtom)
    const labels = get(labelsAtom)
    const labelsMap = new Map(labels.map((l: Label) => [l.id, l]))

    // Get labels that are in the ordering
    const orderedLabels = ordering.labels
      .map((id: LabelId) => labelsMap.get(id))
      .filter((label: Label | undefined): label is Label => label !== undefined)

    // Get labels that exist but aren't in the ordering yet
    const orderedLabelIds = new Set(ordering.labels)
    const unorderedLabels = labels.filter((label: Label) => !orderedLabelIds.has(label.id))

    // Return ordered labels first, then unordered labels
    return [...orderedLabels, ...unorderedLabels]
  } catch (error) {
    handleAtomError(error, "orderedLabelsAtom")
    return []
  }
})
orderedLabelsAtom.debugLabel = "orderedLabelsAtom"

// =============================================================================
// UTILITY FUNCTIONS FOR ARRAY OPERATIONS
// =============================================================================

/**
 * Move an item from one index to another in an array
 */
function moveInArray<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  const result = [...array]
  const [item] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, item)
  return result
}

/**
 * Add an item to an array at a specific index
 */
function addToArray<T>(array: T[], item: T, index?: number): T[] {
  const result = [...array]
  if (index === undefined) {
    result.push(item)
  } else {
    result.splice(index, 0, item)
  }
  return result
}

/**
 * Remove an item from an array
 */
function removeFromArray<T>(array: T[], item: T): T[] {
  return array.filter((x) => x !== item)
}

// =============================================================================
// PROJECT ORDERING OPERATIONS
// =============================================================================

/**
 * Add a project to the ordering (at the end by default)
 */
export const addProjectToOrderingAtom = atom(
  null,
  async (get, set, data: { projectId: ProjectId; index?: number }) => {
    try {
      const ordering = get(orderingAtom)
      const newProjects = addToArray(ordering.projects, data.projectId, data.index)
      const newOrdering = { ...ordering, projects: newProjects }

      // Use the mutation to update ordering
      const mutation = get(updateOrderingMutationAtom)
      await mutation.mutateAsync(newOrdering)
    } catch (error) {
      log.error({ error, module: "ordering" }, "Failed to add project to ordering")
      throw error
    }
  },
)
addProjectToOrderingAtom.debugLabel = "addProjectToOrderingAtom"

/**
 * Remove a project from the ordering
 */
export const removeProjectFromOrderingAtom = atom(null, async (get, set, projectId: ProjectId) => {
  try {
    const ordering = get(orderingAtom)
    const newProjects = removeFromArray(ordering.projects, projectId)
    const newOrdering = { ...ordering, projects: newProjects }

    // Use the mutation to update ordering
    const mutation = get(updateOrderingMutationAtom)
    await mutation.mutateAsync(newOrdering)
  } catch (error) {
    log.error({ error, module: "ordering" }, "Failed to remove project from ordering")
    throw error
  }
})
removeProjectFromOrderingAtom.debugLabel = "removeProjectFromOrderingAtom"

/**
 * Reorder a project to a new position
 */
export const reorderProjectAtom = atom(
  null,
  async (get, set, data: { projectId: ProjectId; newIndex: number }) => {
    try {
      const ordering = get(orderingAtom)
      const projectId = data.projectId
      const currentIndex = ordering.projects.indexOf(projectId)

      if (currentIndex === -1 || currentIndex === data.newIndex) return

      const newProjects = moveInArray(ordering.projects, currentIndex, data.newIndex)
      const newOrdering = { ...ordering, projects: newProjects }

      // Use the mutation to update ordering
      const mutation = get(updateOrderingMutationAtom)
      await mutation.mutateAsync(newOrdering)
    } catch (error) {
      log.error({ error, module: "ordering" }, "Failed to reorder project")
      throw error
    }
  },
)
reorderProjectAtom.debugLabel = "reorderProjectAtom"

// =============================================================================
// LABEL ORDERING OPERATIONS
// =============================================================================

/**
 * Add a label to the ordering (at the end by default)
 */
export const addLabelToOrderingAtom = atom(
  null,
  async (get, set, data: { labelId: LabelId; index?: number }) => {
    try {
      const ordering = get(orderingAtom)
      const newLabels = addToArray(ordering.labels, data.labelId, data.index)
      const newOrdering = { ...ordering, labels: newLabels }

      // Use the mutation to update ordering
      const mutation = get(updateOrderingMutationAtom)
      await mutation.mutateAsync(newOrdering)
    } catch (error) {
      log.error({ error, module: "ordering" }, "Failed to add label to ordering")
      throw error
    }
  },
)
addLabelToOrderingAtom.debugLabel = "addLabelToOrderingAtom"

/**
 * Remove a label from the ordering
 */
export const removeLabelFromOrderingAtom = atom(null, async (get, set, labelId: LabelId) => {
  try {
    const ordering = get(orderingAtom)
    const newLabels = removeFromArray(ordering.labels, labelId)
    const newOrdering = { ...ordering, labels: newLabels }

    // Use the mutation to update ordering
    const mutation = get(updateOrderingMutationAtom)
    await mutation.mutateAsync(newOrdering)
  } catch (error) {
    log.error({ error, module: "ordering" }, "Failed to remove label from ordering")
    throw error
  }
})
removeLabelFromOrderingAtom.debugLabel = "removeLabelFromOrderingAtom"

/**
 * Reorder a label to a new position
 */
export const reorderLabelAtom = atom(
  null,
  async (get, set, data: { labelId: LabelId; newIndex: number }) => {
    try {
      const ordering = get(orderingAtom)
      const labelId = data.labelId
      const currentIndex = ordering.labels.indexOf(labelId)

      if (currentIndex === -1 || currentIndex === data.newIndex) return

      const newLabels = moveInArray(ordering.labels, currentIndex, data.newIndex)
      const newOrdering = { ...ordering, labels: newLabels }

      // Use the mutation to update ordering
      const mutation = get(updateOrderingMutationAtom)
      await mutation.mutateAsync(newOrdering)
    } catch (error) {
      log.error({ error, module: "ordering" }, "Failed to reorder label")
      throw error
    }
  },
)
reorderLabelAtom.debugLabel = "reorderLabelAtom"
