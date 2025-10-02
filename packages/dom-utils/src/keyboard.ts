import { KeyboardEvent } from "react";

export interface KeyboardHandlerOptions {
  multiline?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
}

/**
 * Uniform keyboard handler for text input components across all platforms
 *
 * Behavior:
 * - Single-line: Enter saves, Escape cancels
 * - Multi-line:
 *   - Enter: saves (most common UX)
 *   - Shift+Enter: adds newline (universal across all platforms)
 *   - Escape: cancels
 */
export function createKeyboardHandler<T extends HTMLElement>(
  options: KeyboardHandlerOptions,
) {
  const { multiline = false, onSave, onCancel } = options;

  return (event: KeyboardEvent<T>) => {
    if (event.key === "Enter") {
      if (multiline) {
        // Uniform cross-platform behavior
        if (event.shiftKey) {
          // Shift+Enter: allow newline (universal across all platforms)
          // Don't prevent default, let contentEditable handle newline insertion
        } else {
          // Plain Enter: save (most common UX pattern for forms)
          event.preventDefault();
          onSave?.();
        }
      } else {
        // Single-line: Enter always saves
        event.preventDefault();
        onSave?.();
      }
    } else if (event.key === "Escape") {
      // Escape: cancel editing
      event.preventDefault();
      onCancel?.();
    }
  };
}

/**
 * Get user-friendly keyboard shortcut descriptions
 */
export function getKeyboardShortcuts(multiline: boolean = false) {
  if (multiline) {
    return {
      save: ["Enter"],
      newline: ["Shift+Enter"],
      cancel: ["Escape"],
    };
  } else {
    return {
      save: ["Enter"],
      cancel: ["Escape"],
    };
  }
}

/**
 * Format keyboard shortcut for display based on platform
 */
export function formatKeyboardShortcut(shortcut: string): string {
  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  if (isMac) {
    return shortcut
      .replace("Ctrl+", "⌘")
      .replace("Alt+", "⌥")
      .replace("Shift+", "⇧");
  } else {
    return shortcut.replace("Cmd+", "Ctrl+");
  }
}

/**
 * Universal input protection utility for keyboard event handlers
 * Checks if the user is currently typing in any editable element
 *
 * This should be used by ALL global keyboard handlers to prevent
 * shortcuts from triggering while users are typing.
 */
export function shouldIgnoreKeyboardEvent(event: KeyboardEvent): boolean {
  const target = event.target;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

/**
 * Native keyboard event version for use with document.addEventListener
 * Same logic as shouldIgnoreKeyboardEvent but for native events
 */
export function shouldIgnoreNativeKeyboardEvent(
  event: globalThis.KeyboardEvent,
): boolean {
  const target = event.target;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}
