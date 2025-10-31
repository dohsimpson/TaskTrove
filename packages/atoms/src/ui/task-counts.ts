/**
 * UI-specific task count atoms.
 */

import { atom, type Getter } from "jotai";
import { atomFamily } from "jotai/utils";
import type { Task, Project } from "@tasktrove/types/core";
import type { ViewId, ProjectId, LabelId } from "@tasktrove/types/id";
import { LabelIdSchema, GroupIdSchema } from "@tasktrove/types/id";
import { projectsAtom, labelsAtom } from "@tasktrove/atoms/data/base/atoms";
import {
  activeTasksAtom,
  completedTasksAtom,
  todayTasksAtom,
  upcomingTasksAtom,
  inboxTasksAtom,
  calendarTasksAtom,
  autoRolloverTasksAtom,
} from "@tasktrove/atoms/data/tasks/filters";

import { handleAtomError } from "@tasktrove/atoms/utils/atom-helpers";
import { allGroupsAtom } from "@tasktrove/atoms/core/groups";
import { collectProjectIdsFromGroup } from "@tasktrove/utils/group-utils";

/**
 * Pure function to get base filtered tasks for any view (without UI preferences).
 */
function getBaseFilteredTasksForView(viewId: ViewId, get: Getter): Task[] {
  try {
    const activeTasks = get(activeTasksAtom);

    // Determine view type based on viewId pattern
    if (viewId === "all") {
      return activeTasks;
    } else if (viewId === "inbox") {
      return get(inboxTasksAtom);
    } else if (viewId === "today") {
      return get(todayTasksAtom);
    } else if (viewId === "upcoming") {
      return get(upcomingTasksAtom);
    } else if (viewId === "calendar") {
      return get(calendarTasksAtom);
    } else if (viewId === "completed") {
      return get(completedTasksAtom);
    } else if (viewId === "habits") {
      return get(autoRolloverTasksAtom);
    } else {
      // Check if viewId is a project ID
      const projects = get(projectsAtom);
      const matchingProject = projects.find((p: Project) => p.id === viewId);
      if (matchingProject) {
        const projectTasks = activeTasks.filter(
          (task: Task) => task.projectId === viewId,
        );
        return projectTasks;
      }

      // Check if viewId is a label ID
      try {
        const labelId = LabelIdSchema.parse(viewId);
        const labelTasks = activeTasks.filter((task: Task) =>
          task.labels.includes(labelId),
        );
        return labelTasks;
      } catch {
        // Not a valid label ID
      }

      // Check if viewId is a project group ID
      try {
        const groupId = GroupIdSchema.parse(viewId);
        const groups = get(allGroupsAtom);
        const projectIds = collectProjectIdsFromGroup(groups, groupId);
        const groupTasks = activeTasks.filter(
          (task: Task) => task.projectId && projectIds.includes(task.projectId),
        );
        return groupTasks;
      } catch {
        // Not a valid group ID
      }

      // Default: return all active tasks for unknown view types
      return activeTasks;
    }
  } catch (error) {
    handleAtomError(error, `getBaseFilteredTasksForView(${viewId})`);
    return [];
  }
}

/**
 * Get task count for any view (base filtering only, no UI preferences).
 */
export const taskCountForViewAtom = atomFamily((viewId: ViewId) =>
  atom((get) => {
    try {
      const filteredTasks = getBaseFilteredTasksForView(viewId, get);
      return filteredTasks.length;
    } catch (error) {
      handleAtomError(error, `taskCountForViewAtom(${viewId})`);
      return 0;
    }
  }),
);

/**
 * UI-specific atom for project task counts.
 */
export const projectTaskCountsAtom = atom<Record<ProjectId, number>>((get) => {
  try {
    const projects = get(projectsAtom);
    const tasks = get(activeTasksAtom);
    const counts: Record<ProjectId, number> = {};

    for (const project of projects) {
      const projectTasks = tasks.filter((t) => t.projectId === project.id);

      // Use base filtering only (no UI preferences) for sidebar counts.
      counts[project.id] = projectTasks.length;
    }

    return counts;
  } catch (error) {
    handleAtomError(error, "projectTaskCounts");
    return {};
  }
});
projectTaskCountsAtom.debugLabel = "projectTaskCountsAtom";

/**
 * UI-specific atom for label task counts.
 */
export const labelTaskCountsAtom = atom<Record<LabelId, number>>((get) => {
  try {
    const labels = get(labelsAtom);
    const tasks = get(activeTasksAtom);
    const counts: Record<LabelId, number> = {};

    for (const label of labels) {
      const labelTasks = tasks.filter((t) => t.labels.includes(label.id));

      // Use base filtering only (no UI preferences) for sidebar counts.
      counts[label.id] = labelTasks.length;
    }

    return counts;
  } catch (error) {
    handleAtomError(error, "labelTaskCounts");
    return {};
  }
});
labelTaskCountsAtom.debugLabel = "labelTaskCountsAtom";

/**
 * UI-specific atom for task view counts.
 */
export const taskCountsAtom = atom((get) => {
  try {
    // Raw counts (not view-specific, always show all active/completed)
    const activeTasks = get(activeTasksAtom);
    const completedTasks = get(completedTasksAtom);

    // Standard view counts (all respect per-view showCompleted settings via uiFilteredTasksForViewAtom)
    return {
      total: activeTasks.length,
      inbox: get(taskCountForViewAtom("inbox")),
      today: get(taskCountForViewAtom("today")),
      upcoming: get(taskCountForViewAtom("upcoming")),
      calendar: get(taskCountForViewAtom("calendar")),
      habits: get(taskCountForViewAtom("habits")),
      overdue: get(taskCountForViewAtom("today")), // overdue is shown in today view
      completed: completedTasks.length,
      all: get(taskCountForViewAtom("all")),
      active: activeTasks.filter((task) => !task.completed).length,
    };
  } catch (error) {
    handleAtomError(error, "taskCountsAtom");
    return {
      total: 0,
      inbox: 0,
      today: 0,
      upcoming: 0,
      calendar: 0,
      habits: 0,
      overdue: 0,
      completed: 0,
      all: 0,
      active: 0,
    };
  }
});
taskCountsAtom.debugLabel = "taskCountsAtom";
