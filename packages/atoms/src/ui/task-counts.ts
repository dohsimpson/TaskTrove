/**
 * UI-specific task count atoms
 *
 * These atoms live in the UI layer because they depend on UI state (viewStatesAtom).
 * They use pure count functions from utils/counts.ts for the actual calculation logic.
 *
 * Previously, these were in core/projects.ts and core/labels.ts, which created
 * circular dependencies (core importing from ui).
 */

import { atom } from "jotai";
import type { ProjectId, LabelId, Task } from "@tasktrove/types";
import { projectsAtom } from "../core/projects";
import { labelsAtom } from "../core/labels";
import {
  activeTasksAtom,
  completedTasksAtom,
  calendarTasksAtom,
  overdueTasksAtom,
} from "../core/tasks";
import { viewStatesAtom, getViewStateOrDefault } from "./views";
import { uiFilteredTasksForViewAtom } from "./filtered-tasks";
import {
  calculateProjectTaskCounts,
  calculateLabelTaskCounts,
  type CountConfig,
} from "../utils/counts";
import { handleAtomError } from "../utils/atom-helpers";

/**
 * UI-specific atom for project task counts
 * Respects per-project showCompleted settings from viewStates
 */
export const projectTaskCountsAtom = atom<Record<ProjectId, number>>((get) => {
  try {
    const projects = get(projectsAtom);
    const tasks = get(activeTasksAtom);
    const viewStates = get(viewStatesAtom);

    // For each project, use its own showCompleted setting
    const counts: Record<ProjectId, number> = {};

    for (const project of projects) {
      const projectTasks = tasks.filter((t) => t.projectId === project.id);
      const viewState = getViewStateOrDefault(viewStates, project.id);
      const config: CountConfig = { showCompleted: viewState.showCompleted };

      // Use pure function (testable in isolation)
      const projectCounts = calculateProjectTaskCounts(
        [project],
        projectTasks,
        config,
      );
      counts[project.id] = projectCounts[project.id] || 0;
    }

    return counts;
  } catch (error) {
    handleAtomError(error, "projectTaskCounts");
    return {};
  }
});
projectTaskCountsAtom.debugLabel = "projectTaskCountsAtom";

/**
 * UI-specific atom for label task counts
 * Respects per-label showCompleted settings from viewStates
 */
export const labelTaskCountsAtom = atom<Record<LabelId, number>>((get) => {
  try {
    const labels = get(labelsAtom);
    const tasks = get(activeTasksAtom);
    const viewStates = get(viewStatesAtom);

    const counts: Record<LabelId, number> = {};

    for (const label of labels) {
      const labelTasks = tasks.filter((t) => t.labels.includes(label.id));
      const viewState = getViewStateOrDefault(viewStates, label.id);
      const config: CountConfig = { showCompleted: viewState.showCompleted };

      const labelCounts = calculateLabelTaskCounts([label], labelTasks, config);
      counts[label.id] = labelCounts[label.id] || 0;
    }

    return counts;
  } catch (error) {
    handleAtomError(error, "labelTaskCounts");
    return {};
  }
});
labelTaskCountsAtom.debugLabel = "labelTaskCountsAtom";

/**
 * UI-specific atom for task view counts
 * Returns counts for all standard views (inbox, today, upcoming, etc.)
 * Respects per-view showCompleted settings from viewStates
 *
 * This atom was moved from core/tasks.ts to eliminate circular dependencies.
 */
export const taskCountsAtom = atom((get) => {
  try {
    const activeTasks = get(activeTasksAtom);
    const completedTasks = get(completedTasksAtom);
    const calendarTasks = get(calendarTasksAtom);
    const overdueTasks = get(overdueTasksAtom);
    const viewStates = get(viewStatesAtom);

    // Use UI-filtered atoms for standard views (they respect showCompleted)
    const inboxTasks = get(uiFilteredTasksForViewAtom("inbox"));
    const todayTasks = get(uiFilteredTasksForViewAtom("today"));
    const upcomingTasks = get(uiFilteredTasksForViewAtom("upcoming"));
    const allTasks = get(uiFilteredTasksForViewAtom("all"));

    // Calendar view: apply showCompleted setting
    const calendarShowCompleted = getViewStateOrDefault(
      viewStates,
      "calendar",
    ).showCompleted;
    const calendarCount = calendarShowCompleted
      ? calendarTasks.length
      : calendarTasks.filter((task: Task) => !task.completed).length;

    // Overdue: apply "today" view's showCompleted setting (overdue is part of today)
    const todayShowCompleted = getViewStateOrDefault(
      viewStates,
      "today",
    ).showCompleted;
    const overdueCount = todayShowCompleted
      ? overdueTasks.length
      : overdueTasks.filter((task: Task) => !task.completed).length;

    return {
      total: activeTasks.length,
      inbox: inboxTasks.length,
      today: todayTasks.length,
      upcoming: upcomingTasks.length,
      calendar: calendarCount,
      overdue: overdueCount,
      completed: completedTasks.length,
      all: allTasks.length,
      active: activeTasks.filter((task: Task) => !task.completed).length,
    };
  } catch (error) {
    handleAtomError(error, "taskCountsAtom");
    return {
      total: 0,
      inbox: 0,
      today: 0,
      upcoming: 0,
      calendar: 0,
      overdue: 0,
      completed: 0,
      all: 0,
      active: 0,
    };
  }
});
taskCountsAtom.debugLabel = "taskCountsAtom";
