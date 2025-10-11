/**
 * Keyboard Shortcuts Hook Family
 *
 * This module provides convenient React hooks for easily integrating keyboard shortcuts
 * into any component. These hooks automatically register and unregister shortcuts
 * with the global keyboard management system.
 *
 * Features:
 * - Easy shortcut registration with automatic cleanup
 * - Context-aware shortcuts (view, dialog, task requirements)
 * - Priority-based execution order
 * - Conditional enablement based on component state
 * - Type-safe shortcut definitions
 */

import { useEffect, useMemo } from "react"
import { useSetAtom } from "jotai"
import { v4 as uuidv4 } from "uuid"
import {
  registerKeyboardHandlerAtom,
  unregisterKeyboardHandlerAtom,
  setActiveComponentAtom,
  type KeyboardHandler,
  type KeyboardHandlerContext,
} from "@tasktrove/atoms"
import { matchesShortcut } from "@/hooks/use-global-keyboard-manager"

interface ShortcutOptions extends Omit<KeyboardHandlerContext, "priority"> {
  /** Unique component identifier for context filtering */
  componentId?: string
  /** Handler priority (higher = executed first) */
  priority?: number
  /** Whether shortcuts are enabled (default: true) */
  enabled?: boolean
}

/**
 * Main hook for registering keyboard shortcuts in any component
 *
 * @param shortcuts - Object mapping shortcut strings to handler functions
 * @param options - Configuration options for context filtering and behavior
 *
 * @example
 * ```typescript
 * function TaskForm() {
 *   useKeyboardShortcuts({
 *     'Cmd+S': () => saveTask(),
 *     'Escape': () => cancelEdit(),
 *     'Cmd+Enter': () => saveAndClose()
 *   }, {
 *     componentId: 'task-form',
 *     priority: 30,
 *     enabled: isEditing
 *   })
 * }
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: Record<string, (event: KeyboardEvent) => void | boolean>,
  options: ShortcutOptions = {},
) {
  const registerHandler = useSetAtom(registerKeyboardHandlerAtom)
  const unregisterHandler = useSetAtom(unregisterKeyboardHandlerAtom)
  const setActiveComponent = useSetAtom(setActiveComponentAtom)

  // Generate stable handler ID
  const handlerId = useMemo(
    () => `component-${options.componentId || "anonymous"}-${uuidv4()}`,
    [options.componentId],
  )

  useEffect(() => {
    // Skip registration if disabled
    if (options.enabled === false) {
      return
    }

    // Set active component for context tracking
    if (options.componentId) {
      setActiveComponent(options.componentId)
    }

    // Create keyboard handler
    const handler: KeyboardHandler = {
      id: handlerId,
      shortcuts: Object.keys(shortcuts),
      context: {
        requiresComponent: options.componentId,
        requiresView: options.requiresView,
        requiresDialog: options.requiresDialog,
        excludeDialogs: options.excludeDialogs,
        requiresTask: options.requiresTask,
        requiresNoTyping: options.requiresNoTyping !== false, // Default to true
        requiresFocus: options.requiresFocus,
        requiresElement: options.requiresElement,
        priority: options.priority || 0,
      },
      handler: (event, context) => {
        // Find matching shortcut
        const matchingShortcut = Object.keys(shortcuts).find((shortcut) =>
          matchesShortcut(shortcut, event),
        )

        if (matchingShortcut && shortcuts[matchingShortcut]) {
          const result = shortcuts[matchingShortcut](event)
          // Return true if handler explicitly returns true, or if it doesn't return false
          return result !== false
        }

        return false
      },
    }

    // Register the handler
    registerHandler(handler)

    // Cleanup function
    return () => {
      unregisterHandler(handlerId)
      if (options.componentId) {
        setActiveComponent(null)
      }
    }
  }, [
    shortcuts,
    options.componentId,
    options.requiresView,
    options.requiresDialog,
    options.excludeDialogs,
    options.requiresTask,
    options.requiresNoTyping,
    options.requiresFocus,
    options.requiresElement,
    options.priority,
    options.enabled,
    handlerId,
    registerHandler,
    unregisterHandler,
    setActiveComponent,
  ])
}

/**
 * Hook for global shortcuts that work across the entire application
 *
 * @param shortcuts - Object mapping shortcut strings to handler functions
 * @param options - Additional options (enabled, priority)
 *
 * @example
 * ```typescript
 * function GlobalShortcuts() {
 *   useGlobalShortcuts({
 *     'Cmd+N': () => openQuickAdd(),
 *     'Cmd+F': () => openSearch(),
 *     '?': () => showHelp()
 *   })
 * }
 * ```
 */
export function useGlobalShortcuts(
  shortcuts: Record<string, () => void | boolean>,
  options: Pick<ShortcutOptions, "enabled" | "priority"> = {},
) {
  // Convert void-returning functions to work with the main hook
  const convertedShortcuts = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(shortcuts).map(([key, handler]) => [
          key,
          (event: KeyboardEvent) => {
            const result = handler()
            return result !== false
          },
        ]),
      ),
    [shortcuts],
  )

  return useKeyboardShortcuts(convertedShortcuts, {
    excludeDialogs: true, // Global shortcuts usually don't work in dialogs
    priority: options.priority || 10,
    enabled: options.enabled,
  })
}

/**
 * Hook for dialog-specific shortcuts that only work when a specific dialog is open
 *
 * @param shortcuts - Object mapping shortcut strings to handler functions
 * @param dialogName - Name of the dialog that must be open
 * @param options - Additional options (enabled, priority)
 *
 * @example
 * ```typescript
 * function QuickAddDialog({ open }) {
 *   useDialogShortcuts({
 *     'Escape': () => closeDialog(),
 *     'Cmd+Enter': () => submitAndClose(),
 *     'Tab': () => focusNextField()
 *   }, 'quick-add', { enabled: open })
 * }
 * ```
 */
export function useDialogShortcuts(
  shortcuts: Record<string, () => void | boolean>,
  dialogName: string,
  options: Pick<ShortcutOptions, "enabled" | "priority"> = {},
) {
  const convertedShortcuts = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(shortcuts).map(([key, handler]) => [
          key,
          (event: KeyboardEvent) => {
            const result = handler()
            return result !== false
          },
        ]),
      ),
    [shortcuts],
  )

  return useKeyboardShortcuts(convertedShortcuts, {
    requiresDialog: dialogName,
    priority: options.priority || 20,
    enabled: options.enabled,
  })
}

/**
 * Hook for task-specific shortcuts that only work when a task is selected
 *
 * @param shortcuts - Object mapping shortcut strings to handler functions
 * @param options - Additional options (enabled, priority)
 *
 * @example
 * ```typescript
 * function TaskContextMenu({ selectedTask }) {
 *   useTaskShortcuts({
 *     'Delete': () => deleteTask(selectedTask.id),
 *     'Enter': () => editTask(selectedTask.id),
 *     'Space': () => toggleTaskCompletion(selectedTask.id)
 *   }, { enabled: !!selectedTask })
 * }
 * ```
 */
export function useTaskShortcuts(
  shortcuts: Record<string, () => void | boolean>,
  options: Pick<ShortcutOptions, "enabled" | "priority"> = {},
) {
  const convertedShortcuts = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(shortcuts).map(([key, handler]) => [
          key,
          (event: KeyboardEvent) => {
            const result = handler()
            return result !== false
          },
        ]),
      ),
    [shortcuts],
  )

  return useKeyboardShortcuts(convertedShortcuts, {
    requiresTask: true,
    priority: options.priority || 25,
    enabled: options.enabled,
  })
}

/**
 * Hook for view-specific shortcuts that only work in a particular view/route
 *
 * @param shortcuts - Object mapping shortcut strings to handler functions
 * @param viewName - Name of the view/route that must be active
 * @param options - Additional options (enabled, priority)
 *
 * @example
 * ```typescript
 * function KanbanView() {
 *   useViewShortcuts({
 *     'J': () => moveToNextColumn(),
 *     'K': () => moveToPrevColumn(),
 *     'N': () => addTaskToColumn()
 *   }, 'kanban')
 * }
 * ```
 */
export function useViewShortcuts(
  shortcuts: Record<string, () => void | boolean>,
  viewName: string,
  options: Pick<ShortcutOptions, "enabled" | "priority"> = {},
) {
  const convertedShortcuts = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(shortcuts).map(([key, handler]) => [
          key,
          (event: KeyboardEvent) => {
            const result = handler()
            return result !== false
          },
        ]),
      ),
    [shortcuts],
  )

  return useKeyboardShortcuts(convertedShortcuts, {
    requiresView: viewName,
    priority: options.priority || 15,
    enabled: options.enabled,
  })
}

/**
 * Hook for element-focused shortcuts that only work when specific elements are focused
 *
 * @param shortcuts - Object mapping shortcut strings to handler functions
 * @param elementSelector - CSS selector for elements that must be focused
 * @param options - Additional options (enabled, priority)
 *
 * @example
 * ```typescript
 * function TaskList() {
 *   useFocusShortcuts({
 *     'ArrowDown': () => focusNextTask(),
 *     'ArrowUp': () => focusPrevTask(),
 *     'Enter': () => editFocusedTask()
 *   }, '[data-task-item]')
 * }
 * ```
 */
export function useFocusShortcuts(
  shortcuts: Record<string, () => void | boolean>,
  elementSelector: string,
  options: Pick<ShortcutOptions, "enabled" | "priority"> = {},
) {
  const convertedShortcuts = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(shortcuts).map(([key, handler]) => [
          key,
          (event: KeyboardEvent) => {
            const result = handler()
            return result !== false
          },
        ]),
      ),
    [shortcuts],
  )

  return useKeyboardShortcuts(convertedShortcuts, {
    requiresElement: elementSelector,
    requiresFocus: true,
    priority: options.priority || 30,
    enabled: options.enabled,
  })
}

/**
 * Helper function to find which shortcut matches the current event
 * Used internally by the hooks but exported for testing/debugging
 */
export function findMatchingShortcut(shortcuts: string[], event: KeyboardEvent): string | null {
  return shortcuts.find((shortcut) => matchesShortcut(shortcut, event)) || null
}
