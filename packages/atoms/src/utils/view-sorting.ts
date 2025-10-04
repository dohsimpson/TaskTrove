/**
 * View state sorting utilities
 *
 * Shared sorting logic that can be used in both atoms and components
 * to apply viewState sorting (sortBy, sortDirection)
 */

import type { Task, ViewState } from "@tasktrove/types";

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
  return tasks.sort((a: Task, b: Task) => {
    const direction = viewState.sortDirection === "asc" ? 1 : -1;

    switch (viewState.sortBy) {
      case "default":
        // Default sort: completed tasks at bottom, maintain existing order otherwise
        if (a.completed !== b.completed) {
          return (a.completed ? 1 : 0) - (b.completed ? 1 : 0);
        }
        // Within same completion status, maintain existing order (no additional sorting)
        return 0;
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
      case "status":
        // Sort by completion status only
        if (a.completed !== b.completed) {
          return direction * ((a.completed ? 1 : 0) - (b.completed ? 1 : 0));
        }
        return 0;
      default:
        return 0;
    }
  });
}
