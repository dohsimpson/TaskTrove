/**
 * Tests for view state filtering utilities
 */

import { describe, it, expect } from "vitest";
import { applyViewStateFilters } from "./view-filters";
import type { Task, ViewState, ViewId } from "@tasktrove/types";
import { createTaskId, createProjectId, createLabelId } from "@tasktrove/types";

describe("applyViewStateFilters", () => {
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

  describe("showCompleted filter", () => {
    it("should include completed tasks when showCompleted is true", () => {
      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          completed: true,
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
          completed: false,
        }),
      ];

      const result = applyViewStateFilters(tasks, baseViewState, "all");

      expect(result).toHaveLength(2);
    });

    it("should exclude completed tasks when showCompleted is false", () => {
      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          completed: true,
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
          completed: false,
        }),
      ];

      const viewState = { ...baseViewState, showCompleted: false };
      const result = applyViewStateFilters(tasks, viewState, "all");

      expect(result).toHaveLength(1);
      expect(result[0]?.completed).toBe(false);
    });
  });

  describe("showOverdue filter", () => {
    it("should include overdue tasks when showOverdue is true", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          dueDate: yesterday,
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
        }),
      ];

      const result = applyViewStateFilters(tasks, baseViewState, "all");

      expect(result).toHaveLength(2);
    });

    it("should exclude overdue tasks when showOverdue is false", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          dueDate: yesterday,
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
        }),
      ];

      const viewState = { ...baseViewState, showOverdue: false };
      const result = applyViewStateFilters(tasks, viewState, "all");

      expect(result).toHaveLength(1);
      expect(result[0]?.dueDate).toBeUndefined();
    });

    it("should include tasks due today even when showOverdue is false", () => {
      const today = new Date();

      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          dueDate: today,
        }),
      ];

      const viewState = { ...baseViewState, showOverdue: false };
      const result = applyViewStateFilters(tasks, viewState, "all");

      expect(result).toHaveLength(1);
    });
  });

  describe("search query filter", () => {
    it("should filter by title", () => {
      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          title: "Buy groceries",
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
          title: "Call doctor",
        }),
      ];

      const viewState = { ...baseViewState, searchQuery: "groceries" };
      const result = applyViewStateFilters(tasks, viewState, "all");

      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe("Buy groceries");
    });

    it("should filter by description", () => {
      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          description: "Get milk and eggs",
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
          description: "Schedule appointment",
        }),
      ];

      const viewState = { ...baseViewState, searchQuery: "milk" };
      const result = applyViewStateFilters(tasks, viewState, "all");

      expect(result).toHaveLength(1);
      expect(result[0]?.description).toBe("Get milk and eggs");
    });

    it("should be case insensitive", () => {
      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          title: "Buy Groceries",
        }),
      ];

      const viewState = { ...baseViewState, searchQuery: "groceries" };
      const result = applyViewStateFilters(tasks, viewState, "all");

      expect(result).toHaveLength(1);
    });
  });

  describe("label filters", () => {
    const labelId1 = createLabelId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    const labelId2 = createLabelId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");

    it("should filter by specific labels", () => {
      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          labels: [labelId1],
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
          labels: [labelId2],
        }),
        createTask({
          id: createTaskId("33333333-3333-4333-8333-333333333333"),
          labels: [],
        }),
      ];

      const viewState = {
        ...baseViewState,
        activeFilters: { labels: [labelId1] },
      };
      const result = applyViewStateFilters(tasks, viewState, "all");

      expect(result).toHaveLength(1);
      expect(result[0]?.labels).toContain(labelId1);
    });

    it("should show only tasks with no labels when labels filter is null", () => {
      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          labels: [labelId1],
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
          labels: [],
        }),
      ];

      const viewState = {
        ...baseViewState,
        activeFilters: { labels: null },
      };
      const result = applyViewStateFilters(tasks, viewState, "all");

      expect(result).toHaveLength(1);
      expect(result[0]?.labels).toHaveLength(0);
    });

    it("should show all tasks when labels filter is empty array", () => {
      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          labels: [labelId1],
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
          labels: [],
        }),
      ];

      const viewState = {
        ...baseViewState,
        activeFilters: { labels: [] },
      };
      const result = applyViewStateFilters(tasks, viewState, "all");

      expect(result).toHaveLength(2);
    });
  });

  describe("priority filter", () => {
    it("should filter by priority", () => {
      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          priority: 1,
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
          priority: 2,
        }),
        createTask({
          id: createTaskId("33333333-3333-4333-8333-333333333333"),
          priority: 4,
        }),
      ];

      const viewState = {
        ...baseViewState,
        activeFilters: { priorities: [1, 2] as (1 | 2 | 3 | 4)[] },
      };
      const result = applyViewStateFilters(tasks, viewState, "all");

      expect(result).toHaveLength(2);
      expect(result.every((t) => t.priority === 1 || t.priority === 2)).toBe(
        true,
      );
    });
  });

  describe("completed view special case", () => {
    it("should return all tasks for completed view regardless of other filters", () => {
      const tasks = [
        createTask({
          id: createTaskId("11111111-1111-4111-8111-111111111111"),
          completed: true,
        }),
        createTask({
          id: createTaskId("22222222-2222-4222-8222-222222222222"),
          completed: false,
        }),
      ];

      const viewState = { ...baseViewState, showCompleted: false };
      const result = applyViewStateFilters(tasks, viewState, "completed");

      expect(result).toHaveLength(2);
    });
  });
});
