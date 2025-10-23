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
import { atomFamily } from "jotai/utils";
import type { ProjectId, LabelId, ViewId } from "@tasktrove/types";
import { projectsAtom, labelsAtom } from "@tasktrove/atoms/data/base/atoms";
import {
  activeTasksAtom,
  completedTasksAtom,
} from "@tasktrove/atoms/data/tasks/filters";
import {
  viewStatesAtom,
  getViewStateOrDefault,
} from "@tasktrove/atoms/ui/views";
import { uiFilteredTasksForViewAtom } from "@tasktrove/atoms/ui/filtered-tasks";
import { applyViewStateFilters } from "@tasktrove/atoms/utils/view-filters";
import { handleAtomError } from "@tasktrove/atoms/utils/atom-helpers";

/**
 * Get task count for any view
 * Leverages uiFilteredTasksForViewAtom which already handles all filtering
 */
export const taskCountForViewAtom = atomFamily((viewId: ViewId) =>
  atom((get) => {
    try {
      return get(uiFilteredTasksForViewAtom(viewId)).length;
    } catch (error) {
      handleAtomError(error, `taskCountForViewAtom(${viewId})`);
      return 0;
    }
  }),
);

/**
 * UI-specific atom for project task counts
 * Respects per-project view state settings (showCompleted, showOverdue, filters, etc.)
 * Uses the same filtering logic as the main view to ensure counts match what users see
 */
export const projectTaskCountsAtom = atom<Record<ProjectId, number>>((get) => {
  try {
    const projects = get(projectsAtom);
    const tasks = get(activeTasksAtom);
    const viewStates = get(viewStatesAtom);

    const counts: Record<ProjectId, number> = {};

    for (const project of projects) {
      const projectTasks = tasks.filter((t) => t.projectId === project.id);
      const viewState = getViewStateOrDefault(viewStates, project.id);

      // Use the same filtering logic as the main view to ensure counts match exactly
      const filteredTasks = applyViewStateFilters(
        projectTasks,
        viewState,
        project.id,
      );

      counts[project.id] = filteredTasks.length;
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
 * Respects per-label view state settings (showCompleted, showOverdue, filters, etc.)
 * Uses the same filtering logic as the main view to ensure counts match what users see
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

      // Use the same filtering logic as the main view to ensure counts match exactly
      const filteredTasks = applyViewStateFilters(
        labelTasks,
        viewState,
        label.id,
      );

      counts[label.id] = filteredTasks.length;
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
 * REFACTORED: Simplified to delegate to taskCountForViewAtom
 * All filtering logic is handled by uiFilteredTasksForViewAtom
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
      overdue: 0,
      completed: 0,
      all: 0,
      active: 0,
    };
  }
});
taskCountsAtom.debugLabel = "taskCountsAtom";
