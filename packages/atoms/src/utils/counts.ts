/**
 * Pure count calculation functions for TaskTrove
 *
 * These functions are completely independent of Jotai atoms and UI state.
 * They accept data as parameters and return count results.
 *
 * CRITICAL: This file must have ZERO dependencies on atom files to break circular dependencies.
 */

import { isToday, isPast, isFuture } from "date-fns";
import type { Task, Project, Label } from "@tasktrove/types/core";
import type { ProjectId, LabelId } from "@tasktrove/types/id";
import { shouldTaskBeInInbox } from "@tasktrove/utils";
import { filterTasksByCompleted } from "./filters";

// =============================================================================
// COUNT CONFIGURATION
// =============================================================================

/**
 * Configuration object for counting tasks
 * Extracted from ViewState to enable pure counting logic
 */
export interface CountConfig {
  /** Whether to show completed tasks */
  showCompleted: boolean;
}

// =============================================================================
// VIEW COUNTS
// =============================================================================

/**
 * Standard view counts interface
 * Matches the shape of taskCountsAtom
 */
export interface ViewCounts {
  /** Total count of active (non-completed, non-archived) tasks */
  total: number;
  /** Count of inbox tasks */
  inbox: number;
  /** Count of tasks due today (includes overdue tasks) */
  today: number;
  /** Count of upcoming tasks (future, not today) */
  upcoming: number;
  /** Count of tasks with any due date */
  calendar: number;
  /** Count of overdue tasks (past due, not today) */
  overdue: number;
  /** Count of completed tasks */
  completed: number;
  /** Count of all active tasks (matches 'all' view) */
  all: number;
  /** Count of active (non-completed) tasks */
  active: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Filters tasks that should be in inbox
 * Pure function with no atom dependencies
 */
function filterInboxTasks(tasks: Task[], projectIds: Set<ProjectId>): Task[] {
  return tasks.filter((task) =>
    shouldTaskBeInInbox(task.projectId, projectIds),
  );
}

/**
 * Filters tasks due today (includes overdue tasks)
 * Pure function with no atom dependencies
 */
function filterTodayTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => {
    if (!task.dueDate) return false;

    // Always include tasks due exactly today
    if (isToday(task.dueDate)) {
      return true;
    }

    // Include overdue tasks (past but not today)
    if (isPast(task.dueDate) && !isToday(task.dueDate)) {
      return true;
    }

    return false;
  });
}

/**
 * Filters upcoming tasks (future, not today)
 * Pure function with no atom dependencies
 */
function filterUpcomingTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => {
    if (!task.dueDate) return false;
    // Upcoming = future tasks that are not today (i.e. tomorrow onwards)
    return isFuture(task.dueDate) && !isToday(task.dueDate);
  });
}

/**
 * Filters overdue tasks (past due, not today, not completed)
 * Pure function with no atom dependencies
 */
function filterOverdueTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => {
    if (!task.dueDate) return false;
    return isPast(task.dueDate) && !isToday(task.dueDate) && !task.completed;
  });
}

/**
 * Filters calendar tasks (tasks with any due date)
 * Pure function with no atom dependencies
 */
function filterCalendarTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => task.dueDate);
}

// =============================================================================
// COUNT CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculates task counts per project
 * Pure function - no atom dependencies
 *
 * @param projects - Array of projects to count tasks for
 * @param tasks - Array of all tasks (should be active tasks only, no archived)
 * @param config - Configuration for filtering (e.g., showCompleted)
 * @returns Record mapping ProjectId to task count
 */
export function calculateProjectTaskCounts(
  projects: Project[],
  tasks: Task[],
  config: CountConfig = { showCompleted: false },
): Record<ProjectId, number> {
  const counts: Record<ProjectId, number> = {};

  for (const project of projects) {
    // Filter tasks by project ID
    const projectTasks = tasks.filter((task) => task.projectId === project.id);

    // Apply completion filter
    const filteredTasks = filterTasksByCompleted(
      projectTasks,
      config.showCompleted,
    );

    counts[project.id] = filteredTasks.length;
  }

  return counts;
}

/**
 * Calculates task counts per label
 * Pure function - no atom dependencies
 *
 * @param labels - Array of labels to count tasks for
 * @param tasks - Array of all tasks (should be active tasks only, no archived)
 * @param config - Configuration for filtering (e.g., showCompleted)
 * @returns Record mapping LabelId to task count
 */
export function calculateLabelTaskCounts(
  labels: Label[],
  tasks: Task[],
  config: CountConfig = { showCompleted: false },
): Record<LabelId, number> {
  const counts: Record<LabelId, number> = {};

  for (const label of labels) {
    // Filter tasks that include this label
    const labelTasks = tasks.filter((task) => task.labels.includes(label.id));

    // Apply completion filter
    const filteredTasks = filterTasksByCompleted(
      labelTasks,
      config.showCompleted,
    );

    counts[label.id] = filteredTasks.length;
  }

  return counts;
}

/**
 * Calculates standard view counts (inbox, today, upcoming, etc.)
 * Pure function - extracts logic from current taskCountsAtom
 *
 * @param tasks - Array of all tasks (should be active tasks only, no archived)
 * @param completedTasks - Array of completed tasks
 * @param projectIds - Set of valid project IDs (for inbox calculation)
 * @param config - Partial configuration for per-view filtering
 * @returns ViewCounts object with all standard view counts
 */
export function calculateViewCounts(
  tasks: Task[],
  completedTasks: Task[],
  projectIds: Set<ProjectId>,
  config: Partial<{
    showCompletedInbox: boolean;
    showCompletedToday: boolean;
    showCompletedUpcoming: boolean;
    showCompletedCalendar: boolean;
    showCompletedOverdue: boolean;
    showCompletedAll: boolean;
  }> = {},
): ViewCounts {
  // Filter for active (non-completed) tasks
  const activeTasks = tasks.filter((task) => !task.completed);

  // Calculate inbox count
  const inboxTasks = filterInboxTasks(tasks, projectIds);
  const inboxFiltered = filterTasksByCompleted(
    inboxTasks,
    config.showCompletedInbox ?? false,
  );

  // Calculate today count
  const todayTasks = filterTodayTasks(tasks);
  const todayFiltered = filterTasksByCompleted(
    todayTasks,
    config.showCompletedToday ?? false,
  );

  // Calculate upcoming count
  const upcomingTasks = filterUpcomingTasks(tasks);
  const upcomingFiltered = filterTasksByCompleted(
    upcomingTasks,
    config.showCompletedUpcoming ?? false,
  );

  // Calculate calendar count
  const calendarTasks = filterCalendarTasks(tasks);
  const calendarFiltered = filterTasksByCompleted(
    calendarTasks,
    config.showCompletedCalendar ?? false,
  );

  // Calculate overdue count
  const overdueTasks = filterOverdueTasks(tasks);
  const overdueFiltered = filterTasksByCompleted(
    overdueTasks,
    config.showCompletedOverdue ?? false,
  );

  // Calculate all count (respects showCompleted for 'all' view)
  const allFiltered = filterTasksByCompleted(
    tasks,
    config.showCompletedAll ?? false,
  );

  return {
    total: activeTasks.length,
    inbox: inboxFiltered.length,
    today: todayFiltered.length,
    upcoming: upcomingFiltered.length,
    calendar: calendarFiltered.length,
    overdue: overdueFiltered.length,
    completed: completedTasks.length,
    all: allFiltered.length,
    active: activeTasks.length,
  };
}
