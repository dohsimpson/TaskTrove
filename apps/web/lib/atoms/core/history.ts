/**
 * History management atoms for TaskTrove undo/redo functionality
 *
 * This file implements a comprehensive undo/redo system using jotai-history
 * to wrap the core state atoms (tasks, projects, labels) with history tracking.
 *
 * Key features:
 * - Synchronized undo/redo across all core state atoms
 * - Memory-efficient with configurable history limits
 * - Operation descriptions for user feedback
 * - Keyboard shortcuts support (Ctrl+Z, Ctrl+Y)
 * - Type-safe implementation with full TypeScript support
 */

import { atom } from "jotai"
import type { WritableAtom } from "jotai"
import { withHistory, UNDO, REDO, RESET } from "jotai-history"
import { handleAtomError } from "../utils/index"
import { tasksAtom, projectsAtom, labelsAtom } from "./base"
import { log } from "@/lib/utils/logger"

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Configuration for history limits per atom type
 * These limits prevent memory issues while providing reasonable undo depth
 */
const HISTORY_CONFIG = {
  tasks: 50, // Tasks are the most frequently modified
  projects: 30, // Projects change less frequently
  labels: 20, // Labels change rarely
} as const

// =============================================================================
// HISTORY-ENABLED ATOMS
// =============================================================================

/**
 * History-enabled tasks atom
 * Tracks the last 50 task state changes for undo/redo
 */
export const tasksHistoryAtom = withHistory(tasksAtom, HISTORY_CONFIG.tasks)
tasksHistoryAtom.debugLabel = "tasksHistoryAtom"

/**
 * History-enabled projects atom
 * Tracks the last 30 project state changes for undo/redo
 */
export const projectsHistoryAtom = withHistory(projectsAtom, HISTORY_CONFIG.projects)
projectsHistoryAtom.debugLabel = "projectsHistoryAtom"

/**
 * History-enabled labels atom
 * Tracks the last 20 label state changes for undo/redo
 */
export const labelsHistoryAtom = withHistory(labelsAtom, HISTORY_CONFIG.labels)
labelsHistoryAtom.debugLabel = "labelsHistoryAtom"

// =============================================================================
// OPERATION TRACKING
// =============================================================================

/**
 * Tracks the last operation performed for user feedback
 * This helps users understand what action will be undone/redone
 */
export const lastOperationAtom = atom<string | null>(null)
lastOperationAtom.debugLabel = "lastOperationAtom"

/**
 * Helper atom to record operations with descriptions
 * This is used by action atoms to provide meaningful undo/redo feedback
 */
export const recordOperationAtom = atom(null, (get, set, operation: string) => {
  try {
    set(lastOperationAtom, operation)
    log.info({ module: "history", operation }, `Operation recorded: ${operation}`)
  } catch (error) {
    handleAtomError(error, "recordOperationAtom")
  }
})
recordOperationAtom.debugLabel = "recordOperationAtom"

// =============================================================================
// COMBINED HISTORY MANAGEMENT
// =============================================================================

/**
 * Combined history state atom
 * Provides a unified view of all history states for UI components
 */
export const historyStateAtom = atom((get) => {
  try {
    const tasksHistory = get(tasksHistoryAtom)
    const projectsHistory = get(projectsHistoryAtom)
    const labelsHistory = get(labelsHistoryAtom)
    const lastOperation = get(lastOperationAtom)

    return {
      canUndo: tasksHistory.canUndo || projectsHistory.canUndo || labelsHistory.canUndo,
      canRedo: tasksHistory.canRedo || projectsHistory.canRedo || labelsHistory.canRedo,
      lastOperation,
      historyInfo: {
        tasks: {
          canUndo: tasksHistory.canUndo,
          canRedo: tasksHistory.canRedo,
          currentIndex: 0, // withHistory doesn't expose index
          historyLength: 0, // withHistory doesn't expose history length
        },
        projects: {
          canUndo: projectsHistory.canUndo,
          canRedo: projectsHistory.canRedo,
          currentIndex: 0, // withHistory doesn't expose index
          historyLength: 0, // withHistory doesn't expose history length
        },
        labels: {
          canUndo: labelsHistory.canUndo,
          canRedo: labelsHistory.canRedo,
          currentIndex: 0, // withHistory doesn't expose index
          historyLength: 0, // withHistory doesn't expose history length
        },
      },
    }
  } catch (error) {
    handleAtomError(error, "historyStateAtom")
    return {
      canUndo: false,
      canRedo: false,
      lastOperation: null,
      historyInfo: {
        tasks: { canUndo: false, canRedo: false, currentIndex: 0, historyLength: 0 },
        projects: { canUndo: false, canRedo: false, currentIndex: 0, historyLength: 0 },
        labels: { canUndo: false, canRedo: false, currentIndex: 0, historyLength: 0 },
      },
    }
  }
})
historyStateAtom.debugLabel = "historyStateAtom"

// =============================================================================
// UNDO/REDO ACTIONS
// =============================================================================

/**
 * Unified undo action atom
 * Performs undo operation only on atoms that have history to undo
 */
export const undoAtom = atom(null, (get, set) => {
  try {
    const historyState = get(historyStateAtom)

    if (!historyState.canUndo) {
      log.warn({ module: "history" }, "No actions to undo")
      return
    }

    // Only perform undo on atoms that have history to undo
    const tasksHistory = get(tasksHistoryAtom)
    const projectsHistory = get(projectsHistoryAtom)
    const labelsHistory = get(labelsHistoryAtom)

    if (tasksHistory.canUndo) {
      set(tasksHistoryAtom, UNDO)
    }
    if (projectsHistory.canUndo) {
      set(projectsHistoryAtom, UNDO)
    }
    if (labelsHistory.canUndo) {
      set(labelsHistoryAtom, UNDO)
    }

    // Clear the last operation since we've undone it
    set(lastOperationAtom, null)

    log.info({ module: "history" }, "Undo performed successfully")
  } catch (error) {
    handleAtomError(error, "undoAtom")
  }
})
undoAtom.debugLabel = "undoAtom"

/**
 * Unified redo action atom
 * Performs redo operation only on atoms that have history to redo
 */
export const redoAtom = atom(null, (get, set) => {
  try {
    const historyState = get(historyStateAtom)

    if (!historyState.canRedo) {
      log.warn({ module: "history" }, "No actions to redo")
      return
    }

    // Only perform redo on atoms that have history to redo
    const tasksHistory = get(tasksHistoryAtom)
    const projectsHistory = get(projectsHistoryAtom)
    const labelsHistory = get(labelsHistoryAtom)

    if (tasksHistory.canRedo) {
      set(tasksHistoryAtom, REDO)
    }
    if (projectsHistory.canRedo) {
      set(projectsHistoryAtom, REDO)
    }
    if (labelsHistory.canRedo) {
      set(labelsHistoryAtom, REDO)
    }

    log.info({ module: "history" }, "Redo performed successfully")
  } catch (error) {
    handleAtomError(error, "redoAtom")
  }
})
redoAtom.debugLabel = "redoAtom"

/**
 * Clear all history action atom
 * Resets all history for all atoms - use with caution
 */
export const clearHistoryAtom = atom(null, (get, set) => {
  try {
    // Reset all atoms regardless of their current state
    // This is intentionally different from undo/redo which only operates on atoms with history
    set(tasksHistoryAtom, RESET)
    set(projectsHistoryAtom, RESET)
    set(labelsHistoryAtom, RESET)
    set(lastOperationAtom, null)

    log.info({ module: "history" }, "All history cleared")
  } catch (error) {
    handleAtomError(error, "clearHistoryAtom")
  }
})
clearHistoryAtom.debugLabel = "clearHistoryAtom"

// =============================================================================
// KEYBOARD SHORTCUTS
// =============================================================================

/**
 * Keyboard shortcut handler atom
 * Handles Ctrl+Z (undo) and Ctrl+Y (redo) keyboard shortcuts
 */
export const keyboardShortcutAtom = atom(null, (get, set, event: KeyboardEvent) => {
  try {
    // Check for Ctrl+Z (undo) or Cmd+Z on Mac
    if ((event.ctrlKey || event.metaKey) && event.key === "z" && !event.shiftKey) {
      event.preventDefault()
      set(undoAtom)
      return
    }

    // Check for Ctrl+Y (redo) or Ctrl+Shift+Z or Cmd+Shift+Z on Mac
    if (
      ((event.ctrlKey || event.metaKey) && event.key === "y") ||
      ((event.ctrlKey || event.metaKey) && event.key === "z" && event.shiftKey)
    ) {
      event.preventDefault()
      set(redoAtom)
      return
    }
  } catch (error) {
    handleAtomError(error, "keyboardShortcutAtom")
  }
})
keyboardShortcutAtom.debugLabel = "keyboardShortcutAtom"

// =============================================================================
// ENHANCED ACTION ATOMS WITH HISTORY TRACKING
// =============================================================================

/**
 * Enhanced action atom wrapper that records operations for history tracking
 * This can be used to wrap existing action atoms to provide operation descriptions
 */
export const withOperationTracking = <T extends readonly unknown[]>(
  actionAtom: WritableAtom<null, [...T], void>,
  getOperationDescription: (...args: T) => string,
) => {
  return atom(null, (get, set, ...args: [...T]) => {
    try {
      // Record the operation first
      const description = getOperationDescription(...args)
      set(recordOperationAtom, description)

      // Then perform the actual action
      set(actionAtom, ...args)
    } catch (error) {
      handleAtomError(error, "withOperationTracking")
    }
  })
}

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Main export object containing all history-related atoms
 * Organized by category for easy imports and better developer experience
 */
export const historyAtoms = {
  // History-enabled state atoms
  tasksHistory: tasksHistoryAtom,
  projectsHistory: projectsHistoryAtom,
  labelsHistory: labelsHistoryAtom,

  // History management atoms
  historyState: historyStateAtom,
  lastOperation: lastOperationAtom,

  // Action atoms
  actions: {
    undo: undoAtom,
    redo: redoAtom,
    clearHistory: clearHistoryAtom,
    recordOperation: recordOperationAtom,
    handleKeyboardShortcut: keyboardShortcutAtom,
  },

  // Utility functions
  utils: {
    withOperationTracking,
  },

  // Configuration
  config: HISTORY_CONFIG,
} as const
