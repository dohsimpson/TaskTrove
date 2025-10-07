/**
 * UI-specific filtered tasks atoms
 *
 * These atoms live in the UI layer because they depend on UI state (viewStates, search, etc.)
 * They use pure filter functions from utils/filters.ts and base filtering from core/tasks.ts
 */

import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import type { ViewId } from "@tasktrove/types";
import { baseFilteredTasksForViewAtom } from "../core/tasks";
import {
  currentViewAtom,
  currentViewStateAtom,
  viewStatesAtom,
  getViewStateOrDefault,
} from "./views";
import { handleAtomError } from "../utils/atom-helpers";
import { applyViewStateFilters } from "../utils/view-filters";
import { sortTasksByViewState } from "../utils/view-sorting";

/**
 * UI-filtered tasks for a specific view
 * Applies UI preferences (showCompleted, showOverdue, search, activeFilters) on top of base filtered tasks
 */
export const uiFilteredTasksForViewAtom = atomFamily((viewId: ViewId) =>
  atom((get) => {
    try {
      // Start with base filtered tasks (view-specific logic only)
      const baseTasks = get(baseFilteredTasksForViewAtom(viewId));

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

    // Get UI-filtered tasks for current view
    const result = get(uiFilteredTasksForViewAtom(currentView));

    // Apply sorting based on viewState.sortBy
    // Note: sortTasksByViewState mutates the array, so we pass a copy
    return sortTasksByViewState([...result], viewState);
  } catch (error) {
    handleAtomError(error, "filteredTasksAtom");
    return [];
  }
});
filteredTasksAtom.debugLabel = "filteredTasksAtom";
