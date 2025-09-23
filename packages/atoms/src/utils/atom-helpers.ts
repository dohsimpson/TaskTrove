/**
 * Utility functions for atoms package
 */

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// Storage key prefix for the app
export const STORAGE_PREFIX = "tasktrove-";

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
  info: (...args: any[]) => console.log(...args),
  warn: (...args: any[]) => console.warn(...args),
  error: (...args: any[]) => console.error(...args),
};

// Simple date filter function - this should be moved to @tasktrove/utils
export function matchesDueDateFilter(
  dueDate: Date | null,
  completed: boolean,
  preset: string,
  customRange: any,
): boolean {
  // For now, return true to not break functionality
  // TODO: Move proper implementation from web app to @tasktrove/utils
  return true;
}

// Simple error handler
export function handleAtomError(error: any, context?: string) {
  console.error(`Atom error${context ? ` in ${context}` : ""}:`, error);
}

// Simple sound atom placeholder
export const playSoundAtom = atom(null, async (get, _set, params: any) => {
  // This should be implemented properly based on platform
  console.log("Sound requested:", params);
});

// Simple toast placeholder - should be implemented based on platform
export const toast = {
  success: (message: string) => console.log("Toast success:", message),
  error: (message: string) => console.error("Toast error:", message),
  info: (message: string) => console.log("Toast info:", message),
  warning: (message: string) => console.warn("Toast warning:", message),
};

// Service worker notification placeholder - DOM API dependent
export async function showServiceWorkerNotification(
  title: string,
  options: any,
  context?: string,
): Promise<{ success: boolean; error?: string }> {
  // Platform-dependent implementation placeholder
  console.log("Service worker notification requested:", {
    title,
    options,
    context,
  });

  // Return expected result structure
  return { success: true };
}

// Routing utility placeholders - NEXTJS DEPENDENT
export function resolveProject(projectId: string, projects: any[]): any | null {
  // Platform-dependent implementation placeholder
  return projects.find((p) => p.id === projectId) || null;
}

export function resolveLabel(labelId: string, labels: any[]): any | null {
  // Platform-dependent implementation placeholder
  return labels.find((l) => l.id === labelId) || null;
}

export function resolveProjectGroup(groupId: string, groups: any): any | null {
  // Platform-dependent implementation placeholder - groups could be object or array
  if (Array.isArray(groups)) {
    return groups.find((g: any) => g.id === groupId) || null;
  }
  // Handle groups as object structure
  return groups.find?.((g: any) => g.id === groupId) || null;
}

export function findGroupById(groups: any, groupId: string): any | null {
  // Platform-dependent implementation placeholder - groups could be object or array
  if (Array.isArray(groups)) {
    return groups.find((g: any) => g.id === groupId) || null;
  }
  // Handle groups as object structure with items
  return groups?.items?.find?.((g: any) => g.id === groupId) || null;
}
