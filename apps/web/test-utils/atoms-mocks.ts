/**
 * Centralized Atom Mocks for Testing
 *
 * This file provides mock implementations for all @tasktrove/atoms subpath exports.
 * It replaces the old barrel export mock pattern with individual subpath mocks.
 *
 * Usage:
 * - Automatically imported via test-setup.ts
 * - Individual tests can override specific atoms using vi.mock() if needed
 */

import { vi } from "vitest"
import { atom } from "jotai"
import { SIDEBAR_WIDTH_PX_DEFAULT } from "@tasktrove/constants"

// Helper to create mock atoms with proper jotai structure
// Creates real Jotai atoms so they can be used with useHydrateAtoms in tests
const createMockAtom = (name: string, initialValue: unknown = undefined) => {
  const mockAtom = atom(initialValue)
  mockAtom.debugLabel = name
  return mockAtom
}

/**
 * Mock @tasktrove/atoms/ui/focus-timer
 */
vi.mock("@tasktrove/atoms/ui/focus-timer", () => ({
  activeFocusTimerAtom: createMockAtom("activeFocusTimerAtom"),
  focusTimerStatusAtom: createMockAtom("focusTimerStatusAtom"),
  activeFocusTaskAtom: createMockAtom("activeFocusTaskAtom"),
  focusTimerDisplayAtom: createMockAtom("focusTimerDisplayAtom"),
  focusTimerTickAtom: createMockAtom("focusTimerTickAtom"),
  stopFocusTimerAtom: createMockAtom("stopFocusTimerAtom"),
  startFocusTimerAtom: createMockAtom("startFocusTimerAtom"),
  pauseFocusTimerAtom: createMockAtom("pauseFocusTimerAtom"),
}))

/**
 * Mock @tasktrove/atoms/ui/dialogs
 */
vi.mock("@tasktrove/atoms/ui/dialogs", () => ({
  showQuickAddAtom: createMockAtom("showQuickAddAtom"),
  showTaskPanelAtom: createMockAtom("showTaskPanelAtom"),
  showPomodoroAtom: createMockAtom("showPomodoroAtom"),
  showProjectDialogAtom: createMockAtom("showProjectDialogAtom"),
  showSearchDialogAtom: createMockAtom("showSearchDialogAtom"),
  showSettingsDialogAtom: createMockAtom("showSettingsDialogAtom"),
  showUserProfileDialogAtom: createMockAtom("showUserProfileDialogAtom"),
  showLabelDialogAtom: createMockAtom("showLabelDialogAtom"),
  showSectionDialogAtom: createMockAtom("showSectionDialogAtom"),
  showProjectGroupDialogAtom: createMockAtom("showProjectGroupDialogAtom"),
  projectDialogContextAtom: createMockAtom("projectDialogContextAtom"),
  labelDialogContextAtom: createMockAtom("labelDialogContextAtom"),
  sectionDialogContextAtom: createMockAtom("sectionDialogContextAtom"),
  projectGroupDialogContextAtom: createMockAtom("projectGroupDialogContextAtom"),
  quickAddTaskAtom: createMockAtom("quickAddTaskAtom"),
  quickAddAutocompleteAtom: createMockAtom("quickAddAutocompleteAtom"),
  nlpEnabledAtom: createMockAtom("nlpEnabledAtom"),
  openQuickAddAtom: createMockAtom("openQuickAddAtom"),
  closeQuickAddAtom: createMockAtom("closeQuickAddAtom"),
  toggleTaskPanelAtom: createMockAtom("toggleTaskPanelAtom"),
  closeTaskPanelAtom: createMockAtom("closeTaskPanelAtom"),
  openPomodoroAtom: createMockAtom("openPomodoroAtom"),
  closePomodoroAtom: createMockAtom("closePomodoroAtom"),
  closeAllDialogsAtom: createMockAtom("closeAllDialogsAtom"),
  openSettingsDialogAtom: createMockAtom("openSettingsDialogAtom"),
  closeSettingsDialogAtom: createMockAtom("closeSettingsDialogAtom"),
  openUserProfileDialogAtom: createMockAtom("openUserProfileDialogAtom"),
  closeUserProfileDialogAtom: createMockAtom("closeUserProfileDialogAtom"),
  updateQuickAddAutocompleteAtom: createMockAtom("updateQuickAddAutocompleteAtom"),
  closeQuickAddAutocompleteAtom: createMockAtom("closeQuickAddAutocompleteAtom"),
  updateQuickAddTaskAtom: createMockAtom("updateQuickAddTaskAtom"),
  resetQuickAddTaskAtom: createMockAtom("resetQuickAddTaskAtom"),
  toggleNlpAtom: createMockAtom("toggleNlpAtom"),
  openQuickAddWithCopyAtom: createMockAtom("openQuickAddWithCopyAtom"),
  resetCopyTaskAtom: createMockAtom("resetCopyTaskAtom"),
  copyTaskAtom: createMockAtom("copyTaskAtom"),
}))

/**
 * Mock @tasktrove/atoms/ui/navigation
 */
vi.mock("@tasktrove/atoms/ui/navigation", () => ({
  openSearchAtom: createMockAtom("openSearchAtom"),
  closeSearchAtom: createMockAtom("closeSearchAtom"),
  toggleSearchAtom: createMockAtom("toggleSearchAtom"),
  openQuickAddAtom: createMockAtom("openQuickAddAtom"),
  closeQuickAddAtom: createMockAtom("closeQuickAddAtom"),
  toggleQuickAddAtom: createMockAtom("toggleQuickAddAtom"),
  openProjectDialogAtom: createMockAtom("openProjectDialogAtom"),
  closeProjectDialogAtom: createMockAtom("closeProjectDialogAtom"),
  toggleProjectDialogAtom: createMockAtom("toggleProjectDialogAtom"),
  openLabelDialogAtom: createMockAtom("openLabelDialogAtom"),
  closeLabelDialogAtom: createMockAtom("closeLabelDialogAtom"),
  toggleLabelDialogAtom: createMockAtom("toggleLabelDialogAtom"),
  openSectionDialogAtom: createMockAtom("openSectionDialogAtom"),
  closeSectionDialogAtom: createMockAtom("closeSectionDialogAtom"),
  toggleSectionDialogAtom: createMockAtom("toggleSectionDialogAtom"),
  openProjectGroupDialogAtom: createMockAtom("openProjectGroupDialogAtom"),
  closeProjectGroupDialogAtom: createMockAtom("closeProjectGroupDialogAtom"),
  toggleProjectGroupDialogAtom: createMockAtom("toggleProjectGroupDialogAtom"),
  closeAllDialogsAtom: createMockAtom("closeAllDialogsAtom"),
  pathnameAtom: createMockAtom("pathnameAtom", "/today"),
  setPathnameAtom: createMockAtom("setPathnameAtom"),
  currentRouteContextAtom: createMockAtom("currentRouteContextAtom", {
    routeType: "standard",
    view: "today",
  }),
  dynamicPageInfoAtom: createMockAtom("dynamicPageInfoAtom", null),
  editingProjectIdAtom: createMockAtom("editingProjectIdAtom", null),
  startEditingProjectAtom: createMockAtom("startEditingProjectAtom"),
  stopEditingProjectAtom: createMockAtom("stopEditingProjectAtom"),
  editingLabelIdAtom: createMockAtom("editingLabelIdAtom", null),
  startEditingLabelAtom: createMockAtom("startEditingLabelAtom"),
  stopEditingLabelAtom: createMockAtom("stopEditingLabelAtom"),
  editingSectionIdAtom: createMockAtom("editingSectionIdAtom", null),
  stopEditingSectionAtom: createMockAtom("stopEditingSectionAtom"),
  startEditingSectionAtom: createMockAtom("startEditingSectionAtom"),
  editingGroupIdAtom: createMockAtom("editingGroupIdAtom", null),
  startEditingGroupAtom: createMockAtom("startEditingGroupAtom"),
  stopEditingGroupAtom: createMockAtom("stopEditingGroupAtom"),
}))

/**
 * Mock @tasktrove/atoms/ui/views
 *
 * Special handling for viewState atoms to maintain reactivity:
 * - currentViewStateAtom is a writable atom that can be updated
 * - setSearchQueryAtom is a write-only atom that updates currentViewStateAtom
 * This ensures that typing in search inputs actually updates the displayed value
 */
vi.mock("@tasktrove/atoms/ui/views", () => {
  const defaultViewState = {
    viewMode: "list",
    sortBy: "default",
    sortDirection: "asc",
    showCompleted: false,
    showOverdue: false,
    searchQuery: "",
    showSidePanel: false,
    compactView: false,
    collapsedSections: [],
  }

  // Create a shared writable viewState atom
  const mockViewStateAtom = atom(defaultViewState)
  mockViewStateAtom.debugLabel = "currentViewStateAtom"

  // Create a write-only atom that updates the searchQuery in viewState
  const mockSetSearchQueryAtom = atom(null, (get, set, query: string) => {
    const current = get(mockViewStateAtom)
    set(mockViewStateAtom, { ...current, searchQuery: query })
  })
  mockSetSearchQueryAtom.debugLabel = "setSearchQueryAtom"

  const mockSetViewOptionsAtom = atom(
    null,
    (get, set, updates: Partial<typeof defaultViewState>) => {
      const current = get(mockViewStateAtom)
      set(mockViewStateAtom, { ...current, ...updates })
    },
  )
  mockSetViewOptionsAtom.debugLabel = "setViewOptionsAtom"

  // Create updateViewStateAtom - updates view state for a specific viewId
  const mockUpdateViewStateAtom = atom(
    null,
    (
      get,
      set,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      { viewId, updates }: { viewId: string; updates: Partial<typeof defaultViewState> },
    ) => {
      // For tests, just update the shared mockViewStateAtom (viewId ignored)
      const current = get(mockViewStateAtom)
      set(mockViewStateAtom, { ...current, ...updates })
    },
  )
  mockUpdateViewStateAtom.debugLabel = "updateViewStateAtom"

  // Create getViewStateAtom - function that returns an atom for a specific viewId
  const getViewStateAtom = (viewId: string) => {
    const viewStateAtom = atom(defaultViewState)
    viewStateAtom.debugLabel = `getViewStateAtom(${viewId})`
    return viewStateAtom
  }

  return {
    currentViewAtom: createMockAtom("currentViewAtom", "today"),
    currentViewStateAtom: mockViewStateAtom,
    isCalendarViewAtom: createMockAtom("isCalendarViewAtom", false),
    selectedCalendarDateAtom: createMockAtom("selectedCalendarDateAtom", null),
    setSearchQueryAtom: mockSetSearchQueryAtom,
    collapsedSectionsAtom: createMockAtom("collapsedSectionsAtom", []),
    toggleSectionCollapseAtom: createMockAtom("toggleSectionCollapseAtom"),
    toggleTaskPanelWithViewStateAtom: createMockAtom("toggleTaskPanelWithViewStateAtom"),
    sidePanelWidthAtom: createMockAtom("sidePanelWidthAtom", 400),
    sideBarWidthAtom: createMockAtom("sideBarWidthAtom", SIDEBAR_WIDTH_PX_DEFAULT),
    updateGlobalViewOptionsAtom: createMockAtom("updateGlobalViewOptionsAtom"),
    activeFiltersAtom: createMockAtom("activeFiltersAtom", {}),
    hasActiveFiltersAtom: createMockAtom("hasActiveFiltersAtom", false),
    activeFilterCountAtom: createMockAtom("activeFilterCountAtom", 0),
    updateFiltersAtom: createMockAtom("updateFiltersAtom"),
    clearActiveFiltersAtom: createMockAtom("clearActiveFiltersAtom"),
    setViewOptionsAtom: mockSetViewOptionsAtom,
    updateViewStateAtom: mockUpdateViewStateAtom,
    getViewStateAtom,
  }
})

/**
 * Mock @tasktrove/atoms/ui/selection
 */
vi.mock("@tasktrove/atoms/ui/selection", () => ({
  selectedTaskIdAtom: createMockAtom("selectedTaskIdAtom"),
  selectedTasksAtom: createMockAtom("selectedTasksAtom", []),
  selectedTaskAtom: createMockAtom("selectedTaskAtom"),
  selectedTaskRouteContextAtom: createMockAtom("selectedTaskRouteContextAtom"),
  setSelectedTaskIdAtom: createMockAtom("setSelectedTaskIdAtom"),
  lastSelectedTaskAtom: createMockAtom("lastSelectedTaskAtom"),
  selectRangeAtom: createMockAtom("selectRangeAtom"),
  toggleTaskSelectionAtom: createMockAtom("toggleTaskSelectionAtom"),
  clearSelectedTasksAtom: createMockAtom("clearSelectedTasksAtom"),
  multiSelectDraggingAtom: createMockAtom("multiSelectDraggingAtom", false),
}))

/**
 * Mock @tasktrove/atoms/ui/drag
 */
vi.mock("@tasktrove/atoms/ui/drag", () => {
  const draggingTaskIdsAtom = createMockAtom("draggingTaskIdsAtom", [])
  const resizingTaskIdAtom = createMockAtom("resizingTaskIdAtom", null)
  const draggingEventIdAtom = createMockAtom("draggingEventIdAtom", null)
  const resizingEventIdAtom = createMockAtom("resizingEventIdAtom", null)
  const isAnyDragActiveAtom = createMockAtom("isAnyDragActiveAtom", false)
  const isAnyResizeActiveAtom = createMockAtom("isAnyResizeActiveAtom", false)
  return {
    draggingTaskIdsAtom,
    resizingTaskIdAtom,
    draggingEventIdAtom,
    resizingEventIdAtom,
    isAnyDragActiveAtom,
    isAnyResizeActiveAtom,
    dragAtoms: {
      draggingTaskIds: draggingTaskIdsAtom,
      resizingTaskId: resizingTaskIdAtom,
      draggingEventId: draggingEventIdAtom,
      resizingEventId: resizingEventIdAtom,
      isAnyDragActive: isAnyDragActiveAtom,
      isAnyResizeActive: isAnyResizeActiveAtom,
    },
  }
})

/**
 * Mock @tasktrove/atoms/ui/scroll-to-task
 */
vi.mock("@tasktrove/atoms/ui/scroll-to-task", () => ({
  scrollToTaskAtom: createMockAtom("scrollToTaskAtom"),
  scrollToTaskActionAtom: createMockAtom("scrollToTaskActionAtom"),
}))

/**
 * Mock @tasktrove/atoms/ui/keyboard-context
 */
vi.mock("@tasktrove/atoms/ui/keyboard-context", () => ({
  keyboardContextAtom: createMockAtom("keyboardContextAtom"),
  keyboardHandlersAtom: createMockAtom("keyboardHandlersAtom"),
  registerKeyboardHandlerAtom: createMockAtom("registerKeyboardHandlerAtom"),
  unregisterKeyboardHandlerAtom: createMockAtom("unregisterKeyboardHandlerAtom"),
  updateKeyboardContextAtom: createMockAtom("updateKeyboardContextAtom"),
  setActiveComponentAtom: createMockAtom("setActiveComponentAtom"),
}))

/**
 * Mock @tasktrove/atoms/data/base/atoms
 */
vi.mock("@tasktrove/atoms/data/base/atoms", () => ({
  tasksAtom: createMockAtom("tasksAtom", []),
  projectsAtom: createMockAtom("projectsAtom", []),
  labelsAtom: createMockAtom("labelsAtom", []),
  settingsAtom: createMockAtom("settingsAtom", {
    general: {
      theme: "system",
      language: "en",
      popoverHoverOpen: false,
      preferDayMonthFormat: false,
    },
    data: {
      fileFormat: "json",
      autoSave: true,
    },
    uiSettings: {
      use24HourTime: false,
      weekStartsOn: 0,
      showWeekNumber: false,
    },
  }),
  dataFileAtom: createMockAtom("dataFileAtom", {}),
  userAtom: createMockAtom("userAtom", null),
  usersAtom: createMockAtom("usersAtom", []),
  taskByIdAtom: createMockAtom("taskByIdAtom", new Map()),
  // pro atoms
  tasksByTrackingIdAtom: createMockAtom("tasksByTrackingIdAtom", new Map()),
}))

/**
 * Mock @tasktrove/atoms/core/tasks
 */
vi.mock("@tasktrove/atoms/core/tasks", () => ({
  addTaskAtom: createMockAtom("addTaskAtom"),
  updateTaskAtom: createMockAtom("updateTaskAtom"),
  updateTasksAtom: createMockAtom("updateTasksAtom"),
  deleteTaskAtom: createMockAtom("deleteTaskAtom"),
  deleteTasksAtom: createMockAtom("deleteTasksAtom"),
  toggleTaskAtom: createMockAtom("toggleTaskAtom"),
  addCommentAtom: createMockAtom("addCommentAtom"),
  completedTasksTodayAtom: createMockAtom("completedTasksTodayAtom"),
  moveTaskBetweenSectionsAtom: createMockAtom("moveTaskBetweenSectionsAtom"),
  reorderTaskInViewAtom: createMockAtom("reorderTaskInViewAtom"),
  // Legacy grouped structure for backwards compatibility
  taskAtoms: {
    tasks: createMockAtom("tasksAtom", []),
    actions: {
      updateTask: createMockAtom("updateTaskAtom"),
      addTask: createMockAtom("addTaskAtom"),
      deleteTask: createMockAtom("deleteTaskAtom"),
      toggleTask: createMockAtom("toggleTaskAtom"),
    },
    derived: {
      // These derived atoms return functions (atom families)
      // Note: Use simple names without "Atom" suffix for test compatibility
      orderedTasksBySection: {
        toString: () => "orderedTasksBySection",
        debugLabel: "orderedTasksBySection",
        read: () => vi.fn(() => []),
        write: vi.fn(),
      },
      taskById: {
        toString: () => "taskById",
        debugLabel: "taskById",
        read: () => vi.fn(() => null),
        write: vi.fn(),
      },
    },
  },
}))

/**
 * Mock @tasktrove/atoms/core/projects
 */
vi.mock("@tasktrove/atoms/core/projects", () => ({
  addProjectAtom: createMockAtom("addProjectAtom"),
  updateProjectAtom: createMockAtom("updateProjectAtom"),
  updateProjectsAtom: createMockAtom("updateProjectsAtom"),
  deleteProjectAtom: createMockAtom("deleteProjectAtom"),
  deleteProjectsAtom: createMockAtom("deleteProjectsAtom"),
  projectByIdAtom: createMockAtom("projectByIdAtom", new Map()),
  visibleProjectsAtom: createMockAtom("visibleProjectsAtom", []),
  projectIdsAtom: createMockAtom("projectIdsAtom", new Set()),
  sortedLabelsAtom: createMockAtom("sortedLabelsAtom", []),
  // Legacy grouped structure for backwards compatibility
  projectAtoms: {
    projects: createMockAtom("projectsAtom", []),
    actions: {
      deleteProject: createMockAtom("deleteProjectAtom"),
      updateProject: createMockAtom("updateProjectAtom"),
      addSection: createMockAtom("addSectionAtom"),
      renameSection: createMockAtom("renameSectionAtom"),
      removeSection: createMockAtom("removeSectionAtom"),
      moveSection: createMockAtom("moveSectionAtom"),
    },
    derived: {
      // These derived atoms return functions (atom families)
      // Note: Use simple names without "Atom" suffix for test compatibility
      projectById: {
        toString: () => "projectById",
        debugLabel: "projectById",
        read: () => vi.fn(() => null),
        write: vi.fn(),
      },
      visibleProjects: {
        toString: () => "visibleProjects",
        debugLabel: "visibleProjects",
        read: () => vi.fn(() => []),
        write: vi.fn(),
      },
      allProjects: {
        toString: () => "allProjects",
        debugLabel: "allProjects",
        read: () => vi.fn(() => []),
        write: vi.fn(),
      },
    },
  },
}))

/**
 * Mock @tasktrove/atoms/core/labels
 */
vi.mock("@tasktrove/atoms/core/labels", () => ({
  addLabelAtom: createMockAtom("addLabelAtom"),
  updateLabelAtom: createMockAtom("updateLabelAtom"),
  deleteLabelAtom: createMockAtom("deleteLabelAtom"),
  labelsFromIdsAtom: createMockAtom("labelsFromIdsAtom"),
  addLabelAndWaitForRealIdAtom: createMockAtom("addLabelAndWaitForRealIdAtom"),
  reorderLabelsAtom: createMockAtom("reorderLabelsAtom"),
  // Legacy grouped structure for backwards compatibility
  labelAtoms: {
    labels: createMockAtom("labelsAtom", []),
    actions: {
      addLabel: createMockAtom("addLabelAtom"),
      updateLabel: createMockAtom("updateLabelAtom"),
      deleteLabel: createMockAtom("deleteLabelAtom"),
    },
  },
}))

/**
 * Mock @tasktrove/atoms/core/groups
 */
vi.mock("@tasktrove/atoms/core/groups", () => ({
  allGroupsAtom: createMockAtom("allGroupsAtom", {
    projectGroups: {
      type: "project",
      id: "root",
      name: "All Projects",
      items: [],
    },
    labelGroups: {
      type: "label",
      id: "root-labels",
      name: "All Labels",
      items: [],
    },
  }),
  projectGroupsAtom: createMockAtom("projectGroupsAtom", []),
  addProjectGroupAtom: createMockAtom("addProjectGroupAtom"),
  updateProjectGroupAtom: createMockAtom("updateProjectGroupAtom"),
  deleteProjectGroupAtom: createMockAtom("deleteProjectGroupAtom"),
  flattenProjectGroupsAtom: createMockAtom("flattenProjectGroupsAtom", []),
}))

/**
 * Mock @tasktrove/atoms/core/history
 */
vi.mock("@tasktrove/atoms/core/history", () => ({
  undoAtom: createMockAtom("undoAtom"),
  redoAtom: createMockAtom("redoAtom"),
  canUndoAtom: createMockAtom("canUndoAtom"),
  canRedoAtom: createMockAtom("canRedoAtom"),
  keyboardShortcutAtom: createMockAtom("keyboardShortcutAtom"),
}))

/**
 * Mock @tasktrove/atoms/ui/app-refresh
 */
vi.mock("@tasktrove/atoms/ui/app-refresh", () => ({
  appRefreshTriggerAtom: createMockAtom("appRefreshTriggerAtom"),
}))

/**
 * Mock @tasktrove/atoms/ui/pomodoro
 */
vi.mock("@tasktrove/atoms/ui/pomodoro", () => ({
  pomodoroSettingsAtom: createMockAtom("pomodoroSettingsAtom"),
  pomodoroStatusAtom: createMockAtom("pomodoroStatusAtom"),
}))

/**
 * Mock @tasktrove/atoms/ui/settings
 */
vi.mock("@tasktrove/atoms/ui/settings", () => {
  const activeSettingsCategoryAtom = atom("general")
  activeSettingsCategoryAtom.debugLabel = "activeSettingsCategoryAtom"

  const mobileSettingsDrawerOpenAtom = atom(false)
  mobileSettingsDrawerOpenAtom.debugLabel = "mobileSettingsDrawerOpenAtom"

  const navigateToSettingsCategoryAtom = atom(null, (get, set, category: string) => {
    set(activeSettingsCategoryAtom, category)
  })
  navigateToSettingsCategoryAtom.debugLabel = "navigateToSettingsCategoryAtom"

  const toggleMobileSettingsDrawerAtom = atom(null, (get, set) => {
    const current = get(mobileSettingsDrawerOpenAtom)
    set(mobileSettingsDrawerOpenAtom, !current)
  })
  toggleMobileSettingsDrawerAtom.debugLabel = "toggleMobileSettingsDrawerAtom"

  const isValidCategory = (id: string) =>
    ["general", "notifications", "data", "appearance", "scheduler"].includes(id)

  return {
    activeSettingsCategoryAtom,
    navigateToSettingsCategoryAtom,
    mobileSettingsDrawerOpenAtom,
    toggleMobileSettingsDrawerAtom,
    isValidCategory,
  }
})

/**
 * Mock @tasktrove/atoms/ui/filtered-tasks
 */
vi.mock("@tasktrove/atoms/ui/filtered-tasks", () => ({
  filteredTasksAtom: createMockAtom("filteredTasksAtom"),
  activeTasksAtom: createMockAtom("activeTasksAtom"),
  // uiFilteredTasksForViewAtom is an atom family - it's a function that returns an atom
  uiFilteredTasksForViewAtom: vi.fn((viewId) =>
    createMockAtom(`uiFilteredTasksForViewAtom(${viewId})`, []),
  ),
}))

/**
 * Mock @tasktrove/atoms/ui/task-counts
 */
vi.mock("@tasktrove/atoms/ui/task-counts", () => ({
  taskCountsAtom: createMockAtom("taskCountsAtom", {
    projectTaskCounts: {},
    labelTaskCounts: {},
    viewCounts: {},
  }),
  projectTaskCountsAtom: createMockAtom("projectTaskCountsAtom", {}),
  labelTaskCountsAtom: createMockAtom("labelTaskCountsAtom", {}),
  viewCountsAtom: createMockAtom("viewCountsAtom", {}),
  taskCountForViewAtom: vi.fn((viewId: string) =>
    createMockAtom(`taskCountForViewAtom(${viewId})`, 0),
  ),
  taskListForViewAtom: vi.fn((viewId: string) =>
    createMockAtom(`taskListForViewAtom(${viewId})`, []),
  ),
}))

// Export helper for tests that need to create custom atoms
export { createMockAtom }
