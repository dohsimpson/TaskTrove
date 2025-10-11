// Re-export all atoms for convenience
export * from "./core/tasks";
export * from "./core/projects";
export * from "./core/labels";
// Export base atoms directly since core/base no longer re-exports them
export {
  tasksAtom,
  projectsAtom,
  labelsAtom,
  settingsAtom,
  userAtom,
} from "./data/base/atoms";
// Export query atoms directly since core/base no longer re-exports them
export {
  queryClientAtom,
  tasksQueryAtom,
  projectsQueryAtom,
  labelsQueryAtom,
  groupsQueryAtom,
  settingsQueryAtom,
  userQueryAtom,
} from "./data/base/query";
export {
  updateSettingsAtom,
  dataSettingsAtom,
  updateDataSettingsAtom,
  settingsAtoms,
} from "./core/settings";
import { updateSettingsMutationAtom } from "./mutations/settings";
export { updateSettingsMutationAtom };
export * from "./core/notifications";
export * from "./core/history";
export * from "./core/groups";
export * from "./ui/views";
export * from "./ui/task-counts";
export * from "./ui/filtered-tasks";
export * from "./ui/user-settings-atom";
export * from "./ui/focus-timer";
export * from "./ui/dialogs";
export * from "./ui/keyboard-context";
export * from "./ui/pomodoro";
export * from "./ui/app-refresh";
// Export specific atoms from navigation to avoid conflicts with dialogs
export {
  pathnameAtom,
  currentRouteContextAtom,
  setPathnameAtom,
  dynamicPageInfoAtom,
  editingProjectIdAtom,
  projectColorPickerAtom,
  startEditingProjectAtom,
  stopEditingProjectAtom,
  openProjectColorPickerAtom,
  closeProjectColorPickerAtom,
  editingLabelIdAtom,
  labelColorPickerAtom,
  startEditingLabelAtom,
  stopEditingLabelAtom,
  openLabelColorPickerAtom,
  closeLabelColorPickerAtom,
  editingSectionIdAtom,
  sectionColorPickerAtom,
  startEditingSectionAtom,
  stopEditingSectionAtom,
  openSectionColorPickerAtom,
  closeSectionColorPickerAtom,
  editingGroupIdAtom,
  groupColorPickerAtom,
  startEditingGroupAtom,
  stopEditingGroupAtom,
  openGroupColorPickerAtom,
  closeGroupColorPickerAtom,
  navigationAtoms,
  // Dialog management atoms
  openSearchAtom,
  closeSearchAtom,
  openProjectDialogAtom,
  closeProjectDialogAtom,
  openLabelDialogAtom,
  closeLabelDialogAtom,
  openSectionDialogAtom,
  closeSectionDialogAtom,
  openProjectGroupDialogAtom,
  closeProjectGroupDialogAtom,
  openQuickAddAtom,
  type RouteContext,
} from "./ui/navigation";

// Selection exports (avoiding conflicts with dialogs)
export {
  selectedTaskIdAtom,
  selectedTaskAtom,
  selectedTasksAtom,
  lastSelectedTaskAtom,
  multiSelectDraggingAtom,
  toggleTaskSelectionAtom,
  clearSelectedTasksAtom,
  setSelectedTaskIdAtom,
  selectRangeAtom,
  selectionActionAtoms,
  selectionAtoms,
} from "./ui/selection";

export * from "./features/analytics";

// Export utils including audio functionality
export { playSoundAtom } from "./utils/atom-helpers";
export type { SoundType } from "@tasktrove/dom-utils/audio";

// Filter utilities
export {
  filterTasksByCompleted,
  filterTasksByOverdue,
  filterTasks,
  type FilterConfig,
  viewStateToFilterConfig,
} from "./utils/filters";

// View state utilities
export { applyViewStateFilters } from "./utils/view-filters";
export { sortTasksByViewState } from "./utils/view-sorting";

// Count utilities
export {
  calculateProjectTaskCounts,
  calculateLabelTaskCounts,
  calculateViewCounts,
  type CountConfig,
  type ViewCounts,
} from "./utils/counts";

// Task ordering utilities
export {
  getOrderedTasksForSection,
  getOrderedTasksForProject,
  moveTaskWithinSection,
  addTaskToSection,
  removeTaskFromSection,
} from "./data/tasks/ordering";

// Test helpers
export {
  createMockTask,
  createMockTaskSet,
  TEST_TASK_ID_1,
  TEST_TASK_ID_2,
  TEST_TASK_ID_3,
  TEST_PROJECT_ID_1,
  TEST_PROJECT_ID_2,
  TEST_LABEL_ID_1,
  TEST_LABEL_ID_2,
  TEST_SECTION_ID_1,
  TEST_SECTION_ID_2,
} from "./utils/test-helpers";
