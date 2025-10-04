/**
 * Tests for view state sorting utilities
 */

import { describe, it, expect } from "vitest";
import { sortTasksByViewState } from "./view-sorting";
import type { Task, ViewState } from "@tasktrove/types";
import { createTaskId, createProjectId } from "@tasktrove/types";

describe("sortTasksByViewState", () => {
  const baseViewState: ViewState = {
    viewMode: "list",
    sortBy: "default",
    sortDirection: "asc",
    showCompleted: true,
    showOverdue: true,
    searchQuery: "",
    showSidePanel: false,
    compactView: false,
  };

  const createTask = (overrides: Partial<Task> = {}): Task =>
    ({
      id: createTaskId("12345678-1234-4234-8234-123456789abc"),
      title: "Test Task",
      description: "",
      completed: false,
      priority: 4,
      projectId: createProjectId("87654321-4321-4321-8321-210987654321"),
      labels: [],
      subtasks: [],
      comments: [],
      createdAt: new Date("2024-01-01"),
      ...overrides,
    }) as Task;

  describe("default sort", () => {
    it("should put completed tasks at the bottom", () => {
      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          completed: true,
          title: "A",
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
          completed: false,
          title: "B",
        }),
        createTask({
          id: createTaskId("33333333-3333-4333-8333-333333333333"),
          completed: true,
          title: "C",
        }),
      ];

      const result = sortTasksByViewState([...tasks], baseViewState);

      expect(result[0]?.completed).toBe(false);
      expect(result[1]?.completed).toBe(true);
      expect(result[2]?.completed).toBe(true);
    });

    it("should maintain order within same completion status", () => {
      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          completed: false,
          title: "A",
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
          completed: false,
          title: "B",
        }),
      ];

      const result = sortTasksByViewState([...tasks], baseViewState);

      expect(result[0]?.title).toBe("A");
      expect(result[1]?.title).toBe("B");
    });
  });

  describe("priority sort", () => {
    it("should sort by priority ascending", () => {
      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          priority: 3,
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
          priority: 1,
        }),
        createTask({
          id: createTaskId("33333333-3333-4333-8333-333333333333"),
          priority: 2,
        }),
      ];

      const viewState = {
        ...baseViewState,
        sortBy: "priority",
        sortDirection: "asc" as const,
      };
      const result = sortTasksByViewState([...tasks], viewState);

      expect(result[0]?.priority).toBe(1);
      expect(result[1]?.priority).toBe(2);
      expect(result[2]?.priority).toBe(3);
    });

    it("should sort by priority descending", () => {
      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          priority: 1,
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
          priority: 3,
        }),
        createTask({
          id: createTaskId("33333333-3333-4333-8333-333333333333"),
          priority: 2,
        }),
      ];

      const viewState = {
        ...baseViewState,
        sortBy: "priority",
        sortDirection: "desc" as const,
      };
      const result = sortTasksByViewState([...tasks], viewState);

      expect(result[0]?.priority).toBe(3);
      expect(result[1]?.priority).toBe(2);
      expect(result[2]?.priority).toBe(1);
    });
  });

  describe("due date sort", () => {
    it("should sort by due date ascending", () => {
      const date1 = new Date(2024, 0, 1); // January 1, 2024
      const date2 = new Date(2024, 1, 1); // February 1, 2024
      const date3 = new Date(2024, 2, 1); // March 1, 2024

      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          dueDate: date3,
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
          dueDate: date1,
        }),
        createTask({
          id: createTaskId("33333333-3333-4333-8333-333333333333"),
          dueDate: date2,
        }),
      ];

      const viewState = {
        ...baseViewState,
        sortBy: "dueDate",
        sortDirection: "asc" as const,
      };
      const result = sortTasksByViewState([...tasks], viewState);

      expect(result[0]?.dueDate?.getMonth()).toBe(0); // January
      expect(result[1]?.dueDate?.getMonth()).toBe(1); // February
      expect(result[2]?.dueDate?.getMonth()).toBe(2); // March
    });

    it("should put tasks with no due date at the end when ascending", () => {
      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          dueDate: new Date("2024-02-01"),
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
        }), // No due date
        createTask({
          id: createTaskId("33333333-3333-4333-8333-333333333333"),
          dueDate: new Date("2024-01-01"),
        }),
      ];

      const viewState = {
        ...baseViewState,
        sortBy: "dueDate",
        sortDirection: "asc" as const,
      };
      const result = sortTasksByViewState([...tasks], viewState);

      expect(result[0]?.dueDate).toBeDefined();
      expect(result[1]?.dueDate).toBeDefined();
      expect(result[2]?.dueDate).toBeUndefined();
    });

    it("should put tasks with no due date at the beginning when descending", () => {
      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          dueDate: new Date("2024-02-01"),
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
        }), // No due date
        createTask({
          id: createTaskId("33333333-3333-4333-8333-333333333333"),
          dueDate: new Date("2024-01-01"),
        }),
      ];

      const viewState = {
        ...baseViewState,
        sortBy: "dueDate",
        sortDirection: "desc" as const,
      };
      const result = sortTasksByViewState([...tasks], viewState);

      expect(result[0]?.dueDate).toBeUndefined();
      expect(result[1]?.dueDate).toBeDefined();
      expect(result[2]?.dueDate).toBeDefined();
    });
  });

  describe("title sort", () => {
    it("should sort by title alphabetically ascending", () => {
      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          title: "Charlie",
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
          title: "Alice",
        }),
        createTask({
          id: createTaskId("33333333-3333-4333-8333-333333333333"),
          title: "Bob",
        }),
      ];

      const viewState = {
        ...baseViewState,
        sortBy: "title",
        sortDirection: "asc" as const,
      };
      const result = sortTasksByViewState([...tasks], viewState);

      expect(result[0]?.title).toBe("Alice");
      expect(result[1]?.title).toBe("Bob");
      expect(result[2]?.title).toBe("Charlie");
    });

    it("should sort by title alphabetically descending", () => {
      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          title: "Alice",
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
          title: "Charlie",
        }),
        createTask({
          id: createTaskId("33333333-3333-4333-8333-333333333333"),
          title: "Bob",
        }),
      ];

      const viewState = {
        ...baseViewState,
        sortBy: "title",
        sortDirection: "desc" as const,
      };
      const result = sortTasksByViewState([...tasks], viewState);

      expect(result[0]?.title).toBe("Charlie");
      expect(result[1]?.title).toBe("Bob");
      expect(result[2]?.title).toBe("Alice");
    });
  });

  describe("created date sort", () => {
    it("should sort by created date ascending", () => {
      const date1 = new Date(2024, 0, 1); // January 1, 2024
      const date2 = new Date(2024, 1, 1); // February 1, 2024
      const date3 = new Date(2024, 2, 1); // March 1, 2024

      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          createdAt: date3,
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
          createdAt: date1,
        }),
        createTask({
          id: createTaskId("33333333-3333-4333-8333-333333333333"),
          createdAt: date2,
        }),
      ];

      const viewState = {
        ...baseViewState,
        sortBy: "createdAt",
        sortDirection: "asc" as const,
      };
      const result = sortTasksByViewState([...tasks], viewState);

      expect(result[0]?.createdAt.getMonth()).toBe(0); // January
      expect(result[1]?.createdAt.getMonth()).toBe(1); // February
      expect(result[2]?.createdAt.getMonth()).toBe(2); // March
    });

    it("should sort by created date descending", () => {
      const date1 = new Date(2024, 0, 1); // January 1, 2024
      const date2 = new Date(2024, 1, 1); // February 1, 2024
      const date3 = new Date(2024, 2, 1); // March 1, 2024

      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          createdAt: date1,
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
          createdAt: date3,
        }),
        createTask({
          id: createTaskId("33333333-3333-4333-8333-333333333333"),
          createdAt: date2,
        }),
      ];

      const viewState = {
        ...baseViewState,
        sortBy: "createdAt",
        sortDirection: "desc" as const,
      };
      const result = sortTasksByViewState([...tasks], viewState);

      expect(result[0]?.createdAt.getMonth()).toBe(2); // March
      expect(result[1]?.createdAt.getMonth()).toBe(1); // February
      expect(result[2]?.createdAt.getMonth()).toBe(0); // January
    });
  });

  describe("status sort", () => {
    it("should sort by completion status ascending", () => {
      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          completed: true,
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
          completed: false,
        }),
        createTask({
          id: createTaskId("33333333-3333-4333-8333-333333333333"),
          completed: true,
        }),
      ];

      const viewState = {
        ...baseViewState,
        sortBy: "status",
        sortDirection: "asc" as const,
      };
      const result = sortTasksByViewState([...tasks], viewState);

      expect(result[0]?.completed).toBe(false);
      expect(result[1]?.completed).toBe(true);
      expect(result[2]?.completed).toBe(true);
    });

    it("should sort by completion status descending", () => {
      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          completed: false,
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
          completed: true,
        }),
        createTask({
          id: createTaskId("33333333-3333-4333-8333-333333333333"),
          completed: false,
        }),
      ];

      const viewState = {
        ...baseViewState,
        sortBy: "status",
        sortDirection: "desc" as const,
      };
      const result = sortTasksByViewState([...tasks], viewState);

      expect(result[0]?.completed).toBe(true);
      expect(result[1]?.completed).toBe(false);
      expect(result[2]?.completed).toBe(false);
    });
  });

  describe("array mutation", () => {
    it("should mutate the original array", () => {
      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          priority: 2,
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
          priority: 1,
        }),
      ];

      const viewState = {
        ...baseViewState,
        sortBy: "priority",
        sortDirection: "asc" as const,
      };
      const result = sortTasksByViewState(tasks, viewState);

      // Same reference
      expect(result).toBe(tasks);
      // Original array is sorted
      expect(tasks[0]?.priority).toBe(1);
      expect(tasks[1]?.priority).toBe(2);
    });
  });
});
