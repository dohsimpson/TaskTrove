/**
 * Pure functions for sidebar drag-and-drop logic.
 * These functions are side-effect-free and easy to unit test.
 *
 * Key principle: ROOT is just another ProjectGroup, not special!
 */

import type { Instruction as TreeInstruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item"
import type { Instruction as ListInstruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/list-item"
import type { ProjectId, GroupId, ProjectGroup } from "@/lib/types"
import { ROOT_PROJECT_GROUP_ID, isGroup, createGroupId } from "@/lib/types"
import { reorderInArray, moveItemBetweenArrays } from "@tasktrove/utils"

// =============================================================================
// TYPES
// =============================================================================

/**
 * Unified instruction type that supports both tree-item and list-item instructions.
 * This allows validation logic to work with both drag-and-drop modes.
 */
export type DragInstruction = TreeInstruction | ListInstruction

/**
 * Represents a location in the group hierarchy
 */
export interface GroupLocation {
  /** The group containing the item */
  group: ProjectGroup
  /** Index of the item within the group */
  index: number
}

// =============================================================================
// PURE FUNCTIONS - FINDING LOCATIONS
// =============================================================================

/**
 * Finds which group contains the given item (project or group).
 * Searches recursively through the entire hierarchy.
 *
 * @param itemId - ID of the project or group to find
 * @param searchGroup - Group to search in (typically the root group)
 * @returns Location of the item, or null if not found
 *
 * @example
 * ```ts
 * const location = findContainingGroup(projectId, rootGroup)
 * if (location) {
 *   console.log(`Found in group ${location.group.id} at index ${location.index}`)
 * }
 * ```
 */
export function findContainingGroup(
  itemId: ProjectId | GroupId,
  searchGroup: ProjectGroup,
): GroupLocation | null {
  // Check direct children
  const index = searchGroup.items.findIndex((item) =>
    isGroup<ProjectGroup>(item) ? item.id === itemId : item === itemId,
  )

  if (index !== -1) {
    return { group: searchGroup, index }
  }

  // Search nested groups recursively
  for (const item of searchGroup.items) {
    if (isGroup<ProjectGroup>(item)) {
      const found = findContainingGroup(itemId, item)
      if (found) return found
    }
  }

  return null
}

/**
 * Gets a group by ID, treating ROOT as the top-level group.
 * This normalizes access - ROOT is not special!
 *
 * @param groupId - ID of the group to get
 * @param rootGroup - The root project group
 * @returns The group, or null if not found
 */
export function getGroupById(groupId: GroupId, rootGroup: ProjectGroup): ProjectGroup | null {
  // ROOT is just the top-level group
  if (groupId === ROOT_PROJECT_GROUP_ID) {
    return rootGroup
  }

  // Search for nested groups
  return findGroupByIdRecursive(groupId, rootGroup)
}

/**
 * Recursively searches for a group by ID
 */
function findGroupByIdRecursive(groupId: GroupId, searchGroup: ProjectGroup): ProjectGroup | null {
  if (searchGroup.id === groupId) {
    return searchGroup
  }

  for (const item of searchGroup.items) {
    if (isGroup<ProjectGroup>(item)) {
      const found = findGroupByIdRecursive(groupId, item)
      if (found) return found
    }
  }

  return null
}

// =============================================================================
// PURE FUNCTIONS - RESOLVING TARGET LOCATIONS
// =============================================================================

/**
 * Resolves where an item should be dropped based on drop target data and instruction.
 * This normalizes all different drop scenarios into a single location format.
 *
 * @param targetData - Data from the drop target
 * @param instruction - Tree-item instruction (reorder-above, reorder-below, make-child)
 * @param rootGroup - The root project group
 * @returns Target location, or null if invalid
 *
 * @example
 * ```ts
 * const target = resolveTargetLocation(
 *   { type: "sidebar-project-drop-target", index: 2, groupId: undefined },
 *   { type: "reorder-above" },
 *   rootGroup
 * )
 * // Returns: { group: rootGroup, index: 2 }
 * ```
 */
export function resolveTargetLocation(
  targetData: Record<string, unknown>,
  instruction: TreeInstruction,
  rootGroup: ProjectGroup,
): GroupLocation | null {
  const targetType = targetData.type
  if (typeof targetType !== "string") return null

  switch (targetType) {
    case "sidebar-project-drop-target": {
      // Dropping on/near a project
      const targetGroupId =
        typeof targetData.groupId === "string"
          ? createGroupId(targetData.groupId)
          : ROOT_PROJECT_GROUP_ID
      const targetGroup = getGroupById(targetGroupId, rootGroup)
      if (!targetGroup) return null

      if (typeof targetData.index !== "number") return null
      const targetIndex = targetData.index
      const insertIndex = instruction.type === "reorder-above" ? targetIndex : targetIndex + 1

      return { group: targetGroup, index: insertIndex }
    }

    case "sidebar-group-drop-target": {
      // Dropping on/near a group header
      if (instruction.type === "make-child") {
        // Insert INTO the group (at beginning)
        if (typeof targetData.groupId !== "string") return null
        const targetGroupId = createGroupId(targetData.groupId)
        const targetGroup = getGroupById(targetGroupId, rootGroup)
        if (!targetGroup) return null

        return { group: targetGroup, index: 0 }
      } else {
        // Insert at ROOT level (above/below the group)
        if (typeof targetData.index !== "number") return null
        const targetIndex = targetData.index
        const insertIndex = instruction.type === "reorder-above" ? targetIndex : targetIndex + 1

        return { group: rootGroup, index: insertIndex }
      }
    }

    case "sidebar-root-drop-target": {
      // Dropping on empty ROOT area (append to end)
      return { group: rootGroup, index: -1 }
    }

    default:
      return null
  }
}

// =============================================================================
// PURE FUNCTIONS - CALCULATING MOVES
// =============================================================================

/**
 * Result of calculating a move operation
 */
export interface MoveResult {
  /** Updates to apply to groups */
  updates: Array<{
    groupId: GroupId
    newItems: Array<ProjectId | ProjectGroup>
  }>
}

/**
 * Calculates the array updates needed to move an item from source to target.
 * This is a pure function - it doesn't mutate anything or have side effects.
 *
 * CRITICAL: When moving between a nested group and ROOT, we need to update
 * the nested group reference within ROOT's items array to avoid stale data.
 *
 * @param itemId - ID of the item being moved
 * @param source - Current location of the item
 * @param target - Desired location of the item
 * @param rootGroup - The root group (needed to update nested references)
 * @returns Array of updates to apply
 *
 * @example
 * ```ts
 * const result = calculateMove(projectId, sourceLocation, targetLocation, rootGroup)
 * for (const update of result.updates) {
 *   await updateGroup({ id: update.groupId, items: update.newItems })
 * }
 * ```
 */
export function calculateMove(
  itemId: ProjectId | GroupId,
  source: GroupLocation,
  target: GroupLocation,
  rootGroup: ProjectGroup,
): MoveResult {
  // Same group? Just reorder
  if (source.group.id === target.group.id) {
    // target.index is already the desired insert position (adjusted by resolveTargetLocation)
    // But we need to account for the source removal when moving within the same array
    const adjustedTargetIndex = source.index < target.index ? target.index - 1 : target.index

    const newItems = reorderInArray(source.group.items, source.index, adjustedTargetIndex)

    return {
      updates: [{ groupId: source.group.id, newItems }],
    }
  }

  // Different groups? Move between them
  // Find the actual item to move (could be ProjectId or ProjectGroup)
  const item = source.group.items[source.index]
  if (!item) {
    throw new Error(`Item at index ${source.index} not found in source group`)
  }

  const { source: newSourceItems, target: newTargetItems } = moveItemBetweenArrays(
    source.group.items,
    target.group.items,
    item,
    target.index,
  )

  // CRITICAL: If we're moving between ROOT and a nested group,
  // we need to update the nested group object within ROOT's items array
  const isRootInvolved = source.group.id === rootGroup.id || target.group.id === rootGroup.id
  const hasNestedGroup = source.group.id !== rootGroup.id && target.group.id !== rootGroup.id

  if (isRootInvolved && !hasNestedGroup) {
    // One of the groups is ROOT, and the other is a nested group
    const isSourceRoot = source.group.id === rootGroup.id
    const nestedGroupId = isSourceRoot ? target.group.id : source.group.id
    const nestedGroupNewItems = isSourceRoot ? newTargetItems : newSourceItems

    // Update the nested group reference in ROOT's items
    const rootItems = isSourceRoot ? newSourceItems : newTargetItems
    const updatedRootItems = rootItems.map((rootItem) => {
      if (isGroup<ProjectGroup>(rootItem) && rootItem.id === nestedGroupId) {
        // Found the nested group - return updated version
        return { ...rootItem, items: nestedGroupNewItems }
      }
      return rootItem
    })

    // Return single update with corrected ROOT
    return {
      updates: [
        {
          groupId: rootGroup.id,
          newItems: updatedRootItems,
        },
      ],
    }
  }

  // Standard cross-group move (no ROOT involvement)
  return {
    updates: [
      { groupId: source.group.id, newItems: newSourceItems },
      { groupId: target.group.id, newItems: newTargetItems },
    ],
  }
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Pure validation logic for sidebar drag-and-drop operations.
 * Returns true if the operation is valid, false otherwise.
 *
 * This is the single source of truth for validation - used by both:
 * - Components (to hide invalid indicators)
 * - Drop handler (to show error messages)
 *
 * @param sourceData - Data from the dragged item
 * @param targetData - Data from the drop target
 * @param instruction - Tree-item or list-item instruction (can be null)
 * @returns true if valid, false if invalid
 */
export function isValidSidebarOperation(
  sourceData: Record<string, unknown>,
  targetData: Record<string, unknown>,
  instruction: DragInstruction | null,
): boolean {
  // Helper to check instruction type (handles both tree-item and list-item)
  const instructionType = instruction && "type" in instruction ? instruction.type : null

  // Block project nesting (make-child on project)
  if (
    sourceData.type === "sidebar-project" &&
    targetData.type === "sidebar-project-drop-target" &&
    instructionType === "make-child"
  ) {
    return false
  }

  // Block groups from being dropped on nested projects (only applies to project targets)
  if (sourceData.type === "sidebar-group" && targetData.type === "sidebar-project-drop-target") {
    const targetGroupId = targetData.groupId
    // If the target project is inside a group (not ROOT), block it
    if (typeof targetGroupId === "string" && targetGroupId !== ROOT_PROJECT_GROUP_ID) {
      return false
    }
  }

  // Block group nesting (make-child on group)
  if (
    sourceData.type === "sidebar-group" &&
    targetData.type === "sidebar-group-drop-target" &&
    instructionType === "make-child"
  ) {
    return false
  }

  return true
}

/**
 * Extracts the tree-item instruction from drop target data.
 * This is the same extraction logic used in Atlaskit's tree-item.
 */
function extractInstructionForValidation(
  targetData: Record<string, unknown>,
): DragInstruction | null {
  const instructionSymbol = Object.getOwnPropertySymbols(targetData).find((symbol) =>
    symbol.toString().includes("tree-item-instruction"),
  )

  if (!instructionSymbol) {
    return null
  }

  // Use symbol as index to access the instruction
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Symbol requires Record type assertion
  const instructionValue = (targetData as Record<symbol, unknown>)[instructionSymbol]
  if (
    typeof instructionValue === "object" &&
    instructionValue !== null &&
    "type" in instructionValue
  ) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Type guard ensures this is DragInstruction
    return instructionValue as DragInstruction
  }
  return null
}

/**
 * Validates that a drop operation is allowed.
 * Returns an error message if invalid, or null if valid.
 *
 * @param sourceData - Data from the dragged item
 * @param targetData - Data from the drop target
 * @returns Error message or null
 */
export function validateDrop(
  sourceData: Record<string, unknown>,
  targetData: Record<string, unknown>,
): string | null {
  const instruction = extractInstructionForValidation(targetData)
  const instructionType = instruction && "type" in instruction ? instruction.type : null

  // Use shared validation logic
  if (!isValidSidebarOperation(sourceData, targetData, instruction)) {
    // Return appropriate error message based on the operation
    if (
      sourceData.type === "sidebar-project" &&
      targetData.type === "sidebar-project-drop-target" &&
      instructionType === "make-child"
    ) {
      return "Projects cannot be nested under other projects"
    }

    if (sourceData.type === "sidebar-group") {
      if (targetData.type === "sidebar-project-drop-target") {
        return "Groups can only exist at the top level"
      }
      if (targetData.type === "sidebar-group-drop-target" && instructionType === "make-child") {
        return "Groups cannot be nested under other groups"
      }
    }
  }

  return null
}
