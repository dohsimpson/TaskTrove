/**
 * Array operation utilities for drag-and-drop and reordering.
 * Pure functions with no side effects.
 */

/**
 * Reorders an item within an array by moving it from one index to another.
 * Handles the "remove then insert" index adjustment automatically.
 *
 * @param items - The array to reorder
 * @param fromIndex - Current index of the item
 * @param toIndex - Target index for the item
 * @returns New array with item moved to target index
 *
 * @example
 * ```ts
 * reorderInArray(['a', 'b', 'c', 'd'], 1, 3)
 * // Returns: ['a', 'c', 'd', 'b']
 * ```
 */
export function reorderInArray<T>(
  items: T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  if (fromIndex === toIndex) return items;
  if (fromIndex < 0 || fromIndex >= items.length) return items;
  if (toIndex < 0 || toIndex >= items.length) return items;

  const newItems = [...items];
  const [item] = newItems.splice(fromIndex, 1);
  if (!item) return items;

  newItems.splice(toIndex, 0, item);
  return newItems;
}

/**
 * Removes items from array based on a predicate function.
 *
 * @param items - The array to filter
 * @param predicate - Function that returns true for items to remove
 * @returns New array with matching items removed
 *
 * @example
 * ```ts
 * removeFromArray([1, 2, 3, 4], x => x % 2 === 0)
 * // Returns: [1, 3]
 * ```
 */
export function removeFromArray<T>(
  items: T[],
  predicate: (item: T) => boolean,
): T[] {
  return items.filter((item) => !predicate(item));
}

/**
 * Inserts an item at a specific index in an array.
 * Supports special index -1 to append to the end.
 *
 * @param items - The array to insert into
 * @param item - The item to insert
 * @param index - Index to insert at (-1 = append to end)
 * @returns New array with item inserted
 *
 * @example
 * ```ts
 * insertAtIndex(['a', 'b', 'c'], 'x', 1)
 * // Returns: ['a', 'x', 'b', 'c']
 *
 * insertAtIndex(['a', 'b'], 'x', -1)
 * // Returns: ['a', 'b', 'x']
 * ```
 */
export function insertAtIndex<T>(items: T[], item: T, index: number): T[] {
  const newItems = [...items];
  const actualIndex = index === -1 ? newItems.length : index;

  if (actualIndex < 0 || actualIndex > newItems.length) {
    return items;
  }

  newItems.splice(actualIndex, 0, item);
  return newItems;
}

/**
 * Moves an item from one array to another at a specific index.
 * Removes item from source and inserts into target.
 *
 * @param sourceItems - Array to remove item from
 * @param targetItems - Array to insert item into
 * @param item - Item to move
 * @param targetIndex - Index to insert at in target array
 * @returns Object with updated source and target arrays
 *
 * @example
 * ```ts
 * moveItemBetweenArrays(['a', 'b', 'c'], ['x', 'y'], 'b', 1)
 * // Returns: { source: ['a', 'c'], target: ['x', 'b', 'y'] }
 * ```
 */
export function moveItemBetweenArrays<T>(
  sourceItems: T[],
  targetItems: T[],
  item: T,
  targetIndex: number,
): { source: T[]; target: T[] } {
  return {
    source: removeFromArray(sourceItems, (i) => i === item),
    target: insertAtIndex(targetItems, item, targetIndex),
  };
}

/**
 * Moves an item within the same array, with special handling for when
 * the item already exists at a different position.
 * Removes the item first, then inserts at the target index.
 *
 * @param items - The array to operate on
 * @param item - Item to move
 * @param targetIndex - Target index (-1 = append)
 * @returns New array with item moved to target position
 *
 * @example
 * ```ts
 * // Item 'b' exists at index 1, move to index 3
 * moveItemToIndex(['a', 'b', 'c', 'd'], 'b', 3)
 * // Returns: ['a', 'c', 'd', 'b']
 * ```
 */
export function moveItemToIndex<T>(
  items: T[],
  item: T,
  targetIndex: number,
): T[] {
  // First, remove the item if it exists
  const withoutItem = removeFromArray(items, (i) => i === item);

  // Then insert at target index
  return insertAtIndex(withoutItem, item, targetIndex);
}
