import { atom } from "jotai";
import type React from "react";
import type { LabelId, ProjectId, GroupId, TaskId } from "@tasktrove/types/id";
import type { Task } from "@tasktrove/types/core";
import type {
  CreateTaskRequest,
  UpdateTaskRequest,
} from "@tasktrove/types/api-requests";
import { clearNullValues } from "@tasktrove/utils";
import { selectedTaskIdAtom, setSelectedTaskIdAtom } from "./selection";

/**
 * Dialog state atoms for TaskTrove's UI components
 *
 * This module manages all dialog states that were previously handled
 * in MainLayoutWrapper with individual useState hooks. Dialog states
 * are UI-only and should NOT be persisted across page reloads.
 */

// =============================================================================
// BASE DIALOG STATE ATOMS
// =============================================================================

/**
 * Quick Add Dialog - Controls the quick task creation dialog
 */
export const showQuickAddAtom = atom<boolean>(false);
showQuickAddAtom.debugLabel = "showQuickAddAtom";

/**
 * Task Panel - Controls the task detail side panel
 */
export const showTaskPanelAtom = atom<boolean>(false);
showTaskPanelAtom.debugLabel = "showTaskPanelAtom";

/**
 * Pomodoro Dialog - Controls the pomodoro timer dialog
 */
export const showPomodoroAtom = atom<boolean>(false);
showPomodoroAtom.debugLabel = "showPomodoroAtom";

/**
 * Project Dialog - Controls the project creation/edit dialog
 */
export const showProjectDialogAtom = atom<boolean>(false);
showProjectDialogAtom.debugLabel = "showProjectDialogAtom";

/**
 * Generic Entity Dialog Context - Tracks insertion position and dialog mode
 * Can be used for projects, labels, and sections
 */
type EntityDialogContext<T = LabelId | ProjectId | GroupId> = {
  mode: "create" | "edit";
  insertPosition?: {
    id?: T;
    placement?: "above" | "below";
    // Additional context for sections (which need project context)
    projectId?: ProjectId;
  };
};

/**
 * Project Dialog Context - Tracks insertion position and related project info
 */
export const projectDialogContextAtom = atom<EntityDialogContext<ProjectId>>({
  mode: "create",
});
projectDialogContextAtom.debugLabel = "projectDialogContextAtom";

/**
 * Label Dialog Context - Tracks insertion position and related label info
 */
export const labelDialogContextAtom = atom<EntityDialogContext<LabelId>>({
  mode: "create",
});
labelDialogContextAtom.debugLabel = "labelDialogContextAtom";

/**
 * Section Dialog - Controls the section creation/edit dialog
 */
export const showSectionDialogAtom = atom<boolean>(false);
showSectionDialogAtom.debugLabel = "showSectionDialogAtom";

/**
 * Section Dialog Context - Tracks insertion position and related section info
 */
export const sectionDialogContextAtom = atom<EntityDialogContext<GroupId>>({
  mode: "create",
});
sectionDialogContextAtom.debugLabel = "sectionDialogContextAtom";

/**
 * Search Dialog - Controls the global search dialog
 */
export const showSearchDialogAtom = atom<boolean>(false);
showSearchDialogAtom.debugLabel = "showSearchDialogAtom";

/**
 * Label Dialog - Controls the label creation/edit dialog
 */
export const showLabelDialogAtom = atom<boolean>(false);
showLabelDialogAtom.debugLabel = "showLabelDialogAtom";

/**
 * Settings Dialog - Controls the settings configuration dialog
 */
export const showSettingsDialogAtom = atom<boolean>(false);
showSettingsDialogAtom.debugLabel = "showSettingsDialogAtom";

/**
 * Project Group Dialog - Controls the project group creation/edit dialog
 */
export const showProjectGroupDialogAtom = atom<boolean>(false);
showProjectGroupDialogAtom.debugLabel = "showProjectGroupDialogAtom";

/**
 * Project Group Dialog Context - Tracks insertion position and related group info
 */
type ProjectGroupDialogContext = {
  mode: "create" | "edit";
  groupId?: string;
  parentId?: string;
};

export const projectGroupDialogContextAtom = atom<ProjectGroupDialogContext>({
  mode: "create",
});
projectGroupDialogContextAtom.debugLabel = "projectGroupDialogContextAtom";

/**
 * User Profile Dialog - Controls the user profile edit dialog
 */
export const showUserProfileDialogAtom = atom<boolean>(false);
showUserProfileDialogAtom.debugLabel = "showUserProfileDialogAtom";

// =============================================================================
// WRITE-ONLY ACTION ATOMS
// =============================================================================

/**
 * Opens the quick add dialog
 */
export const openQuickAddAtom = atom(null, (get, set) => {
  set(showQuickAddAtom, true);
});
openQuickAddAtom.debugLabel = "openQuickAddAtom";

/**
 * Closes the quick add dialog
 */
export const closeQuickAddAtom = atom(null, (get, set) => {
  set(showQuickAddAtom, false);
});
closeQuickAddAtom.debugLabel = "closeQuickAddAtom";

/**
 * Toggles the task panel with a specific task
 */
export const toggleTaskPanelAtom = atom(null, (get, set, task: Task) => {
  const isCurrentlyOpen = get(showTaskPanelAtom);
  const currentTaskId = get(selectedTaskIdAtom);

  if (isCurrentlyOpen && currentTaskId === task.id) {
    // If panel is open with the same task, close it
    set(showTaskPanelAtom, false);
    set(setSelectedTaskIdAtom, null);
  } else {
    // Otherwise, open/switch to the new task
    set(setSelectedTaskIdAtom, task.id);
    set(showTaskPanelAtom, true);
  }
});
toggleTaskPanelAtom.debugLabel = "toggleTaskPanelAtom";

/**
 * Closes the task panel and clears the selected task
 */
export const closeTaskPanelAtom = atom(null, (get, set) => {
  set(showTaskPanelAtom, false);
  set(setSelectedTaskIdAtom, null);
});
closeTaskPanelAtom.debugLabel = "closeTaskPanelAtom";

/**
 * Opens the pomodoro dialog with a specific task
 */
export const openPomodoroAtom = atom(null, (get, set, task: Task) => {
  set(setSelectedTaskIdAtom, task.id);
  set(showPomodoroAtom, true);
});
openPomodoroAtom.debugLabel = "openPomodoroAtom";

/**
 * Closes the pomodoro dialog and clears the selected task
 */
export const closePomodoroAtom = atom(null, (get, set) => {
  set(showPomodoroAtom, false);
  set(setSelectedTaskIdAtom, null);
});
closePomodoroAtom.debugLabel = "closePomodoroAtom";

/**
 * Closes all dialogs and clears all selections
 */
export const closeAllDialogsAtom = atom(null, (get, set) => {
  // Close all dialogs
  set(showQuickAddAtom, false);
  set(showTaskPanelAtom, false);
  set(showPomodoroAtom, false);
  set(showProjectDialogAtom, false);
  set(showLabelDialogAtom, false);
  set(showSectionDialogAtom, false);
  set(showSearchDialogAtom, false);
  set(showSettingsDialogAtom, false);
  set(showProjectGroupDialogAtom, false);
  set(showUserProfileDialogAtom, false);

  // Note: Selection clearing is handled by the selection module
  // Import and use clearSelectedTasksAtom from selection.ts if needed
});
closeAllDialogsAtom.debugLabel = "closeAllDialogsAtom";

// =============================================================================
// DERIVED READ ATOMS
// =============================================================================

/**
 * Returns true if any dialog is currently open
 */
export const isAnyDialogOpenAtom = atom<boolean>((get) => {
  return (
    get(showQuickAddAtom) ||
    get(showTaskPanelAtom) ||
    get(showPomodoroAtom) ||
    get(showProjectDialogAtom) ||
    get(showLabelDialogAtom) ||
    get(showSectionDialogAtom) ||
    get(showSearchDialogAtom) ||
    get(showSettingsDialogAtom) ||
    get(showProjectGroupDialogAtom) ||
    get(showUserProfileDialogAtom)
  );
});
isAnyDialogOpenAtom.debugLabel = "isAnyDialogOpenAtom";

// =============================================================================
// QUICK ADD NLP SETTINGS
// =============================================================================

/**
 * NLP Enabled State - Controls whether natural language processing is enabled in Quick Add
 * Defaults to true for smart parsing experience
 */
export const nlpEnabledAtom = atom<boolean>(true);
nlpEnabledAtom.debugLabel = "nlpEnabledAtom";

/**
 * Toggle NLP - Action atom to toggle natural language processing
 */
export const toggleNlpAtom = atom(null, (get, set) => {
  const currentValue = get(nlpEnabledAtom);
  set(nlpEnabledAtom, !currentValue);
});
toggleNlpAtom.debugLabel = "toggleNlpAtom";

/**
 * Opens the settings dialog
 */
export const openSettingsDialogAtom = atom(null, (get, set) => {
  set(showSettingsDialogAtom, true);
});
openSettingsDialogAtom.debugLabel = "openSettingsDialogAtom";

/**
 * Closes the settings dialog
 */
export const closeSettingsDialogAtom = atom(null, (get, set) => {
  set(showSettingsDialogAtom, false);
});
closeSettingsDialogAtom.debugLabel = "closeSettingsDialogAtom";

/**
 * Opens the user profile dialog
 */
export const openUserProfileDialogAtom = atom(null, (get, set) => {
  set(showUserProfileDialogAtom, true);
});
openUserProfileDialogAtom.debugLabel = "openUserProfileDialogAtom";

/**
 * Closes the user profile dialog
 */
export const closeUserProfileDialogAtom = atom(null, (get, set) => {
  set(showUserProfileDialogAtom, false);
});
closeUserProfileDialogAtom.debugLabel = "closeUserProfileDialogAtom";

// =============================================================================
// QUICK ADD AUTOCOMPLETE STATE
// =============================================================================

interface AutocompleteItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  type: "project" | "label" | "date";
  value?: string;
}

interface QuickAddAutocompleteState {
  show: boolean;
  type: "project" | "label" | "date" | null;
  query: string;
  items: AutocompleteItem[];
  selectedIndex: number;
  position: { x: number; y: number };
  startPos: number;
}

/**
 * Quick Add Autocomplete State - Manages autocomplete dropdown state
 */
export const quickAddAutocompleteAtom = atom<QuickAddAutocompleteState>({
  show: false,
  type: null,
  query: "",
  items: [],
  selectedIndex: 0,
  position: { x: 0, y: 0 },
  startPos: 0,
});
quickAddAutocompleteAtom.debugLabel = "quickAddAutocompleteAtom";

/**
 * Update Quick Add Autocomplete - Action atom to update autocomplete state
 */
export const updateQuickAddAutocompleteAtom = atom(
  null,
  (get, set, updates: Partial<QuickAddAutocompleteState>) => {
    const current = get(quickAddAutocompleteAtom);
    set(quickAddAutocompleteAtom, { ...current, ...updates });
  },
);
updateQuickAddAutocompleteAtom.debugLabel = "updateQuickAddAutocompleteAtom";

/**
 * Close Quick Add Autocomplete - Action atom to hide autocomplete
 */
export const closeQuickAddAutocompleteAtom = atom(null, (get, set) => {
  set(quickAddAutocompleteAtom, {
    show: false,
    type: null,
    query: "",
    items: [],
    selectedIndex: 0,
    position: { x: 0, y: 0 },
    startPos: 0,
  });
});
closeQuickAddAutocompleteAtom.debugLabel = "closeQuickAddAutocompleteAtom";

// =============================================================================
// QUICK ADD TASK FORM STATE
// =============================================================================

/**
 * Quick Add Task Form - Manages task data during creation
 * Uses CreateTaskRequest type for consistency with API
 */
export const quickAddTaskAtom = atom<CreateTaskRequest>({
  title: "",
});
quickAddTaskAtom.debugLabel = "quickAddTaskAtom";

/**
 * Update Quick Add Task - Action atom to update task form data
 */
export const updateQuickAddTaskAtom = atom(
  null,
  (
    get,
    set,
    { updateRequest }: { updateRequest: Omit<UpdateTaskRequest, "id"> },
  ) => {
    const current: CreateTaskRequest = get(quickAddTaskAtom);

    // Extract only CreateTaskRequest compatible fields (exclude completed)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { completed, ...rawUpdates } = updateRequest;

    // Clean null values to undefined for consistency with API
    const cleanedUpdates = clearNullValues(rawUpdates);

    set(quickAddTaskAtom, { ...current, ...cleanedUpdates });
  },
);
updateQuickAddTaskAtom.debugLabel = "updateQuickAddTaskAtom";

/**
 * Reset Quick Add Task - Action atom to reset form to initial state
 */
export const resetQuickAddTaskAtom = atom(null, (get, set) => {
  set(quickAddTaskAtom, {
    title: "",
  });
});
// Task copying functionality
export const copyTaskAtom = atom<TaskId | null>(null);

export const openQuickAddWithCopyAtom = atom(
  null,
  (get, set, taskId: TaskId) => {
    set(copyTaskAtom, taskId);
    set(showQuickAddAtom, true);
  },
);

export const resetCopyTaskAtom = atom(null, (get, set) => {
  set(copyTaskAtom, null);
});
resetQuickAddTaskAtom.debugLabel = "resetQuickAddTaskAtom";

// =============================================================================
// EXPORTED COLLECTIONS
// =============================================================================

/**
 * All base dialog state atoms
 */
export const baseDialogAtoms = {
  showQuickAdd: showQuickAddAtom,
  showTaskPanel: showTaskPanelAtom,
  showPomodoro: showPomodoroAtom,
  showProjectDialog: showProjectDialogAtom,
  showSearchDialog: showSearchDialogAtom,
  showSettingsDialog: showSettingsDialogAtom,
  showUserProfileDialog: showUserProfileDialogAtom,
  quickAddAutocomplete: quickAddAutocompleteAtom,
  quickAddTask: quickAddTaskAtom,
  nlpEnabled: nlpEnabledAtom,
} as const;

/**
 * All action atoms for dialog management
 */
export const dialogActionAtoms = {
  openQuickAdd: openQuickAddAtom,
  closeQuickAdd: closeQuickAddAtom,
  toggleTaskPanel: toggleTaskPanelAtom,
  closeTaskPanel: closeTaskPanelAtom,
  openPomodoro: openPomodoroAtom,
  closePomodoro: closePomodoroAtom,
  openSettingsDialog: openSettingsDialogAtom,
  closeSettingsDialog: closeSettingsDialogAtom,
  openUserProfileDialog: openUserProfileDialogAtom,
  closeUserProfileDialog: closeUserProfileDialogAtom,
  closeAllDialogs: closeAllDialogsAtom,
  updateQuickAddAutocomplete: updateQuickAddAutocompleteAtom,
  closeQuickAddAutocomplete: closeQuickAddAutocompleteAtom,
  updateQuickAddTask: updateQuickAddTaskAtom,
  resetQuickAddTask: resetQuickAddTaskAtom,
  toggleNlp: toggleNlpAtom,
  openQuickAddWithCopy: openQuickAddWithCopyAtom,
  resetCopyTask: resetCopyTaskAtom,
} as const;

/**
 * All derived/computed dialog atoms
 */
export const derivedDialogAtoms = {
  isAnyDialogOpen: isAnyDialogOpenAtom,
} as const;

/**
 * Complete collection of all dialog atoms
 */
export const dialogAtoms = {
  ...baseDialogAtoms,
  ...dialogActionAtoms,
  ...derivedDialogAtoms,
} as const;
