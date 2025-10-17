import { extractInstruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/list-item";
import type { ElementDropTargetEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import type { Instruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/list-item";

/**
 * Result of parsing a drop event payload
 */
export interface DropPayload {
  /** IDs of the dragged items */
  draggedIds: string[];
  /** Drop instruction (reorder-before or reorder-after) */
  instruction: Instruction;
  /** ID of the target item */
  targetId: string;
}

/**
 * Extracts and validates drop payload from a drag-and-drop event.
 * Returns null if the payload is invalid or missing required data.
 *
 * @param args - Drop event payload from pragmatic-drag-and-drop
 * @returns Parsed drop payload or null if invalid
 *
 * @example
 * ```ts
 * const payload = extractDropPayload(args)
 * if (!payload) return
 *
 * const { draggedIds, instruction, targetId } = payload
 * // Use the validated payload...
 * ```
 */
export function extractDropPayload(
  args: ElementDropTargetEventBasePayload,
): DropPayload | null {
  // Extract IDs from drag source
  const sourceData = args.source.data;
  if (!Array.isArray(sourceData.ids)) return null;

  const draggedIds = sourceData.ids.filter(
    (id: unknown): id is string => typeof id === "string",
  );

  if (draggedIds.length === 0) return null;

  // Extract instruction (reorder-before or reorder-after)
  const instruction = extractInstruction(args.self.data);
  if (!instruction) return null;

  // Extract target ID
  const targetId = args.self.data.id;
  if (!targetId || typeof targetId !== "string") return null;

  return {
    draggedIds,
    instruction,
    targetId,
  };
}

/**
 * Calculates the insertion index based on drop instruction and target position.
 *
 * @param items - Array of items to search in
 * @param targetId - ID of the target item
 * @param instruction - Drop instruction (reorder-before or reorder-after)
 * @param getId - Function to extract ID from an item (defaults to identity for string arrays)
 * @returns Insert index, or -1 if target not found
 *
 * @example
 * ```ts
 * const items = ['id1', 'id2', 'id3']
 * const insertIdx = calculateInsertIndex(items, 'id2', instruction)
 * // insertIdx will be 1 for reorder-before, 2 for reorder-after
 * ```
 */
export function calculateInsertIndex<T>(
  items: T[],
  targetId: string,
  instruction: Instruction,
  getId: (item: T) => string = (item) => String(item),
): number {
  const targetIndex = items.findIndex((item) => getId(item) === targetId);
  if (targetIndex === -1) return -1;

  return instruction.operation === "reorder-before"
    ? targetIndex
    : targetIndex + 1;
}

/**
 * Reorders items in an array by moving dragged items to a target position.
 *
 * @param items - Original array of items
 * @param draggedIds - IDs of items to move
 * @param targetId - ID of the target item
 * @param instruction - Drop instruction (reorder-before or reorder-after)
 * @param getId - Function to extract ID from an item (defaults to identity for string arrays)
 * @returns New array with reordered items, or null if operation fails
 *
 * @example
 * ```ts
 * const items = ['a', 'b', 'c', 'd']
 * const reordered = reorderItems(items, ['b'], 'd', { operation: 'reorder-before' })
 * // Result: ['a', 'c', 'b', 'd']
 * ```
 */
export function reorderItems<T>(
  items: T[],
  draggedIds: string[],
  targetId: string,
  instruction: Instruction,
  getId: (item: T) => string = (item) => String(item),
): T[] | null {
  // Create a map of items by ID for efficient lookup
  const itemMap = new Map<string, T>();
  for (const item of items) {
    itemMap.set(getId(item), item);
  }

  // Build draggedItems array in the order specified by draggedIds
  const draggedItems: T[] = [];
  for (const id of draggedIds) {
    const item = itemMap.get(id);
    if (item) {
      draggedItems.push(item);
    }
  }

  // Filter out dragged items to get the base list
  const filteredItems = items.filter(
    (item) => !draggedIds.includes(getId(item)),
  );

  // Calculate insert index (note: if target was dragged, it won't be in filteredItems)
  const insertIndex = calculateInsertIndex(
    filteredItems,
    targetId,
    instruction,
    getId,
  );

  // If target not found in filtered items, check if it's one of the dragged items
  // In this case, insert at the end
  if (insertIndex === -1) {
    // Check if target is in draggedIds - if so, this is a no-op reorder
    if (draggedIds.includes(targetId)) {
      // Return items as-is (moving an item relative to itself)
      return items;
    }
    return null;
  }

  // Insert dragged items at the target position
  const result = [
    ...filteredItems.slice(0, insertIndex),
    ...draggedItems,
    ...filteredItems.slice(insertIndex),
  ];

  return result;
}

/**
 * Calculates the adjusted index when reordering an item within the same list.
 * Accounts for the removal of the source item before insertion.
 *
 * @param sourceIndex - Current index of the item being moved
 * @param targetIndex - Index of the item being used as the drop target
 * @param insertBefore - Whether to insert before (true) or after (false) the target
 * @returns The adjusted index for the final position
 *
 * @example
 * ```ts
 * // Moving item from index 2 to position before index 5
 * const newIndex = calculateReorderIndex(2, 5, true)
 * // Result: 4 (accounting for removal of item at index 2)
 * ```
 */
export function calculateReorderIndex(
  sourceIndex: number,
  targetIndex: number,
  insertBefore: boolean,
): number {
  const insertIndex = insertBefore ? targetIndex : targetIndex + 1;
  // If source is before target, the removal shifts indices down by 1
  return sourceIndex < insertIndex ? insertIndex - 1 : insertIndex;
}
