/**
 * Main atoms export file for TaskTrove's Jotai migration
 *
 * Provides organized exports of all atom objects and convenient individual exports
 * for easy importing throughout the application.
 *
 * @example
 * // Import full atom objects
 * import { taskAtoms, projectAtoms } from '@/lib/atoms'
 *
 * // Import specific atoms via convenience exports
 * import { tasks, taskActions, projectById } from '@/lib/atoms'
 *
 * // Import individual atoms directly
 * import { tasksAtom, addTaskAtom } from '@/lib/atoms'
 */

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export * from "./utils"

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export { INBOX_PROJECT_ID } from "../types"

// =============================================================================
// CORE DATA ATOMS
// =============================================================================

/**
 * Task management atoms
 * Contains all task-related state and actions
 */
export { taskAtoms } from "./core/tasks"

/**
 * Project management atoms
 * Contains all project-related state and actions
 */
export { projectAtoms } from "./core/projects"

/**
 * Label management atoms
 * Contains all label-related state and actions
 */
export { labelAtoms } from "./core/labels"

/**
 * Group management atoms
 * Contains all group-related state, nesting operations, and project-group relationships
 */
export * from "./core/groups"

// =============================================================================
// FEATURE ATOMS
// =============================================================================

/**
 * Analytics atoms
 * Contains all analytics calculations, metrics, and actions
 */
export { analyticsAtoms } from "./features/analytics"

// =============================================================================
// UI STATE ATOMS
// =============================================================================

/**
 * View state management atoms
 * Contains view modes, sorting, filtering, and layout state
 */
export { viewAtoms } from "./ui/views"

/**
 * Dialog state management atoms
 * Contains modal and dialog open/close states
 */
export { dialogAtoms } from "./ui/dialogs"

/**
 * Keyboard context management atoms
 * Contains focus context, typing state, and keyboard shortcut routing
 */
export { keyboardContextAtoms } from "./ui/keyboard-context"

/**
 * Selection state management atoms
 * Contains task selection mode, bulk operations, and selection actions
 */
export { selectionAtoms } from "./ui/selection"

/**
 * User settings management atoms (only implemented atoms)
 * Contains user preferences, settings persistence, and configuration
 */
export {
  dataSettingsAtom,
  updateDataSettingsAtom,
  userSettingsAtom,
  exportSettingsAtom,
  importSettingsAtom,
} from "./ui/user-settings-atom"

/**
 * Core settings atoms from settings module
 */
export { settingsAtom, updateSettingsAtom, updateSettingsMutationAtom } from "./core/settings"

// =============================================================================
// CONVENIENCE RE-EXPORTS FOR COMMON ATOMS
// =============================================================================

// Import the atom objects for re-export
import { taskAtoms } from "./core/tasks"
import { projectAtoms } from "./core/projects"
import { labelAtoms } from "./core/labels"
import { viewAtoms } from "./ui/views"

/**
 * Task atoms - convenient individual exports
 */
export const { tasks, actions: taskActions, derived: taskDerived } = taskAtoms

// Additional convenience exports
export const taskCounts = taskDerived.taskCounts

/**
 * Project atoms - convenient individual exports
 */
export const {
  projects,
  currentProjectId,
  actions: projectActions,
  derived: projectDerived,
} = projectAtoms

/**
 * Label atoms - convenient individual exports
 */
export const {
  labels,
  labelsMap,
  labelById,
  labelByName,
  labelNamesFromIds,
  labelsFromIds,
  labelTaskCounts,
  addLabel,
  updateLabel,
  deleteLabel,
} = labelAtoms

/**
 * View atoms - convenient individual exports
 */
export const {
  viewStates,
  currentView,
  currentViewState,
  updateViewState,
  setViewMode,
  setSorting,
  setSearchQuery,
  setShowCompleted,
  setShowOverdue,
  isListView,
  isKanbanView,
  isCalendarView,
  searchQuery,
  sortConfig,
  showCompleted,
  showOverdue,
} = viewAtoms

// =============================================================================
// INDIVIDUAL ATOM EXPORTS
// =============================================================================

// Task atoms
export {
  tasksAtom,
  addTaskAtom,
  updateTaskAtom,
  deleteTaskAtom,
  toggleTaskAtom,
  addCommentAtom,
  bulkActionsAtom,
  moveTaskAtom,
  moveTaskBetweenSectionsAtom,
  reorderTaskInViewAtom,
  addTaskToViewAtom,
  removeTaskFromViewAtom,
  getTasksForViewAtom,
  activeTasksAtom,
  completedTasksAtom,
  inboxTasksAtom,
  todayTasksAtom,
  todayOnlyAtom,
  upcomingTasksAtom,
  overdueTasksAtom,
  taskCountsAtom,
  completedTasksTodayAtom,
  baseFilteredTasksForViewAtom,
  filteredTasksAtom,
} from "./core/tasks"

// Base atoms (mutations)
export {
  createTaskMutationAtom,
  createProjectMutationAtom,
  deleteTaskMutationAtom,
  deleteProjectMutationAtom,
  updateTasksMutationAtom,
  createProjectGroupMutationAtom,
  updateProjectGroupMutationAtom,
  deleteProjectGroupMutationAtom,
} from "./core/base"

// Project atoms
export {
  projectsAtom,
  currentProjectIdAtom,
  addProjectAtom,
  updateProjectAtom,
  deleteProjectAtom,
  visibleProjectsAtom,
  projectByIdAtom,
  projectTaskCountsAtom,
  currentProjectAtom,
} from "./core/projects"

// Label atoms
export {
  labelsAtom,
  labelsMapAtom,
  labelByIdAtom,
  labelByNameAtom,
  labelNamesFromIdsAtom,
  labelsFromIdsAtom,
  labelTaskCountsAtom,
  addLabelAtom,
  updateLabelAtom,
  deleteLabelAtom,
} from "./core/labels"

// View atoms
export {
  viewStatesAtom,
  currentViewAtom,
  updateViewStateAtom,
  setViewOptionsAtom,
  setViewModeAtom,
  setSortingAtom,
  setSearchQueryAtom,
  setShowCompletedAtom,
  setShowOverdueAtom,
  setCompactViewAtom,
  currentViewStateAtom,
  isListViewAtom,
  isKanbanViewAtom,
  isCalendarViewAtom,
  searchQueryAtom,
  sortConfigAtom,
  showCompletedAtom,
  showOverdueAtom,
  compactViewAtom,
  collapsedSectionsAtom,
  toggleSectionCollapseAtom,
  getViewStateAtom,
  resetCurrentViewStateAtom,
  resetViewStateAtom,
  toggleTaskPanelWithViewStateAtom,
} from "./ui/views"

// Dialog atoms
export {
  showQuickAddAtom,
  showTaskPanelAtom,
  showPomodoroAtom,
  showProjectDialogAtom,
  projectDialogContextAtom,
  labelDialogContextAtom,
  showSectionDialogAtom,
  sectionDialogContextAtom,
  showSearchDialogAtom,
  selectedTaskIdAtom,
  selectedTaskAtom,
  selectedTasksAtom,
  openQuickAddAtom,
  closeQuickAddAtom,
  toggleTaskPanelAtom,
  closeTaskPanelAtom,
  toggleTaskSelectionAtom,
  clearSelectedTasksAtom,
  closeAllDialogsAtom,
  isAnyDialogOpenAtom,
  selectedTaskCountAtom,
  isTaskSelectedAtom,
} from "./ui/dialogs"

// Selection atoms
export {
  selectionModeAtom,
  hasSelectedTasksAtom,
  selectedTaskCountAtom as selectionSelectedTaskCountAtom,
  isTaskSelectedAtom as selectionIsTaskSelectedAtom,
  allVisibleTasksSelectedAtom,
  someVisibleTasksSelectedAtom,
  toggleTaskSelectionAtom as selectionToggleTaskSelectionAtom,
  enterSelectionModeAtom,
  exitSelectionModeAtom,
  selectAllVisibleTasksAtom,
  clearSelectionAtom,
  addTaskToSelectionAtom,
  removeTaskFromSelectionAtom,
  toggleSelectAllVisibleTasksAtom,
  bulkActionAtom,
  bulkCompleteTasksAtom,
  bulkDeleteTasksAtom,
  bulkMoveTasksAtom,
  bulkSetPriorityAtom,
  bulkScheduleTasksAtom,
} from "./ui/selection"

// Pomodoro atoms
export {
  pomodoroTimerAtom,
  currentElapsedTimeAtom,
  remainingTimeAtom,
  timerDisplayAtom,
  isTimerRunningAtom,
  currentPomodoroTaskAtom,
  startPomodoroAtom,
  pausePomodoroAtom,
  resumePomodoroAtom,
  resetPomodoroAtom,
  stopPomodoroAtom,
  completePomodoroSessionAtom,
  updatePomodoroSettingsAtom,
  pomodoroAtoms,
} from "./ui/pomodoro"

// Focus timer atoms
export {
  focusTimerStateAtom,
  activeFocusTimerAtom,
  activeFocusTaskAtom,
  isTaskTimerActiveAtom,
  isAnyTimerRunningAtom,
  focusTimerTickAtom,
  currentFocusTimerElapsedAtom,
  focusTimerDisplayAtom,
  focusTimerStatusAtom,
  startFocusTimerAtom,
  pauseFocusTimerAtom,
  stopFocusTimerAtom,
  stopAllFocusTimersAtom,
  focusTimerAtoms,
  formatElapsedTime,
} from "./ui/focus-timer"
