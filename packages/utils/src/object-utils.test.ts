/**
 * Tests for object manipulation utilities
 */

import { describe, it, expect } from "vitest";
import { clearNullValues } from "./object-utils";

describe("clearNullValues", () => {
  it("should convert null values to undefined", () => {
    const input = {
      name: "John",
      email: null,
      age: 30,
      address: null,
    };

    const result = clearNullValues(input);

    expect(result).toEqual({
      name: "John",
      email: undefined,
      age: 30,
      address: undefined,
    });
  });

  it("should preserve non-null values", () => {
    const input = {
      name: "John",
      email: "john@example.com",
      age: 30,
      active: true,
      score: 0,
      description: "",
    };

    const result = clearNullValues(input);

    expect(result).toEqual({
      name: "John",
      email: "john@example.com",
      age: 30,
      active: true,
      score: 0,
      description: "",
    });
  });

  it("should handle objects with all null values", () => {
    const input = {
      field1: null,
      field2: null,
      field3: null,
    };

    const result = clearNullValues(input);

    expect(result).toEqual({
      field1: undefined,
      field2: undefined,
      field3: undefined,
    });
  });

  it("should handle empty objects", () => {
    const input = {};

    const result = clearNullValues(input);

    expect(result).toEqual({});
  });

  it("should handle objects with undefined values (keep them as undefined)", () => {
    const input = {
      name: "John",
      email: undefined,
      age: null,
    };

    const result = clearNullValues(input);

    expect(result).toEqual({
      name: "John",
      email: undefined,
      age: undefined,
    });
  });

  it("should not mutate the original object", () => {
    const input = {
      name: "John",
      email: null,
    };

    const inputCopy = { ...input };
    clearNullValues(input);

    expect(input).toEqual(inputCopy);
  });

  it("should handle objects with nested objects (shallow conversion)", () => {
    const input = {
      name: "John",
      email: null,
      metadata: {
        lastLogin: null,
        preferences: {},
      },
    };

    const result = clearNullValues(input);

    // Should convert top-level nulls only
    expect(result).toEqual({
      name: "John",
      email: undefined,
      metadata: {
        lastLogin: null, // Nested nulls are preserved (shallow conversion)
        preferences: {},
      },
    });
  });

  it("should work with spread operator for merging with null clearing", () => {
    const oldData = {
      name: "John",
      email: "john@example.com",
      age: 30,
    };

    const updates = {
      email: null, // Clear email
      age: 31, // Update age
    };

    // Pattern: spread base, then spread cleared updates
    const result = {
      ...oldData,
      ...clearNullValues(updates),
    };

    expect(result).toEqual({
      name: "John",
      email: undefined,
      age: 31,
    });
  });
});
