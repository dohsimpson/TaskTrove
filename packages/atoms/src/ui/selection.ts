import { atom } from "jotai";
import { tasksAtom } from "@tasktrove/atoms/data/base/atoms";
import { resetSidePanelStateAtom } from "@tasktrove/atoms/ui/views";
import { type TaskId } from "@tasktrove/types/id";
import { type Task } from "@tasktrove/types/core";

/**
 * Simplified Selection State Management Atoms
 *
 * Provides a minimal selection system using only selectedTasksAtom.
 *
 * This module provides:
 * - Selected tasks array storage
 * - Task selection toggle actions
 * - Bulk operations on selected tasks
 */

// =============================================================================
// CORE SELECTION STATE ATOMS
// =============================================================================

/**
 * Selected Task ID - Currently selected task ID for viewing/editing in side panel
 * Note: This is for side panel functionality, not bulk selection
 * IMPORTANT: When setting this to a non-null value, also clear selectedTasksAtom
 */
export const selectedTaskIdAtom = atom<TaskId | null>(null);
selectedTaskIdAtom.debugLabel = "selectedTaskIdAtom";

/**
 * Helper atom to set selected task ID and clear bulk selection
 * Use this instead of directly setting selectedTaskIdAtom
 */
export const setSelectedTaskIdAtom = atom(
  null,
  (get, set, taskId: TaskId | null) => {
    // Set the selected task ID
    set(selectedTaskIdAtom, taskId);

    // If setting a task (not null), clear bulk selection
    if (taskId !== null) {
      set(clearSelectedTasksAtom);
    }
  },
);
setSelectedTaskIdAtom.debugLabel = "setSelectedTaskIdAtom";

/**
 * Selected Task - Derived atom that gets the current task from tasksAtom by ID
 * This ensures the selected task is always up-to-date with the latest task data
 * Note: This is for side panel functionality, not bulk selection
 */
export const selectedTaskAtom = atom<Task | null>((get) => {
  const selectedId = get(selectedTaskIdAtom);
  if (!selectedId) return null;

  const tasks = get(tasksAtom);
  return tasks.find((task: Task) => task.id === selectedId) || null;
});
selectedTaskAtom.debugLabel = "selectedTaskAtom";

/**
 * Selected Tasks - Array of task IDs selected for bulk operations
 * This is the single source of truth for task selection
 */
export const selectedTasksAtom = atom<TaskId[]>([]);
selectedTasksAtom.debugLabel = "selectedTasksAtom";

/**
 * Last Selected Task - Tracks the most recently selected task for bulk selection
 * Used as anchor for potential range selection functionality
 * Cleared when removing tasks from selection
 */
export const lastSelectedTaskAtom = atom<TaskId | null>(null);
lastSelectedTaskAtom.debugLabel = "lastSelectedTaskAtom";

/**
 * Multi-Select Dragging - Tracks whether a multi-selection drag is currently in progress
 * Used to show/hide multi-select UI elements during drag operations
 */
export const multiSelectDraggingAtom = atom<boolean>(false);
multiSelectDraggingAtom.debugLabel = "multiSelectDraggingAtom";

// =============================================================================
// SELECTION ACTION ATOMS
// =============================================================================

/**
 * Toggle single task selection
 * Simplified to: reset side panel state, then toggle taskId in selectedTasksAtom
 */
export const toggleTaskSelectionAtom = atom(
  null,
  (get, set, taskId: TaskId) => {
    // BEFORE resetting side panel, preserve the currently selected task
    const currentSelectedTaskId = get(selectedTaskIdAtom);
    const currentSelection = get(selectedTasksAtom);

    // If there's a task selected in side panel and it's not already in multi-select,
    // add it to preserve the selection when transitioning to multi-select mode
    if (
      currentSelectedTaskId &&
      !currentSelection.includes(currentSelectedTaskId)
    ) {
      set(selectedTasksAtom, [...currentSelection, currentSelectedTaskId]);
      // Also set as last selected so SHIFT+click range selection can use it as anchor
      set(lastSelectedTaskAtom, currentSelectedTaskId);
    }

    // Then reset side panel state (closes panel and disables showSidePanel)
    set(resetSidePanelStateAtom);

    // Then toggle taskId in selectedTasksAtom set
    const updatedSelection = get(selectedTasksAtom); // Re-read after preservation
    const isSelected = updatedSelection.includes(taskId);

    if (isSelected) {
      // Remove taskId from selection
      const newSelection = updatedSelection.filter((id) => id !== taskId);
      set(selectedTasksAtom, newSelection);

      // Clear last selected task when removing from selection
      set(lastSelectedTaskAtom, null);
    } else {
      // Add taskId to selection
      set(selectedTasksAtom, [...updatedSelection, taskId]);

      // Track last selected task when adding to selection
      set(lastSelectedTaskAtom, taskId);
    }
  },
);
toggleTaskSelectionAtom.debugLabel = "toggleTaskSelectionAtom";

/**
 * Clear all selected tasks - simplified action
 */
export const clearSelectedTasksAtom = atom(null, (get, set) => {
  set(selectedTasksAtom, []);
  set(lastSelectedTaskAtom, null);
});
clearSelectedTasksAtom.debugLabel = "clearSelectedTasksAtom";

/**
 * Range selection payload for SHIFT+click selection
 */
interface RangeSelectionPayload {
  startTaskId: TaskId;
  endTaskId: TaskId;
  sortedTaskIds: TaskId[];
}

/**
 * Range selection atom for SHIFT+click functionality
 * Selects all tasks between start and end task in the sorted list
 */
export const selectRangeAtom = atom(
  null,
  (get, set, payload: RangeSelectionPayload) => {
    const { startTaskId, endTaskId, sortedTaskIds } = payload;

    // Find indices of start and end tasks in the sorted list
    const startIndex = sortedTaskIds.indexOf(startTaskId);
    const endIndex = sortedTaskIds.indexOf(endTaskId);

    if (startIndex === -1 || endIndex === -1) {
      // Invalid task IDs, don't do anything
      return;
    }

    // Get range between the two indices (inclusive)
    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);
    const rangeTaskIds = sortedTaskIds.slice(minIndex, maxIndex + 1);

    // Reset side panel state (as with any selection)
    set(resetSidePanelStateAtom);

    // Get current selection to preserve existing selected tasks
    const currentSelection = get(selectedTasksAtom);

    // Merge current selection with new range selection, avoiding duplicates
    const mergedSelection = [
      ...new Set([...currentSelection, ...rangeTaskIds]),
    ];

    // Set the merged selection
    set(selectedTasksAtom, mergedSelection);

    // Update last selected task to the end of the range
    set(lastSelectedTaskAtom, endTaskId);
  },
);
selectRangeAtom.debugLabel = "selectRangeAtom";

// =============================================================================
// EXPORTED COLLECTIONS
// =============================================================================

/**
 * All selection action atoms
 */
export const selectionActionAtoms = {
  toggleTaskSelection: toggleTaskSelectionAtom,
  clearSelectedTasks: clearSelectedTasksAtom,
  setSelectedTaskId: setSelectedTaskIdAtom,
  selectRange: selectRangeAtom,
} as const;

/**
 * Complete collection of all selection atoms
 */
export const selectionAtoms = {
  selectedTaskId: selectedTaskIdAtom,
  selectedTask: selectedTaskAtom,
  selectedTasks: selectedTasksAtom,
  lastSelectedTask: lastSelectedTaskAtom,
  multiSelectDragging: multiSelectDraggingAtom,
  ...selectionActionAtoms,
} as const;
