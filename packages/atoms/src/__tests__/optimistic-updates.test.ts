/**
 * ⚠️  WEB API DEPENDENT - Optimistic Updates Test Suite
 *
 * Platform dependencies:
 * - Global fetch API for HTTP requests
 * - Window object detection for environment switching
 * - Process environment variables (NODE_ENV)
 * - TanStack Query for mutations and cache management
 * - Web-specific error handling and rollback mechanisms
 *
 * Tests for optimistic updates in task mutations
 *
 * These tests verify the smart optimistic update behavior and server response integration
 * that was implemented to fix task completion state synchronization issues.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createStore } from "jotai";
import { updateTasksMutationAtom, queryClientAtom } from "../core/base";
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

let store: ReturnType<typeof createStore>;
let queryClient: QueryClient;

const mockTask: Task = {
  id: createTaskId("12345678-1234-4234-8234-123456789ab1"),
  title: "Test Task",
  description: "Test description",
  completed: false,
  priority: 2,
  projectId: INBOX_PROJECT_ID,
  labels: [],
  subtasks: [],
  comments: [],
  attachments: [],
  createdAt: new Date("2024-01-01T12:00:00Z"),
  recurringMode: "dueDate",
  status: "active",
  order: 0,
};

const mockCompletedTask: Task = {
  ...mockTask,
  id: createTaskId("12345678-1234-4234-8234-123456789ab2"),
  title: "Completed Test Task",
  completed: true,
  completedAt: new Date("2024-01-01T14:00:00Z"),
  recurringMode: "dueDate",
};

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
  queryClient.setQueryData(TASKS_QUERY_KEY, [mockTask, mockCompletedTask]);

  // Mock process.env to avoid test mode in mutations
  vi.stubEnv("NODE_ENV", "development");

  // Mock window object so mutations don't think we're in test environment
  Object.defineProperty(global, "window", {
    value: {},
    writable: true,
  });

  vi.clearAllMocks();
});

describe("Optimistic Updates", () => {
  describe("Smart Optimistic Updates", () => {
    it("should set completedAt when task transitions from incomplete to complete", async () => {
      const mutation = store.get(updateTasksMutationAtom);

      // Mock successful API response
      const mockResponse = {
        success: true,
        taskIds: [mockTask.id],
        message: "Task updated successfully",
      };

      const mockFetchResponse: Partial<Response> = {
        ok: true,
        json: () => Promise.resolve(mockResponse),
      };
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      vi.mocked(global.fetch).mockResolvedValueOnce(
        mockFetchResponse as Response,
      );

      // Update task to completed
      const taskUpdate = {
        id: mockTask.id,
        completed: true,
      };

      // Execute mutation
      await mutation.mutateAsync([taskUpdate]);

      // Check that optimistic update set completedAt
      const tasks = queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY);
      if (!tasks) {
        throw new Error("Tasks not found in query data");
      }
      const updatedTask = tasks.find((t: Task) => t.id === mockTask.id);

      if (!updatedTask) {
        throw new Error("Updated task not found in query data");
      }

      expect(updatedTask.completed).toBe(true);
      expect(updatedTask.completedAt).toBeInstanceOf(Date);
      expect(updatedTask.completedAt).toBeDefined();
    });

    it("should clear completedAt when task transitions from complete to incomplete", async () => {
      const mutation = store.get(updateTasksMutationAtom);

      // Mock successful API response
      const mockResponse = {
        success: true,
        taskIds: [mockTask.id],
        message: "Task updated successfully",
      };

      const mockFetchResponse: Partial<Response> = {
        ok: true,
        json: () => Promise.resolve(mockResponse),
      };
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      vi.mocked(global.fetch).mockResolvedValueOnce(
        mockFetchResponse as Response,
      );

      // Update completed task to incomplete
      const taskUpdate = {
        id: mockCompletedTask.id,
        completed: false,
      };

      // Execute mutation
      await mutation.mutateAsync([taskUpdate]);

      // Check that optimistic update cleared completedAt
      const tasks = queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY);
      if (!tasks) {
        throw new Error("Tasks not found in query data");
      }
      const updatedTask = tasks.find(
        (t: Task) => t.id === mockCompletedTask.id,
      );

      if (!updatedTask) {
        throw new Error("Updated task not found in query data");
      }

      expect(updatedTask.completed).toBe(false);
      expect(updatedTask.completedAt).toBeUndefined();
    });

    it("should not modify completedAt when completion status does not change", async () => {
      const mutation = store.get(updateTasksMutationAtom);

      // Mock successful API response
      const mockResponse = {
        success: true,
        taskIds: [mockTask.id],
        message: "Task updated successfully",
      };

      const mockFetchResponse: Partial<Response> = {
        ok: true,
        json: () => Promise.resolve(mockResponse),
      };
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      vi.mocked(global.fetch).mockResolvedValueOnce(
        mockFetchResponse as Response,
      );

      const originalCompletedAt = mockCompletedTask.completedAt;

      // Update task without changing completion status
      const taskUpdate = {
        id: mockCompletedTask.id,
        title: "Updated Title",
      };

      // Execute mutation
      await mutation.mutateAsync([taskUpdate]);

      // Check that completedAt was not modified
      const tasks = queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY);
      if (!tasks) {
        throw new Error("Tasks not found in query data");
      }
      const updatedTask = tasks.find(
        (t: Task) => t.id === mockCompletedTask.id,
      );

      if (!updatedTask) {
        throw new Error("Updated task not found in query data");
      }

      expect(updatedTask.title).toBe("Updated Title");
      expect(updatedTask.completedAt).toEqual(originalCompletedAt);
    });

    it("should handle multiple task updates with different completion transitions", async () => {
      const mutation = store.get(updateTasksMutationAtom);

      // Mock successful API response
      const mockResponse = {
        success: true,
        taskIds: [mockTask.id, mockCompletedTask.id],
        message: "Tasks updated successfully",
      };

      const mockFetchResponse: Partial<Response> = {
        ok: true,
        json: () => Promise.resolve(mockResponse),
      };
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      vi.mocked(global.fetch).mockResolvedValueOnce(
        mockFetchResponse as Response,
      );

      // Update both tasks with different completion transitions
      const taskUpdates = [
        { id: mockTask.id, completed: true }, // incomplete -> complete
        { id: mockCompletedTask.id, completed: false }, // complete -> incomplete
      ];

      // Execute mutation
      await mutation.mutateAsync(taskUpdates);

      // Check both tasks were updated correctly
      const tasks = queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY);
      if (!tasks) {
        throw new Error("Tasks not found in query data");
      }
      const task1 = tasks.find((t: Task) => t.id === mockTask.id);
      const task2 = tasks.find((t: Task) => t.id === mockCompletedTask.id);

      if (!task1) {
        throw new Error("Task 1 not found in query data");
      }
      if (!task2) {
        throw new Error("Task 2 not found in query data");
      }

      expect(task1.completed).toBe(true);
      expect(task1.completedAt).toBeInstanceOf(Date);

      expect(task2.completed).toBe(false);
      expect(task2.completedAt).toBeUndefined();
    });
  });

  describe("Error Handling", () => {
    it("should rollback optimistic updates on API error", async () => {
      const mutation = store.get(updateTasksMutationAtom);

      // Mock API error
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error("API Error"));

      // Store initial data for comparison
      const initialData = queryClient.getQueryData(TASKS_QUERY_KEY);

      // Update task
      const taskUpdate = {
        id: mockTask.id,
        completed: true,
      };

      // Execute mutation and expect it to fail
      await expect(mutation.mutateAsync([taskUpdate])).rejects.toThrow(
        "API Error",
      );

      // Check that data was rolled back
      const finalData = queryClient.getQueryData(TASKS_QUERY_KEY);
      expect(finalData).toEqual(initialData);
    });
  });

  describe("Network Boundary", () => {
    it("should use test mode when window is undefined", async () => {
      // Mock process.env for test environment
      vi.stubEnv("NODE_ENV", "test");

      // Remove window to trigger test mode condition - type-safe deletion
      const globalObj: Record<string, unknown> = global;
      if ("window" in globalObj) {
        delete globalObj.window;
      }

      const mutation = store.get(updateTasksMutationAtom);

      // Update task
      const taskUpdate = {
        id: mockTask.id,
        completed: true,
      };

      // Execute mutation
      const result = await mutation.mutateAsync([taskUpdate]);

      // Check test mode response
      expect(result.success).toBe(true);
      expect(result.taskIds).toEqual([taskUpdate.id]);
      expect(result.message).toContain("test mode");
    });
  });
});
