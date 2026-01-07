/**
 * Custom hook for handling undo/redo keyboard shortcuts
 *
 * This hook sets up global keyboard event listeners for:
 * - Ctrl+Z (Cmd+Z on Mac): Undo
 * - Ctrl+Y (Cmd+Y on Mac): Redo
 * - Ctrl+Shift+Z (Cmd+Shift+Z on Mac): Redo (alternative)
 *
 * The hook automatically handles cross-platform differences and prevents
 * default browser behavior for these shortcuts.
 */

import React, { useEffect } from "react"
import { useSetAtom } from "jotai"
import { keyboardShortcutAtom } from "@tasktrove/atoms/core/history"

/**
 * Hook that enables global keyboard shortcuts for undo/redo functionality
 * Should be used at the root level of the application to ensure global coverage
 */
export const useHistoryShortcuts = () => {
  const handleKeyboardShortcut = useSetAtom(keyboardShortcutAtom)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in any editable element
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable)
      ) {
        return
      }

      // Let the atom handle the keyboard event
      handleKeyboardShortcut(event)
    }

    // Add the event listener to the document
    document.addEventListener("keydown", handleKeyDown)

    // Cleanup function to remove the event listener
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleKeyboardShortcut])

  // This hook doesn't return anything - it just sets up the global listeners
}

/**
 * Component wrapper that sets up history shortcuts
 * Use this at the root of your app to enable global undo/redo shortcuts
 */
export const HistoryShortcutsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useHistoryShortcuts()
  return <>{children}</>
}
