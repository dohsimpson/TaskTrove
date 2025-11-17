/**
 * Effective Due Date Tests
 *
 * Tests for effective due date calculation and auto-rollover functionality.
 * Consolidates all effective due date related tests into a single file.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { addDays } from "date-fns";
import type { Task } from "@tasktrove/types/core";
import { createTaskId } from "@tasktrove/types/id";
import { getEffectiveDueDate } from "./effective-due-date";

// Mock current date for consistent testing
const MOCK_CURRENT_DATE = new Date("2024-01-15T10:00:00Z");

// Helper to create test tasks
function createTestTask(overrides: Partial<Task> = {}): Task {
  return {
    id: createTaskId("550e8400-e29b-41d4-a716-446655440000"),
    title: "Test Task",
    completed: false,
    priority: 1,
    labels: [],
    subtasks: [],
    comments: [],
    createdAt: new Date("2024-01-01T00:00:00Z"),
    dueDate: new Date("2024-01-10T00:00:00Z"),
    recurring: "RRULE:FREQ=DAILY;INTERVAL=1",
    recurringMode: "autoRollover",
    ...overrides,
  };
}

// Mock date utilities
function mockCurrentDate(date: Date) {
  vi.setSystemTime(date);
}

describe("Effective Due Date", () => {
  beforeEach(() => {
    mockCurrentDate(MOCK_CURRENT_DATE);
  });

  describe("getEffectiveDueDate", () => {
    it("should return original due date for non-auto-rollover tasks", () => {
      const task = createTestTask({
        recurringMode: "dueDate",
        dueDate: new Date("2024-01-20T00:00:00Z"),
      });

      const result = getEffectiveDueDate(task);
      expect(result).toEqual(new Date("2024-01-20T00:00:00Z"));
    });

    it("should return next occurrence for auto-rollover tasks when original date is past", () => {
      const task = createTestTask({
        dueDate: new Date("2024-01-10T00:00:00Z"), // 5 days ago
        recurring: "RRULE:FREQ=DAILY;INTERVAL=1",
        recurringMode: "autoRollover",
      });

      const result = getEffectiveDueDate(task);
      expect(result).toEqual(new Date("2024-01-16T00:00:00Z")); // Next occurrence after today
    });

    it("should return next day for auto-rollover tasks when date is today", () => {
      const task = createTestTask({
        dueDate: new Date("2024-01-15T00:00:00Z"), // Today
        recurring: "RRULE:FREQ=DAILY;INTERVAL=1",
        recurringMode: "autoRollover",
      });

      const result = getEffectiveDueDate(task);
      expect(result).toEqual(new Date("2024-01-16T00:00:00Z")); // Next day
    });

    it("should return original date for auto-rollover tasks when date is future", () => {
      const task = createTestTask({
        dueDate: new Date("2024-01-20T00:00:00Z"), // Future
        recurring: "RRULE:FREQ=DAILY;INTERVAL=1",
        recurringMode: "autoRollover",
      });

      const result = getEffectiveDueDate(task);
      expect(result).toEqual(new Date("2024-01-20T00:00:00Z")); // Should stay future
    });

    it("should handle weekly recurring patterns", () => {
      const task = createTestTask({
        dueDate: new Date("2024-01-09T00:00:00Z"), // Last Tuesday
        recurring: "RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=TU",
        recurringMode: "autoRollover",
      });

      const result = getEffectiveDueDate(task);
      expect(result).toEqual(new Date("2024-01-16T00:00:00.000Z")); // Next Tuesday
    });

    it("should return null for tasks without due dates", () => {
      const task = createTestTask({
        dueDate: undefined,
        recurring: "RRULE:FREQ=DAILY;INTERVAL=1",
        recurringMode: "autoRollover",
      });

      const result = getEffectiveDueDate(task);
      expect(result).toBeNull();
    });

    it("should return original due date for non-recurring auto-rollover tasks", () => {
      const task = createTestTask({
        dueDate: new Date("2024-01-10T00:00:00Z"),
        recurring: undefined, // No recurring pattern
        recurringMode: "autoRollover",
      });

      const result = getEffectiveDueDate(task);
      expect(result).toEqual(new Date("2024-01-10T00:00:00Z"));
    });

    it("should handle multiple days overdue", () => {
      const task = createTestTask({
        dueDate: new Date("2024-01-01T00:00:00Z"), // 14 days ago
        recurring: "RRULE:FREQ=DAILY;INTERVAL=1",
        recurringMode: "autoRollover",
      });

      const result = getEffectiveDueDate(task);
      expect(result).toEqual(new Date("2024-01-16T00:00:00Z")); // Next day after rolling forward
    });
  });

  describe("Task Completion with Virtual Due Dates", () => {
    it("should use virtual due date as the completion date", () => {
      const task = createTestTask({
        dueDate: new Date("2024-01-10T00:00:00Z"), // 5 days ago
        recurring: "RRULE:FREQ=DAILY;INTERVAL=1",
        recurringMode: "autoRollover",
      });

      const effectiveDueDate = getEffectiveDueDate(task);
      expect(effectiveDueDate).toEqual(new Date("2024-01-16T00:00:00Z")); // Next occurrence

      // Simulate completion: completed task should use virtual due date
      const completedTask: Task = {
        ...task,
        completed: true,
        completedAt: new Date(),
        dueDate: effectiveDueDate || undefined, // ← This is what we're testing
      };

      expect(completedTask.dueDate).toEqual(new Date("2024-01-16T00:00:00Z"));
      expect(completedTask.completed).toBe(true);
      expect(completedTask.completedAt).toBeDefined();
    });

    it("should preserve original due date for non-auto-rollover tasks", () => {
      const task = createTestTask({
        dueDate: new Date("2024-01-10T00:00:00Z"),
        recurring: "RRULE:FREQ=DAILY;INTERVAL=1",
        recurringMode: "dueDate", // Regular mode
      });

      const effectiveDueDate = getEffectiveDueDate(task);
      expect(effectiveDueDate).toEqual(new Date("2024-01-10T00:00:00Z")); // Same as original

      // Regular task completion should use original due date
      const completedTask: Task = {
        ...task,
        completed: true,
        completedAt: new Date(),
      };

      expect(completedTask.dueDate).toEqual(new Date("2024-01-10T00:00:00Z"));
    });

    it("should handle auto-rollover task with today's virtual due date", () => {
      const task = createTestTask({
        dueDate: new Date("2024-01-15T00:00:00Z"), // Today
        recurring: "RRULE:FREQ=DAILY;INTERVAL=1",
        recurringMode: "autoRollover",
      });

      const effectiveDueDate = getEffectiveDueDate(task);
      expect(effectiveDueDate).toEqual(new Date("2024-01-16T00:00:00Z")); // Gets next day

      const completedTask: Task = {
        ...task,
        completed: true,
        completedAt: new Date(),
        dueDate: effectiveDueDate || undefined,
      };

      expect(completedTask.dueDate).toEqual(new Date("2024-01-16T00:00:00Z"));
    });

    it("should handle auto-rollover task with future virtual due date", () => {
      const task = createTestTask({
        dueDate: new Date("2024-01-20T00:00:00Z"), // Future
        recurring: "RRULE:FREQ=DAILY;INTERVAL=1",
        recurringMode: "autoRollover",
      });

      const effectiveDueDate = getEffectiveDueDate(task);
      expect(effectiveDueDate).toEqual(new Date("2024-01-20T00:00:00Z")); // Same as original

      const completedTask: Task = {
        ...task,
        completed: true,
        completedAt: new Date(),
        dueDate: effectiveDueDate || undefined,
      };

      expect(completedTask.dueDate).toEqual(new Date("2024-01-20T00:00:00Z"));
    });
  });

  describe("Route Integration Tests", () => {
    it("should use virtual due date for completed auto-rollover tasks", () => {
      // Test the actual logic from the route
      const originalTask = createTestTask({
        dueDate: new Date("2024-01-10T00:00:00Z"), // Past due date
        recurring: "RRULE:FREQ=DAILY;INTERVAL=1",
        recurringMode: "autoRollover",
      });

      // User sees virtual due date
      const effectiveDueDate = getEffectiveDueDate(originalTask);
      expect(effectiveDueDate).toEqual(new Date("2024-01-16T00:00:00Z"));

      // User completes the task
      const completedTask = {
        ...originalTask,
        completed: true,
        completedAt: new Date(),
      };

      // Apply the route logic
      if (originalTask.recurringMode === "autoRollover") {
        const effectiveDueDateForCompletion = getEffectiveDueDate(originalTask);
        if (effectiveDueDateForCompletion) {
          completedTask.dueDate = effectiveDueDateForCompletion;
        }
      }

      // The completed task should use the virtual due date
      expect(completedTask.dueDate).toEqual(new Date("2024-01-16T00:00:00Z"));
      expect(completedTask.completed).toBe(true);
    });

    it("should preserve original due date for non-auto-rollover tasks", () => {
      const originalTask = createTestTask({
        dueDate: new Date("2024-01-10T00:00:00Z"), // Past due date
        recurring: "RRULE:FREQ=DAILY;INTERVAL=1",
        recurringMode: "dueDate", // Regular mode
      });

      const completedTask = {
        ...originalTask,
        completed: true,
        completedAt: new Date(),
      };

      // No modification for non-auto-rollover tasks
      expect(completedTask.dueDate).toEqual(new Date("2024-01-10T00:00:00Z"));
    });

    it("should use future virtual due date for future-due auto-rollover tasks", () => {
      const originalTask = createTestTask({
        dueDate: new Date("2024-01-20T00:00:00Z"), // Future due date
        recurring: "RRULE:FREQ=DAILY;INTERVAL=1",
        recurringMode: "autoRollover",
      });

      const effectiveDueDate = getEffectiveDueDate(originalTask);
      expect(effectiveDueDate).toEqual(new Date("2024-01-20T00:00:00Z")); // Same as original

      const completedTask = {
        ...originalTask,
        completed: true,
        completedAt: new Date(),
      };

      if (originalTask.recurringMode === "autoRollover") {
        const effectiveDueDateForCompletion = getEffectiveDueDate(originalTask);
        if (effectiveDueDateForCompletion) {
          completedTask.dueDate = effectiveDueDateForCompletion;
        }
      }

      expect(completedTask.dueDate).toEqual(new Date("2024-01-20T00:00:00Z"));
    });
  });

  describe("Next Instance Calculation", () => {
    it("should calculate next instance from virtual due date", () => {
      // Simulate the completion scenario:
      // Original task due Jan 10, today is Jan 15, virtual due date is Jan 16
      const originalTask = createTestTask({
        dueDate: new Date("2024-01-10T00:00:00Z"),
        recurring: "RRULE:FREQ=DAILY;INTERVAL=1",
        recurringMode: "autoRollover",
      });

      const effectiveDueDate = getEffectiveDueDate(originalTask);
      expect(effectiveDueDate).toEqual(new Date("2024-01-16T00:00:00Z"));

      // Complete task using virtual due date
      const completedTask: Task = {
        ...originalTask,
        completed: true,
        completedAt: new Date("2024-01-15T10:00:00Z"),
        dueDate: effectiveDueDate || undefined, // Using virtual due date!
      };

      // Next instance should be calculated from virtual due date (Jan 16) + 1 day = Jan 17
      const expectedNextDueDate = addDays(effectiveDueDate || new Date(), 1);
      expect(expectedNextDueDate).toEqual(new Date("2024-01-17T00:00:00Z"));

      // In real implementation, the next instance would be:
      const nextInstance: Partial<Task> = {
        ...completedTask,
        id: createTaskId("550e8400-e29b-41d4-a716-446655440001"),
        completed: false,
        completedAt: undefined,
        dueDate: expectedNextDueDate,
      };

      expect(nextInstance.dueDate).toEqual(new Date("2024-01-17T00:00:00Z"));
    });
  });
});
