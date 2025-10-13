/**
 * Object manipulation utilities
 *
 * General-purpose utilities for working with objects.
 */

/**
 * Helper type to exclude null from a union type
 */
type ExcludeNull<T> = T extends null ? never : T;

/**
 * Converts all null values in an object to undefined.
 *
 * @param obj - The object to process
 * @returns A new object with all null values converted to undefined
 *
 * @example
 * ```typescript
 * const input = { name: "John", email: null, age: 30 };
 * const result = clearNullValues(input);
 * // result: { name: "John", email: undefined, age: 30 }
 * ```
 */
export function clearNullValues<T extends Record<string, unknown>>(
  obj: T,
): { [K in keyof T]: ExcludeNull<T[K]> | Extract<T[K], undefined> } {
  const result: Record<string, unknown> = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      result[key] = value === null ? undefined : value;
    }
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return result as {
    [K in keyof T]: ExcludeNull<T[K]> | Extract<T[K], undefined>;
  };
}
