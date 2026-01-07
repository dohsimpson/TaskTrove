/**
 * Pure filter utility functions for TaskTrove
 *
 * These functions are completely independent of Jotai atoms and UI state.
 * They accept data as parameters and return filtered results.
 *
 * CRITICAL: This file must have ZERO dependencies on atom files to break circular dependencies.
 */

import type { Task, ViewState, TaskPriority } from "@tasktrove/types/core";
import type { ProjectId, LabelId } from "@tasktrove/types/id";

// =============================================================================
// FILTER CONFIGURATION
// =============================================================================

/**
 * Configuration object for filtering tasks
 * Extracted from ViewState to enable pure filtering logic
 */
export interface FilterConfig {
  /** Whether to show completed tasks */
  showCompleted?: boolean;
  /** Whether to show archived tasks */
  showArchived?: boolean;
  /** Whether to show overdue tasks */
  showOverdue?: boolean;
  /** Search query to match against task title and description */
  searchQuery?: string;
  /** Filter by specific project IDs */
  projectIds?: ProjectId[];
  /** Filter by specific label IDs (null = tasks with no labels) */
  labels?: LabelId[] | null;
  /** Filter by priority levels */
  priorities?: TaskPriority[];
  /** Filter by completion status */
  completed?: boolean;
  /** Filter by due date presets or custom ranges */
  dueDateFilter?: {
    preset?:
      | "overdue"
      | "today"
      | "tomorrow"
      | "thisWeek"
      | "nextWeek"
      | "noDueDate";
    customRange?: {
      start?: Date;
      end?: Date;
    };
  };
  /** Filter by task status */
  status?: string[];
}

// =============================================================================
// BASIC FILTER FUNCTIONS
// =============================================================================

/**
 * Filters tasks by completion status
 * Pure function with no atom dependencies
 *
 * @param tasks - Array of tasks to filter
 * @param showCompleted - Whether to include completed tasks
 * @returns Filtered array of tasks
 */
export function filterTasksByCompleted(
  tasks: Task[],
  showCompleted: boolean,
): Task[] {
  return showCompleted ? tasks : tasks.filter((t) => !t.completed);
}

/**
 * Filters tasks by archived status
 *
 * @param tasks - Array of tasks to filter
 * @param showArchived - Whether to include archived tasks
 * @returns Filtered array of tasks
 */
export function filterTasksByArchived(
  tasks: Task[],
  showArchived: boolean,
): Task[] {
  if (showArchived) return tasks;
  return tasks.filter((task) => !task.archived);
}

/**
 * Filters tasks by overdue status
 * Pure function with no atom dependencies
 *
 * @param tasks - Array of tasks to filter
 * @param showOverdue - Whether to include overdue tasks
 * @returns Filtered array of tasks
 */
export function filterTasksByOverdue(
  tasks: Task[],
  showOverdue: boolean,
): Task[] {
  if (showOverdue) return tasks;

  // Filter out overdue tasks (tasks with dueDate before today that are not completed)
  // Note: Tasks due TODAY are not considered overdue
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return tasks.filter((t) => {
    // Keep tasks without due dates
    if (!t.dueDate) return true;
    // Keep completed tasks regardless of due date
    if (t.completed) return true;
    // Keep tasks that are due today or in the future (not overdue)
    return t.dueDate >= todayStart;
  });
}

/**
 * Filters tasks by search query
 * Searches in task title and description (case-insensitive)
 *
 * @param tasks - Array of tasks to filter
 * @param searchQuery - Search query string
 * @returns Filtered array of tasks
 */
export function filterTasksBySearch(
  tasks: Task[],
  searchQuery: string,
): Task[] {
  if (!searchQuery || searchQuery.trim() === "") return tasks;

  const query = searchQuery.toLowerCase().trim();
  return tasks.filter((task) => {
    const titleMatch = task.title.toLowerCase().includes(query);
    const descriptionMatch = task.description
      ? task.description.toLowerCase().includes(query)
      : false;
    return titleMatch || descriptionMatch;
  });
}

/**
 * Filters tasks by project IDs
 *
 * @param tasks - Array of tasks to filter
 * @param projectIds - Array of project IDs to include
 * @returns Filtered array of tasks
 */
export function filterTasksByProjects(
  tasks: Task[],
  projectIds: ProjectId[] | undefined,
): Task[] {
  if (!projectIds || projectIds.length === 0) return tasks;

  return tasks.filter((task) => {
    if (!task.projectId) return false;
    return projectIds.includes(task.projectId);
  });
}

/**
 * Filters tasks by label IDs
 * Special handling: null means "tasks with no labels", array means "tasks with any of these labels"
 *
 * @param tasks - Array of tasks to filter
 * @param labels - Array of label IDs to include, or null for tasks without labels
 * @returns Filtered array of tasks
 */
export function filterTasksByLabels(
  tasks: Task[],
  labels: LabelId[] | null | undefined,
): Task[] {
  // No filter
  if (labels === undefined) return tasks;

  // null = filter for tasks with no labels
  if (labels === null) {
    return tasks.filter((task) => task.labels.length === 0);
  }

  // Empty array = no tasks match
  if (labels.length === 0) return tasks;

  // Filter for tasks that have at least one of the specified label IDs
  return tasks.filter((task) => {
    return task.labels.some((labelId) => labels.includes(labelId));
  });
}

/**
 * Filters tasks by priority levels
 *
 * @param tasks - Array of tasks to filter
 * @param priorities - Array of priority levels to include (1-4)
 * @returns Filtered array of tasks
 */
export function filterTasksByPriorities(
  tasks: Task[],
  priorities: TaskPriority[] | undefined,
): Task[] {
  if (!priorities || priorities.length === 0) return tasks;

  return tasks.filter((task) => priorities.includes(task.priority));
}

/**
 * Filters tasks by completion status (from activeFilters)
 * Different from filterTasksByCompleted - this filters for specific completion state
 *
 * @param tasks - Array of tasks to filter
 * @param completed - Specific completion status to filter for
 * @returns Filtered array of tasks
 */
export function filterTasksByCompletionStatus(
  tasks: Task[],
  completed: boolean | undefined,
): Task[] {
  if (completed === undefined) return tasks;

  return tasks.filter((task) => task.completed === completed);
}

/**
 * Filters tasks by due date using preset or custom range
 *
 * @param tasks - Array of tasks to filter
 * @param dueDateFilter - Due date filter configuration
 * @returns Filtered array of tasks
 */
export function filterTasksByDueDate(
  tasks: Task[],
  dueDateFilter:
    | {
        preset?:
          | "overdue"
          | "today"
          | "tomorrow"
          | "thisWeek"
          | "nextWeek"
          | "noDueDate";
        customRange?: {
          start?: Date;
          end?: Date;
        };
      }
    | undefined,
): Task[] {
  if (!dueDateFilter) return tasks;

  const now = new Date();
  // Create today at start of day in UTC to match how dates are typically stored
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  // Handle preset filters
  if (dueDateFilter.preset) {
    switch (dueDateFilter.preset) {
      case "overdue":
        return tasks.filter(
          (task) => task.dueDate && task.dueDate < now && !task.completed,
        );

      case "today": {
        const tomorrow = new Date(today);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        return tasks.filter(
          (task) =>
            task.dueDate && task.dueDate >= today && task.dueDate < tomorrow,
        );
      }

      case "tomorrow": {
        const tomorrow = new Date(today);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        const dayAfter = new Date(tomorrow);
        dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
        return tasks.filter(
          (task) =>
            task.dueDate && task.dueDate >= tomorrow && task.dueDate < dayAfter,
        );
      }

      case "thisWeek": {
        // End of week is end of Sunday (next Sunday at 23:59:59)
        const endOfWeek = new Date(today);
        endOfWeek.setUTCDate(endOfWeek.getUTCDate() + (7 - today.getUTCDay()));
        endOfWeek.setUTCHours(23, 59, 59, 999);
        return tasks.filter(
          (task) =>
            task.dueDate && task.dueDate >= today && task.dueDate <= endOfWeek,
        );
      }

      case "nextWeek": {
        const nextWeekStart = new Date(today);
        nextWeekStart.setUTCDate(
          nextWeekStart.getUTCDate() + (7 - today.getUTCDay()) + 1,
        );
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setUTCDate(nextWeekEnd.getUTCDate() + 6);
        nextWeekEnd.setUTCHours(23, 59, 59, 999);
        return tasks.filter(
          (task) =>
            task.dueDate &&
            task.dueDate >= nextWeekStart &&
            task.dueDate <= nextWeekEnd,
        );
      }

      case "noDueDate":
        return tasks.filter((task) => !task.dueDate);

      default:
        return tasks;
    }
  }

  // Handle custom range
  if (dueDateFilter.customRange) {
    const { start, end } = dueDateFilter.customRange;

    if (start && end) {
      return tasks.filter(
        (task) => task.dueDate && task.dueDate >= start && task.dueDate <= end,
      );
    }

    if (start) {
      return tasks.filter((task) => task.dueDate && task.dueDate >= start);
    }

    if (end) {
      return tasks.filter((task) => task.dueDate && task.dueDate <= end);
    }
  }

  return tasks;
}

// =============================================================================
// COMPREHENSIVE FILTER FUNCTION
// =============================================================================

/**
 * Applies all filters from FilterConfig to a task array
 * This is the main filtering function that combines all filter criteria
 *
 * @param tasks - Array of tasks to filter
 * @param config - Filter configuration object
 * @returns Filtered array of tasks
 */
export function filterTasks(tasks: Task[], config: FilterConfig): Task[] {
  let filtered = tasks;

  // Apply archived visibility filter (default: hide archived)
  const showArchived = config.showArchived ?? false;
  filtered = filterTasksByArchived(filtered, showArchived);

  // Apply completion visibility filter
  if (config.showCompleted !== undefined) {
    filtered = filterTasksByCompleted(filtered, config.showCompleted);
  }

  // Apply overdue visibility filter
  if (config.showOverdue !== undefined) {
    filtered = filterTasksByOverdue(filtered, config.showOverdue);
  }

  // Apply search query filter
  if (config.searchQuery) {
    filtered = filterTasksBySearch(filtered, config.searchQuery);
  }

  // Apply project filter
  if (config.projectIds) {
    filtered = filterTasksByProjects(filtered, config.projectIds);
  }

  // Apply label filter
  if (config.labels !== undefined) {
    filtered = filterTasksByLabels(filtered, config.labels);
  }

  // Apply priority filter
  if (config.priorities) {
    filtered = filterTasksByPriorities(filtered, config.priorities);
  }

  // Apply completion status filter (from activeFilters)
  if (config.completed !== undefined) {
    filtered = filterTasksByCompletionStatus(filtered, config.completed);
  }

  // Apply due date filter
  if (config.dueDateFilter) {
    filtered = filterTasksByDueDate(filtered, config.dueDateFilter);
  }

  return filtered;
}

// =============================================================================
// BRIDGE FUNCTIONS
// =============================================================================

/**
 * Extracts filter config from ViewState
 * This is a bridge function for UI layer to convert ViewState to FilterConfig
 *
 * @param viewState - ViewState object from UI layer
 * @returns FilterConfig object for pure filtering
 */
export function viewStateToFilterConfig(viewState: ViewState): FilterConfig {
  return {
    showCompleted: viewState.showCompleted,
    showArchived: viewState.showArchived ?? false,
    showOverdue: viewState.showOverdue,
    searchQuery: viewState.searchQuery,
    projectIds: viewState.activeFilters?.projectIds,
    labels: viewState.activeFilters?.labels,
    priorities: viewState.activeFilters?.priorities,
    completed: viewState.activeFilters?.completed,
    dueDateFilter: viewState.activeFilters?.dueDateFilter,
  };
}
