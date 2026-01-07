/**
 * View state sorting utilities
 *
 * Shared sorting logic that can be used in both atoms and components
 * to apply viewState sorting (sortBy, sortDirection)
 */

import type { Task, ViewState } from "@tasktrove/types/core";

/**
 * Sort tasks based on view state preferences
 *
 * IMPORTANT: This function mutates the input array using .sort()
 * If you need to preserve the original array, pass a copy: [...tasks]
 *
 * @param tasks - Array of tasks to sort (will be mutated)
 * @param viewState - View state containing sorting preferences
 * @returns The sorted array (same reference as input)
 */
export function sortTasksByViewState(
  tasks: Task[],
  viewState: ViewState,
): Task[] {
  const statusRank = (task: Task) => {
    if (task.completed) return 2;
    if (task.archived) return 1;
    return 0;
  };

  return tasks.sort((a: Task, b: Task) => {
    const direction = viewState.sortDirection === "asc" ? 1 : -1;

    switch (viewState.sortBy) {
      case "default":
        // Default sort: active -> archived -> completed
        return statusRank(a) - statusRank(b);
      case "priority":
        return direction * (a.priority - b.priority);
      case "dueDate":
        // Regular due date sorting (mixed completed/incomplete)
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return direction;
        if (!b.dueDate) return -direction;
        return direction * (a.dueDate.getTime() - b.dueDate.getTime());
      case "title":
        return direction * a.title.localeCompare(b.title);
      case "createdAt":
        return direction * (a.createdAt.getTime() - b.createdAt.getTime());
      default:
        return 0;
    }
  });
}
