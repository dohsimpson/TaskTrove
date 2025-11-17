/**
 * Tests for object manipulation utilities
 */

import { describe, it, expect } from "vitest";
import { clearNullValues, mergeDeep } from "./object-utils";

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

describe("mergeDeep", () => {
  it("should return a cloned object when no partial is provided", () => {
    const base = {
      general: { soundEnabled: true },
    };

    const merged = mergeDeep(base);

    expect(merged).toEqual(base);
    expect(merged).not.toBe(base);
  });

  it("should merge nested objects without losing existing keys", () => {
    const base: {
      general: { soundEnabled: boolean; startView: string };
      notifications: { enabled: boolean; requireInteraction: boolean };
    } = {
      general: { soundEnabled: true, startView: "all" },
      notifications: { enabled: true, requireInteraction: true },
    };

    const partial: { general?: Partial<typeof base.general> } = {
      general: { soundEnabled: false },
    };

    const result = mergeDeep(base, partial);

    expect(result.general).toEqual({
      soundEnabled: false,
      startView: "all",
    });
    expect(result.notifications).toEqual(base.notifications);
  });

  it("should preserve unknown keys from the base object", () => {
    const base: {
      general: { soundEnabled: boolean };
      productivity: { rewardsEnabled: boolean };
    } = {
      general: { soundEnabled: true },
      productivity: { rewardsEnabled: true },
    };

    const partial: { general?: Partial<typeof base.general> } = {
      general: { soundEnabled: false },
    };

    const result = mergeDeep(base, partial);

    expect(result.productivity).toEqual({ rewardsEnabled: true });
  });

  it("should replace arrays instead of concatenating them", () => {
    const base: { notifications: { channels: string[] } } = {
      notifications: { channels: ["email", "push"] },
    };

    const partial: { notifications?: Partial<typeof base.notifications> } = {
      notifications: { channels: ["push"] },
    };

    const result = mergeDeep(base, partial);

    expect(result.notifications.channels).toEqual(["push"]);
  });

  it("should ignore undefined values from the partial object", () => {
    const base: { general: { soundEnabled: boolean } } = {
      general: { soundEnabled: true },
    };

    const partial: { general?: Partial<typeof base.general> } = {
      general: { soundEnabled: undefined },
    };

    const result = mergeDeep(base, partial);

    expect(result.general.soundEnabled).toBe(true);
  });

  it("should not mutate the base object", () => {
    const base: { general: { soundEnabled: boolean } } = {
      general: { soundEnabled: true },
    };

    const partial: { general?: Partial<typeof base.general> } = {
      general: { soundEnabled: false },
    };

    const copy = JSON.parse(JSON.stringify(base));
    const result = mergeDeep(base, partial);

    expect(base).toEqual(copy);
    expect(result.general.soundEnabled).toBe(false);
  });
});
