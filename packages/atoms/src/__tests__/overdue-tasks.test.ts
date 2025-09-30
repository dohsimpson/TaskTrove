/**
 * ⚠️  WEB API DEPENDENT - Overdue Tasks Test Suite
 *
 * Platform dependencies:
 * - TanStack Query for data fetching
 * - Global fetch API for network requests
 * - Browser-specific query client setup
 *
 * Tests for overdueTasksAtom date-only comparison logic
 *
 * Ensures that overdue task filtering correctly handles date-only comparisons
 * and ignores time components when determining if a task is overdue.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createStore } from "jotai";
import { v4 as uuidv4 } from "uuid";
import { overdueTasksAtom } from "../core/tasks";
import { queryClientAtom } from "../core/base";
import type { Task } from "@tasktrove/types";
import {
  createTaskId,
  createSectionId,
  INBOX_PROJECT_ID,
} from "@tasktrove/types";
import { TASKS_QUERY_KEY } from "@tasktrove/constants";
import { QueryClient } from "@tanstack/react-query";

// Mock fetch globally
global.fetch = vi.fn();

// Mock date utilities for predictable testing
const mockToday = new Date("2024-01-15T14:30:00.000Z"); // Monday, Jan 15, 2024 at 2:30 PM

// Helper to create local dates for testing (not UTC)
const createLocalDate = (
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
) => {
  return new Date(year, month - 1, day, hour, minute, second); // month is 0-indexed
};

describe("overdueTasksAtom", () => {
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

    // Mock the current date
    vi.setSystemTime(mockToday);

    vi.clearAllMocks();
  });

  const createTestTask = (dueDate: Date | null, title = "Test Task"): Task => ({
    id: createTaskId(uuidv4()),
    title,
    description: "",
    completed: false,
    priority: 4,
    createdAt: new Date("2024-01-10T10:00:00.000Z"),
    projectId: INBOX_PROJECT_ID,
    sectionId: createSectionId("00000000-0000-0000-0000-000000000000"),
    labels: [],
    subtasks: [],
    comments: [],
    attachments: [],
    dueDate: dueDate ?? undefined,
    dueTime: undefined,
    completedAt: undefined,
    recurringMode: "dueDate",
    favorite: false,
    status: "active",
    order: 0,
  });

  const setupTasksInQueryClient = (tasks: Task[]) => {
    queryClient.setQueryData(TASKS_QUERY_KEY, tasks);
  };

  describe("date-only comparison logic", () => {
    it("should NOT consider tasks due today as overdue", () => {
      // Task due today at different times should not be overdue
      const taskDueToday1 = createTestTask(
        createLocalDate(2024, 1, 15, 0, 0, 0),
        "Today at midnight",
      );
      const taskDueToday2 = createTestTask(
        createLocalDate(2024, 1, 15, 9, 30, 0),
        "Today at 9:30 AM",
      );
      const taskDueToday3 = createTestTask(
        createLocalDate(2024, 1, 15, 23, 59, 59),
        "Today at 11:59 PM",
      );

      const allTasks = [taskDueToday1, taskDueToday2, taskDueToday3];
      setupTasksInQueryClient(allTasks);

      const overdueTasks = store.get(overdueTasksAtom);
      expect(overdueTasks).toHaveLength(0);
    });

    it("should consider tasks due yesterday as overdue", () => {
      // Tasks due yesterday at different times should be overdue
      const taskDueYesterday1 = createTestTask(
        createLocalDate(2024, 1, 14, 0, 0, 0),
        "Yesterday at midnight",
      );
      const taskDueYesterday2 = createTestTask(
        createLocalDate(2024, 1, 14, 15, 45, 0),
        "Yesterday at 3:45 PM",
      );
      const taskDueYesterday3 = createTestTask(
        createLocalDate(2024, 1, 14, 23, 59, 59),
        "Yesterday at 11:59 PM",
      );

      const allTasks = [
        taskDueYesterday1,
        taskDueYesterday2,
        taskDueYesterday3,
      ];
      setupTasksInQueryClient(allTasks);

      const overdueTasks = store.get(overdueTasksAtom);
      expect(overdueTasks).toHaveLength(3);
      expect(overdueTasks.map((t) => t.title)).toEqual([
        "Yesterday at midnight",
        "Yesterday at 3:45 PM",
        "Yesterday at 11:59 PM",
      ]);
    });

    it("should NOT consider tasks due tomorrow as overdue", () => {
      // Tasks due tomorrow should not be overdue
      const taskDueTomorrow1 = createTestTask(
        createLocalDate(2024, 1, 16, 0, 0, 0),
        "Tomorrow at midnight",
      );
      const taskDueTomorrow2 = createTestTask(
        createLocalDate(2024, 1, 16, 12, 0, 0),
        "Tomorrow at noon",
      );

      const allTasks = [taskDueTomorrow1, taskDueTomorrow2];
      setupTasksInQueryClient(allTasks);

      const overdueTasks = store.get(overdueTasksAtom);
      expect(overdueTasks).toHaveLength(0);
    });

    it("should consider tasks due multiple days ago as overdue", () => {
      const taskDueLastWeek = createTestTask(
        createLocalDate(2024, 1, 8, 16, 20, 0),
        "Last Monday",
      );
      const taskDueLastMonth = createTestTask(
        createLocalDate(2023, 12, 15, 8, 0, 0),
        "Last month",
      );

      const allTasks = [taskDueLastWeek, taskDueLastMonth];
      setupTasksInQueryClient(allTasks);

      const overdueTasks = store.get(overdueTasksAtom);
      expect(overdueTasks).toHaveLength(2);
      expect(overdueTasks.map((t) => t.title)).toEqual([
        "Last Monday",
        "Last month",
      ]);
    });

    it("should NOT consider tasks with no due date as overdue", () => {
      const taskWithoutDueDate = createTestTask(null, "No due date");

      const allTasks = [taskWithoutDueDate];
      setupTasksInQueryClient(allTasks);

      const overdueTasks = store.get(overdueTasksAtom);
      expect(overdueTasks).toHaveLength(0);
    });

    it("should handle mixed scenarios correctly", () => {
      const taskDueYesterday = createTestTask(
        createLocalDate(2024, 1, 14, 10, 0, 0),
        "Overdue Task",
      );
      const taskDueToday = createTestTask(
        createLocalDate(2024, 1, 15, 15, 0, 0),
        "Due Today",
      );
      const taskDueTomorrow = createTestTask(
        createLocalDate(2024, 1, 16, 11, 0, 0),
        "Due Tomorrow",
      );
      const taskWithoutDate = createTestTask(null, "No Due Date");
      const taskDueLastWeek = createTestTask(
        createLocalDate(2024, 1, 7, 9, 0, 0),
        "Due Last Week",
      );

      const allTasks = [
        taskDueYesterday,
        taskDueToday,
        taskDueTomorrow,
        taskWithoutDate,
        taskDueLastWeek,
      ];
      setupTasksInQueryClient(allTasks);

      const overdueTasks = store.get(overdueTasksAtom);
      expect(overdueTasks).toHaveLength(2);
      expect(overdueTasks.map((t) => t.title)).toContain("Overdue Task");
      expect(overdueTasks.map((t) => t.title)).toContain("Due Last Week");
      expect(overdueTasks.map((t) => t.title)).not.toContain("Due Today");
      expect(overdueTasks.map((t) => t.title)).not.toContain("Due Tomorrow");
      expect(overdueTasks.map((t) => t.title)).not.toContain("No Due Date");
    });
  });

  describe("time zone edge cases", () => {
    it("should work correctly across different time zones", () => {
      // Test with dates that would be different days in different time zones
      const taskDueYesterdayUTC = createTestTask(
        createLocalDate(2024, 1, 14, 23, 0, 0),
        "Yesterday 11 PM local",
      );
      const taskDueTodayUTC = createTestTask(
        createLocalDate(2024, 1, 15, 1, 0, 0),
        "Today 1 AM local",
      );

      const allTasks = [taskDueYesterdayUTC, taskDueTodayUTC];
      setupTasksInQueryClient(allTasks);

      const overdueTasks = store.get(overdueTasksAtom);
      expect(overdueTasks).toHaveLength(1); // Only yesterday's task should be overdue
      const firstOverdueTask = overdueTasks[0];
      if (!firstOverdueTask) {
        throw new Error("Expected to find first overdue task");
      }
      expect(firstOverdueTask.title).toBe("Yesterday 11 PM local");
    });
  });

  describe("error handling", () => {
    it("should handle invalid dates gracefully", () => {
      // Create a task with an invalid date
      const taskWithInvalidDate = createTestTask(
        new Date("invalid"),
        "Invalid date task",
      );

      const allTasks = [taskWithInvalidDate];
      setupTasksInQueryClient(allTasks);

      // Should not throw an error and should handle gracefully
      expect(() => store.get(overdueTasksAtom)).not.toThrow();
      const overdueTasks = store.get(overdueTasksAtom);
      expect(Array.isArray(overdueTasks)).toBe(true);
    });
  });
});
