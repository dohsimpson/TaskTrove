/**
 * View state filtering utilities
 *
 * Shared filtering logic that can be used in both atoms and components
 * to apply viewState filters (showCompleted, showOverdue, search, activeFilters)
 */

import type { Task, ViewState, ViewId, LabelId } from "@tasktrove/types";
import { matchesDueDateFilter } from "@tasktrove/utils";

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

  let result = tasks;

  // Apply showCompleted filter
  if (!viewState.showCompleted) {
    result = result.filter((task: Task) => !task.completed);
  }

  // Apply showOverdue filter
  if (!viewState.showOverdue) {
    result = result.filter((task: Task) => {
      if (!task.dueDate) return true;
      // Use date-fns utilities from core/tasks.ts
      const now = new Date();
      const taskDate = new Date(task.dueDate);
      // Remove overdue tasks (tasks in the past but not today)
      const isOverdue =
        taskDate < now &&
        !(
          taskDate.getDate() === now.getDate() &&
          taskDate.getMonth() === now.getMonth() &&
          taskDate.getFullYear() === now.getFullYear()
        );
      return !isOverdue;
    });
  }

  // Apply search query filter
  const searchQuery = viewState.searchQuery;
  if (searchQuery) {
    result = result.filter(
      (task: Task) =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }

  // Apply advanced filters from viewState.activeFilters
  const activeFilters = viewState.activeFilters;
  if (activeFilters) {
    // Filter by project IDs
    if (activeFilters.projectIds?.length) {
      result = result.filter(
        (task: Task) =>
          task.projectId && activeFilters.projectIds?.includes(task.projectId),
      );
    }

    // Filter by labels
    if (activeFilters.labels === null) {
      // Show only tasks with NO labels
      result = result.filter((task: Task) => task.labels.length === 0);
    } else if (activeFilters.labels && activeFilters.labels.length > 0) {
      // Show tasks with specific labels
      const labelFilter = activeFilters.labels;
      result = result.filter((task: Task) =>
        task.labels.some((label: LabelId) => labelFilter.includes(label)),
      );
    }
    // If activeFilters.labels is [], show all tasks (no filtering)

    // Filter by priorities
    if (activeFilters.priorities?.length) {
      result = result.filter((task: Task) =>
        activeFilters.priorities?.includes(task.priority),
      );
    }

    // Filter by completion status
    if (activeFilters.completed !== undefined) {
      result = result.filter(
        (task: Task) => task.completed === activeFilters.completed,
      );
    }

    // Filter by due date (preset or custom range)
    if (activeFilters.dueDateFilter) {
      const { preset, customRange } = activeFilters.dueDateFilter;
      result = result.filter((task: Task) => {
        return matchesDueDateFilter(
          task.dueDate || null,
          task.completed,
          preset || undefined,
          customRange,
        );
      });
    }

    // Filter by assigned team members (currently not supported in Task schema)
    // TODO: Add assignedTo field to Task schema when team features are implemented
    // if (activeFilters.assignedTo?.length) {
    //   result = result.filter((task) =>
    //     task.assignedTo?.some((userId) => activeFilters.assignedTo!.includes(userId))
    //   );
    // }

    // Status filtering removed
  }

  return result;
}
