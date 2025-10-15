/**
 * Tests for pure filter utility functions
 *
 * These tests verify filtering logic in complete isolation from atoms and UI state.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  filterTasksByCompleted,
  filterTasksByOverdue,
  filterTasksBySearch,
  filterTasksByProjects,
  filterTasksByLabels,
  filterTasksByPriorities,
  filterTasksByCompletionStatus,
  filterTasksByDueDate,
  filterTasks,
  viewStateToFilterConfig,
  type FilterConfig,
} from "./filters";
import type { Task, ViewState } from "@tasktrove/types";
import { createTaskId, createProjectId, createLabelId } from "@tasktrove/types";

// =============================================================================
// TEST FIXTURES
// =============================================================================

// Mock current time to 2024-01-15 12:00:00 UTC for consistent date comparisons
const MOCK_NOW = new Date("2024-01-15T12:00:00Z");
const now = MOCK_NOW;
const today = new Date("2024-01-15T00:00:00Z"); // Start of day
const yesterday = new Date("2024-01-14T12:00:00Z");
const tomorrow = new Date("2024-01-16T12:00:00Z");
const nextWeek = new Date("2024-01-22T12:00:00Z");

// Set up fake timers at the module level so all tests use consistent time
beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MOCK_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

const projectId1 = createProjectId("10000000-0000-4000-8000-000000000001");
const projectId2 = createProjectId("20000000-0000-4000-8000-000000000002");
const labelId1 = createLabelId("30000000-0000-4000-8000-000000000011");
const labelId2 = createLabelId("40000000-0000-4000-8000-000000000012");

function createTestTask(overrides: Partial<Task> = {}): Task {
  return {
    id: createTaskId("50000000-0000-4000-8000-000000000099"),
    title: "Test Task",
    description: "",
    completed: false,
    priority: 3,
    labels: [],
    subtasks: [],
    comments: [],
    createdAt: now,
    recurringMode: "dueDate",
    ...overrides,
  };
}

// =============================================================================
// FILTER BY COMPLETED
// =============================================================================

describe("filterTasksByCompleted", () => {
  it("should return all tasks when showCompleted is true", () => {
    const tasks: Task[] = [
      createTestTask({ completed: true }),
      createTestTask({ completed: false }),
    ];

    const result = filterTasksByCompleted(tasks, true);
    expect(result).toHaveLength(2);
  });

  it("should filter out completed tasks when showCompleted is false", () => {
    const tasks: Task[] = [
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000001"),
        completed: true,
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000002"),
        completed: false,
      }),
    ];

    const result = filterTasksByCompleted(tasks, false);
    expect(result).toHaveLength(1);
    expect(result[0]?.completed).toBe(false);
  });

  it("should handle empty array", () => {
    const result = filterTasksByCompleted([], false);
    expect(result).toHaveLength(0);
  });

  it("should handle all completed tasks with showCompleted false", () => {
    const tasks: Task[] = [
      createTestTask({ completed: true }),
      createTestTask({ completed: true }),
    ];

    const result = filterTasksByCompleted(tasks, false);
    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// FILTER BY OVERDUE
// =============================================================================

describe("filterTasksByOverdue", () => {
  it("should return all tasks when showOverdue is true", () => {
    const tasks: Task[] = [
      createTestTask({ dueDate: yesterday }),
      createTestTask({ dueDate: tomorrow }),
    ];

    const result = filterTasksByOverdue(tasks, true);
    expect(result).toHaveLength(2);
  });

  it("should filter out overdue uncompleted tasks when showOverdue is false", () => {
    const tasks: Task[] = [
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000001"),
        dueDate: yesterday,
        completed: false,
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000002"),
        dueDate: tomorrow,
        completed: false,
      }),
    ];

    const result = filterTasksByOverdue(tasks, false);
    expect(result).toHaveLength(1);
    expect(result[0]?.dueDate).toEqual(tomorrow);
  });

  it("should keep overdue completed tasks when showOverdue is false", () => {
    const tasks: Task[] = [
      createTestTask({
        dueDate: yesterday,
        completed: true,
      }),
    ];

    const result = filterTasksByOverdue(tasks, false);
    expect(result).toHaveLength(1);
  });

  it("should keep tasks without due dates", () => {
    const tasks: Task[] = [
      createTestTask({ dueDate: undefined }),
      createTestTask({ dueDate: yesterday, completed: false }),
    ];

    const result = filterTasksByOverdue(tasks, false);
    expect(result).toHaveLength(1);
    expect(result[0]?.dueDate).toBeUndefined();
  });

  it("should handle empty array", () => {
    const result = filterTasksByOverdue([], false);
    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// FILTER BY SEARCH
// =============================================================================

describe("filterTasksBySearch", () => {
  it("should return all tasks when search query is empty", () => {
    const tasks: Task[] = [
      createTestTask({ title: "Task 1" }),
      createTestTask({ title: "Task 2" }),
    ];

    expect(filterTasksBySearch(tasks, "")).toHaveLength(2);
    expect(filterTasksBySearch(tasks, "   ")).toHaveLength(2);
  });

  it("should filter tasks by title (case-insensitive)", () => {
    const tasks: Task[] = [
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000001"),
        title: "Buy groceries",
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000002"),
        title: "Write report",
      }),
    ];

    const result = filterTasksBySearch(tasks, "buy");
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Buy groceries");

    const resultUpper = filterTasksBySearch(tasks, "BUY");
    expect(resultUpper).toHaveLength(1);
  });

  it("should filter tasks by description (case-insensitive)", () => {
    const tasks: Task[] = [
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000001"),
        title: "Task 1",
        description: "Important meeting notes",
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000002"),
        title: "Task 2",
        description: "Draft proposal",
      }),
    ];

    const result = filterTasksBySearch(tasks, "meeting");
    expect(result).toHaveLength(1);
    expect(result[0]?.description).toBe("Important meeting notes");
  });

  it("should match tasks with query in title OR description", () => {
    const tasks: Task[] = [
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000001"),
        title: "Meeting prep",
        description: "Prepare slides",
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000002"),
        title: "Write report",
        description: "Meeting notes",
      }),
    ];

    const result = filterTasksBySearch(tasks, "meeting");
    expect(result).toHaveLength(2);
  });

  it("should handle tasks without description", () => {
    const tasks: Task[] = [
      createTestTask({
        title: "Task with description",
        description: "test",
      }),
      createTestTask({
        title: "Task without description",
        description: undefined,
      }),
    ];

    const result = filterTasksBySearch(tasks, "test");
    expect(result).toHaveLength(1);
  });

  it("should handle empty array", () => {
    const result = filterTasksBySearch([], "query");
    expect(result).toHaveLength(0);
  });

  it("should trim search query", () => {
    const tasks: Task[] = [createTestTask({ title: "Test task" })];

    const result = filterTasksBySearch(tasks, "  test  ");
    expect(result).toHaveLength(1);
  });
});

// =============================================================================
// FILTER BY PROJECTS
// =============================================================================

describe("filterTasksByProjects", () => {
  it("should return all tasks when projectIds is undefined", () => {
    const tasks: Task[] = [
      createTestTask({ projectId: projectId1 }),
      createTestTask({ projectId: projectId2 }),
    ];

    const result = filterTasksByProjects(tasks, undefined);
    expect(result).toHaveLength(2);
  });

  it("should return all tasks when projectIds is empty array", () => {
    const tasks: Task[] = [
      createTestTask({ projectId: projectId1 }),
      createTestTask({ projectId: projectId2 }),
    ];

    const result = filterTasksByProjects(tasks, []);
    expect(result).toHaveLength(2);
  });

  it("should filter tasks by single project", () => {
    const tasks: Task[] = [
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000001"),
        projectId: projectId1,
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000002"),
        projectId: projectId2,
      }),
    ];

    const result = filterTasksByProjects(tasks, [projectId1]);
    expect(result).toHaveLength(1);
    expect(result[0]?.projectId).toBe(projectId1);
  });

  it("should filter tasks by multiple projects", () => {
    const projectId3 = createProjectId("60000000-0000-4000-8000-000000000003");
    const tasks: Task[] = [
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000001"),
        projectId: projectId1,
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000002"),
        projectId: projectId2,
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000003"),
        projectId: projectId3,
      }),
    ];

    const result = filterTasksByProjects(tasks, [projectId1, projectId2]);
    expect(result).toHaveLength(2);
  });

  it("should filter out tasks without projectId", () => {
    const tasks: Task[] = [
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000001"),
        projectId: projectId1,
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000002"),
        projectId: undefined,
      }),
    ];

    const result = filterTasksByProjects(tasks, [projectId1]);
    expect(result).toHaveLength(1);
  });

  it("should handle empty array", () => {
    const result = filterTasksByProjects([], [projectId1]);
    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// FILTER BY LABELS
// =============================================================================

describe("filterTasksByLabels", () => {
  it("should return all tasks when labels is undefined", () => {
    const tasks: Task[] = [
      createTestTask({ labels: [labelId1] }),
      createTestTask({ labels: [labelId2] }),
    ];

    const result = filterTasksByLabels(tasks, undefined);
    expect(result).toHaveLength(2);
  });

  it("should filter for tasks with no labels when labels is null", () => {
    const tasks: Task[] = [
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000001"),
        labels: [],
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000002"),
        labels: [labelId1],
      }),
    ];

    const result = filterTasksByLabels(tasks, null);
    expect(result).toHaveLength(1);
    expect(result[0]?.labels).toHaveLength(0);
  });

  it("should return all tasks when labels is empty array", () => {
    const tasks: Task[] = [
      createTestTask({ labels: [labelId1] }),
      createTestTask({ labels: [labelId2] }),
    ];

    const result = filterTasksByLabels(tasks, []);
    expect(result).toHaveLength(2);
  });

  it("should filter tasks by single label", () => {
    const tasks: Task[] = [
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000001"),
        labels: [labelId1],
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000002"),
        labels: [labelId2],
      }),
    ];

    const result = filterTasksByLabels(tasks, [labelId1]);
    expect(result).toHaveLength(1);
    expect(result[0]?.labels).toContain(labelId1);
  });

  it("should filter tasks by multiple labels (OR logic)", () => {
    const labelId3 = createLabelId("60000000-0000-4000-8000-000000000013");
    const tasks: Task[] = [
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000001"),
        labels: [labelId1],
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000002"),
        labels: [labelId2],
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000003"),
        labels: [labelId3],
      }),
    ];

    const result = filterTasksByLabels(tasks, [labelId1, labelId2]);
    expect(result).toHaveLength(2);
  });

  it("should match tasks with multiple labels if one matches", () => {
    const tasks: Task[] = [
      createTestTask({
        labels: [labelId1, labelId2],
      }),
    ];

    const result = filterTasksByLabels(tasks, [labelId1]);
    expect(result).toHaveLength(1);
  });

  it("should handle empty array", () => {
    const result = filterTasksByLabels([], [labelId1]);
    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// FILTER BY PRIORITIES
// =============================================================================

describe("filterTasksByPriorities", () => {
  it("should return all tasks when priorities is undefined", () => {
    const tasks: Task[] = [
      createTestTask({ priority: 1 }),
      createTestTask({ priority: 2 }),
    ];

    const result = filterTasksByPriorities(tasks, undefined);
    expect(result).toHaveLength(2);
  });

  it("should return all tasks when priorities is empty array", () => {
    const tasks: Task[] = [
      createTestTask({ priority: 1 }),
      createTestTask({ priority: 2 }),
    ];

    const result = filterTasksByPriorities(tasks, []);
    expect(result).toHaveLength(2);
  });

  it("should filter tasks by single priority", () => {
    const tasks: Task[] = [
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000001"),
        priority: 1,
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000002"),
        priority: 2,
      }),
    ];

    const result = filterTasksByPriorities(tasks, [1]);
    expect(result).toHaveLength(1);
    expect(result[0]?.priority).toBe(1);
  });

  it("should filter tasks by multiple priorities", () => {
    const tasks: Task[] = [
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000001"),
        priority: 1,
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000002"),
        priority: 2,
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000003"),
        priority: 3,
      }),
    ];

    const result = filterTasksByPriorities(tasks, [1, 2]);
    expect(result).toHaveLength(2);
  });

  it("should handle all priority levels", () => {
    const tasks: Task[] = [
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000001"),
        priority: 1,
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000002"),
        priority: 2,
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000003"),
        priority: 3,
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000004"),
        priority: 4,
      }),
    ];

    const result = filterTasksByPriorities(tasks, [1, 2, 3, 4]);
    expect(result).toHaveLength(4);
  });

  it("should handle empty array", () => {
    const result = filterTasksByPriorities([], [1]);
    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// FILTER BY COMPLETION STATUS
// =============================================================================

describe("filterTasksByCompletionStatus", () => {
  it("should return all tasks when completed is undefined", () => {
    const tasks: Task[] = [
      createTestTask({ completed: true }),
      createTestTask({ completed: false }),
    ];

    const result = filterTasksByCompletionStatus(tasks, undefined);
    expect(result).toHaveLength(2);
  });

  it("should filter for completed tasks when completed is true", () => {
    const tasks: Task[] = [
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000001"),
        completed: true,
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000002"),
        completed: false,
      }),
    ];

    const result = filterTasksByCompletionStatus(tasks, true);
    expect(result).toHaveLength(1);
    expect(result[0]?.completed).toBe(true);
  });

  it("should filter for incomplete tasks when completed is false", () => {
    const tasks: Task[] = [
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000001"),
        completed: true,
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000002"),
        completed: false,
      }),
    ];

    const result = filterTasksByCompletionStatus(tasks, false);
    expect(result).toHaveLength(1);
    expect(result[0]?.completed).toBe(false);
  });

  it("should handle empty array", () => {
    const result = filterTasksByCompletionStatus([], true);
    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// FILTER BY DUE DATE
// =============================================================================

describe("filterTasksByDueDate", () => {
  const today = new Date("2024-01-15T00:00:00Z");
  const yesterdayLocal = new Date("2024-01-14T12:00:00Z");
  const tomorrowLocal = new Date("2024-01-16T12:00:00Z");
  const twoDaysFromNow = new Date("2024-01-17T12:00:00Z");
  const endOfWeek = new Date("2024-01-21T23:59:59Z"); // Sunday

  it("should return all tasks when dueDateFilter is undefined", () => {
    const tasks: Task[] = [
      createTestTask({ dueDate: yesterday }),
      createTestTask({ dueDate: tomorrow }),
    ];

    const result = filterTasksByDueDate(tasks, undefined);
    expect(result).toHaveLength(2);
  });

  describe("preset: overdue", () => {
    it("should filter for overdue incomplete tasks", () => {
      const tasks: Task[] = [
        createTestTask({
          id: createTaskId("60000000-0000-4000-8000-000000000001"),
          dueDate: yesterdayLocal,
          completed: false,
        }),
        createTestTask({
          id: createTaskId("60000000-0000-4000-8000-000000000002"),
          dueDate: tomorrowLocal,
          completed: false,
        }),
      ];

      const result = filterTasksByDueDate(tasks, { preset: "overdue" });
      expect(result).toHaveLength(1);
      expect(result[0]?.dueDate).toEqual(yesterdayLocal);
    });

    it("should not include overdue completed tasks", () => {
      const tasks: Task[] = [
        createTestTask({
          dueDate: yesterdayLocal,
          completed: true,
        }),
      ];

      const result = filterTasksByDueDate(tasks, { preset: "overdue" });
      expect(result).toHaveLength(0);
    });
  });

  describe("preset: today", () => {
    it("should filter for tasks due today", () => {
      const tasks: Task[] = [
        createTestTask({
          id: createTaskId("60000000-0000-4000-8000-000000000001"),
          dueDate: today,
        }),
        createTestTask({
          id: createTaskId("60000000-0000-4000-8000-000000000002"),
          dueDate: tomorrowLocal,
        }),
      ];

      const result = filterTasksByDueDate(tasks, { preset: "today" });
      expect(result).toHaveLength(1);
    });
  });

  describe("preset: tomorrow", () => {
    it("should filter for tasks due tomorrow", () => {
      const tasks: Task[] = [
        createTestTask({
          id: createTaskId("60000000-0000-4000-8000-000000000001"),
          dueDate: today,
        }),
        createTestTask({
          id: createTaskId("60000000-0000-4000-8000-000000000002"),
          dueDate: tomorrowLocal,
        }),
        createTestTask({
          id: createTaskId("60000000-0000-4000-8000-000000000003"),
          dueDate: twoDaysFromNow,
        }),
      ];

      const result = filterTasksByDueDate(tasks, { preset: "tomorrow" });
      expect(result).toHaveLength(1);
      expect(result[0]?.dueDate).toEqual(tomorrowLocal);
    });
  });

  describe("preset: thisWeek", () => {
    it("should filter for tasks due this week", () => {
      const tasks: Task[] = [
        createTestTask({
          id: createTaskId("60000000-0000-4000-8000-000000000001"),
          dueDate: today,
        }),
        createTestTask({
          id: createTaskId("60000000-0000-4000-8000-000000000002"),
          dueDate: endOfWeek,
        }),
        createTestTask({
          id: createTaskId("60000000-0000-4000-8000-000000000003"),
          dueDate: nextWeek,
        }),
      ];

      const result = filterTasksByDueDate(tasks, { preset: "thisWeek" });
      expect(result).toHaveLength(2);
    });
  });

  describe("preset: nextWeek", () => {
    it("should filter for tasks due next week", () => {
      const tasks: Task[] = [
        createTestTask({
          id: createTaskId("60000000-0000-4000-8000-000000000001"),
          dueDate: today,
        }),
        createTestTask({
          id: createTaskId("60000000-0000-4000-8000-000000000002"),
          dueDate: nextWeek,
        }),
      ];

      const result = filterTasksByDueDate(tasks, { preset: "nextWeek" });
      expect(result).toHaveLength(1);
      expect(result[0]?.dueDate).toEqual(nextWeek);
    });
  });

  describe("preset: noDueDate", () => {
    it("should filter for tasks without due date", () => {
      const tasks: Task[] = [
        createTestTask({
          id: createTaskId("60000000-0000-4000-8000-000000000001"),
          dueDate: undefined,
        }),
        createTestTask({
          id: createTaskId("60000000-0000-4000-8000-000000000002"),
          dueDate: today,
        }),
      ];

      const result = filterTasksByDueDate(tasks, { preset: "noDueDate" });
      expect(result).toHaveLength(1);
      expect(result[0]?.dueDate).toBeUndefined();
    });
  });

  describe("customRange", () => {
    it("should filter by start and end date", () => {
      const start = yesterday;
      const end = tomorrow;
      const tasks: Task[] = [
        createTestTask({
          id: createTaskId("60000000-0000-4000-8000-000000000001"),
          dueDate: new Date("2024-01-13T12:00:00Z"),
        }),
        createTestTask({
          id: createTaskId("60000000-0000-4000-8000-000000000002"),
          dueDate: today,
        }),
        createTestTask({
          id: createTaskId("60000000-0000-4000-8000-000000000003"),
          dueDate: new Date("2024-01-18T12:00:00Z"),
        }),
      ];

      const result = filterTasksByDueDate(tasks, {
        customRange: { start, end },
      });
      expect(result).toHaveLength(1);
    });

    it("should filter by start date only", () => {
      const start = today;
      const tasks: Task[] = [
        createTestTask({
          id: createTaskId("60000000-0000-4000-8000-000000000001"),
          dueDate: yesterday,
        }),
        createTestTask({
          id: createTaskId("60000000-0000-4000-8000-000000000002"),
          dueDate: tomorrow,
        }),
      ];

      const result = filterTasksByDueDate(tasks, {
        customRange: { start },
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.dueDate).toEqual(tomorrow);
    });

    it("should filter by end date only", () => {
      const end = today;
      const tasks: Task[] = [
        createTestTask({
          id: createTaskId("60000000-0000-4000-8000-000000000001"),
          dueDate: yesterday,
        }),
        createTestTask({
          id: createTaskId("60000000-0000-4000-8000-000000000002"),
          dueDate: tomorrow,
        }),
      ];

      const result = filterTasksByDueDate(tasks, {
        customRange: { end },
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.dueDate).toEqual(yesterday);
    });
  });

  it("should handle empty array", () => {
    const result = filterTasksByDueDate([], { preset: "today" });
    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// COMPREHENSIVE FILTER
// =============================================================================

describe("filterTasks", () => {
  it("should return all tasks with empty config", () => {
    const tasks: Task[] = [createTestTask(), createTestTask()];

    const result = filterTasks(tasks, {});
    expect(result).toHaveLength(2);
  });

  it("should apply showCompleted filter", () => {
    const tasks: Task[] = [
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000001"),
        completed: true,
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000002"),
        completed: false,
      }),
    ];

    const result = filterTasks(tasks, { showCompleted: false });
    expect(result).toHaveLength(1);
    expect(result[0]?.completed).toBe(false);
  });

  it("should apply multiple filters in combination", () => {
    const tasks: Task[] = [
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000001"),
        title: "Buy groceries",
        completed: false,
        priority: 1,
        projectId: projectId1,
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000002"),
        title: "Write report",
        completed: true,
        priority: 2,
        projectId: projectId1,
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000003"),
        title: "Buy milk",
        completed: false,
        priority: 1,
        projectId: projectId2,
      }),
    ];

    const config: FilterConfig = {
      showCompleted: false,
      searchQuery: "buy",
      priorities: [1],
      projectIds: [projectId1],
    };

    const result = filterTasks(tasks, config);
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Buy groceries");
  });

  it("should handle all filters being applied", () => {
    const tasks: Task[] = [
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000001"),
        title: "Important task",
        description: "Very important",
        completed: false,
        priority: 1,
        projectId: projectId1,
        labels: [labelId1],
        dueDate: tomorrow,
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000002"),
        title: "Other task",
        completed: true,
      }),
    ];

    const config: FilterConfig = {
      showCompleted: false,
      showOverdue: true,
      searchQuery: "important",
      projectIds: [projectId1],
      labels: [labelId1],
      priorities: [1],
      dueDateFilter: { customRange: { start: today, end: nextWeek } },
    };

    const result = filterTasks(tasks, config);
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Important task");
  });

  it("should return empty array when no tasks match filters", () => {
    const tasks: Task[] = [
      createTestTask({ title: "Task 1", priority: 1 }),
      createTestTask({ title: "Task 2", priority: 2 }),
    ];

    const config: FilterConfig = {
      searchQuery: "nonexistent",
    };

    const result = filterTasks(tasks, config);
    expect(result).toHaveLength(0);
  });

  it("should handle empty task array", () => {
    const config: FilterConfig = {
      showCompleted: false,
      searchQuery: "test",
    };

    const result = filterTasks([], config);
    expect(result).toHaveLength(0);
  });

  it("should apply filters sequentially (order matters)", () => {
    const tasks: Task[] = [
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000001"),
        title: "Completed high priority",
        completed: true,
        priority: 1,
      }),
      createTestTask({
        id: createTaskId("60000000-0000-4000-8000-000000000002"),
        title: "Incomplete high priority",
        completed: false,
        priority: 1,
      }),
    ];

    // showCompleted filters first, then priority
    const result = filterTasks(tasks, {
      showCompleted: false,
      priorities: [1],
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.completed).toBe(false);
  });
});

// =============================================================================
// BRIDGE FUNCTIONS
// =============================================================================

describe("viewStateToFilterConfig", () => {
  it("should extract basic filter config from ViewState", () => {
    const viewState: ViewState = {
      viewMode: "list",
      sortBy: "priority",
      sortDirection: "asc",
      showCompleted: false,
      showOverdue: true,
      searchQuery: "test query",
      showSidePanel: false,
      compactView: false,
    };

    const config = viewStateToFilterConfig(viewState);

    expect(config.showCompleted).toBe(false);
    expect(config.showOverdue).toBe(true);
    expect(config.searchQuery).toBe("test query");
  });

  it("should extract activeFilters from ViewState", () => {
    const viewState: ViewState = {
      viewMode: "list",
      sortBy: "priority",
      sortDirection: "asc",
      showCompleted: true,
      showOverdue: true,
      searchQuery: "",
      showSidePanel: false,
      compactView: false,
      activeFilters: {
        projectIds: [projectId1],
        labels: [labelId1],
        priorities: [1, 2],
        completed: false,
      },
    };

    const config = viewStateToFilterConfig(viewState);

    expect(config.projectIds).toEqual([projectId1]);
    expect(config.labels).toEqual([labelId1]);
    expect(config.priorities).toEqual([1, 2]);
    expect(config.completed).toBe(false);
  });

  it("should handle ViewState without activeFilters", () => {
    const viewState: ViewState = {
      viewMode: "kanban",
      sortBy: "dueDate",
      sortDirection: "desc",
      showCompleted: true,
      showOverdue: false,
      searchQuery: "",
      showSidePanel: true,
      compactView: true,
    };

    const config = viewStateToFilterConfig(viewState);

    expect(config.showCompleted).toBe(true);
    expect(config.showOverdue).toBe(false);
    expect(config.projectIds).toBeUndefined();
    expect(config.labels).toBeUndefined();
  });

  it("should handle ViewState with dueDateFilter", () => {
    const viewState: ViewState = {
      viewMode: "list",
      sortBy: "priority",
      sortDirection: "asc",
      showCompleted: true,
      showOverdue: true,
      searchQuery: "",
      showSidePanel: false,
      compactView: false,
      activeFilters: {
        dueDateFilter: {
          preset: "today",
        },
      },
    };

    const config = viewStateToFilterConfig(viewState);

    expect(config.dueDateFilter?.preset).toBe("today");
  });

  it("should handle ViewState with custom date range", () => {
    const start = new Date("2024-01-15");
    const end = new Date("2024-01-20");

    const viewState: ViewState = {
      viewMode: "list",
      sortBy: "priority",
      sortDirection: "asc",
      showCompleted: true,
      showOverdue: true,
      searchQuery: "",
      showSidePanel: false,
      compactView: false,
      activeFilters: {
        dueDateFilter: {
          customRange: { start, end },
        },
      },
    };

    const config = viewStateToFilterConfig(viewState);

    expect(config.dueDateFilter?.customRange?.start).toEqual(start);
    expect(config.dueDateFilter?.customRange?.end).toEqual(end);
  });

  it("should handle labels as null (no labels filter)", () => {
    const viewState: ViewState = {
      viewMode: "list",
      sortBy: "priority",
      sortDirection: "asc",
      showCompleted: true,
      showOverdue: true,
      searchQuery: "",
      showSidePanel: false,
      compactView: false,
      activeFilters: {
        labels: null,
      },
    };

    const config = viewStateToFilterConfig(viewState);

    expect(config.labels).toBeNull();
  });
});
