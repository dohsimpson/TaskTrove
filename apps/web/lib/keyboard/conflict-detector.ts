/**
 * Keyboard Shortcut Conflict Detection System
 *
 * Detects and resolves conflicts between keyboard shortcuts.
 * Provides strategies for automatic conflict resolution and prevention.
 *
 * Features:
 * - Real-time conflict detection across all registered handlers
 * - Context-aware conflict severity assessment
 * - Multiple resolution strategies (priority, modify, ignore)
 * - Registration validation with conflict prevention
 * - Alternative shortcut suggestions
 */

import { atom } from "jotai"
import { keyboardHandlersAtom } from "@tasktrove/atoms/ui/keyboard-context"
import type { KeyboardHandler, KeyboardHandlerContext } from "@tasktrove/atoms/ui/keyboard-context"

/**
 * Interface for representing a shortcut conflict
 */
export interface ShortcutConflict {
  shortcut: string
  handlers: string[] // Handler IDs that conflict
  contexts: KeyboardHandlerContext[] // Contexts of conflicting handlers
}

/**
 * Resolution strategies for conflicts
 */
export type ConflictResolutionStrategy = "priority" | "modify" | "ignore"

/**
 * Severity levels for conflicts
 */
export type ConflictSeverity = "low" | "medium" | "high"

/**
 * Interface for conflict resolution actions
 */
export interface ConflictResolution {
  shortcut: string
  type: ConflictResolutionStrategy
  action: "remove_handler" | "modify_shortcut" | "ignore"
  targetHandler?: string
  newShortcut?: string
  reason?: string
}

/**
 * Interface for handler validation results
 */
export interface HandlerValidation {
  isValid: boolean
  conflicts: ShortcutConflict[]
  suggestions?: string[]
}

/**
 * Atom that provides real-time conflict detection
 * Returns conflicts between all registered keyboard handlers
 */
export const shortcutConflictsAtom = atom((get) => {
  const handlers = get(keyboardHandlersAtom)
  return detectConflicts(Array.from(handlers.values()))
})

/**
 * Detect conflicts between keyboard handlers
 */
export function detectConflicts(handlers: KeyboardHandler[]): ShortcutConflict[] {
  if (handlers.length === 0) {
    return []
  }

  const conflicts: ShortcutConflict[] = []
  const shortcutMap = new Map<string, { handlers: string[]; contexts: KeyboardHandlerContext[] }>()

  // Build shortcut map
  for (const handler of handlers) {
    // Process handler shortcuts

    // Track shortcuts to avoid duplicates within the same handler
    const handlerShortcuts = new Set<string>()

    for (const shortcut of handler.shortcuts) {
      if (!shortcut || typeof shortcut !== "string") {
        continue
      }

      // Normalize shortcut for comparison (case insensitive)
      const normalizedShortcut = normalizeShortcut(shortcut)

      // Skip if this handler already has this shortcut (avoid duplicates within same handler)
      if (handlerShortcuts.has(normalizedShortcut)) {
        continue
      }
      handlerShortcuts.add(normalizedShortcut)

      if (!shortcutMap.has(normalizedShortcut)) {
        shortcutMap.set(normalizedShortcut, { handlers: [], contexts: [] })
      }

      const entry = shortcutMap.get(normalizedShortcut)
      if (entry) {
        entry.handlers.push(handler.id)
        entry.contexts.push(handler.context)
      }
    }
  }

  // Find conflicts (shortcuts with multiple handlers)
  for (const [normalizedShortcut, entry] of shortcutMap) {
    if (entry.handlers.length > 1) {
      // Find the original shortcut casing from the first handler
      const originalShortcut = findOriginalShortcut(normalizedShortcut, handlers)
      conflicts.push({
        shortcut: originalShortcut,
        handlers: entry.handlers,
        contexts: entry.contexts,
      })
    }
  }

  return conflicts
}

/**
 * Assess the severity of a conflict based on context overlap
 */
export function getConflictSeverity(conflict: ShortcutConflict): ConflictSeverity {
  const contexts = conflict.contexts

  let hasDirectOverlap = false
  let hasContextualSeparation = false

  for (let i = 0; i < contexts.length; i++) {
    for (let j = i + 1; j < contexts.length; j++) {
      const context1 = contexts[i]
      const context2 = contexts[j]
      if (!context1 || !context2) continue

      // Check for direct overlap (same requirements)
      const sameContext = areContextsSimilar(context1, context2)
      if (sameContext) {
        hasDirectOverlap = true
      }

      // Check for contextual separation
      if (areContextsSeparated(context1, context2)) {
        hasContextualSeparation = true
      }
    }
  }

  // High severity: contexts are very similar and will likely conflict
  if (hasDirectOverlap) {
    return "high"
  }

  // Low severity: contexts are very well separated
  if (hasContextualSeparation) {
    return "low"
  }

  // Medium severity: contexts have some overlap potential but are not identical
  return "medium"
}

/**
 * Check if contexts are similar (likely to overlap)
 */
function areContextsSimilar(
  context1: KeyboardHandlerContext,
  context2: KeyboardHandlerContext,
): boolean {
  return (
    context1.excludeDialogs === context2.excludeDialogs &&
    context1.requiresView === context2.requiresView &&
    context1.requiresComponent === context2.requiresComponent &&
    context1.requiresDialog === context2.requiresDialog &&
    context1.requiresTask === context2.requiresTask
  )
}

/**
 * Check if contexts are clearly separated
 */
function areContextsSeparated(
  context1: KeyboardHandlerContext,
  context2: KeyboardHandlerContext,
): boolean {
  let separationCount = 0

  // If one excludes dialogs and the other requires a specific dialog, they're separated
  if (context1.excludeDialogs && context2.requiresDialog) separationCount++
  if (context2.excludeDialogs && context1.requiresDialog) separationCount++

  // If they require different views, they're separated
  if (
    context1.requiresView &&
    context2.requiresView &&
    context1.requiresView !== context2.requiresView
  ) {
    separationCount++
  }

  // If they require different components, they're separated
  if (
    context1.requiresComponent &&
    context2.requiresComponent &&
    context1.requiresComponent !== context2.requiresComponent
  ) {
    separationCount++
  }

  // If they require different dialogs, they're separated
  if (
    context1.requiresDialog &&
    context2.requiresDialog &&
    context1.requiresDialog !== context2.requiresDialog
  ) {
    separationCount++
  }

  // Additional separation factors
  if (context1.requiresView && !context2.requiresView) separationCount++
  if (context2.requiresView && !context1.requiresView) separationCount++

  // Return true if there are multiple separation factors (well-separated)
  return separationCount >= 2
}

/**
 * Resolve conflicts using different strategies
 */
export function resolveConflicts(
  conflicts: ShortcutConflict[],
  strategy: ConflictResolutionStrategy,
): ConflictResolution[] {
  const resolutions: ConflictResolution[] = []

  for (const conflict of conflicts) {
    switch (strategy) {
      case "priority":
        resolutions.push(resolveBypriority(conflict))
        break
      case "modify":
        resolutions.push(resolveByModification(conflict))
        break
      case "ignore":
        resolutions.push(resolveByIgnoring(conflict))
        break
    }
  }

  return resolutions
}

/**
 * Validate a handler before registration to prevent conflicts
 */
export function validateHandlerRegistration(
  handler: KeyboardHandler,
  existingHandlers: KeyboardHandler[],
): HandlerValidation {
  // Check for conflicts with existing handlers
  const allHandlers = [...existingHandlers, handler]
  const conflicts = detectConflicts(allHandlers)

  // Filter conflicts that involve the new handler
  const relevantConflicts = conflicts.filter((conflict) => conflict.handlers.includes(handler.id))

  const isValid = relevantConflicts.length === 0

  // Generate suggestions for conflicting shortcuts
  let suggestions: string[] | undefined
  if (!isValid) {
    suggestions = generateAlternativeShortcuts(handler.shortcuts, existingHandlers)
  }

  return {
    isValid,
    conflicts: relevantConflicts,
    suggestions,
  }
}

/**
 * Normalize shortcut for comparison
 */
function normalizeShortcut(shortcut: string): string {
  return shortcut.toLowerCase().trim()
}

/**
 * Find the original shortcut casing from handlers
 */
function findOriginalShortcut(normalizedShortcut: string, handlers: KeyboardHandler[]): string {
  for (const handler of handlers) {
    for (const shortcut of handler.shortcuts) {
      if (normalizeShortcut(shortcut) === normalizedShortcut) {
        return shortcut
      }
    }
  }
  return normalizedShortcut
}

/**
 * Resolve conflict by removing lower priority handler
 */
function resolveBypriority(conflict: ShortcutConflict): ConflictResolution {
  // Find handler with lowest priority
  let lowestPriority = Infinity
  let targetHandler = conflict.handlers[0]

  for (let i = 0; i < conflict.handlers.length; i++) {
    const context = conflict.contexts[i]
    if (!context) continue
    const priority = context.priority || 0
    if (priority < lowestPriority) {
      lowestPriority = priority
      targetHandler = conflict.handlers[i]
    }
  }

  return {
    shortcut: conflict.shortcut,
    type: "priority",
    action: "remove_handler",
    targetHandler,
    reason: `Removed lower priority handler (priority: ${lowestPriority})`,
  }
}

/**
 * Resolve conflict by modifying one of the shortcuts
 */
function resolveByModification(conflict: ShortcutConflict): ConflictResolution {
  // Generate alternative shortcut
  const alternatives = [
    "Cmd+Shift+" + conflict.shortcut.split("+").pop(),
    "Alt+" + conflict.shortcut.split("+").pop(),
    "Ctrl+Alt+" + conflict.shortcut.split("+").pop(),
  ]

  return {
    shortcut: conflict.shortcut,
    type: "modify",
    action: "modify_shortcut",
    targetHandler: conflict.handlers[0],
    newShortcut: alternatives[0],
    reason: "Modified shortcut to avoid conflict",
  }
}

/**
 * Resolve conflict by ignoring it (contexts are separate)
 */
function resolveByIgnoring(conflict: ShortcutConflict): ConflictResolution {
  const severity = getConflictSeverity(conflict)

  return {
    shortcut: conflict.shortcut,
    type: "ignore",
    action: "ignore",
    reason: `Different contexts prevent runtime conflict (severity: ${severity})`,
  }
}

/**
 * Generate alternative shortcut suggestions
 */
function generateAlternativeShortcuts(
  conflictingShortcuts: string[],
  existingHandlers: KeyboardHandler[],
): string[] {
  const alternatives: string[] = []
  const usedShortcuts = new Set(
    existingHandlers.flatMap((h) => h.shortcuts).map((s) => normalizeShortcut(s)),
  )

  for (const shortcut of conflictingShortcuts) {
    const baseKey = shortcut.split("+").pop() || shortcut

    const candidates = [
      `Cmd+Shift+${baseKey}`,
      `Alt+${baseKey}`,
      `Ctrl+Alt+${baseKey}`,
      `Cmd+Alt+${baseKey}`,
      `Shift+${baseKey}`,
      `Cmd+${baseKey.toUpperCase()}`,
      `F${Math.floor(Math.random() * 12) + 1}`, // Random function key
    ]

    for (const candidate of candidates) {
      if (!usedShortcuts.has(normalizeShortcut(candidate))) {
        alternatives.push(candidate)
        break
      }
    }
  }

  return alternatives
}
