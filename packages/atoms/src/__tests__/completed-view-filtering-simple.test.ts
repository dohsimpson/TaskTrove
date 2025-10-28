/**
 * ⚠️  WEB API DEPENDENT - Completed View Filtering Test Suite
 *
 * Platform dependencies:
 * - TanStack Query for data management and caching
 * - Global fetch API for mocking HTTP requests
 * - Window object for environment detection
 * - Process environment variables (NODE_ENV)
 * - Web-specific view state management
 *
 * Simple tests for completed view filtering fix
 *
 * Tests the core fix: completed view should show completed tasks
 * even when showCompleted filter is false.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createStore } from "jotai";
import { filteredTasksAtom } from "../ui/filtered-tasks";
import { currentViewAtom, updateViewStateAtom } from "../ui/views";
import { setPathnameAtom } from "../ui/navigation";
import { queryClientAtom } from "../data/base/query";
import type { Task } from "@tasktrove/types/core";
import { createTaskId } from "@tasktrove/types/id";
import { INBOX_PROJECT_ID } from "@tasktrove/types/constants";
import { TASKS_QUERY_KEY } from "@tasktrove/constants";
import { QueryClient } from "@tanstack/react-query";

// Mock fetch globally
global.fetch = vi.fn();

let store: ReturnType<typeof createStore>;
let queryClient: QueryClient;

const activeTasks: Task[] = [
  {
    id: createTaskId("12345678-1234-4234-8234-123456789ab1"),
    title: "Active Task 1",
    completed: false,
    priority: 2,
    projectId: INBOX_PROJECT_ID,
    labels: [],
    subtasks: [],
    comments: [],
    createdAt: new Date("2024-01-01T12:00:00Z"),
    recurringMode: "dueDate",
  },
  {
    id: createTaskId("12345678-1234-4234-8234-123456789ab2"),
    title: "Active Task 2",
    completed: false,
    priority: 1,
    projectId: INBOX_PROJECT_ID,
    labels: [],
    subtasks: [],
    comments: [],
    createdAt: new Date("2024-01-01T13:00:00Z"),
    recurringMode: "dueDate",
  },
];

const completedTasks: Task[] = [
  {
    id: createTaskId("12345678-1234-4234-8234-123456789ab3"),
    title: "Completed Task 1",
    completed: true,
    completedAt: new Date("2024-01-01T14:00:00Z"),
    priority: 2,
    projectId: INBOX_PROJECT_ID,
    labels: [],
    subtasks: [],
    comments: [],
    createdAt: new Date("2024-01-01T12:00:00Z"),
    recurringMode: "dueDate",
  },
  {
    id: createTaskId("12345678-1234-4234-8234-123456789ab4"),
    title: "Completed Task 2",
    completed: true,
    completedAt: new Date("2024-01-01T15:00:00Z"),
    priority: 1,
    projectId: INBOX_PROJECT_ID,
    labels: [],
    subtasks: [],
    comments: [],
    createdAt: new Date("2024-01-01T13:00:00Z"),
    recurringMode: "dueDate",
  },
];

const allTasks = [...activeTasks, ...completedTasks];

beforeEach(() => {
  store = createStore();
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  store.set(queryClientAtom, queryClient);

  // Setup initial data in query client
  queryClient.setQueryData(TASKS_QUERY_KEY, allTasks);

  // Mock process.env to avoid test mode in mutations
  vi.stubEnv("NODE_ENV", "development");

  // Mock window object so mutations don't think we're in test environment
  Object.defineProperty(global, "window", {
    value: {},
    writable: true,
  });

  vi.clearAllMocks();
});

describe("Completed View Filtering Fix", () => {
  describe("Core Bug Fix", () => {
    it("should show completed tasks in completed view even when showCompleted is false", () => {
      // Set up completed view - must set pathname for route-reactive filtering
      store.set(setPathnameAtom, "/completed");
      store.set(currentViewAtom, "completed");

      // Set showCompleted to false (this was causing the bug)
      store.set(updateViewStateAtom, {
        viewId: "completed",
        updates: { showCompleted: false },
      });

      const filteredTasks = store.get(filteredTasksAtom);

      // Should show completed tasks despite showCompleted = false
      expect(filteredTasks).toHaveLength(2);
      expect(filteredTasks.every((task: Task) => task.completed)).toBe(true);
      expect(filteredTasks.map((t: Task) => t.title)).toEqual([
        "Completed Task 1",
        "Completed Task 2",
      ]);
    });

    it("should show completed tasks in completed view when showCompleted is true", () => {
      // Set up completed view - must set pathname for route-reactive filtering
      store.set(setPathnameAtom, "/completed");
      store.set(currentViewAtom, "completed");

      // Set showCompleted to true
      store.set(updateViewStateAtom, {
        viewId: "completed",
        updates: { showCompleted: true },
      });

      const filteredTasks = store.get(filteredTasksAtom);

      // Should show completed tasks
      expect(filteredTasks).toHaveLength(2);
      expect(filteredTasks.every((task: Task) => task.completed)).toBe(true);
      expect(filteredTasks.map((t: Task) => t.title)).toEqual([
        "Completed Task 1",
        "Completed Task 2",
      ]);
    });

    it("should filter out completed tasks in other views when showCompleted is false", () => {
      // Set up inbox view
      store.set(currentViewAtom, "inbox");

      // Set showCompleted to false
      store.set(updateViewStateAtom, {
        viewId: "inbox",
        updates: { showCompleted: false },
      });

      const filteredTasks = store.get(filteredTasksAtom);

      // Should only show active tasks
      expect(filteredTasks).toHaveLength(2);
      expect(filteredTasks.every((task: Task) => !task.completed)).toBe(true);
      expect(filteredTasks.map((t: Task) => t.title)).toEqual([
        "Active Task 1",
        "Active Task 2",
      ]);
    });

    it("should show all tasks in other views when showCompleted is true", () => {
      // Set up inbox view
      store.set(currentViewAtom, "inbox");

      // Set showCompleted to true
      store.set(updateViewStateAtom, {
        viewId: "inbox",
        updates: { showCompleted: true },
      });

      const filteredTasks = store.get(filteredTasksAtom);

      // Should show all tasks
      expect(filteredTasks).toHaveLength(4);
      expect(filteredTasks.some((task: Task) => task.completed)).toBe(true);
      expect(filteredTasks.some((task: Task) => !task.completed)).toBe(true);
    });
  });

  describe("Bug Regression Test", () => {
    it("should reproduce and fix the original bug scenario", () => {
      // This is the exact scenario that was reported:
      // 1. Tasks exist with completed: true and completedAt set
      // 2. User navigates to completed view
      // 3. showCompleted is false (default state in many cases)
      // 4. Before fix: filteredTasksAtom would filter out completed tasks -> empty list
      // 5. After fix: completed view override should show completed tasks

      const bugTask: Task = {
        id: createTaskId("12345678-1234-4234-8234-123456789ab9"),
        title: "Task completed today",
        completed: true,
        completedAt: new Date(), // Completed today
        priority: 2,
        projectId: INBOX_PROJECT_ID,
        labels: [],
        subtasks: [],
        comments: [],
        createdAt: new Date("2024-01-01T12:00:00Z"),
        recurringMode: "dueDate",
      };

      queryClient.setQueryData(TASKS_QUERY_KEY, [bugTask]);

      // Navigate to completed view with showCompleted = false (bug scenario)
      store.set(currentViewAtom, "completed");
      store.set(updateViewStateAtom, {
        viewId: "completed",
        updates: { showCompleted: false }, // This would cause the bug
      });

      const filteredTasks = store.get(filteredTasksAtom);

      // With the fix, this should now show the completed task
      expect(filteredTasks).toHaveLength(1);
      const firstTask = filteredTasks[0];
      if (!firstTask) {
        throw new Error("Expected to find first filtered task");
      }
      expect(firstTask.id).toBe(bugTask.id);
      expect(firstTask.completed).toBe(true);
      expect(firstTask.title).toBe("Task completed today");

      // Before the fix, this would have been:
      // expect(filteredTasks).toHaveLength(0); // Bug: No tasks found
    });
  });
});
