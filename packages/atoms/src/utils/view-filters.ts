/**
 * View state filtering utilities
 *
 * Shared filtering logic that can be used in both atoms and components
 * to apply viewState filters (showCompleted, showOverdue, search, activeFilters)
 */

import type { Task, ViewState, ViewId } from "@tasktrove/types";
import { filterTasks, viewStateToFilterConfig } from "#utils/filters";

/**
 * Apply all view state filters to a list of tasks
 *
 * @param tasks - Array of tasks to filter
 * @param viewState - View state containing filter preferences
 * @param viewId - Current view ID (some views like "completed" have special behavior)
 * @returns Filtered array of tasks
 */
export function applyViewStateFilters(
  tasks: Task[],
  viewState: ViewState,
  viewId: ViewId,
): Task[] {
  // For completed view, always show all completed tasks (no filtering)
  if (viewId === "completed") {
    return tasks;
  }

  // Convert ViewState to FilterConfig and apply all filters using the centralized filterTasks function
  const filterConfig = viewStateToFilterConfig(viewState);
  return filterTasks(tasks, filterConfig);
}
