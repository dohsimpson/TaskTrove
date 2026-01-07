/**
 * UI-specific filtered tasks atoms
 *
 * These atoms live in the UI layer because they depend on UI state (viewStates, search, etc.)
 * They use pure filter functions from utils/filters.ts and base filtering from core/tasks.ts
 */

import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import type { ViewId } from "@tasktrove/types/id";
import { baseFilteredTasksAtom } from "@tasktrove/atoms/data/tasks/filters";
import {
  currentViewAtom,
  currentViewStateAtom,
  viewStatesAtom,
  getViewStateOrDefault,
} from "@tasktrove/atoms/ui/views";
import {
  taskFocusVisibilityAtom,
  includeFocusedTask,
} from "@tasktrove/atoms/ui/task-focus";
import { selectedTaskIdAtom } from "@tasktrove/atoms/ui/selection";
import { handleAtomError } from "@tasktrove/atoms/utils/atom-helpers";
import { applyViewStateFilters } from "@tasktrove/atoms/utils/view-filters";
import { sortTasksByViewState } from "@tasktrove/atoms/utils/view-sorting";
import { sortTasksByRecentActivity } from "@tasktrove/atoms/utils/task-recent";

/**
 * UI-filtered tasks for a specific view
 * Applies UI preferences (showCompleted, showOverdue, search, activeFilters) on top of base filtered tasks
 *
 * Note: This still uses atomFamily for caching view-specific UI state,
 * but now reads from the simplified baseFilteredTasksAtom
 */
export const uiFilteredTasksForViewAtom = atomFamily((viewId: ViewId) =>
  atom((get) => {
    try {
      // Start with base filtered tasks (now route-reactive, not parameterized)
      const baseTasks = get(baseFilteredTasksAtom);

      // Get UI preferences for this view
      const viewStates = get(viewStatesAtom);
      const viewState = getViewStateOrDefault(viewStates, viewId);

      // Apply all view state filters
      return applyViewStateFilters(baseTasks, viewState, viewId);
    } catch (error) {
      handleAtomError(error, `uiFilteredTasksForViewAtom(${viewId})`);
      return [];
    }
  }),
);

/**
 * Filtered tasks for the current view
 * This is the main atom that components should use
 *
 * Applies view-specific logic, UI preferences, and sorting
 */
export const filteredTasksAtom = atom((get) => {
  try {
    const currentView = get(currentViewAtom);
    const viewState = get(currentViewStateAtom);
    const focusVisibility = get(taskFocusVisibilityAtom);
    const selectedTaskId = get(selectedTaskIdAtom);

    // Get UI-filtered tasks for current view
    const baseTasks = get(baseFilteredTasksAtom);
    const result = includeFocusedTask(
      get(uiFilteredTasksForViewAtom(currentView)),
      baseTasks,
      focusVisibility,
      selectedTaskId,
      currentView,
    );

    if (currentView === "recent" && viewState.sortBy === "default") {
      return sortTasksByRecentActivity([...result]);
    }

    // Apply sorting based on viewState.sortBy
    // Note: sortTasksByViewState mutates the array, so we pass a copy
    return sortTasksByViewState([...result], viewState);
  } catch (error) {
    handleAtomError(error, "filteredTasksAtom");
    return [];
  }
});
filteredTasksAtom.debugLabel = "filteredTasksAtom";
