import { describe, it, expect } from "vitest";
import {
  DEFAULT_TASK_PRIORITY,
  DEFAULT_TASK_TITLE,
  DEFAULT_TASK_COMPLETED,
  DEFAULT_TASK_STATUS,
  DEFAULT_UUID,
  DEFAULT_TASK_LABELS,
  DEFAULT_TASK_SUBTASKS,
  DEFAULT_TASK_COMMENTS,
  DEFAULT_TASK_ATTACHMENTS,
  DEFAULT_INBOX_NAME,
  DEFAULT_INBOX_COLOR,
  DEFAULT_SECTION_NAME,
  DEFAULT_PROJECT_SHARED,
  DEFAULT_VIEW_MODE,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_DIRECTION,
  DEFAULT_SHOW_COMPLETED,
  DEFAULT_SHOW_OVERDUE,
  DEFAULT_SEARCH_QUERY,
  DEFAULT_SHOW_SIDE_PANEL,
  DEFAULT_COMPACT_VIEW,
  DEFAULT_SOUND_ENABLED,
  DEFAULT_SOUND_VOLUME,
  DEFAULT_NOTIFICATION_VOLUME,
  DEFAULT_COLOR_PALETTE,
  DEFAULT_PROJECT_COLORS,
  DEFAULT_LABEL_COLORS,
  PLACEHOLDER_TASK_INPUT,
  PLACEHOLDER_PROJECT_NAME,
  PLACEHOLDER_LABEL_NAME,
  PLACEHOLDER_TASK_DESCRIPTION,
  PLACEHOLDER_SEARCH,
} from "./defaults";

describe("TaskTrove Default Constants", () => {
  describe("Task Defaults", () => {
    it("should have correct task priority", () => {
      expect(DEFAULT_TASK_PRIORITY).toBe(4);
      expect(DEFAULT_TASK_PRIORITY).toBeGreaterThanOrEqual(1);
      expect(DEFAULT_TASK_PRIORITY).toBeLessThanOrEqual(4);
    });

    it("should have correct task title", () => {
      expect(DEFAULT_TASK_TITLE).toBe("Untitled Task");
      expect(typeof DEFAULT_TASK_TITLE).toBe("string");
    });

    it("should have correct task status defaults", () => {
      expect(DEFAULT_TASK_COMPLETED).toBe(false);
      expect(DEFAULT_TASK_STATUS).toBe("active");
    });

    it("should have correct section ID", () => {
      expect(DEFAULT_UUID).toBe("00000000-0000-0000-0000-000000000000");
      expect(typeof DEFAULT_UUID).toBe("string");
    });

    it("should have empty arrays for task collections", () => {
      expect(DEFAULT_TASK_LABELS).toEqual([]);
      expect(DEFAULT_TASK_SUBTASKS).toEqual([]);
      expect(DEFAULT_TASK_COMMENTS).toEqual([]);
      expect(DEFAULT_TASK_ATTACHMENTS).toEqual([]);

      expect(Array.isArray(DEFAULT_TASK_LABELS)).toBe(true);
      expect(Array.isArray(DEFAULT_TASK_SUBTASKS)).toBe(true);
      expect(Array.isArray(DEFAULT_TASK_COMMENTS)).toBe(true);
      expect(Array.isArray(DEFAULT_TASK_ATTACHMENTS)).toBe(true);
    });
  });

  describe("Project Defaults", () => {
    it("should have correct inbox defaults", () => {
      expect(DEFAULT_INBOX_NAME).toBe("Inbox");
      expect(DEFAULT_INBOX_COLOR).toBe("#6b7280");
      expect(typeof DEFAULT_INBOX_NAME).toBe("string");
      expect(typeof DEFAULT_INBOX_COLOR).toBe("string");
    });

    it("should have correct section name", () => {
      expect(DEFAULT_SECTION_NAME).toBe("Default");
      expect(typeof DEFAULT_SECTION_NAME).toBe("string");
    });

    it("should have correct project status defaults", () => {
      expect(DEFAULT_PROJECT_SHARED).toBe(false);
    });
  });

  describe("View State Defaults", () => {
    it("should have correct view mode defaults", () => {
      expect(DEFAULT_VIEW_MODE).toBe("list");
      expect(DEFAULT_SORT_BY).toBe("default");
      expect(DEFAULT_SORT_DIRECTION).toBe("asc");
    });

    it("should have correct boolean view defaults", () => {
      expect(DEFAULT_SHOW_COMPLETED).toBe(false);
      expect(DEFAULT_SHOW_OVERDUE).toBe(true);
      expect(DEFAULT_SHOW_SIDE_PANEL).toBe(false);
      expect(DEFAULT_COMPACT_VIEW).toBe(false);
    });

    it("should have correct search query default", () => {
      expect(DEFAULT_SEARCH_QUERY).toBe("");
      expect(typeof DEFAULT_SEARCH_QUERY).toBe("string");
    });
  });

  describe("Audio Defaults", () => {
    it("should have correct sound defaults", () => {
      expect(DEFAULT_SOUND_ENABLED).toBe(true);
      expect(DEFAULT_SOUND_VOLUME).toBe(0.3);
      expect(DEFAULT_NOTIFICATION_VOLUME).toBe(70);
    });

    it("should have valid volume ranges", () => {
      expect(DEFAULT_SOUND_VOLUME).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_SOUND_VOLUME).toBeLessThanOrEqual(1);
      expect(DEFAULT_NOTIFICATION_VOLUME).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_NOTIFICATION_VOLUME).toBeLessThanOrEqual(100);
    });
  });

  describe("Color Palette Defaults", () => {
    it("should have valid color arrays", () => {
      expect(Array.isArray(DEFAULT_COLOR_PALETTE)).toBe(true);
      expect(Array.isArray(DEFAULT_PROJECT_COLORS)).toBe(true);
      expect(Array.isArray(DEFAULT_LABEL_COLORS)).toBe(true);

      expect(DEFAULT_COLOR_PALETTE.length).toBeGreaterThan(0);
      expect(DEFAULT_PROJECT_COLORS.length).toBeGreaterThan(0);
      expect(DEFAULT_LABEL_COLORS.length).toBeGreaterThan(0);
    });

    it("should have valid hex color format", () => {
      const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

      DEFAULT_COLOR_PALETTE.forEach((color: string) => {
        expect(color).toMatch(hexColorRegex);
      });

      DEFAULT_PROJECT_COLORS.forEach((color: string) => {
        expect(color).toMatch(hexColorRegex);
      });

      DEFAULT_LABEL_COLORS.forEach((color: string) => {
        expect(color).toMatch(hexColorRegex);
      });
    });

    it("should have label colors same as project colors", () => {
      expect(DEFAULT_LABEL_COLORS).toEqual(DEFAULT_PROJECT_COLORS);
    });
  });

  describe("Placeholder Text", () => {
    it("should have meaningful placeholder texts", () => {
      expect(PLACEHOLDER_TASK_INPUT).toBe("What needs to be done?");
      expect(PLACEHOLDER_PROJECT_NAME).toBe("Enter project name");
      expect(PLACEHOLDER_LABEL_NAME).toBe("Enter label name");
      expect(PLACEHOLDER_TASK_DESCRIPTION).toBe("Add description...");
      expect(PLACEHOLDER_SEARCH).toBe("Search tasks...");

      // All should be non-empty strings
      expect(PLACEHOLDER_TASK_INPUT.length).toBeGreaterThan(0);
      expect(PLACEHOLDER_PROJECT_NAME.length).toBeGreaterThan(0);
      expect(PLACEHOLDER_LABEL_NAME.length).toBeGreaterThan(0);
      expect(PLACEHOLDER_TASK_DESCRIPTION.length).toBeGreaterThan(0);
      expect(PLACEHOLDER_SEARCH.length).toBeGreaterThan(0);
    });
  });

  describe("Type Compatibility", () => {
    it("should work with fallback patterns", () => {
      // Test the logical pattern used throughout the codebase
      const assignedPriority = DEFAULT_TASK_PRIORITY;
      const assignedTitle = DEFAULT_TASK_TITLE;

      expect(assignedPriority).toBe(4);
      expect(assignedTitle).toBe("Untitled Task");
    });

    it("should preserve explicit values", () => {
      const explicitPriority = 1;
      const explicitTitle = "Custom Task";

      const assignedPriority = explicitPriority;
      const assignedTitle = explicitTitle;

      expect(assignedPriority).toBe(1);
      expect(assignedTitle).toBe("Custom Task");
    });

    it("should be compatible with TypeScript union types", () => {
      // Test that constants work with our type system
      type Priority = 1 | 2 | 3 | 4;
      type ViewMode = "list" | "board" | "calendar";
      type SortDirection = "asc" | "desc";

      const priority: Priority = DEFAULT_TASK_PRIORITY;
      const viewMode: ViewMode = DEFAULT_VIEW_MODE;
      const sortDirection: SortDirection = DEFAULT_SORT_DIRECTION;

      expect([1, 2, 3, 4]).toContain(priority);
      expect(["list", "board", "calendar"]).toContain(viewMode);
      expect(["asc", "desc"]).toContain(sortDirection);
    });
  });

  describe("Consistency Checks", () => {
    it("should maintain consistent default patterns", () => {
      // Boolean defaults should be false for optional features
      expect(DEFAULT_TASK_COMPLETED).toBe(false);
      expect(DEFAULT_PROJECT_SHARED).toBe(false);
      expect(DEFAULT_SHOW_COMPLETED).toBe(false);
      expect(DEFAULT_SHOW_SIDE_PANEL).toBe(false);
      expect(DEFAULT_COMPACT_VIEW).toBe(false);
    });

    it("should have sensible numeric defaults", () => {
      expect(DEFAULT_TASK_PRIORITY).toBe(4); // Lowest priority
      expect(DEFAULT_UUID).toBe("00000000-0000-0000-0000-000000000000"); // First section
      expect(DEFAULT_SOUND_VOLUME).toBeLessThan(1); // Not too loud
      expect(DEFAULT_NOTIFICATION_VOLUME).toBeLessThan(100); // Not max volume
    });
  });
});
