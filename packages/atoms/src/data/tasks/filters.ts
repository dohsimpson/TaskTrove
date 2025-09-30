/**
 * Task filtering atoms
 * Provides various filtered views of tasks (inbox, today, upcoming, etc.)
 */

import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import { isToday, isPast, isFuture } from "date-fns";
import type { Task, ViewId, GroupId } from "@tasktrove/types";
import { LabelIdSchema, GroupIdSchema } from "@tasktrove/types";
import { shouldTaskBeInInbox } from "@tasktrove/utils";
import { collectProjectIdsFromGroup } from "@tasktrove/utils/group-utils";
import {
  handleAtomError,
  namedAtom,
  withErrorHandling,
} from "../../utils/atom-helpers";
import { tasksAtom } from "../../data/base/atoms";
import { currentRouteContextAtom } from "../../ui/navigation";
import { allGroupsAtom } from "../../core/groups";
import { projectIdsAtom } from "../../core/projects";

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
        return tasks.filter((task: Task) => task.status !== "archived");
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
 * Base filtered tasks for a specific view - CORE BUSINESS LOGIC ONLY
 *
 * This atom contains ONLY view-specific filtering logic (inbox, today, upcoming, etc.)
 * It does NOT apply UI preferences like showCompleted or showOverdue.
 *
 * For UI-filtered tasks that respect user preferences, use uiFilteredTasksForViewAtom
 * from ui/filtered-tasks.ts
 */
export const baseFilteredTasksForViewAtom = atomFamily((viewId: ViewId) =>
  atom((get) => {
    try {
      const routeContext = get(currentRouteContextAtom);

      // Get base tasks for the specified view - PURE VIEW LOGIC ONLY
      let result: Task[];
      switch (viewId) {
        case "today":
          // Today view includes overdue tasks by default (business logic)
          result = get(todayTasksAtom);
          break;
        case "upcoming":
          result = get(upcomingTasksAtom);
          break;
        case "inbox":
          result = get(inboxTasksAtom);
          break;
        case "completed":
          result = get(completedTasksAtom);
          break;
        case "all":
          result = get(activeTasksAtom);
          break;
        default:
          // Use route context to determine if this is a project or label view
          const activeTasks = get(activeTasksAtom);

          if (routeContext.routeType === "project") {
            result = activeTasks.filter(
              (task: Task) => task.projectId === routeContext.viewId,
            );
          } else if (routeContext.routeType === "label") {
            try {
              const labelId = LabelIdSchema.parse(viewId);
              result = activeTasks.filter((task: Task) =>
                task.labels.includes(labelId),
              );
            } catch {
              result = [];
            }
          } else if (routeContext.routeType === "projectgroup") {
            try {
              const groupId = GroupIdSchema.parse(routeContext.viewId);
              const getProjectGroupTasks = get(projectGroupTasksAtom);
              result = getProjectGroupTasks(groupId);
            } catch {
              result = [];
            }
          } else {
            result = activeTasks;
          }
          break;
      }

      // Do NOT apply showCompleted or showOverdue here - that's UI layer responsibility
      return result;
    } catch (error) {
      handleAtomError(error, `baseFilteredTasksForViewAtom(${viewId})`);
      return [];
    }
  }),
);
