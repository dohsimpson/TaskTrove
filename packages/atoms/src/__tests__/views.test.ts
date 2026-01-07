/**
 * ⚠️  WEB API DEPENDENT - Views Utilities Test Suite
 *
 * Platform dependencies:
 * - Web-specific view state management
 * - Local storage for view state persistence
 * - UI state management for views
 * - Logging and error handling utilities
 *
 * Views Utilities Test Suite
 *
 * Tests for view state migration and utility functions
 * used in the views atom system.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ViewState, ViewStates } from "@tasktrove/types/core";
import { createProjectId, createLabelId } from "@tasktrove/types/id";
import { DEFAULT_VIEW_STATE } from "@tasktrove/types/defaults";
import { migrateViewStates, getViewStateOrDefault } from "../ui/views";

// Mock the atoms package logger to avoid console output during tests
vi.mock("../utils/atom-helpers", () => ({
  log: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
  // Re-export other utils that might be needed
  createAtomWithStorage: vi.fn(() => {
    const mockAtom = vi.fn();
    Object.defineProperty(mockAtom, "debugLabel", {
      value: "",
      writable: true,
      enumerable: true,
      configurable: true,
    });
    return mockAtom;
  }),
  namedAtom: vi.fn((name, atom) => {
    atom.debugLabel = name;
    return atom;
  }),
  handleAtomError: vi.fn(),
  playSoundAtom: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  showServiceWorkerNotification: vi.fn(),
  resolveProject: vi.fn(),
  resolveLabel: vi.fn(),
  resolveProjectGroup: vi.fn(),
  findGroupById: vi.fn(),
}));

describe("migrateViewStates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("invalid input handling", () => {
    it("should return empty object for null input", () => {
      const result = migrateViewStates(null);
      expect(result).toEqual({});
    });

    it("should return empty object for undefined input", () => {
      const result = migrateViewStates(undefined);
      expect(result).toEqual({});
    });

    it("should return empty object for non-object input", () => {
      expect(migrateViewStates("invalid")).toEqual({});
      expect(migrateViewStates(123)).toEqual({});
      expect(migrateViewStates(true)).toEqual({});
      expect(migrateViewStates([])).toEqual({});
    });
  });

  describe("valid ViewState preservation", () => {
    it("should preserve completely valid ViewStates", () => {
      const validViewStates: ViewStates = {
        today: {
          viewMode: "list",
          sortBy: "dueDate",
          sortDirection: "asc",
          showCompleted: false,
          showOverdue: true,
          searchQuery: "",
          showSidePanel: false,
          compactView: false,
          collapsedSections: ["section1"],
          activeFilters: {
            projectIds: [],
            labels: [],
            priorities: [1, 2],
          },
        },
        inbox: {
          viewMode: "kanban",
          sortBy: "priority",
          sortDirection: "desc",
          showCompleted: true,
          showOverdue: false,
          searchQuery: "test search",
          showSidePanel: true,
          compactView: true,
          collapsedSections: [],
          activeFilters: {
            labels: [createLabelId("abcdefab-abcd-4bcd-8bcd-abcdefabcdef")],
            priorities: [4],
          },
        },
      };

      const result = migrateViewStates(validViewStates);
      expect(result).toEqual(validViewStates);
    });
  });

  describe("partial migration", () => {
    it("should preserve valid fields and backfill missing ones", () => {
      const partialData = {
        today: {
          viewMode: "kanban", // valid
          sortBy: "title", // valid
          invalidField: "should be ignored",
          showCompleted: true, // valid
          // Missing fields should be backfilled
        },
      };

      const result = migrateViewStates(partialData);

      expect(result.today).toEqual({
        ...DEFAULT_VIEW_STATE,
        viewMode: "kanban",
        sortBy: "title",
        showCompleted: true,
      });
    });

    it("should handle invalid enum values gracefully", () => {
      const invalidEnumData = {
        today: {
          viewMode: "invalid_mode", // should not be preserved
          sortDirection: "invalid_direction", // should not be preserved
          showCompleted: true, // valid
        },
      };

      const result = migrateViewStates(invalidEnumData);

      expect(result.today).toEqual({
        ...DEFAULT_VIEW_STATE,
        showCompleted: true, // Only this should be preserved
      });
    });

    it("should handle type mismatches", () => {
      const typeMismatchData = {
        today: {
          viewMode: "list", // valid
          showCompleted: "not a boolean", // invalid type
          searchQuery: 123, // invalid type
          sortBy: true, // invalid type
        },
      };

      const result = migrateViewStates(typeMismatchData);

      expect(result.today).toEqual({
        ...DEFAULT_VIEW_STATE,
        viewMode: "list", // Only valid field preserved
      });
    });

    it("should filter invalid items from arrays", () => {
      const arrayData = {
        today: {
          collapsedSections: ["valid1", 123, "valid2", null, "valid3"], // mixed types
          viewMode: "calendar",
        },
      };

      const result = migrateViewStates(arrayData);

      expect(result.today).toEqual({
        ...DEFAULT_VIEW_STATE,
        viewMode: "calendar",
        collapsedSections: ["valid1", "valid2", "valid3"], // Only strings preserved
      });
    });
  });

  describe("mixed scenario", () => {
    it("should handle mix of valid and invalid viewStates", () => {
      const mixedData = {
        today: {
          viewMode: "list",
          sortBy: "priority",
          showCompleted: true,
        },
        invalidView: "not an object", // Should be ignored
        inbox: {
          viewMode: "kanban",
          invalidField: "ignored",
          sortDirection: "desc",
        },
        projectId: null, // Should be ignored
      };

      const result = migrateViewStates(mixedData);

      expect(Object.keys(result)).toEqual(["today", "inbox"]);
      expect(result.today).toEqual({
        ...DEFAULT_VIEW_STATE,
        viewMode: "list",
        sortBy: "priority",
        showCompleted: true,
      });
      expect(result.inbox).toEqual({
        ...DEFAULT_VIEW_STATE,
        viewMode: "kanban",
        sortDirection: "desc",
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty object", () => {
      const result = migrateViewStates({});
      expect(result).toEqual({});
    });

    it("should handle object with all invalid entries", () => {
      const invalidData = {
        view1: "not an object",
        view2: null,
        view3: 123,
        view4: [],
      };

      const result = migrateViewStates(invalidData);
      expect(result).toEqual({});
    });

    it("should preserve all valid ViewMode values", () => {
      const viewModes: Array<ViewState["viewMode"]> = [
        "list",
        "kanban",
        "calendar",
        "table",
        "stats",
      ];

      viewModes.forEach((mode) => {
        const data = {
          test: { viewMode: mode },
        };

        const result = migrateViewStates(data);
        if (!result.test) {
          throw new Error("Expected result.test to be defined");
        }
        expect(result.test.viewMode).toBe(mode);
      });
    });

    it("should preserve all valid sortDirection values", () => {
      const sortDirections: Array<ViewState["sortDirection"]> = ["asc", "desc"];

      sortDirections.forEach((direction) => {
        const data = {
          test: { sortDirection: direction },
        };

        const result = migrateViewStates(data);
        if (!result.test) {
          throw new Error("Expected result.test to be defined");
        }
        expect(result.test.sortDirection).toBe(direction);
      });
    });

    it("should handle deeply nested object structures gracefully", () => {
      const complexData = {
        today: {
          viewMode: "list",
          activeFilters: {
            // This will likely fail validation due to complex structure
            nested: { deeply: { invalid: true } },
          },
          searchQuery: "valid search",
        },
      };

      const result = migrateViewStates(complexData);

      // Should preserve simple valid fields
      if (!result.today) {
        throw new Error("Expected result.today to be defined");
      }
      expect(result.today.viewMode).toBe("list");
      expect(result.today.searchQuery).toBe("valid search");
      // activeFilters should be reset to default due to validation failure
      expect(result.today.activeFilters).toEqual(
        DEFAULT_VIEW_STATE.activeFilters,
      );
    });
  });

  describe("logging behavior", () => {
    it("should log info for successful partial migrations", async () => {
      const partialData = {
        today: { viewMode: "list", invalidField: "ignored" },
      };

      migrateViewStates(partialData);

      // Get the mocked log for testing
      const { log } = await import("../utils/atom-helpers");

      expect(log.info).toHaveBeenCalledWith(
        expect.objectContaining({
          module: "views",
          viewId: "today",
          preservedFields: ["viewMode"],
        }),
        "Migrated ViewState with partial data preservation",
      );
    });

    it("should log warning for invalid data types", async () => {
      migrateViewStates("invalid");

      // Get the mocked log for testing
      const { log } = await import("../utils/atom-helpers");

      expect(log.warn).toHaveBeenCalledWith(
        { module: "views" },
        "Invalid ViewStates data type, returning empty object",
      );
    });
  });
});

describe("getViewStateOrDefault", () => {
  const mockViewStates: ViewStates = {
    today: {
      viewMode: "kanban",
      sortBy: "priority",
      sortDirection: "desc",
      showCompleted: true,
      showArchived: false,
      showOverdue: false,
      searchQuery: "test",
      showSidePanel: true,
      compactView: false,
      collapsedSections: ["section1"],
      activeFilters: {
        labels: [createLabelId("abcdefab-abcd-4bcd-8bcd-abcdefabcdef")],
      },
    },
    inbox: {
      viewMode: "list",
      sortBy: "dueDate",
      sortDirection: "asc",
      showCompleted: false,
      showArchived: false,
      showOverdue: true,
      searchQuery: "",
      showSidePanel: false,
      compactView: true,
      collapsedSections: [],
      activeFilters: { labels: [], priorities: [1, 2] },
    },
  };

  it("should return existing ViewState when viewId exists", () => {
    const result = getViewStateOrDefault(mockViewStates, "today");
    expect(result).toEqual({ ...DEFAULT_VIEW_STATE, ...mockViewStates.today });
  });

  it("should return same reference for existing ViewState", () => {
    const result = getViewStateOrDefault(mockViewStates, "inbox");
    expect(result).toEqual({ ...DEFAULT_VIEW_STATE, ...mockViewStates.inbox });
  });

  it("should return default ViewState when viewId does not exist", () => {
    // Test with a standard ViewId that doesn't exist in mockViewStates
    const result = getViewStateOrDefault(mockViewStates, "upcoming");
    expect(result).toEqual(DEFAULT_VIEW_STATE);
  });

  it("should return default ViewState for new project IDs", () => {
    // Test with a project-like ViewId (valid v4 UUID)
    const projectViewId = createProjectId(
      "12345678-1234-4000-8000-123456789abc",
    );
    const result = getViewStateOrDefault(mockViewStates, projectViewId);
    expect(result).toEqual(DEFAULT_VIEW_STATE);
  });

  it("should return default ViewState for new label IDs", () => {
    // Test with a label-like ViewId (valid v4 UUID)
    const labelViewId = createLabelId("87654321-4321-4000-8000-fedcba987654");
    const result = getViewStateOrDefault(mockViewStates, labelViewId);
    expect(result).toEqual(DEFAULT_VIEW_STATE);
  });

  it("should return copy of default (not reference)", () => {
    // Test with calendar standard view (missing from mockViewStates)
    const result = getViewStateOrDefault(mockViewStates, "calendar");
    expect(result).toEqual(DEFAULT_VIEW_STATE);
    expect(result).not.toBe(DEFAULT_VIEW_STATE); // Different object reference
  });

  it("should handle empty ViewStates object", () => {
    const emptyViewStates: ViewStates = {};
    const result = getViewStateOrDefault(emptyViewStates, "today");
    expect(result).toEqual(DEFAULT_VIEW_STATE);
  });
});
