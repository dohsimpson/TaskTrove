/**
 * Keyboard context atoms for TaskTrove's unified keyboard management
 *
 * This file provides atoms to track keyboard context including:
 * - Active component focus
 * - Focused element state
 * - Typing state
 * - Combined keyboard context for shortcut routing
 *
 * Leverages existing dialog and view atoms for comprehensive UI context.
 */

import { atom } from "jotai";
import type { Task } from "@tasktrove/types/core";
import {
  isAnyDialogOpenAtom,
  showTaskPanelAtom,
  showSearchDialogAtom,
  showQuickAddAtom,
  showProjectDialogAtom,
  showPomodoroAtom,
} from "./dialogs";
import { selectedTaskAtom, selectedTasksAtom } from "./selection";
import { currentViewAtom, searchQueryAtom } from "./views";

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

/**
 * Keyboard context interface providing complete UI state for shortcut routing
 */
export interface KeyboardContext {
  // Focus context
  activeComponent: string | null;
  focusedElement: string | null;
  isTyping: boolean;

  // Route context
  currentView: string; // 'today', 'inbox', 'project-123', etc.

  // Dialog context
  isAnyDialogOpen: boolean;
  showTaskPanel: boolean;
  showSearchDialog: boolean;
  showQuickAdd: boolean;
  showProjectDialog: boolean;
  showPomodoro: boolean;

  // Task context
  selectedTask: Task | null;
  selectedTasks: string[];

  // Search context
  hasSearchQuery: boolean;

  // Computed contexts for easy filtering
  isInTaskPanel: boolean;
  isInGlobalView: boolean;
  canUseGlobalShortcuts: boolean;
  canUseTaskShortcuts: boolean;
}

/**
 * Keyboard handler context requirements
 */
export interface KeyboardHandlerContext {
  // Context requirements
  requiresView?: string; // 'today', 'project-123', etc.
  requiresComponent?: string; // 'task-side-panel', 'quick-add', etc.
  requiresElement?: string; // CSS selector for focused element
  requiresDialog?: string; // Specific dialog must be open
  excludeDialogs?: boolean; // Cannot work when any dialog is open
  requiresTask?: boolean; // Must have selectedTask

  // State requirements
  requiresNoTyping?: boolean; // Cannot trigger while typing (default: true)
  requiresFocus?: boolean; // Element must be focused

  // Priority and grouping
  priority?: number; // Higher = processed first (default: 0)
  group?: string; // Handler group for bulk operations
}

/**
 * Keyboard handler definition
 */
export interface KeyboardHandler {
  id: string;
  shortcuts: string[]; // ['Cmd+N', 'Escape', '/', etc.]
  context: KeyboardHandlerContext;
  handler: (event: KeyboardEvent, context: KeyboardContext) => boolean; // Return true if handled
}

// =============================================================================
// FOCUS CONTEXT ATOMS
// =============================================================================

/**
 * Currently focused component ID (set by components on mount/focus)
 */
export const activeComponentAtom = atom<string | null>(null);
activeComponentAtom.debugLabel = "activeComponentAtom";

/**
 * Currently focused element selector (set by focus events)
 */
export const focusedElementAtom = atom<string | null>(null);
focusedElementAtom.debugLabel = "focusedElementAtom";

/**
 * Whether user is currently typing in an editable element
 */
export const isTypingAtom = atom<boolean>(false);
isTypingAtom.debugLabel = "isTypingAtom";

// =============================================================================
// KEYBOARD CONTEXT DERIVED ATOMS
// =============================================================================

/**
 * Complete keyboard context for shortcut routing
 * Combines all UI state into actionable context
 */
export const keyboardContextAtom = atom<KeyboardContext>((get) => {
  const activeComponent = get(activeComponentAtom);
  const focusedElement = get(focusedElementAtom);
  const isTyping = get(isTypingAtom);
  const currentView = get(currentViewAtom);
  const isAnyDialogOpen = get(isAnyDialogOpenAtom);
  const showTaskPanel = get(showTaskPanelAtom);
  const showSearchDialog = get(showSearchDialogAtom);
  const showQuickAdd = get(showQuickAddAtom);
  const showProjectDialog = get(showProjectDialogAtom);
  const showPomodoro = get(showPomodoroAtom);
  const selectedTask = get(selectedTaskAtom);
  const selectedTasks = get(selectedTasksAtom);
  const hasSearchQuery = Boolean(get(searchQueryAtom));

  return {
    // Focus context
    activeComponent,
    focusedElement,
    isTyping,

    // Route context
    currentView,

    // Dialog context
    isAnyDialogOpen,
    showTaskPanel,
    showSearchDialog,
    showQuickAdd,
    showProjectDialog,
    showPomodoro,

    // Task context
    selectedTask,
    selectedTasks,

    // Search context
    hasSearchQuery,

    // Computed contexts
    isInTaskPanel: showTaskPanel && Boolean(selectedTask),
    isInGlobalView: !isAnyDialogOpen,
    canUseGlobalShortcuts: !isTyping && !isAnyDialogOpen,
    canUseTaskShortcuts: showTaskPanel && Boolean(selectedTask) && !isTyping,
  };
});
keyboardContextAtom.debugLabel = "keyboardContextAtom";

// =============================================================================
// CONTEXT ACTIONS
// =============================================================================

/**
 * Update active component (called by components on mount/unmount)
 */
export const setActiveComponentAtom = atom(
  null,
  (get, set, componentId: string | null) => {
    set(activeComponentAtom, componentId);
  },
);
setActiveComponentAtom.debugLabel = "setActiveComponentAtom";

/**
 * Update focused element (called by focus handlers)
 */
export const setFocusedElementAtom = atom(
  null,
  (get, set, selector: string | null) => {
    set(focusedElementAtom, selector);
  },
);
setFocusedElementAtom.debugLabel = "setFocusedElementAtom";

/**
 * Update typing state (called by input handlers)
 */
export const setIsTypingAtom = atom(null, (get, set, typing: boolean) => {
  set(isTypingAtom, typing);
});
setIsTypingAtom.debugLabel = "setIsTypingAtom";

// =============================================================================
// KEYBOARD HANDLER REGISTRY
// =============================================================================

/**
 * Registry of all keyboard handlers
 */
export const keyboardHandlersAtom = atom<Map<string, KeyboardHandler>>(
  new Map(),
);
keyboardHandlersAtom.debugLabel = "keyboardHandlersAtom";

/**
 * Registry of handler groups for bulk operations
 */
export const keyboardGroupsAtom = atom<Map<string, string[]>>(new Map());
keyboardGroupsAtom.debugLabel = "keyboardGroupsAtom";

/**
 * Register a keyboard handler
 */
export const registerKeyboardHandlerAtom = atom(
  null,
  (get, set, handler: KeyboardHandler) => {
    const handlers = new Map(get(keyboardHandlersAtom));
    handlers.set(handler.id, handler);
    set(keyboardHandlersAtom, handlers);

    // Update groups if handler belongs to a group
    if (handler.context.group) {
      const groups = new Map(get(keyboardGroupsAtom));
      const groupHandlers = groups.get(handler.context.group) || [];
      if (!groupHandlers.includes(handler.id)) {
        groups.set(handler.context.group, [...groupHandlers, handler.id]);
        set(keyboardGroupsAtom, groups);
      }
    }
  },
);
registerKeyboardHandlerAtom.debugLabel = "registerKeyboardHandlerAtom";

/**
 * Unregister a keyboard handler
 */
export const unregisterKeyboardHandlerAtom = atom(
  null,
  (get, set, handlerId: string) => {
    const handlers = new Map(get(keyboardHandlersAtom));
    const handler = handlers.get(handlerId);
    handlers.delete(handlerId);
    set(keyboardHandlersAtom, handlers);

    // Update groups if handler belonged to a group
    if (handler?.context.group) {
      const groups = new Map(get(keyboardGroupsAtom));
      const groupHandlers = groups.get(handler.context.group) || [];
      groups.set(
        handler.context.group,
        groupHandlers.filter((id) => id !== handlerId),
      );
      set(keyboardGroupsAtom, groups);
    }
  },
);
unregisterKeyboardHandlerAtom.debugLabel = "unregisterKeyboardHandlerAtom";

/**
 * Register multiple handlers as a group
 */
export const registerHandlerGroupAtom = atom(
  null,
  (get, set, groupId: string, handlers: KeyboardHandler[]) => {
    handlers.forEach((handler) => {
      const handlerWithGroup = {
        ...handler,
        context: { ...handler.context, group: groupId },
      };
      set(registerKeyboardHandlerAtom, handlerWithGroup);
    });
  },
);
registerHandlerGroupAtom.debugLabel = "registerHandlerGroupAtom";

/**
 * Unregister all handlers in a group
 */
export const unregisterHandlerGroupAtom = atom(
  null,
  (get, set, groupId: string) => {
    const groups = get(keyboardGroupsAtom);
    const handlerIds = groups.get(groupId) || [];
    handlerIds.forEach((id) => set(unregisterKeyboardHandlerAtom, id));
  },
);
unregisterHandlerGroupAtom.debugLabel = "unregisterHandlerGroupAtom";

/**
 * Get all handlers applicable to current context (derived atom)
 */
export const applicableHandlersAtom = atom((get) => {
  const handlers = get(keyboardHandlersAtom);
  const context = get(keyboardContextAtom);

  return Array.from(handlers.values())
    .filter((handler) => {
      // Basic filtering - detailed filtering happens in the manager
      if (handler.context.requiresNoTyping !== false && context.isTyping)
        return false;
      if (handler.context.excludeDialogs && context.isAnyDialogOpen)
        return false;
      return true;
    })
    .sort((a, b) => (b.context.priority || 0) - (a.context.priority || 0));
});
applicableHandlersAtom.debugLabel = "applicableHandlersAtom";

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Collection of all keyboard context atoms
 */
export const keyboardContextAtoms = {
  // Base state
  activeComponent: activeComponentAtom,
  focusedElement: focusedElementAtom,
  isTyping: isTypingAtom,
  keyboardContext: keyboardContextAtom,

  // Actions
  setActiveComponent: setActiveComponentAtom,
  setFocusedElement: setFocusedElementAtom,
  setIsTyping: setIsTypingAtom,

  // Handler registry
  keyboardHandlers: keyboardHandlersAtom,
  keyboardGroups: keyboardGroupsAtom,
  applicableHandlers: applicableHandlersAtom,

  // Registry actions
  registerHandler: registerKeyboardHandlerAtom,
  unregisterHandler: unregisterKeyboardHandlerAtom,
  registerHandlerGroup: registerHandlerGroupAtom,
  unregisterHandlerGroup: unregisterHandlerGroupAtom,
} as const;
