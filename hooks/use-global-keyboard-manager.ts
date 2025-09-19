/**
 * Global Keyboard Manager Hook
 *
 * This hook implements the unified keyboard shortcut system for TaskTrove.
 * It provides:
 * - Single global event listener for all keyboard shortcuts
 * - Context-aware handler filtering based on UI state
 * - Priority-based handler execution
 * - Universal input protection
 * - Smart shortcut matching with cross-platform support
 *
 * Usage: Call this hook once at the app root level (MainLayoutWrapper)
 */

import { useEffect, useMemo } from "react"
import { useAtomValue } from "jotai"
import {
  keyboardContextAtom,
  keyboardHandlersAtom,
  type KeyboardContext,
  type KeyboardHandler,
} from "@/lib/atoms/ui/keyboard-context"
import { shouldIgnoreNativeKeyboardEvent } from "@/lib/utils/keyboard"
import { log } from "@/lib/utils/logger"

/**
 * Main hook that sets up the global keyboard management system
 * Should be called once at the root level of the application
 */
export function useGlobalKeyboardManager() {
  const context = useAtomValue(keyboardContextAtom)
  const handlers = useAtomValue(keyboardHandlersAtom)

  // Pre-sort handlers by priority for better performance
  const sortedHandlers = useMemo(() => {
    return Array.from(handlers.values()).sort(
      (a, b) => (b.context.priority || 0) - (a.context.priority || 0),
    )
  }, [handlers])

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      try {
        // Universal input protection - skip all handlers if user is typing
        if (shouldIgnoreNativeKeyboardEvent(event)) {
          return
        }

        // Create event key signature once for performance
        const eventSignature = createEventSignature(event)

        // Filter and execute handlers in priority order (already sorted)
        for (const handler of sortedHandlers) {
          try {
            // Quick shortcut match check first (most efficient filter)
            if (
              !handler.shortcuts.some((shortcut) =>
                matchesShortcutOptimized(shortcut, event, eventSignature),
              )
            ) {
              continue
            }

            // Check if handler applies to current context
            if (!handlerApplies(handler, context)) {
              continue
            }

            // Try to execute the handler
            if (handler.handler(event, context)) {
              // Handler successfully processed the event
              event.preventDefault()
              log.debug(
                {
                  module: "keyboard",
                  handlerId: handler.id,
                  shortcut: eventSignature,
                  context: context.currentView,
                },
                `Keyboard shortcut handled by ${handler.id}`,
              )
              break // Stop processing once handled
            }
          } catch (error) {
            log.error(
              {
                module: "keyboard",
                handlerId: handler.id,
                error,
              },
              `Error in keyboard handler ${handler.id}`,
            )
            // Continue to next handler even if one fails
          }
        }
      } catch (error) {
        log.error(
          {
            module: "keyboard",
            error,
          },
          "Error in global keyboard manager",
        )
      }
    }

    // Use capture phase to ensure we get events before other handlers
    document.addEventListener("keydown", handleKeyDown, { capture: true })

    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true })
    }
  }, [context, sortedHandlers])
}

/**
 * Determines if a keyboard handler applies to the current context
 */
function handlerApplies(handler: KeyboardHandler, context: KeyboardContext): boolean {
  const { context: handlerContext } = handler

  // Check typing requirements
  if (handlerContext.requiresNoTyping !== false && context.isTyping) {
    return false
  }

  // Check view requirements
  if (handlerContext.requiresView && context.currentView !== handlerContext.requiresView) {
    return false
  }

  // Check component requirements
  if (
    handlerContext.requiresComponent &&
    context.activeComponent !== handlerContext.requiresComponent
  ) {
    return false
  }

  // Check dialog exclusions
  if (handlerContext.excludeDialogs && context.isAnyDialogOpen) {
    return false
  }

  // Check specific dialog requirements
  if (handlerContext.requiresDialog && !isDialogOpen(handlerContext.requiresDialog, context)) {
    return false
  }

  // Check task requirements
  if (handlerContext.requiresTask && !context.selectedTask) {
    return false
  }

  // Check element focus requirements
  if (handlerContext.requiresElement) {
    const focusedEl = document.activeElement
    if (!focusedEl?.matches(handlerContext.requiresElement)) {
      return false
    }
  }

  // Check general focus requirements
  if (handlerContext.requiresFocus && !document.activeElement) {
    return false
  }

  return true
}

/**
 * Checks if a specific dialog is open based on context
 */
function isDialogOpen(dialogName: string, context: KeyboardContext): boolean {
  switch (dialogName) {
    case "task-panel":
      return context.showTaskPanel
    case "search":
      return context.showSearchDialog
    case "quick-add":
      return context.showQuickAdd
    case "project":
      return context.showProjectDialog
    case "pomodoro":
      return context.showPomodoro
    default:
      return false
  }
}

/**
 * Creates an optimized event signature for faster matching
 */
function createEventSignature(event: globalThis.KeyboardEvent): string {
  const modifiers = []
  if (event.ctrlKey) modifiers.push("Ctrl")
  if (event.metaKey) modifiers.push("Cmd")
  if (event.shiftKey) modifiers.push("Shift")
  if (event.altKey) modifiers.push("Alt")

  return modifiers.length > 0 ? `${modifiers.join("+")}+${event.key}` : event.key
}

/**
 * Optimized shortcut matching using pre-computed event signature
 */
function matchesShortcutOptimized(
  shortcut: string,
  event: globalThis.KeyboardEvent,
  eventSignature: string,
): boolean {
  // Direct signature match for exact shortcuts
  if (shortcut === eventSignature) return true

  // Handle simple single-key shortcuts
  if (!shortcut.includes("+")) {
    return event.key === shortcut || event.code === shortcut
  }

  // Handle case-insensitive matching for common shortcuts
  if (shortcut.toLowerCase() === eventSignature.toLowerCase()) return true

  // Fallback to detailed matching for complex cases
  return matchesShortcut(shortcut, event)
}

/**
 * Matches a shortcut string against a keyboard event
 * Supports cross-platform modifiers and various shortcut formats
 *
 * @param shortcut - Shortcut string like "Cmd+N", "Escape", "G+T", "/"
 * @param event - KeyboardEvent to match against
 * @returns true if the event matches the shortcut
 */
export function matchesShortcut(shortcut: string, event: globalThis.KeyboardEvent): boolean {
  // Handle simple single-key shortcuts
  if (!shortcut.includes("+")) {
    return event.key === shortcut || event.code === shortcut
  }

  // Parse compound shortcuts like "Cmd+N", "Ctrl+Shift+T"
  const parts = shortcut.split("+")
  const key = parts[parts.length - 1] // Last part is always the key
  const modifiers = parts.slice(0, -1) // Everything before the key

  if (!key) {
    return false // Invalid shortcut format
  }

  // Check key match first (most specific)
  // Handle case insensitive matching for letters
  const eventKey = event.key.toLowerCase()
  const shortcutKey = key.toLowerCase()
  if (eventKey !== shortcutKey && event.code !== key) {
    return false
  }

  // Check modifier requirements
  const requiredCtrl = modifiers.includes("Ctrl")
  const requiredCmd = modifiers.includes("Cmd")
  const requiredShift = modifiers.includes("Shift")
  const requiredAlt = modifiers.includes("Alt")

  // Check exact modifier matches (no cross-platform compatibility in matching)
  if (requiredCtrl !== event.ctrlKey) return false
  if (requiredCmd !== event.metaKey) return false
  if (requiredShift !== event.shiftKey) return false
  if (requiredAlt !== event.altKey) return false

  return true
}

/**
 * Utility function to create shortcut descriptors for debugging/help
 */
export function getShortcutDescription(shortcut: string): string {
  // Format shortcuts for display with platform-appropriate symbols
  const isMac =
    typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0

  if (isMac) {
    return shortcut
      .replace("Ctrl+", "⌘")
      .replace("Cmd+", "⌘")
      .replace("Alt+", "⌥")
      .replace("Shift+", "⇧")
  } else {
    return shortcut.replace("Cmd+", "Ctrl+")
  }
}
