import { atom } from "jotai";
import {
  ViewState,
  SortConfig,
  ViewStatesSchema,
  ViewStates,
  Task,
  ViewId,
  ViewStateSchema,
  GlobalViewOptions,
} from "@tasktrove/types";
import {
  DEFAULT_VIEW_STATE,
  DEFAULT_GLOBAL_VIEW_OPTIONS,
} from "@tasktrove/types/defaults";
import {
  DEFAULT_ACTIVE_FILTERS,
  STANDARD_VIEW_IDS,
} from "@tasktrove/constants";
import { createAtomWithStorage, log, namedAtom } from "../utils/atom-helpers";
import { showTaskPanelAtom, selectedTaskIdAtom } from "./dialogs";
import { tasksAtom } from "../core/tasks";

/**
 * UI view state atoms for TaskTrove's Jotai migration
 *
 * Migrated from useTaskManager hook's view state management.
 * Handles per-project view states, global view states for routes,
 * and complex view state updating logic.
 */

// =============================================================================
// DEFAULT VALUES
// =============================================================================

/**
 * Create default ViewStates object with all standard views initialized
 */
function createDefaultViewStates(): ViewStates {
  const defaultStates: ViewStates = {};

  // Initialize all standard views with default state
  for (const viewId of STANDARD_VIEW_IDS) {
    defaultStates[viewId] = { ...DEFAULT_VIEW_STATE };
  }

  return defaultStates;
}

/**
 * Safely gets ViewState for a given viewId, creating default if missing
 * @internal Helper to prevent undefined access errors
 */
export function getViewStateOrDefault(
  viewStates: ViewStates,
  viewId: ViewId,
): ViewState {
  if (viewId in viewStates) {
    const viewState = viewStates[viewId];
    if (viewState) {
      return viewState;
    }
  }
  // Return default for missing views (new projects, labels, etc.)
  return { ...DEFAULT_VIEW_STATE };
}

/**
 * Migrates ViewStates data when schema validation fails
 * Preserves valid user preferences while backfilling missing/invalid fields with defaults
 * @internal Exported for testing purposes
 */
export function migrateViewStates(data: unknown): ViewStates {
  const migrated: ViewStates = {};

  if (typeof data !== "object" || data === null) {
    log.warn(
      { module: "views" },
      "Invalid ViewStates data type, returning empty object",
    );
    return migrated;
  }

  for (const [viewId, viewState] of Object.entries(data)) {
    if (
      typeof viewState !== "object" ||
      viewState === null ||
      Array.isArray(viewState)
    ) {
      continue;
    }

    // Try to validate the individual ViewState
    const stateResult = ViewStateSchema.safeParse(viewState);
    if (stateResult.success) {
      // Valid ViewState, use as-is
      migrated[viewId] = stateResult.data;
    } else {
      // Partial migration: preserve valid fields, add defaults for missing/invalid ones
      const preservedFields: Partial<ViewState> = {};

      // Safely extract valid fields from the old ViewState
      if (typeof viewState === "object" && viewState !== null) {
        for (const [key, value] of Object.entries(viewState)) {
          if (key in DEFAULT_VIEW_STATE) {
            // Type-safe field preservation with explicit checks
            if (
              key === "viewMode" &&
              (value === "list" || value === "kanban" || value === "calendar")
            ) {
              preservedFields.viewMode = value;
            } else if (
              key === "sortDirection" &&
              (value === "asc" || value === "desc")
            ) {
              preservedFields.sortDirection = value;
            } else if (key === "sortBy" && typeof value === "string") {
              preservedFields.sortBy = value;
            } else if (key === "showCompleted" && typeof value === "boolean") {
              preservedFields.showCompleted = value;
            } else if (key === "showOverdue" && typeof value === "boolean") {
              preservedFields.showOverdue = value;
            } else if (key === "searchQuery" && typeof value === "string") {
              preservedFields.searchQuery = value;
            } else if (key === "showSidePanel" && typeof value === "boolean") {
              preservedFields.showSidePanel = value;
            } else if (key === "compactView" && typeof value === "boolean") {
              preservedFields.compactView = value;
            } else if (key === "collapsedSections" && Array.isArray(value)) {
              preservedFields.collapsedSections = value.filter(
                (item) => typeof item === "string",
              );
            }
          }
        }
      }

      // Merge preserved fields with defaults
      migrated[viewId] = {
        ...DEFAULT_VIEW_STATE,
        ...preservedFields,
      };

      log.info(
        {
          module: "views",
          viewId,
          preservedFields: Object.keys(preservedFields),
          validationError: stateResult.error.issues,
        },
        "Migrated ViewState with partial data preservation",
      );
    }
  }

  return migrated;
}

// =============================================================================
// BASE ATOMS
// =============================================================================

/**
 * Persistent storage of view states per project/view
 * Maps projectId/viewId -> ViewState
 * Replaces the viewStates state from useTaskManager
 */
export const viewStatesAtom = createAtomWithStorage<ViewStates>(
  "view-states",
  createDefaultViewStates(),
  {
    getOnInit: true,
    serialize: (viewStates) => {
      try {
        return JSON.stringify(viewStates);
      } catch (error) {
        log.error({ error, module: "views" }, "Error serializing view states");
        return JSON.stringify({});
      }
    },
    deserialize: (str) => {
      if (!str || str === "null" || str === "undefined") {
        return {};
      }

      let parsed;
      try {
        parsed = JSON.parse(str);
      } catch (error) {
        log.error(
          { error, module: "views" },
          "Error parsing JSON for view states",
        );
        return {};
      }

      // Try full validation first
      const result = ViewStatesSchema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }

      // If full validation fails, attempt graceful migration
      log.warn(
        { module: "views", error: result.error },
        "Schema validation failed, attempting migration",
      );

      const migrated = migrateViewStates(parsed);

      log.info(
        { module: "views", preservedViews: Object.keys(migrated).length },
        "ViewStates migration completed",
      );

      return migrated;
    },
  },
);
viewStatesAtom.debugLabel = "viewStatesAtom";

/**
 * Global view options stored in localStorage
 * UI preferences that apply across all views
 */
export const globalViewOptionsAtom = createAtomWithStorage<GlobalViewOptions>(
  "global-view-options",
  DEFAULT_GLOBAL_VIEW_OPTIONS,
);
globalViewOptionsAtom.debugLabel = "globalViewOptionsAtom";

/**
 * Currently active view/route (today, inbox, ProjectId, etc.)
 * Tracks which view the user is currently viewing
 */
export const currentViewAtom = namedAtom(
  "currentViewAtom",
  atom<ViewId>("today"),
);

// =============================================================================
// WRITE-ONLY ACTION ATOMS
// =============================================================================

/**
 * Updates view state for a specific project/view
 * Replicates the updateProjectViewState logic from useTaskManager
 *
 * Usage: set(updateViewStateAtom, { viewId: projectId, updates: { viewMode: 'kanban' } })
 */
export const updateViewStateAtom = atom(
  null,
  (
    get,
    set,
    { viewId, updates }: { viewId: ViewId; updates: Partial<ViewState> },
  ) => {
    const currentViewStates = get(viewStatesAtom);
    const currentViewState = currentViewStates[viewId] ?? DEFAULT_VIEW_STATE;

    set(viewStatesAtom, {
      ...currentViewStates,
      [viewId]: { ...currentViewState, ...updates },
    });
  },
);
updateViewStateAtom.debugLabel = "updateViewStateAtom";

/**
 * @deprecated Use setViewOptionsAtom instead
 * Changes view mode for current view (list/kanban/calendar)
 */
export const setViewModeAtom = atom(
  null,
  (get, set, mode: "list" | "kanban" | "calendar") => {
    set(setViewOptionsAtom, { viewMode: mode });
  },
);
setViewModeAtom.debugLabel = "setViewModeAtom";

/**
 * Unified atom to update any view options for the current view
 * Replaces all individual setter atoms for cleaner API
 *
 * Usage: set(setViewOptionsAtom, { sortBy: 'priority', sortDirection: 'desc', showCompleted: true })
 */
export const setViewOptionsAtom = atom(
  null,
  (get, set, updates: Partial<ViewState>) => {
    const currentView = get(currentViewAtom);
    set(updateViewStateAtom, { viewId: currentView, updates });

    // Sync with task panel atoms when showSidePanel is updated
    if ("showSidePanel" in updates) {
      if (updates.showSidePanel) {
        // When enabling side panel, open task panel with first task if available
        const allTasks = get(tasksAtom);
        const firstTask = allTasks[0];
        if (firstTask) {
          set(selectedTaskIdAtom, firstTask.id);
          set(showTaskPanelAtom, true);
        }
      } else {
        // When disabling side panel, close task panel
        set(showTaskPanelAtom, false);
        set(selectedTaskIdAtom, null);
      }
    }
  },
);
setViewOptionsAtom.debugLabel = "setViewOptionsAtom";

/**
 * @deprecated Use setViewOptionsAtom instead
 * Updates sort settings for current view
 */
export const setSortingAtom = atom(
  null,
  (
    get,
    set,
    {
      sortBy,
      sortDirection,
    }: { sortBy?: string; sortDirection?: "asc" | "desc" },
  ) => {
    const updates: Partial<ViewState> = {};
    if (sortBy !== undefined) updates.sortBy = sortBy;
    if (sortDirection !== undefined) updates.sortDirection = sortDirection;
    set(setViewOptionsAtom, updates);
  },
);
setSortingAtom.debugLabel = "setSortingAtom";

/**
 * @deprecated Use setViewOptionsAtom instead
 * Updates search query for current view
 */
export const setSearchQueryAtom = atom(null, (get, set, query: string) => {
  set(setViewOptionsAtom, { searchQuery: query });
});
setSearchQueryAtom.debugLabel = "setSearchQueryAtom";

/**
 * @deprecated Use setViewOptionsAtom instead
 * Toggles completed task visibility for current view
 */
export const setShowCompletedAtom = atom(null, (get, set, show: boolean) => {
  set(setViewOptionsAtom, { showCompleted: show });
});
setShowCompletedAtom.debugLabel = "setShowCompletedAtom";

/**
 * @deprecated Use setViewOptionsAtom instead
 * Toggles overdue task visibility for current view
 */
export const setShowOverdueAtom = atom(null, (get, set, show: boolean) => {
  set(setViewOptionsAtom, { showOverdue: show });
});
setShowOverdueAtom.debugLabel = "setShowOverdueAtom";

/**
 * @deprecated Use setViewOptionsAtom instead
 * Toggles compact view for current view
 */
export const setCompactViewAtom = atom(null, (get, set, compact: boolean) => {
  set(setViewOptionsAtom, { compactView: compact });
});
setCompactViewAtom.debugLabel = "setCompactViewAtom";

/**
 * Toggles collapse state for a specific section in current view
 * Usage: set(toggleSectionCollapseAtom, sectionId)
 */
export const toggleSectionCollapseAtom = atom(
  null,
  (get, set, sectionId: string) => {
    const currentCollapsed = get(collapsedSectionsAtom);

    const isCollapsed = currentCollapsed.includes(sectionId);
    const newCollapsed = isCollapsed
      ? currentCollapsed.filter((id) => id !== sectionId)
      : [...currentCollapsed, sectionId];

    set(setViewOptionsAtom, { collapsedSections: newCollapsed });
  },
);
toggleSectionCollapseAtom.debugLabel = "toggleSectionCollapseAtom";

/**
 * Sets active filters for current view
 * Usage: set(setActiveFiltersAtom, { priorities: [1, 2], labels: ['urgent'] })
 */
export const setActiveFiltersAtom = atom(
  null,
  (get, set, filters: ViewState["activeFilters"]) => {
    set(setViewOptionsAtom, { activeFilters: filters });
  },
);
setActiveFiltersAtom.debugLabel = "setActiveFiltersAtom";

/**
 * Clears all active filters for current view
 * Usage: set(clearActiveFiltersAtom)
 */
export const clearActiveFiltersAtom = atom(null, (get, set) => {
  set(setViewOptionsAtom, { activeFilters: DEFAULT_ACTIVE_FILTERS });
});
clearActiveFiltersAtom.debugLabel = "clearActiveFiltersAtom";

/**
 * Updates specific filter properties for current view
 * Usage: set(updateFiltersAtom, { priorities: [1, 2] })
 */
export const updateFiltersAtom = atom(
  null,
  (get, set, updates: Partial<NonNullable<ViewState["activeFilters"]>>) => {
    const currentViewState = get(currentViewStateAtom);
    const currentFilters =
      currentViewState.activeFilters || DEFAULT_ACTIVE_FILTERS;
    const newFilters = { ...currentFilters, ...updates };
    set(setActiveFiltersAtom, newFilters);
  },
);
updateFiltersAtom.debugLabel = "updateFiltersAtom";

/**
 * Update global view options
 * Usage: set(updateGlobalViewOptionsAtom, { sidePanelWidth: 30 })
 */
export const updateGlobalViewOptionsAtom = atom(
  null,
  (get, set, updates: Partial<GlobalViewOptions>) => {
    const current = get(globalViewOptionsAtom);
    set(globalViewOptionsAtom, { ...current, ...updates });
  },
);
updateGlobalViewOptionsAtom.debugLabel = "updateGlobalViewOptionsAtom";

// =============================================================================
// DERIVED READ ATOMS
// =============================================================================

/**
 * Gets ViewState for the current view
 * Replicates getProjectViewState logic from useTaskManager
 * Returns default state if no specific state exists
 */
export const currentViewStateAtom = atom<ViewState>((get) => {
  const currentView = get(currentViewAtom);
  const viewStates = get(viewStatesAtom);

  return viewStates[currentView] ?? DEFAULT_VIEW_STATE;
});
currentViewStateAtom.debugLabel = "currentViewStateAtom";

/**
 * Checks if current view is in list mode
 * Convenience atom for component conditional rendering
 */
export const isListViewAtom = atom<boolean>((get) => {
  const viewState = get(currentViewStateAtom);
  return viewState.viewMode === "list";
});
isListViewAtom.debugLabel = "isListViewAtom";

/**
 * Checks if current view is in kanban mode
 * Convenience atom for component conditional rendering
 */
export const isKanbanViewAtom = atom<boolean>((get) => {
  const viewState = get(currentViewStateAtom);
  return viewState.viewMode === "kanban";
});
isKanbanViewAtom.debugLabel = "isKanbanViewAtom";

/**
 * Checks if current view is in calendar mode
 * Convenience atom for component conditional rendering
 */
export const isCalendarViewAtom = atom<boolean>((get) => {
  const viewState = get(currentViewStateAtom);
  return viewState.viewMode === "calendar";
});
isCalendarViewAtom.debugLabel = "isCalendarViewAtom";

/**
 * Gets current search query
 * Used for search input component and task filtering
 */
export const searchQueryAtom = atom<string>((get) => {
  const viewState = get(currentViewStateAtom);
  return viewState.searchQuery;
});
searchQueryAtom.debugLabel = "searchQueryAtom";

/**
 * Gets current sort configuration
 * Used for task sorting and sort controls
 */
export const sortConfigAtom = atom<SortConfig>((get) => {
  const viewState = get(currentViewStateAtom);
  return {
    field: viewState.sortBy,
    direction: viewState.sortDirection,
  };
});
sortConfigAtom.debugLabel = "sortConfigAtom";

/**
 * Gets whether completed tasks are shown
 * Used for task filtering and toggle controls
 */
export const showCompletedAtom = atom<boolean>((get) => {
  const viewState = get(currentViewStateAtom);
  return viewState.showCompleted;
});
showCompletedAtom.debugLabel = "showCompletedAtom";

/**
 * Gets whether overdue tasks are shown
 * Used for task filtering and toggle controls
 */
export const showOverdueAtom = atom<boolean>((get) => {
  const viewState = get(currentViewStateAtom);
  return viewState.showOverdue;
});
showOverdueAtom.debugLabel = "showOverdueAtom";

/**
 * Gets whether compact view is enabled
 * Used for task rendering and toggle controls
 */
export const compactViewAtom = atom<boolean>((get) => {
  const viewState = get(currentViewStateAtom);
  return viewState.compactView;
});
compactViewAtom.debugLabel = "compactViewAtom";

/**
 * Gets collapsed sections for current view
 * Used for section collapse state management
 */
export const collapsedSectionsAtom = atom<string[]>((get) => {
  const viewState = get(currentViewStateAtom);
  return viewState.collapsedSections || [];
});
collapsedSectionsAtom.debugLabel = "collapsedSectionsAtom";

/**
 * Gets active filters for current view
 * Used for filter UI components and filter state display
 */
export const activeFiltersAtom = atom<NonNullable<ViewState["activeFilters"]>>(
  (get) => {
    const viewState = get(currentViewStateAtom);
    return viewState.activeFilters || DEFAULT_ACTIVE_FILTERS;
  },
);
activeFiltersAtom.debugLabel = "activeFiltersAtom";

/**
 * Checks if any filters are currently active
 * Used for filter indicator and clear all button state
 */
export const hasActiveFiltersAtom = atom<boolean>((get) => {
  const filters = get(activeFiltersAtom);
  return Object.values(filters).some((filter) => {
    if (Array.isArray(filter)) {
      return filter.length > 0;
    }
    if (typeof filter === "object" && filter !== null) {
      return Object.values(filter).length > 0;
    }
    return Boolean(filter);
  });
});
hasActiveFiltersAtom.debugLabel = "hasActiveFiltersAtom";

/**
 * Gets count of active filters
 * Used for filter badge count display
 */
export const activeFilterCountAtom = atom<number>((get) => {
  const filters = get(activeFiltersAtom);
  let count = 0;

  if (filters.projectIds?.length) count += filters.projectIds.length;

  // Handle labels: null = 1 filter, array with length > 0 = array length
  if (filters.labels === null) {
    count += 1; // "no labels" filter is active
  } else if (filters.labels && filters.labels.length > 0) {
    count += filters.labels.length;
  }

  if (filters.priorities?.length) count += filters.priorities.length;
  if (filters.completed !== undefined) count++;
  if (
    filters.dueDateFilter &&
    (filters.dueDateFilter.preset || filters.dueDateFilter.customRange)
  )
    count++;
  // TODO: Add count for assignedTo and status when implemented
  // if (filters.assignedTo?.length) count += filters.assignedTo.length;
  // if (filters.status?.length) count += filters.status.length;

  return count;
});
activeFilterCountAtom.debugLabel = "activeFilterCountAtom";

/**
 * Side panel width as percentage (20-80%, default 25%)
 * Used for ResizablePanel components across views
 */
export const sidePanelWidthAtom = atom<number>((get) => {
  return get(globalViewOptionsAtom).sidePanelWidth;
});
sidePanelWidthAtom.debugLabel = "sidePanelWidthAtom";

// =============================================================================
// UTILITY ATOMS
// =============================================================================

/**
 * Gets view state for a specific view/project
 * Useful for components that need to display state for views other than current
 *
 * Usage: get(getViewStateAtom(projectId))
 */
export const getViewStateAtom = (viewId: ViewId) =>
  atom<ViewState>((get) => {
    const viewStates = get(viewStatesAtom);
    return viewStates[viewId] ?? DEFAULT_VIEW_STATE;
  });

/**
 * Resets view state for current view back to defaults
 * Useful for reset buttons and clearing filters
 */
export const resetCurrentViewStateAtom = atom(null, (get, set) => {
  const currentView = get(currentViewAtom);
  set(updateViewStateAtom, {
    viewId: currentView,
    updates: DEFAULT_VIEW_STATE,
  });
});
resetCurrentViewStateAtom.debugLabel = "resetCurrentViewStateAtom";

/**
 * Resets view state for a specific view back to defaults
 * Usage: set(resetViewStateAtom, projectId)
 */
export const resetViewStateAtom = atom(null, (get, set, viewId: ViewId) => {
  set(updateViewStateAtom, { viewId, updates: DEFAULT_VIEW_STATE });
});
resetViewStateAtom.debugLabel = "resetViewStateAtom";

// =============================================================================
// TASK PANEL INTEGRATION
// =============================================================================

/**
 * Toggles task panel with proper view state synchronization
 * This is the correct atom to use for task clicks that should control side panel
 *
 * When task panel is closed, it also disables showSidePanel view option
 * When task panel is opened, it enables showSidePanel view option
 */
export const toggleTaskPanelWithViewStateAtom = atom(
  null,
  (get, set, task: Task) => {
    const isCurrentlyOpen = get(showTaskPanelAtom);
    const currentTaskId = get(selectedTaskIdAtom);
    const currentViewState = get(currentViewStateAtom);
    const currentView = get(currentViewAtom);

    if (isCurrentlyOpen && currentTaskId === task.id) {
      // If panel is open with the same task, close it completely
      set(showTaskPanelAtom, false);
      set(selectedTaskIdAtom, null);
      // Also disable side panel view option to ensure panel fully closes
      set(updateViewStateAtom, {
        viewId: currentView,
        updates: { showSidePanel: false },
      });
    } else {
      // Otherwise, open/switch to the new task
      set(selectedTaskIdAtom, task.id);
      set(showTaskPanelAtom, true);
      // Enable side panel view option if not already enabled
      if (!currentViewState.showSidePanel) {
        set(updateViewStateAtom, {
          viewId: currentView,
          updates: { showSidePanel: true },
        });
      }
    }
  },
);
toggleTaskPanelWithViewStateAtom.debugLabel =
  "toggleTaskPanelWithViewStateAtom";

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Collection of all view-related atoms for easy import
 * Organized by category for better developer experience
 */
export const viewAtoms = {
  // Base state
  viewStates: viewStatesAtom,
  currentView: currentViewAtom,
  currentViewState: currentViewStateAtom,
  globalViewOptions: globalViewOptionsAtom,

  // Actions
  updateViewState: updateViewStateAtom,
  setViewOptions: setViewOptionsAtom,
  updateGlobalViewOptions: updateGlobalViewOptionsAtom,
  // Deprecated - use setViewOptions instead
  setViewMode: setViewModeAtom,
  setSorting: setSortingAtom,
  setSearchQuery: setSearchQueryAtom,
  setShowCompleted: setShowCompletedAtom,
  setShowOverdue: setShowOverdueAtom,
  setCompactView: setCompactViewAtom,
  toggleSectionCollapse: toggleSectionCollapseAtom,
  resetCurrentViewState: resetCurrentViewStateAtom,
  resetViewState: resetViewStateAtom,
  // Filter actions
  setActiveFilters: setActiveFiltersAtom,
  clearActiveFilters: clearActiveFiltersAtom,
  updateFilters: updateFiltersAtom,

  // Derived state
  isListView: isListViewAtom,
  isKanbanView: isKanbanViewAtom,
  isCalendarView: isCalendarViewAtom,
  searchQuery: searchQueryAtom,
  sortConfig: sortConfigAtom,
  showCompleted: showCompletedAtom,
  showOverdue: showOverdueAtom,
  compactView: compactViewAtom,
  collapsedSections: collapsedSectionsAtom,
  sidePanelWidth: sidePanelWidthAtom,
  // Filter state
  activeFilters: activeFiltersAtom,
  hasActiveFilters: hasActiveFiltersAtom,
  activeFilterCount: activeFilterCountAtom,

  // Utilities
  getViewState: getViewStateAtom,
};
