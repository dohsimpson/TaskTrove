/**
 * Auto-Rollover Tasks Test Suite
 *
 * Tests for autoRolloverTasksAtom - filters tasks with recurringMode: "autoRollover"
 * These are tasks that automatically roll forward and never appear overdue,
 * perfect for tracking habits and routines.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createStore } from "jotai";
import { autoRolloverTasksAtom } from "../data/tasks/filters";
import { queryClientAtom } from "../data/base/query";
import type { Task } from "@tasktrove/types/core";
import { INBOX_PROJECT_ID } from "@tasktrove/types/constants";
import { TASKS_QUERY_KEY } from "@tasktrove/constants";
import { TEST_TASK_ID_1, TEST_TASK_ID_2 } from "../utils/test-helpers";
import { createTaskId } from "@tasktrove/types/id";
import { QueryClient } from "@tanstack/react-query";

// Mock fetch globally
global.fetch = vi.fn();

describe("autoRolloverTasksAtom", () => {
  let store: ReturnType<typeof createStore>;
  let queryClient: QueryClient;

  beforeEach(() => {
    store = createStore();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    store.set(queryClientAtom, queryClient);

    // Mock process.env to avoid test mode in mutations
    vi.stubEnv("NODE_ENV", "development");

    // Mock window object so mutations don't think we're in test environment
    Object.defineProperty(global, "window", {
      value: {},
      writable: true,
    });

    vi.clearAllMocks();
  });

  const createTestTask = (overrides: Partial<Task> = {}): Task => ({
    id: TEST_TASK_ID_1,
    title: "Test Task",
    description: "",
    completed: false,
    priority: 4,
    createdAt: new Date("2024-01-10T10:00:00.000Z"),
    labels: [],
    subtasks: [],
    comments: [],
    projectId: INBOX_PROJECT_ID,
    recurring: "RRULE:FREQ=DAILY",
    recurringMode: "dueDate",
    dueDate: new Date("2024-01-15T00:00:00.000Z"),
    ...overrides,
  });

  it("should filter tasks with recurringMode autoRollover", () => {
    // Create mock tasks data
    const autoRolloverTask = createTestTask({
      id: TEST_TASK_ID_1,
      title: "Daily Meditation",
      recurringMode: "autoRollover",
    });

    const regularTask = createTestTask({
      id: TEST_TASK_ID_2,
      title: "Regular Task",
      recurringMode: "dueDate",
    });

    const completedTask = createTestTask({
      id: createTaskId("33345678-1234-4234-8234-123456789012"),
      title: "Completed Auto-Rollover Task",
      recurringMode: "autoRollover",
      completed: true,
    });

    const tasks = [autoRolloverTask, regularTask, completedTask];

    // Mock the tasks atom data
    queryClient.setQueryData(TASKS_QUERY_KEY, tasks);

    // Get the auto-rollover tasks
    const result = store.get(autoRolloverTasksAtom);

    // Should return only active tasks with autoRollover mode
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(autoRolloverTask.id);
    expect(result[0]?.recurringMode).toBe("autoRollover");
    expect(result[0]?.completed).toBe(false);
  });

  it("should return empty array when no auto-rollover tasks exist", () => {
    const regularTasks = [
      createTestTask({ recurringMode: "dueDate" }),
      createTestTask({ recurringMode: "completedAt" }),
    ];

    queryClient.setQueryData(TASKS_QUERY_KEY, regularTasks);

    const result = store.get(autoRolloverTasksAtom);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it("should exclude completed auto-rollover tasks", () => {
    const activeAutoRollover = createTestTask({
      id: TEST_TASK_ID_1,
      title: "Active Auto-Rollover",
      recurringMode: "autoRollover",
      completed: false,
    });

    const completedAutoRollover = createTestTask({
      id: TEST_TASK_ID_2,
      title: "Completed Auto-Rollover",
      recurringMode: "autoRollover",
      completed: true,
    });

    queryClient.setQueryData(TASKS_QUERY_KEY, [
      activeAutoRollover,
      completedAutoRollover,
    ]);

    const result = store.get(autoRolloverTasksAtom);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(activeAutoRollover.id);
    expect(result[0]?.completed).toBe(false);
  });

  it("should handle tasks without recurring mode", () => {
    const tasksWithoutRecurringMode = [
      createTestTask({ recurringMode: undefined, recurring: undefined }),
      createTestTask({ recurringMode: "dueDate", recurring: undefined }),
    ];

    queryClient.setQueryData(TASKS_QUERY_KEY, tasksWithoutRecurringMode);

    const result = store.get(autoRolloverTasksAtom);

    expect(result).toHaveLength(0);
  });

  it("should handle empty tasks array", () => {
    queryClient.setQueryData(TASKS_QUERY_KEY, []);

    const result = store.get(autoRolloverTasksAtom);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it("should include tasks with any due date when autoRollover", () => {
    const pastAutoRollover = createTestTask({
      id: TEST_TASK_ID_1,
      title: "Past Auto-Rollover",
      recurringMode: "autoRollover",
      dueDate: new Date("2024-01-10T00:00:00.000Z"), // Past date
    });

    const todayAutoRollover = createTestTask({
      id: TEST_TASK_ID_2,
      title: "Today Auto-Rollover",
      recurringMode: "autoRollover",
      dueDate: new Date("2024-01-15T00:00:00.000Z"), // Today
    });

    const futureAutoRollover = createTestTask({
      id: createTaskId("33345678-1234-4234-8234-123456789012"),
      title: "Future Auto-Rollover",
      recurringMode: "autoRollover",
      dueDate: new Date("2024-01-20T00:00:00.000Z"), // Future date
    });

    const noDueDateAutoRollover = createTestTask({
      id: createTaskId("44445678-1234-4234-8234-123456789012"),
      title: "No Due Date Auto-Rollover",
      recurringMode: "autoRollover",
      dueDate: undefined,
    });

    queryClient.setQueryData(TASKS_QUERY_KEY, [
      pastAutoRollover,
      todayAutoRollover,
      futureAutoRollover,
      noDueDateAutoRollover,
    ]);

    const result = store.get(autoRolloverTasksAtom);

    // Should include all active auto-rollover tasks regardless of due date
    expect(result).toHaveLength(4);
    expect(result.map((t) => t.title)).toEqual([
      "Past Auto-Rollover",
      "Today Auto-Rollover",
      "Future Auto-Rollover",
      "No Due Date Auto-Rollover",
    ]);
  });
});
