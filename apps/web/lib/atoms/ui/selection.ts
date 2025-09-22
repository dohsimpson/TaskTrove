import { atom } from "jotai"
import { selectedTasksAtom } from "./dialogs"
import { filteredTasksAtom } from "../core/tasks"
import { updateTaskAtom, deleteTaskAtom } from "../core/tasks"
import { createProjectId, type TaskId, type ProjectId, type Task } from "../../types"

/**
 * Selection State Management Atoms
 *
 * Centralizes all task selection state management, eliminating the need
 * for selection-related prop drilling throughout the component tree.
 *
 * This module provides:
 * - Selection mode toggling
 * - Individual task selection/deselection
 * - Bulk task operations
 * - Selection mode entry/exit logic
 */

// =============================================================================
// BASE SELECTION STATE ATOMS
// =============================================================================

/**
 * Selection mode state - controls whether the UI is in selection mode
 */
export const selectionModeAtom = atom<boolean>(false)
selectionModeAtom.debugLabel = "selectionModeAtom"

// =============================================================================
// DERIVED SELECTION STATE ATOMS
// =============================================================================

/**
 * Derived atom - returns true if any tasks are selected
 */
export const hasSelectedTasksAtom = atom<boolean>((get) => {
  const selectedTasks = get(selectedTasksAtom)
  return selectedTasks.length > 0
})
hasSelectedTasksAtom.debugLabel = "hasSelectedTasksAtom"

/**
 * Derived atom - returns the count of selected tasks
 */
export const selectedTaskCountAtom = atom<number>((get) => {
  const selectedTasks = get(selectedTasksAtom)
  return selectedTasks.length
})
selectedTaskCountAtom.debugLabel = "selectedTaskCountAtom"

/**
 * Derived atom - returns a function to check if a task is selected
 */
export const isTaskSelectedAtom = atom((get) => {
  const selectedTasks = get(selectedTasksAtom)
  return (taskId: TaskId): boolean => selectedTasks.includes(taskId)
})
isTaskSelectedAtom.debugLabel = "isTaskSelectedAtom"

// =============================================================================
// SELECTION ACTION ATOMS
// =============================================================================

/**
 * Toggle single task selection
 * Auto-enters selection mode when selecting first task
 * Auto-exits selection mode when no tasks are selected
 */
export const toggleTaskSelectionAtom = atom(null, (get, set, taskId: TaskId) => {
  const currentSelected = get(selectedTasksAtom)
  const isSelected = currentSelected.includes(taskId)

  let updatedSelected: TaskId[]
  if (isSelected) {
    // Remove from selection
    updatedSelected = currentSelected.filter((id) => id !== taskId)
  } else {
    // Add to selection
    updatedSelected = [...currentSelected, taskId]
  }

  set(selectedTasksAtom, updatedSelected)

  // Auto-manage selection mode
  if (updatedSelected.length > 0 && !get(selectionModeAtom)) {
    // Auto-enter selection mode when selecting first task
    set(selectionModeAtom, true)
  } else if (updatedSelected.length === 0 && get(selectionModeAtom)) {
    // Auto-exit selection mode when no tasks are selected
    set(selectionModeAtom, false)
  }
})
toggleTaskSelectionAtom.debugLabel = "toggleTaskSelectionAtom"

/**
 * Enter selection mode with optional initial task selection
 */
export const enterSelectionModeAtom = atom(null, (get, set, initialTaskId?: TaskId) => {
  set(selectionModeAtom, true)
  if (initialTaskId && !get(selectedTasksAtom).includes(initialTaskId)) {
    const currentSelected = get(selectedTasksAtom)
    set(selectedTasksAtom, [...currentSelected, initialTaskId])
  }
})
enterSelectionModeAtom.debugLabel = "enterSelectionModeAtom"

/**
 * Exit selection mode and clear all selections
 */
export const exitSelectionModeAtom = atom(null, (get, set) => {
  set(selectionModeAtom, false)
  set(selectedTasksAtom, [])
})
exitSelectionModeAtom.debugLabel = "exitSelectionModeAtom"

/**
 * Select all visible tasks in current view
 */
export const selectAllVisibleTasksAtom = atom(null, (get, set) => {
  const visibleTasks = get(filteredTasksAtom)
  const visibleTaskIds = visibleTasks.map((task: Task) => task.id)
  set(selectedTasksAtom, visibleTaskIds)
  set(selectionModeAtom, true)
})
selectAllVisibleTasksAtom.debugLabel = "selectAllVisibleTasksAtom"

/**
 * Clear all selections but maintain selection mode
 */
export const clearSelectionAtom = atom(null, (get, set) => {
  set(selectedTasksAtom, [])
})
clearSelectionAtom.debugLabel = "clearSelectionAtom"

/**
 * Add specific task to selection (doesn't toggle, always adds)
 */
export const addTaskToSelectionAtom = atom(null, (get, set, taskId: TaskId) => {
  const currentSelected = get(selectedTasksAtom)
  if (!currentSelected.includes(taskId)) {
    set(selectedTasksAtom, [...currentSelected, taskId])
    if (!get(selectionModeAtom)) {
      set(selectionModeAtom, true)
    }
  }
})
addTaskToSelectionAtom.debugLabel = "addTaskToSelectionAtom"

/**
 * Remove specific task from selection (doesn't toggle, always removes)
 */
export const removeTaskFromSelectionAtom = atom(null, (get, set, taskId: TaskId) => {
  const currentSelected = get(selectedTasksAtom)
  const updatedSelected = currentSelected.filter((id) => id !== taskId)
  set(selectedTasksAtom, updatedSelected)

  // Auto-exit selection mode if no tasks remain selected
  if (updatedSelected.length === 0 && get(selectionModeAtom)) {
    set(selectionModeAtom, false)
  }
})
removeTaskFromSelectionAtom.debugLabel = "removeTaskFromSelectionAtom"

// =============================================================================
// BULK OPERATION ATOMS
// =============================================================================

/**
 * Payload type for bulk operations
 */
type BulkActionPayload = {
  projectId?: string | null
  priority?: 1 | 2 | 3 | 4
  dueDate?: Date | null
}

/**
 * Bulk action atom for performing operations on selected tasks
 */
export const bulkActionAtom = atom(
  null,
  async (
    get,
    set,
    action: "complete" | "delete" | "move" | "priority" | "schedule",
    payload?: BulkActionPayload,
  ) => {
    const selectedIds = get(selectedTasksAtom)
    if (selectedIds.length === 0) return

    switch (action) {
      case "complete":
        // Complete all selected tasks
        selectedIds.forEach((taskId) => {
          set(updateTaskAtom, { updateRequest: { id: taskId, completed: true } })
        })
        break

      case "delete":
        // Delete all selected tasks
        selectedIds.forEach((taskId) => {
          set(deleteTaskAtom, taskId)
        })
        break

      case "move":
        // Move all selected tasks to project
        if (payload?.projectId !== undefined) {
          selectedIds.forEach((taskId) => {
            set(updateTaskAtom, {
              updateRequest: {
                id: taskId,
                projectId: payload.projectId ? createProjectId(payload.projectId) : undefined,
              },
            })
          })
        }
        break

      case "priority":
        // Set priority for all selected tasks
        if (payload?.priority && payload.priority >= 1 && payload.priority <= 4) {
          selectedIds.forEach((taskId) => {
            set(updateTaskAtom, {
              updateRequest: { id: taskId, priority: payload.priority },
            })
          })
        }
        break

      case "schedule":
        // Set due date for all selected tasks
        if (payload?.dueDate !== undefined) {
          selectedIds.forEach((taskId) => {
            set(updateTaskAtom, {
              updateRequest: { id: taskId, dueDate: payload.dueDate ?? undefined },
            })
          })
        }
        break
    }

    // Clear selection after bulk action
    set(exitSelectionModeAtom)
  },
)
bulkActionAtom.debugLabel = "bulkActionAtom"

/**
 * Bulk complete selected tasks
 */
export const bulkCompleteTasksAtom = atom(null, (get, set) => {
  set(bulkActionAtom, "complete")
})
bulkCompleteTasksAtom.debugLabel = "bulkCompleteTasksAtom"

/**
 * Bulk delete selected tasks
 */
export const bulkDeleteTasksAtom = atom(null, (get, set) => {
  set(bulkActionAtom, "delete")
})
bulkDeleteTasksAtom.debugLabel = "bulkDeleteTasksAtom"

/**
 * Bulk move selected tasks to a project
 */
export const bulkMoveTasksAtom = atom(null, (get, set, projectId: ProjectId | null) => {
  set(bulkActionAtom, "move", { projectId })
})
bulkMoveTasksAtom.debugLabel = "bulkMoveTasksAtom"

/**
 * Bulk set priority for selected tasks
 */
export const bulkSetPriorityAtom = atom(null, (get, set, priority: 1 | 2 | 3 | 4) => {
  set(bulkActionAtom, "priority", { priority })
})
bulkSetPriorityAtom.debugLabel = "bulkSetPriorityAtom"

/**
 * Bulk schedule selected tasks
 */
export const bulkScheduleTasksAtom = atom(null, (get, set, dueDate: Date | null) => {
  set(bulkActionAtom, "schedule", { dueDate })
})
bulkScheduleTasksAtom.debugLabel = "bulkScheduleTasksAtom"

// =============================================================================
// SELECTION UTILITY ATOMS
// =============================================================================

/**
 * Check if all visible tasks are selected
 */
export const allVisibleTasksSelectedAtom = atom<boolean>((get) => {
  const visibleTasks = get(filteredTasksAtom)
  const selectedTasks = get(selectedTasksAtom)

  if (visibleTasks.length === 0) return false

  return visibleTasks.every((task: Task) => selectedTasks.includes(task.id))
})
allVisibleTasksSelectedAtom.debugLabel = "allVisibleTasksSelectedAtom"

/**
 * Check if some (but not all) visible tasks are selected
 */
export const someVisibleTasksSelectedAtom = atom<boolean>((get) => {
  const visibleTasks = get(filteredTasksAtom)
  const selectedTasks = get(selectedTasksAtom)

  if (visibleTasks.length === 0 || selectedTasks.length === 0) return false

  const selectedVisibleTasks = selectedTasks.filter((taskId: TaskId) =>
    visibleTasks.some((task: Task) => task.id === taskId),
  )

  return selectedVisibleTasks.length > 0 && selectedVisibleTasks.length < visibleTasks.length
})
someVisibleTasksSelectedAtom.debugLabel = "someVisibleTasksSelectedAtom"

/**
 * Toggle selection of all visible tasks
 */
export const toggleSelectAllVisibleTasksAtom = atom(null, (get, set) => {
  const allSelected = get(allVisibleTasksSelectedAtom)

  if (allSelected) {
    // Clear selection
    set(clearSelectionAtom)
  } else {
    // Select all visible tasks
    set(selectAllVisibleTasksAtom)
  }
})
toggleSelectAllVisibleTasksAtom.debugLabel = "toggleSelectAllVisibleTasksAtom"

// =============================================================================
// EXPORTED COLLECTIONS
// =============================================================================

/**
 * All base selection state atoms
 */
export const baseSelectionAtoms = {
  selectionMode: selectionModeAtom,
  selectedTasks: selectedTasksAtom, // Re-export from dialogs for consistency
  hasSelectedTasks: hasSelectedTasksAtom,
  selectedTaskCount: selectedTaskCountAtom,
  isTaskSelected: isTaskSelectedAtom,
  allVisibleTasksSelected: allVisibleTasksSelectedAtom,
  someVisibleTasksSelected: someVisibleTasksSelectedAtom,
} as const

/**
 * All selection action atoms
 */
export const selectionActionAtoms = {
  toggleTaskSelection: toggleTaskSelectionAtom,
  enterSelectionMode: enterSelectionModeAtom,
  exitSelectionMode: exitSelectionModeAtom,
  selectAllVisibleTasks: selectAllVisibleTasksAtom,
  clearSelection: clearSelectionAtom,
  addTaskToSelection: addTaskToSelectionAtom,
  removeTaskFromSelection: removeTaskFromSelectionAtom,
  toggleSelectAllVisibleTasks: toggleSelectAllVisibleTasksAtom,
} as const

/**
 * All bulk operation atoms
 */
export const bulkOperationAtoms = {
  bulkAction: bulkActionAtom,
  bulkCompleteTasks: bulkCompleteTasksAtom,
  bulkDeleteTasks: bulkDeleteTasksAtom,
  bulkMoveTasks: bulkMoveTasksAtom,
  bulkSetPriority: bulkSetPriorityAtom,
  bulkScheduleTasks: bulkScheduleTasksAtom,
} as const

/**
 * Complete collection of all selection atoms
 */
export const selectionAtoms = {
  ...baseSelectionAtoms,
  ...selectionActionAtoms,
  ...bulkOperationAtoms,
} as const
