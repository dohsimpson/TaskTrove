import mergeWith from "lodash.mergewith";

/**
 * Object manipulation utilities
 *
 * General-purpose utilities for working with objects.
 */

/**
 * Helper type to remove null from all properties while preserving undefined
 */
export type WithoutNull<T extends Record<string, unknown>> = {
  [K in keyof T]: Exclude<T[K], null>;
};

/**
 * Deep partial type used for recursive merging.
 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[K] extends Record<string, unknown>
      ? DeepPartial<T[K]>
      : T[K];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

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
): WithoutNull<T> {
  const result: Record<string, unknown> = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      result[key] = value === null ? undefined : value;
    }
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return result as WithoutNull<T>;
}

/**
 * Deep merge helper for plain objects.
 *
 * - Returns a new object without mutating inputs.
 * - Merges nested plain objects recursively.
 * - Replaces arrays instead of concatenating.
 * - Ignores `undefined` values in the partial object.
 */
export function mergeDeep<T extends Record<string, unknown>>(
  base: T,
  partial?: DeepPartial<T>,
): T {
  if (!isPlainObject(base)) {
    throw new TypeError(
      "mergeDeep expects the base value to be a plain object",
    );
  }

  if (!partial || Object.keys(partial).length === 0) {
    return structuredClone(base);
  }

  const clone = structuredClone(base);
  return mergeWith(clone, partial, (objValue, srcValue) => {
    if (Array.isArray(srcValue)) {
      return structuredClone(srcValue);
    }

    return undefined;
  });
}
