// Re-export all atoms for convenience
export * from "./core/tasks";
export * from "./core/projects";
export * from "./core/labels";
export * from "./core/base";
// Export specific atoms from core/settings to avoid conflicts
export {
  settingsAtom,
  updateSettingsAtom,
  dataSettingsAtom,
  updateDataSettingsAtom,
  settingsAtoms,
  settingsQueryAtom,
  updateSettingsMutationAtom,
} from "./core/settings";
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
