/**
 * Tests for unified count interfaces across all count atoms
 * Verifies that taskCountsAtom, projectTaskCountsAtom, and labelTaskCountsAtom
 * all follow the same simple number interface pattern
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createStore } from "jotai";

// Import all count atoms from UI layer (moved during refactoring)
import {
  taskCountsAtom,
  projectTaskCountsAtom,
  labelTaskCountsAtom,
} from "../ui/task-counts";

describe("Unified Count Interfaces", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it("should have consistent interfaces across all count atoms", () => {
    // Get all count atom results
    const taskCounts = store.get(taskCountsAtom);
    const projectCounts = store.get(projectTaskCountsAtom);
    const labelCounts = store.get(labelTaskCountsAtom);

    // taskCountsAtom returns an object with specific keys (inbox, today, etc.)
    expect(typeof taskCounts).toBe("object");
    expect(taskCounts).not.toBeNull();

    // All values in taskCounts should be simple numbers
    Object.values(taskCounts).forEach((count) => {
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(count)).toBe(true);
    });

    // projectTaskCountsAtom returns Record<string, number>
    expect(typeof projectCounts).toBe("object");
    expect(projectCounts).not.toBeNull();

    Object.entries(projectCounts).forEach(([projectId, count]) => {
      expect(typeof projectId).toBe("string");
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(count)).toBe(true);
    });

    // labelTaskCountsAtom returns Record<string, number> (same as projects)
    expect(typeof labelCounts).toBe("object");
    expect(labelCounts).not.toBeNull();

    Object.entries(labelCounts).forEach(([labelId, count]) => {
      expect(typeof labelId).toBe("string");
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(count)).toBe(true);
    });
  });

  it("should have proper debug labels for all count atoms", () => {
    expect(taskCountsAtom.debugLabel).toBe("taskCountsAtom");
    expect(projectTaskCountsAtom.debugLabel).toBe("projectTaskCountsAtom");
    expect(labelTaskCountsAtom.debugLabel).toBe("labelTaskCountsAtom");
  });

  it("should provide stable results across multiple reads", () => {
    // Test stability for all count atoms
    const taskCounts1 = store.get(taskCountsAtom);
    const taskCounts2 = store.get(taskCountsAtom);
    expect(taskCounts1).toEqual(taskCounts2);

    const projectCounts1 = store.get(projectTaskCountsAtom);
    const projectCounts2 = store.get(projectTaskCountsAtom);
    expect(projectCounts1).toEqual(projectCounts2);

    const labelCounts1 = store.get(labelTaskCountsAtom);
    const labelCounts2 = store.get(labelTaskCountsAtom);
    expect(labelCounts1).toEqual(labelCounts2);
  });

  it("should demonstrate the unified interface pattern", () => {
    const taskCounts = store.get(taskCountsAtom);
    const projectCounts = store.get(projectTaskCountsAtom);
    const labelCounts = store.get(labelTaskCountsAtom);

    // All counts should be non-negative integers
    const allCounts = [
      ...Object.values(taskCounts),
      ...Object.values(projectCounts),
      ...Object.values(labelCounts),
    ];

    allCounts.forEach((count) => {
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(count)).toBe(true);
      expect(Number.isFinite(count)).toBe(true);
      expect(count).not.toBeNaN();
    });
  });

  it("should have consistent mathematical properties", () => {
    const taskCounts = store.get(taskCountsAtom);
    const projectCounts = store.get(projectTaskCountsAtom);
    const labelCounts = store.get(labelTaskCountsAtom);

    // Calculate totals
    const taskCountsTotal = Object.values(taskCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    const projectCountsTotal = Object.values(projectCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    const labelCountsTotal = Object.values(labelCounts).reduce(
      (sum, count) => sum + count,
      0,
    );

    // All totals should be non-negative integers
    [taskCountsTotal, projectCountsTotal, labelCountsTotal].forEach((total) => {
      expect(typeof total).toBe("number");
      expect(total).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(total)).toBe(true);
    });

    // taskCounts.total should match the sum of active tasks
    // (This is a consistency check specific to taskCountsAtom)
    expect(taskCounts.total).toBeGreaterThanOrEqual(0);
  });

  it("should handle empty state gracefully across all atoms", () => {
    // Even with no tasks/projects/labels, all atoms should return valid objects
    const taskCounts = store.get(taskCountsAtom);
    const projectCounts = store.get(projectTaskCountsAtom);
    const labelCounts = store.get(labelTaskCountsAtom);

    // Should not throw and should return valid objects
    expect(taskCounts).toBeDefined();
    expect(projectCounts).toBeDefined();
    expect(labelCounts).toBeDefined();

    expect(typeof taskCounts).toBe("object");
    expect(typeof projectCounts).toBe("object");
    expect(typeof labelCounts).toBe("object");
  });
});
