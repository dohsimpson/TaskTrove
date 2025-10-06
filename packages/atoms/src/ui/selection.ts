import { atom } from "jotai";
import { selectedTasksAtom, baseSelectedTasksAtom } from "./dialogs";
import { filteredTasksAtom } from "./filtered-tasks";
import { updateTasksAtom, deleteTasksAtom } from "../core/tasks";
import {
  createProjectId,
  type TaskId,
  type ProjectId,
  type Task,
} from "@tasktrove/types";

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
 * Selection mode state - automatically derived from baseSelectedTasksAtom
 * True when there are manually selected tasks, false otherwise
 */
export const selectionModeAtom = atom<boolean>((get) => {
  const baseSelected = get(baseSelectedTasksAtom);
  return baseSelected.length > 0;
});
selectionModeAtom.debugLabel = "selectionModeAtom";

/**
 * Last selected task - used as anchor for SHIFT+click range selection
 */
export const lastSelectedTaskAtom = atom<TaskId | null>(null);
lastSelectedTaskAtom.debugLabel = "lastSelectedTaskAtom";

// =============================================================================
// DERIVED SELECTION STATE ATOMS
// =============================================================================

/**
 * Derived atom - returns true if any tasks are selected
 */
export const hasSelectedTasksAtom = atom<boolean>((get) => {
  const selectedTasks = get(selectedTasksAtom);
  return selectedTasks.length > 0;
});
hasSelectedTasksAtom.debugLabel = "hasSelectedTasksAtom";

/**
 * Derived atom - returns the count of selected tasks
 */
export const selectedTaskCountAtom = atom<number>((get) => {
  const selectedTasks = get(selectedTasksAtom);
  return selectedTasks.length;
});
selectedTaskCountAtom.debugLabel = "selectedTaskCountAtom";

/**
 * Derived atom - returns a function to check if a task is selected
 */
export const isTaskSelectedAtom = atom((get) => {
  const selectedTasks = get(selectedTasksAtom);
  return (taskId: TaskId): boolean => selectedTasks.includes(taskId);
});
isTaskSelectedAtom.debugLabel = "isTaskSelectedAtom";

// =============================================================================
// SELECTION ACTION ATOMS
// =============================================================================

/**
 * Toggle single task selection
 * Auto-enters selection mode when selecting first task
 * Auto-exits selection mode when no tasks are selected
 */
export const toggleTaskSelectionAtom = atom(
  null,
  (get, set, taskId: TaskId) => {
    const selectedTasks = get(baseSelectedTasksAtom);
    const isSelected = selectedTasks.includes(taskId);

    let updatedSelected: TaskId[];
    if (isSelected) {
      // Remove from selection
      updatedSelected = selectedTasks.filter((id) => id !== taskId);
    } else {
      // Add to selection
      updatedSelected = [...selectedTasks, taskId];
      // Track last selected task for range selection
      set(lastSelectedTaskAtom, taskId);
    }

    set(baseSelectedTasksAtom, updatedSelected);
    // Selection mode is automatically managed by selectionModeAtom (derived from baseSelectedTasksAtom)
  },
);
toggleTaskSelectionAtom.debugLabel = "toggleTaskSelectionAtom";

/**
 * Enter selection mode with optional initial task selection
 * Selection mode is automatically activated when tasks are selected
 */
export const enterSelectionModeAtom = atom(
  null,
  (get, set, initialTaskId?: TaskId) => {
    // Selection mode is automatically managed - just add the task if provided
    if (initialTaskId && !get(baseSelectedTasksAtom).includes(initialTaskId)) {
      const selectedTasks = get(baseSelectedTasksAtom);
      set(baseSelectedTasksAtom, [...selectedTasks, initialTaskId]);
    }
  },
);
enterSelectionModeAtom.debugLabel = "enterSelectionModeAtom";

/**
 * Exit selection mode and clear all selections
 * Selection mode is automatically deactivated when all tasks are deselected
 */
export const exitSelectionModeAtom = atom(null, (get, set) => {
  // Clear selections - selection mode will automatically become false
  set(baseSelectedTasksAtom, []);
});
exitSelectionModeAtom.debugLabel = "exitSelectionModeAtom";

/**
 * Select all visible tasks in current view
 */
export const selectAllVisibleTasksAtom = atom(null, (get, set) => {
  const visibleTasks = get(filteredTasksAtom);
  const visibleTaskIds = visibleTasks.map((task: Task) => task.id);
  set(baseSelectedTasksAtom, visibleTaskIds);
  // Selection mode is automatically activated when tasks are selected
});
selectAllVisibleTasksAtom.debugLabel = "selectAllVisibleTasksAtom";

/**
 * Clear all selections and exit selection mode
 */
export const clearSelectionAtom = atom(null, (get, set) => {
  set(baseSelectedTasksAtom, []);
  // Selection mode is automatically deactivated when all tasks are deselected
});
clearSelectionAtom.debugLabel = "clearSelectionAtom";

/**
 * Add specific task to selection (doesn't toggle, always adds)
 */
export const addTaskToSelectionAtom = atom(null, (get, set, taskId: TaskId) => {
  const selectedTasks = get(baseSelectedTasksAtom);
  if (!selectedTasks.includes(taskId)) {
    set(baseSelectedTasksAtom, [...selectedTasks, taskId]);
    // Track last selected task for range selection
    set(lastSelectedTaskAtom, taskId);
    // Selection mode is automatically activated when tasks are selected
  }
});
addTaskToSelectionAtom.debugLabel = "addTaskToSelectionAtom";

/**
 * Remove specific task from selection (doesn't toggle, always removes)
 */
export const removeTaskFromSelectionAtom = atom(
  null,
  (get, set, taskId: TaskId) => {
    const selectedTasks = get(baseSelectedTasksAtom);
    const updatedSelected = selectedTasks.filter((id) => id !== taskId);
    set(baseSelectedTasksAtom, updatedSelected);
    // Selection mode is automatically deactivated when all tasks are deselected
  },
);
removeTaskFromSelectionAtom.debugLabel = "removeTaskFromSelectionAtom";

/**
 * Select range of tasks from last selected task to current task (SHIFT+click)
 * Uses visible/filtered tasks order for range selection
 */
export const selectTaskRangeAtom = atom(null, (get, set, taskId: TaskId) => {
  const visibleTasks = get(filteredTasksAtom);
  const selectedTasks = get(baseSelectedTasksAtom);

  // Determine the anchor point for range selection
  let lastSelected: TaskId | null;
  if (selectedTasks.length === 0) {
    // No selection: use first visible task as anchor
    lastSelected = visibleTasks[0]?.id ?? null;
  } else if (selectedTasks.length === 1) {
    // Single selection: use that task as anchor
    lastSelected = selectedTasks[0] ?? null;
  } else {
    // Multiple selections: use lastSelectedTaskAtom as anchor
    lastSelected = get(lastSelectedTaskAtom);
  }

  // If no anchor point, just select the current one
  if (!lastSelected) {
    set(addTaskToSelectionAtom, taskId);
    return;
  }

  // Find indices of both tasks in visible tasks
  const lastIndex = visibleTasks.findIndex(
    (task: Task) => task.id === lastSelected,
  );
  const currentIndex = visibleTasks.findIndex(
    (task: Task) => task.id === taskId,
  );

  // If either task is not in visible tasks, just select current
  if (lastIndex === -1 || currentIndex === -1) {
    set(addTaskToSelectionAtom, taskId);
    return;
  }

  // Determine range
  const startIndex = Math.min(lastIndex, currentIndex);
  const endIndex = Math.max(lastIndex, currentIndex);

  // Get all task IDs in range
  const rangeTaskIds = visibleTasks
    .slice(startIndex, endIndex + 1)
    .map((task: Task) => task.id);

  // Merge with existing selection (union)
  const newSelection = Array.from(new Set([...selectedTasks, ...rangeTaskIds]));

  set(baseSelectedTasksAtom, newSelection);
  // Update last selected to current task
  set(lastSelectedTaskAtom, taskId);
  // Selection mode is automatically activated when tasks are selected
});
selectTaskRangeAtom.debugLabel = "selectTaskRangeAtom";

// =============================================================================
// BULK OPERATION ATOMS
// =============================================================================

/**
 * Payload type for bulk operations
 */
type BulkActionPayload = {
  projectId?: string | null;
  priority?: 1 | 2 | 3 | 4;
  dueDate?: Date | null;
};

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
    const selectedIds = get(selectedTasksAtom);
    if (selectedIds.length === 0) return;

    switch (action) {
      case "complete":
        // Complete all selected tasks
        const updates = selectedIds.map((taskId) => ({
          id: taskId,
          completed: true,
        }));
        set(updateTasksAtom, updates);
        break;

      case "delete":
        // Delete all selected tasks
        set(deleteTasksAtom, selectedIds);
        break;

      case "move":
        // Move all selected tasks to project
        if (payload?.projectId !== undefined) {
          const updates = selectedIds.map((taskId) => ({
            id: taskId,
            projectId: payload.projectId
              ? createProjectId(payload.projectId)
              : undefined,
          }));
          set(updateTasksAtom, updates);
        }
        break;

      case "priority":
        // Set priority for all selected tasks
        if (
          payload?.priority &&
          payload.priority >= 1 &&
          payload.priority <= 4
        ) {
          const updates = selectedIds.map((taskId) => ({
            id: taskId,
            priority: payload.priority,
          }));
          set(updateTasksAtom, updates);
        }
        break;

      case "schedule":
        // Set due date for all selected tasks
        if (payload?.dueDate !== undefined) {
          const updates = selectedIds.map((taskId) => ({
            id: taskId,
            dueDate: payload.dueDate ?? undefined,
          }));
          set(updateTasksAtom, updates);
        }
        break;
    }

    // Clear selection after bulk action
    set(exitSelectionModeAtom);
  },
);
bulkActionAtom.debugLabel = "bulkActionAtom";

/**
 * Bulk complete selected tasks
 */
export const bulkCompleteTasksAtom = atom(null, (get, set) => {
  set(bulkActionAtom, "complete");
});
bulkCompleteTasksAtom.debugLabel = "bulkCompleteTasksAtom";

/**
 * Bulk delete selected tasks
 */
export const bulkDeleteTasksAtom = atom(null, (get, set) => {
  set(bulkActionAtom, "delete");
});
bulkDeleteTasksAtom.debugLabel = "bulkDeleteTasksAtom";

/**
 * Bulk move selected tasks to a project
 */
export const bulkMoveTasksAtom = atom(
  null,
  (get, set, projectId: ProjectId | null) => {
    set(bulkActionAtom, "move", { projectId });
  },
);
bulkMoveTasksAtom.debugLabel = "bulkMoveTasksAtom";

/**
 * Bulk set priority for selected tasks
 */
export const bulkSetPriorityAtom = atom(
  null,
  (get, set, priority: 1 | 2 | 3 | 4) => {
    set(bulkActionAtom, "priority", { priority });
  },
);
bulkSetPriorityAtom.debugLabel = "bulkSetPriorityAtom";

/**
 * Bulk schedule selected tasks
 */
export const bulkScheduleTasksAtom = atom(
  null,
  (get, set, dueDate: Date | null) => {
    set(bulkActionAtom, "schedule", { dueDate });
  },
);
bulkScheduleTasksAtom.debugLabel = "bulkScheduleTasksAtom";

// =============================================================================
// SELECTION UTILITY ATOMS
// =============================================================================

/**
 * Check if all visible tasks are selected
 */
export const allVisibleTasksSelectedAtom = atom<boolean>((get) => {
  const visibleTasks = get(filteredTasksAtom);
  const selectedTasks = get(selectedTasksAtom);

  if (visibleTasks.length === 0) return false;

  return visibleTasks.every((task: Task) => selectedTasks.includes(task.id));
});
allVisibleTasksSelectedAtom.debugLabel = "allVisibleTasksSelectedAtom";

/**
 * Check if some (but not all) visible tasks are selected
 */
export const someVisibleTasksSelectedAtom = atom<boolean>((get) => {
  const visibleTasks = get(filteredTasksAtom);
  const selectedTasks = get(selectedTasksAtom);

  if (visibleTasks.length === 0 || selectedTasks.length === 0) return false;

  const selectedVisibleTasks = selectedTasks.filter((taskId: TaskId) =>
    visibleTasks.some((task: Task) => task.id === taskId),
  );

  return (
    selectedVisibleTasks.length > 0 &&
    selectedVisibleTasks.length < visibleTasks.length
  );
});
someVisibleTasksSelectedAtom.debugLabel = "someVisibleTasksSelectedAtom";

/**
 * Toggle selection of all visible tasks
 */
export const toggleSelectAllVisibleTasksAtom = atom(null, (get, set) => {
  const allSelected = get(allVisibleTasksSelectedAtom);

  if (allSelected) {
    // Clear selection
    set(clearSelectionAtom);
  } else {
    // Select all visible tasks
    set(selectAllVisibleTasksAtom);
  }
});
toggleSelectAllVisibleTasksAtom.debugLabel = "toggleSelectAllVisibleTasksAtom";

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
} as const;

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
  selectTaskRange: selectTaskRangeAtom,
  toggleSelectAllVisibleTasks: toggleSelectAllVisibleTasksAtom,
} as const;

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
} as const;

/**
 * Complete collection of all selection atoms
 */
export const selectionAtoms = {
  ...baseSelectionAtoms,
  ...selectionActionAtoms,
  ...bulkOperationAtoms,
} as const;
