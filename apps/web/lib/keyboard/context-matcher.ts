/**
 * Keyboard Context Matcher
 *
 * Sophisticated context matching logic for the keyboard shortcut system.
 * Provides granular control over when handlers should be active based on
 * various UI state conditions.
 */

import type { KeyboardHandler, KeyboardContext } from "@tasktrove/atoms/ui/keyboard-context"

/**
 * Determines if a keyboard handler applies to the current context
 *
 * @param handler - The keyboard handler to check
 * @param context - Current keyboard context from atoms
 * @returns true if handler should be active in current context
 */
export function handlerApplies(handler: KeyboardHandler, context: KeyboardContext): boolean {
  return (
    checkTypingContext(handler, context) &&
    checkViewContext(handler, context) &&
    checkComponentContext(handler, context) &&
    checkDialogContext(handler, context) &&
    checkTaskContext(handler, context) &&
    checkFocusContext(handler)
  )
}

/**
 * Check typing state requirements
 * Most handlers should not work while user is typing
 */
export function checkTypingContext(handler: KeyboardHandler, context: KeyboardContext): boolean {
  // Default behavior: don't work while typing (requiresNoTyping defaults to true)
  if (handler.context.requiresNoTyping !== false && context.isTyping) {
    return false
  }
  return true
}

/**
 * Check view/route requirements
 * Handlers can be restricted to specific views like 'today', 'project-123'
 */
export function checkViewContext(handler: KeyboardHandler, context: KeyboardContext): boolean {
  if (!handler.context.requiresView) return true

  // Exact view match
  if (handler.context.requiresView === context.currentView) return true

  // Support for pattern matching
  if (handler.context.requiresView.includes("*")) {
    const pattern = handler.context.requiresView.replace("*", ".*")
    const regex = new RegExp(`^${pattern}$`)
    return regex.test(context.currentView)
  }

  return false
}

/**
 * Check active component requirements
 * Handlers can be restricted to when specific components are active
 */
export function checkComponentContext(handler: KeyboardHandler, context: KeyboardContext): boolean {
  if (!handler.context.requiresComponent) return true
  return context.activeComponent === handler.context.requiresComponent
}

/**
 * Check dialog state requirements and exclusions
 * Handlers can require specific dialogs or exclude all dialogs
 */
export function checkDialogContext(handler: KeyboardHandler, context: KeyboardContext): boolean {
  // Check dialog exclusions first
  if (handler.context.excludeDialogs && context.isAnyDialogOpen) {
    return false
  }

  // Check specific dialog requirements
  if (handler.context.requiresDialog) {
    return isSpecificDialogOpen(handler.context.requiresDialog, context)
  }

  return true
}

/**
 * Check task-related requirements
 * Handlers can require a selected task to be active
 */
export function checkTaskContext(handler: KeyboardHandler, context: KeyboardContext): boolean {
  if (handler.context.requiresTask && !context.selectedTask) {
    return false
  }
  return true
}

/**
 * Check focus and element requirements
 * Handlers can require specific elements to be focused
 */
export function checkFocusContext(handler: KeyboardHandler): boolean {
  // Check general focus requirement
  if (handler.context.requiresFocus && !document.activeElement) {
    return false
  }

  // Check specific element selector requirement
  if (handler.context.requiresElement) {
    const focused = document.activeElement
    if (!focused?.matches(handler.context.requiresElement)) {
      return false
    }
  }

  return true
}

/**
 * Check if a specific dialog is open based on the context
 */
export function isSpecificDialogOpen(dialogName: string, context: KeyboardContext): boolean {
  switch (dialogName) {
    case "task-panel":
    case "taskPanel":
      return context.showTaskPanel
    case "search":
    case "searchDialog":
      return context.showSearchDialog
    case "quick-add":
    case "quickAdd":
      return context.showQuickAdd
    case "project":
    case "projectDialog":
      return context.showProjectDialog
    case "pomodoro":
    case "pomodoroDialog":
      return context.showPomodoro
    default:
      console.warn(`Unknown dialog name: ${dialogName}`)
      return false
  }
}

/**
 * Get human-readable description of why a handler doesn't apply
 * Useful for debugging and development
 */
export function getContextMismatchReason(
  handler: KeyboardHandler,
  context: KeyboardContext,
): string | null {
  if (!checkTypingContext(handler, context)) {
    return "User is currently typing"
  }

  if (!checkViewContext(handler, context)) {
    return `Wrong view: requires ${handler.context.requiresView}, current is ${context.currentView}`
  }

  if (!checkComponentContext(handler, context)) {
    return `Wrong component: requires ${handler.context.requiresComponent}, current is ${context.activeComponent}`
  }

  if (!checkDialogContext(handler, context)) {
    if (handler.context.excludeDialogs && context.isAnyDialogOpen) {
      return "Handler excludes dialogs but dialog is open"
    }
    if (handler.context.requiresDialog) {
      return `Required dialog not open: ${handler.context.requiresDialog}`
    }
  }

  if (!checkTaskContext(handler, context)) {
    return "Handler requires task but no task is selected"
  }

  if (!checkFocusContext(handler)) {
    if (handler.context.requiresFocus) {
      return "Handler requires focus but no element is focused"
    }
    if (handler.context.requiresElement) {
      return `Wrong focused element: requires ${handler.context.requiresElement}`
    }
  }

  return null // Handler applies
}

/**
 * Get all applicable handlers for current context, sorted by priority
 */
export function getApplicableHandlers(
  handlers: Map<string, KeyboardHandler>,
  context: KeyboardContext,
): KeyboardHandler[] {
  return Array.from(handlers.values())
    .filter((handler) => handlerApplies(handler, context))
    .sort((a, b) => (b.context.priority || 0) - (a.context.priority || 0))
}

/**
 * Find conflicts where multiple handlers claim the same shortcut in the same context
 */
export function findShortcutConflicts(
  handlers: Map<string, KeyboardHandler>,
  context: KeyboardContext,
): Array<{ shortcut: string; handlers: KeyboardHandler[] }> {
  const applicableHandlers = getApplicableHandlers(handlers, context)
  const shortcutMap = new Map<string, KeyboardHandler[]>()

  // Group handlers by shortcut
  for (const handler of applicableHandlers) {
    for (const shortcut of handler.shortcuts) {
      const existing = shortcutMap.get(shortcut) || []
      existing.push(handler)
      shortcutMap.set(shortcut, existing)
    }
  }

  // Find conflicts (shortcuts with multiple handlers)
  const conflicts: Array<{ shortcut: string; handlers: KeyboardHandler[] }> = []
  for (const [shortcut, handlerList] of shortcutMap) {
    if (handlerList.length > 1) {
      conflicts.push({ shortcut, handlers: handlerList })
    }
  }

  return conflicts
}
