/**
 * Utility functions for atoms package
 */

import { atom, type Atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { toast } from "@tasktrove/dom-utils/toast";
import { showServiceWorkerNotification } from "@tasktrove/dom-utils/notifications";

// Storage key prefix for the app
export const STORAGE_PREFIX = "tasktrove-";

/**
 * Creates a named atom with automatic debug label assignment
 * Eliminates the need to manually set atom.debugLabel
 *
 * @param name - The debug label for the atom (should match variable name)
 * @param atomValue - The atom to name
 * @returns The atom with debug label assigned
 *
 * @example
 * export const tasksAtom = namedAtom("tasksAtom", atom([]))
 */
export function namedAtom<AtomType extends Atom<unknown>>(
  name: string,
  atomValue: AtomType,
): AtomType {
  atomValue.debugLabel = name;
  return atomValue;
}

/**
 * Prepends "base" to an atom's debug label and capitalizes the first letter
 *
 * @param name - The original atom name (e.g., "tasksAtom")
 * @returns The prefixed name (e.g., "baseTasksAtom")
 *
 * @example
 * import { tasksAtom as baseTasksAtom } from "./atoms";
 * baseTasksAtom.debugLabel = prependBase(baseTasksAtom.debugLabel);
 * // Result: "baseTasksAtom"
 */
export function prependBase(name: string | undefined): string {
  if (!name) return "base";
  return `base${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

/**
 * Wraps atom getter logic with standardized error handling
 * Eliminates repetitive try-catch blocks throughout the codebase
 *
 * @param fn - The atom getter function to wrap
 * @param context - Name of the atom for error logging (should match atom name)
 * @param fallback - Value to return if an error occurs
 * @returns Result of fn() or fallback if error occurs
 *
 * @example
 * export const myAtom = namedAtom("myAtom", atom((get) =>
 *   withErrorHandling(
 *     () => {
 *       const data = get(someOtherAtom);
 *       return data.filter(x => x.active);
 *     },
 *     "myAtom",
 *     []
 *   )
 * ));
 */
export function withErrorHandling<T>(
  fn: () => T,
  context: string,
  fallback: T,
): T {
  try {
    return fn();
  } catch (error) {
    handleAtomError(error, context);
    return fallback;
  }
}

/**
 * Creates an atom with localStorage persistence
 * @param key - Storage key (will be prefixed with STORAGE_PREFIX)
 * @param initialValue - Initial value for the atom
 * @param options - Additional options for storage
 */
export function createAtomWithStorage<T>(
  key: string,
  initialValue: T,
  options?: {
    getOnInit?: boolean;
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  },
) {
  // Use default localStorage for Jotai, but wrap in SSR check
  if (typeof window === "undefined") {
    // Return a simple atom for SSR
    return atom(initialValue);
  }

  return atomWithStorage(
    `${STORAGE_PREFIX}${key}`,
    initialValue,
    undefined, // Use default localStorage
    options,
  );
}

// Simple logging function - could be replaced with proper logging later
export const log = {
  info: (...args: unknown[]) => console.log(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

// Simple date filter function - this should be moved to @tasktrove/utils
export function matchesDueDateFilter(): boolean {
  // For now, return true to not break functionality
  // TODO: Move proper implementation from web app to @tasktrove/utils
  return true;
}

// Simple error handler
export function handleAtomError(error: unknown, context?: string) {
  console.error(`Atom error${context ? ` in ${context}` : ""}:`, error);
}

// Re-export toast from dom-utils with DOM environment support
export { toast };

// Re-export service worker notification from dom-utils with DOM environment support
export { showServiceWorkerNotification };
