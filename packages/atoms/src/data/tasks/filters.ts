/**
 * Task filtering atoms
 * Provides various filtered views of tasks (inbox, today, upcoming, etc.)
 */

import { atom } from "jotai";
import { isToday, isPast, isFuture } from "date-fns";
import type { Task } from "@tasktrove/types/core";
import type { GroupId } from "@tasktrove/types/id";
import { LabelIdSchema, GroupIdSchema } from "@tasktrove/types/id";
import { shouldTaskBeInInbox } from "@tasktrove/utils";
import { collectProjectIdsFromGroup } from "@tasktrove/utils/group-utils";
import {
  handleAtomError,
  namedAtom,
  withErrorHandling,
} from "@tasktrove/atoms/utils/atom-helpers";
import { tasksAtom } from "@tasktrove/atoms/data/base/atoms";
import { currentRouteContextAtom } from "@tasktrove/atoms/ui/navigation";
import { allGroupsAtom } from "@tasktrove/atoms/core/groups";
import { projectIdsAtom } from "@tasktrove/atoms/core/projects";
import { appRefreshTriggerAtom } from "@tasktrove/atoms/ui/app-refresh";

// =============================================================================
// ACTIVE TASKS
// =============================================================================

/**
 * Active (non-archived) tasks
 * Filters out archived tasks for normal display
 * History tracking enabled through tasksHistoryAtom for undo/redo support
 */
export const activeTasksAtom = namedAtom(
  "activeTasksAtom",
  atom((get) =>
    withErrorHandling(
      () => {
        const tasks = get(tasksAtom);
        get(appRefreshTriggerAtom); // Subscribe to refresh events
        return tasks; // status filtering removed
      },
      "activeTasksAtom",
      [],
    ),
  ),
);

// =============================================================================
// VIEW-SPECIFIC FILTERING ATOMS
// =============================================================================

/**
 * Inbox tasks - tasks with no project or assigned to the special inbox project
 * Includes orphaned tasks (tasks with projectIds that reference non-existent projects)
 */
export const inboxTasksAtom = namedAtom(
  "inboxTasksAtom",
  atom((get) =>
    withErrorHandling(
      () => {
        const activeTasks = get(activeTasksAtom);
        const projectIds = get(projectIdsAtom);

        return activeTasks.filter((task: Task) =>
          shouldTaskBeInInbox(task.projectId, projectIds),
        );
      },
      "inboxTasksAtom",
      [],
    ),
  ),
);

/**
 * Tasks due today (including overdue tasks)
 */
export const todayTasksAtom = namedAtom(
  "todayTasksAtom",
  atom((get) =>
    withErrorHandling(
      () => {
        const activeTasks = get(activeTasksAtom);
        get(appRefreshTriggerAtom); // Subscribe to refresh events

        return activeTasks.filter((task: Task) => {
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
      },
      "todayTasksAtom",
      [],
    ),
  ),
);

/**
 * Upcoming tasks (due after today)
 * Uses the same date comparison logic as main-content.tsx filtering
 */
export const upcomingTasksAtom = namedAtom(
  "upcomingTasksAtom",
  atom((get) =>
    withErrorHandling(
      () => {
        const activeTasks = get(activeTasksAtom);
        get(appRefreshTriggerAtom); // Subscribe to refresh events
        return activeTasks.filter((task: Task) => {
          if (!task.dueDate) return false;
          // Upcoming = future tasks that are not today (i.e. tomorrow onwards)
          return isFuture(task.dueDate) && !isToday(task.dueDate);
        });
      },
      "upcomingTasksAtom",
      [],
    ),
  ),
);

/**
 * Calendar tasks - tasks with due dates
 * Filters active tasks that have a due date for calendar view
 */
export const calendarTasksAtom = namedAtom(
  "calendarTasksAtom",
  atom((get) =>
    withErrorHandling(
      () => {
        const activeTasks = get(activeTasksAtom);
        return activeTasks.filter((task: Task) => task.dueDate);
      },
      "calendarTasksAtom",
      [],
    ),
  ),
);

/**
 * Overdue tasks
 * Filters active tasks with due dates before today (date-only comparison)
 */
export const overdueTasksAtom = namedAtom(
  "overdueTasksAtom",
  atom((get) =>
    withErrorHandling(
      () => {
        const activeTasks = get(activeTasksAtom);
        return activeTasks.filter((task: Task) => {
          if (!task.dueDate) return false;
          return isPast(task.dueDate) && !isToday(task.dueDate);
        });
      },
      "overdueTasksAtom",
      [],
    ),
  ),
);

/**
 * Completed tasks
 * Filters active tasks to show only completed ones
 */
export const completedTasksAtom = namedAtom(
  "completedTasksAtom",
  atom((get) =>
    withErrorHandling(
      () => {
        const activeTasks = get(activeTasksAtom);
        return activeTasks.filter((task: Task) => task.completed);
      },
      "completedTasksAtom",
      [],
    ),
  ),
);

/**
 * Project group tasks atom
 * Returns a function that takes a groupId and returns all tasks from projects in that group (and nested groups)
 * This supports the flat task view for project groups
 */
export const projectGroupTasksAtom = namedAtom(
  "projectGroupTasksAtom",
  atom((get) => {
    return (groupId: GroupId) =>
      withErrorHandling(
        () => {
          const groups = get(allGroupsAtom);
          const activeTasks = get(activeTasksAtom);

          // Get all project IDs from this group and its nested groups
          const projectIds = collectProjectIdsFromGroup(groups, groupId);

          // Return all tasks from these projects
          return activeTasks.filter(
            (task: Task) =>
              task.projectId && projectIds.includes(task.projectId),
          );
        },
        "projectGroupTasksAtom",
        [],
      );
  }),
);

// =============================================================================
// BASE FILTERED TASKS FOR VIEW
// =============================================================================

/**
 * Base filtered tasks for the current route - CORE BUSINESS LOGIC ONLY
 *
 * SIMPLIFIED ARCHITECTURE:
 * - Single atom (not atomFamily) that reactively depends on routeContext
 * - Switches on routeContext.routeType for clean, consistent filtering
 * - All route types (standard/project/label/projectgroup) handled uniformly
 *
 * This atom contains ONLY view-specific filtering logic (inbox, today, upcoming, etc.)
 * It does NOT apply UI preferences like showCompleted or showOverdue.
 *
 * For UI-filtered tasks that respect user preferences, use uiFilteredTasksForViewAtom
 * from ui/filtered-tasks.ts
 */
export const baseFilteredTasksAtom = namedAtom(
  "baseFilteredTasksAtom",
  atom((get) => {
    try {
      const routeContext = get(currentRouteContextAtom);
      const activeTasks = get(activeTasksAtom);

      // Switch on route type for clean, consistent filtering
      switch (routeContext.routeType) {
        case "standard": {
          // Standard views: today, inbox, upcoming, completed, all
          switch (routeContext.viewId) {
            case "today":
              return get(todayTasksAtom);
            case "upcoming":
              return get(upcomingTasksAtom);
            case "inbox":
              return get(inboxTasksAtom);
            case "completed":
              return get(completedTasksAtom);
            case "all":
              return activeTasks;
            default:
              // Unknown standard view, return all active tasks
              return activeTasks;
          }
        }

        case "project": {
          // Filter tasks by project ID
          return activeTasks.filter(
            (task: Task) => task.projectId === routeContext.viewId,
          );
        }

        case "label": {
          // Filter tasks by label ID
          try {
            const labelId = LabelIdSchema.parse(routeContext.viewId);
            return activeTasks.filter((task: Task) =>
              task.labels.includes(labelId),
            );
          } catch {
            return [];
          }
        }

        case "projectgroup": {
          // Filter tasks by project group - inline logic for consistency
          try {
            const groupId = GroupIdSchema.parse(routeContext.viewId);
            const groups = get(allGroupsAtom);

            // Get all project IDs from this group and its nested groups
            const projectIds = collectProjectIdsFromGroup(groups, groupId);

            // Return all tasks from these projects
            return activeTasks.filter(
              (task: Task) =>
                task.projectId && projectIds.includes(task.projectId),
            );
          } catch {
            return [];
          }
        }

        default:
          // Unknown route type, return all active tasks
          return activeTasks;
      }
    } catch (error) {
      handleAtomError(error, "baseFilteredTasksAtom");
      return [];
    }
  }),
);
