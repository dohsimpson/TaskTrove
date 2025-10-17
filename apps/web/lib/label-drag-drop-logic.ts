/**
 * Pure functions for sidebar label drag-and-drop logic.
 * These functions are side-effect-free and easy to unit test.
 *
 * Architecture principles:
 * - Pure functions with no side effects
 * - Simple input → output transformations
 * - No external dependencies or state mutations
 * - Easy to test with minimal data
 *
 * Uses tree-item mode (same as projects - golden path pattern).
 */

import type { Instruction as TreeInstruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item"
import type { Instruction as UnionInstruction } from "@/components/ui/drag-drop"
import type { LabelId, Label } from "@/lib/types"
import { reorderInArray } from "@tasktrove/utils"

// =============================================================================
// TYPES
// =============================================================================

/**
 * Represents a location in the labels array
 */
export interface LabelLocation {
  /** Index of the label within the array */
  index: number
}

/**
 * Result of calculating a label move operation
 */
export interface LabelMoveResult {
  /** Updated labels array */
  newLabels: Label[]
}

// =============================================================================
// PURE FUNCTIONS - FINDING LOCATIONS
// =============================================================================

/**
 * Finds the index of a label in the labels array.
 *
 * @param labelId - ID of the label to find
 * @param labels - Array of labels to search in
 * @returns Index of the label, or null if not found
 *
 * @example
 * ```ts
 * const index = findContainingLabel(labelId, labels)
 * if (index !== null) {
 *   console.log(`Found label at index ${index}`)
 * }
 * ```
 */
export function findContainingLabel(labelId: LabelId, labels: Label[]): number | null {
  const index = labels.findIndex((label) => label.id === labelId)
  return index === -1 ? null : index
}

// =============================================================================
// PURE FUNCTIONS - RESOLVING TARGET LOCATIONS
// =============================================================================

/**
 * Resolves where a label should be dropped based on drop target data and instruction.
 * This normalizes drop scenarios into a single target index.
 *
 * @param targetData - Data from the drop target
 * @param instruction - Tree-item instruction (reorder-above, reorder-below) - golden path pattern
 * @param labels - Current labels array
 * @returns Target index, or null if invalid
 *
 * @example
 * ```ts
 * const targetIndex = resolveLabelTargetLocation(
 *   { type: "sidebar-label-drop-target", index: 2 },
 *   { type: "reorder-above" },
 *   labels
 * )
 * // Returns: 2
 * ```
 */
export function resolveLabelTargetLocation(
  targetData: Record<string, unknown>,
  instruction: TreeInstruction,
  labels: Label[],
): number | null {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Data from drag-and-drop event
  const targetType = targetData.type as string

  switch (targetType) {
    case "sidebar-label-drop-target": {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Data from drag-and-drop event
      const targetIndex = targetData.index as number
      // Tree instructions use "type" property: reorder-above, reorder-below, make-child
      const insertIndex = instruction.type === "reorder-above" ? targetIndex : targetIndex + 1

      // Ensure index is within bounds
      if (insertIndex < 0 || insertIndex > labels.length) {
        return null
      }

      return insertIndex
    }

    case "sidebar-labels-root-drop-target": {
      // Dropping on empty area - append to end
      return labels.length
    }

    default:
      return null
  }
}

// =============================================================================
// PURE FUNCTIONS - CALCULATING MOVES
// =============================================================================

/**
 * Calculates the array updates needed to move a label from source to target.
 * This is a pure function - it doesn't mutate anything or have side effects.
 *
 * @param labelId - ID of the label being moved
 * @param sourceIndex - Current index of the label
 * @param targetIndex - Desired target index (adjusted by resolveLabelTargetLocation)
 * @param labels - Current labels array
 * @returns Updated labels array
 *
 * @example
 * ```ts
 * const result = calculateLabelMove(labelId, 0, 2, labels)
 * set(labelsAtom, result.newLabels)
 * ```
 */
export function calculateLabelMove(
  labelId: LabelId,
  sourceIndex: number,
  targetIndex: number,
  labels: Label[],
): LabelMoveResult {
  // Validate inputs
  if (sourceIndex < 0 || sourceIndex >= labels.length) {
    throw new Error(`Invalid source index: ${sourceIndex}`)
  }

  if (targetIndex < 0 || targetIndex > labels.length) {
    throw new Error(`Invalid target index: ${targetIndex}`)
  }

  // Find the actual label to move
  const label = labels[sourceIndex]
  if (!label || label.id !== labelId) {
    throw new Error(`Label ${labelId} not found at source index ${sourceIndex}`)
  }

  // Use reorderInArray utility - handles index adjustment automatically
  const newLabels = reorderInArray(labels, sourceIndex, targetIndex)

  return {
    newLabels,
  }
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Pure validation logic for label drag-and-drop operations.
 * Returns true if the operation is valid, false otherwise.
 *
 * This is the single source of truth for validation - used by both:
 * - Components (to hide invalid indicators via validateInstruction prop)
 * - Drop handler (via validateLabelDrop to show error messages)
 *
 * Follows golden path pattern (permissive by default):
 * - Allows label-to-label drops (for reordering)
 * - Allows task-to-label drops (for adding label to task)
 * - Blocks label onto itself
 *
 * @param sourceData - Data from the dragged item
 * @param targetData - Data from the drop target
 * @param _instruction - Instruction parameter (unused, required by interface)
 * @returns true if valid, false if invalid
 */
export function isValidLabelOperation(
  sourceData: Record<string, unknown>,
  targetData: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Required by validateInstruction interface
  _instruction: UnionInstruction | null,
): boolean {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Data from drag-and-drop event
  const sourceType = sourceData.type as string

  // Block dropping a label on itself (label reordering validation)
  if (sourceType === "sidebar-label") {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Data from drag-and-drop event
    const targetType = targetData.type as string
    if (targetType === "sidebar-label-drop-target") {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Data from drag-and-drop event
      const sourceLabelId = sourceData.labelId as LabelId
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Data from drag-and-drop event
      const targetLabelId = targetData.labelId as LabelId
      if (sourceLabelId === targetLabelId) {
        return false
      }
    }
  }

  // Allow all other operations (golden path - permissive by default)
  // - Label-to-label drops (for reordering) ✅
  // - Task-to-label drops (for adding label to task) ✅
  return true
}

/**
 * Validates that a label drop operation is allowed.
 * Returns an error message if invalid, or null if valid.
 *
 * This function is stricter than isValidLabelOperation - it only allows:
 * - Label-to-label drops (for reordering)
 * - Label-to-root drops (for moving to end)
 *
 * Note: Task-to-label drops are handled separately in use-label-drag-drop.
 *
 * @param sourceData - Data from the dragged item
 * @param targetData - Data from the drop target
 * @returns Error message or null
 */
export function validateLabelDrop(
  sourceData: Record<string, unknown>,
  targetData: Record<string, unknown>,
): string | null {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Data from drag-and-drop event
  const sourceType = sourceData.type as string
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Data from drag-and-drop event
  const targetType = targetData.type as string

  // Only allow label sources for label reordering
  if (sourceType !== "sidebar-label" && sourceType !== "list-item") {
    return "Only labels can be dragged here"
  }

  // Only allow valid label drop targets
  if (
    targetType !== "sidebar-label-drop-target" &&
    targetType !== "sidebar-labels-root-drop-target"
  ) {
    return "Labels can only be dropped onto other labels or the labels area"
  }

  // Use shared validation logic for additional checks
  if (!isValidLabelOperation(sourceData, targetData, null)) {
    // Check if dropping label on itself
    if (sourceType === "sidebar-label" && targetType === "sidebar-label-drop-target") {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Data from drag-and-drop event
      const sourceLabelId = sourceData.labelId as LabelId
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Data from drag-and-drop event
      const targetLabelId = targetData.labelId as LabelId
      if (sourceLabelId === targetLabelId) {
        return "Cannot drop a label on itself"
      }
    }
  }

  return null
}
