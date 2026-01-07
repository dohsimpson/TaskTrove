/**
 * View state filtering utilities
 *
 * Shared filtering logic that can be used in both atoms and components
 * to apply viewState filters (showCompleted, showOverdue, search, activeFilters)
 */

import type { Task, ViewState } from "@tasktrove/types/core";
import type { ViewId } from "@tasktrove/types/id";
import {
  filterTasks,
  viewStateToFilterConfig,
  filterTasksByArchived,
} from "@tasktrove/atoms/utils/filters";

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
  // For completed view, still hide archived tasks unless explicitly shown
  if (viewId === "completed") {
    const showArchived = viewState.showArchived ?? false;
    return filterTasksByArchived(tasks, showArchived);
  }

  // Convert ViewState to FilterConfig and apply all filters using the centralized filterTasks function
  const filterConfig = viewStateToFilterConfig(viewState);
  return filterTasks(tasks, filterConfig);
}
