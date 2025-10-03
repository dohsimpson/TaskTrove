/**
 * UI-specific filtered tasks atoms
 *
 * These atoms live in the UI layer because they depend on UI state (viewStates, search, etc.)
 * They use pure filter functions from utils/filters.ts and base filtering from core/tasks.ts
 */

import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import type { Task, ViewId, LabelId } from "@tasktrove/types";
import { baseFilteredTasksForViewAtom } from "../core/tasks";
import {
  currentViewAtom,
  currentViewStateAtom,
  viewStatesAtom,
  getViewStateOrDefault,
} from "./views";
import { filterTasks, viewStateToFilterConfig } from "../utils/filters";
import { handleAtomError, matchesDueDateFilter } from "../utils/atom-helpers";

/**
 * UI-filtered tasks for a specific view
 * Applies UI preferences (showCompleted, showOverdue, search, activeFilters) on top of base filtered tasks
 */
export const uiFilteredTasksForViewAtom = atomFamily((viewId: ViewId) =>
  atom((get) => {
    try {
      // Start with base filtered tasks (view-specific logic only)
      const baseTasks = get(baseFilteredTasksForViewAtom(viewId));

      // Get UI preferences for this view
      const viewStates = get(viewStatesAtom);
      const viewState = getViewStateOrDefault(viewStates, viewId);

      // For completed view, always show all completed tasks
      if (viewId === "completed") {
        return baseTasks;
      }

      // Apply showCompleted filter
      let result = baseTasks;
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
              task.projectId &&
              activeFilters.projectIds?.includes(task.projectId),
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
              preset || "",
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
    } catch (error) {
      handleAtomError(error, `uiFilteredTasksForViewAtom(${viewId})`);
      return [];
    }
  }),
);

/**
 * Filtered tasks for the current view
 * This is the main atom that components should use
 *
 * Applies view-specific logic, UI preferences, and sorting
 */
export const filteredTasksAtom = atom((get) => {
  try {
    const currentView = get(currentViewAtom);
    const viewState = get(currentViewStateAtom);

    // Get UI-filtered tasks for current view
    let result = get(uiFilteredTasksForViewAtom(currentView));

    // Apply sorting based on viewState.sortBy
    return result.sort((a: Task, b: Task) => {
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
  } catch (error) {
    handleAtomError(error, "filteredTasksAtom");
    return [];
  }
});
filteredTasksAtom.debugLabel = "filteredTasksAtom";
