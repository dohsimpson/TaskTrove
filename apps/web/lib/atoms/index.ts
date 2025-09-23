/**
 * Main atoms export file for TaskTrove's Jotai migration
 *
 * Re-exports shared atoms from @tasktrove/atoms package and provides
 * web-specific atoms (DOM/NextJS dependencies).
 *
 * @example
 * // Import atoms (works seamlessly - existing imports don't change)
 * import { tasksAtom, addTaskAtom } from '@/lib/atoms'
 */

// =============================================================================
// SHARED ATOMS RE-EXPORT
// =============================================================================

// Re-export all shared atoms from package
export * from "@tasktrove/atoms"

// =============================================================================
// WEB-SPECIFIC UTILITIES AND ATOMS
// =============================================================================

// Keep web-specific utilities (DOM/Audio APIs)
export * from "./utils"

// Web-specific atoms are now migrated to @tasktrove/atoms with platform dependency comments
// They are automatically re-exported through the shared atoms import above

// =============================================================================
// COMPATIBILITY EXPORTS
// =============================================================================

// Compatibility exports for components expecting old naming conventions
import {
  taskAtoms,
  tasksAtom,
  taskCountsAtom,
  projectAtoms,
  projectsAtom,
  labelsAtom,
  updateLabelAtom,
  deleteLabelAtom,
  toggleTaskSelectionAtom,
} from "@tasktrove/atoms"

// Flatten taskAtoms structure to match expected component imports
export const taskActions = {
  ...taskAtoms.actions, // Flatten actions: updateTask, toggleTask, etc.
  ...taskAtoms.derived, // Include derived atoms too if needed
}
export const tasks = tasksAtom // tasks → tasksAtom
export const taskCounts = taskCountsAtom // taskCounts → taskCountsAtom

// Flatten projectAtoms structure to match expected component imports
export const projectActions = {
  ...projectAtoms.actions, // Flatten actions: updateProject, deleteProject, removeSection, etc.
}
export const projects = projectsAtom // projects → projectsAtom
export const projectDerived = projectAtoms.derived // projectDerived → projectAtoms.derived

// Simple mappings
export const labels = labelsAtom // labels → labelsAtom
export const updateLabel = updateLabelAtom // updateLabel → updateLabelAtom
export const deleteLabel = deleteLabelAtom // deleteLabel → deleteLabelAtom
export const selectionToggleTaskSelectionAtom = toggleTaskSelectionAtom // selectionToggleTaskSelectionAtom → toggleTaskSelectionAtom

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export { INBOX_PROJECT_ID } from "../types"
