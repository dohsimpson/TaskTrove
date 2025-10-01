/**
 * ⚠️  WEB API DEPENDENT - Delete Task Mutation Test Suite
 *
 * Platform dependencies:
 * - Global fetch API for HTTP requests
 * - Window object and localStorage
 * - Process environment variables (NODE_ENV)
 * - TanStack Query for mutations
 * - Web-specific error handling and logging
 * - Toast notifications
 * - Sound playing APIs
 * - Service worker notifications
 *
 * Tests for Delete Task Mutation Atom
 *
 * Tests the new deleteTaskMutationAtom and verifies proper implementation
 * of the delete task functionality with API persistence.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createStore } from "jotai";
import { taskAtoms } from "../core/tasks";
import { deleteTaskMutationAtom } from "../core/base";
import {
  createTaskId,
  createSubtaskId,
  createSectionId,
  INBOX_PROJECT_ID,
} from "@tasktrove/types";
import {
  createMockTask,
  TEST_TASK_ID_1,
  TEST_TASK_ID_2,
} from "../utils/test-helpers";

// Mock the atoms package logger to avoid console noise in tests
vi.mock("@tasktrove/atoms/utils", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  // Re-export other utils that might be needed
  createAtomWithStorage: vi.fn(() => {
    const mockAtom = vi.fn() as any;
    mockAtom.debugLabel = "";
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

// Mock the audio utils
vi.mock("../../utils/audio", () => ({
  playSound: vi.fn().mockResolvedValue(undefined),
}));

interface MockedProcessEnv {
  NODE_ENV: string;
}

// Type guards for test utilities

function isProcessEnvMockable(env: unknown): env is MockedProcessEnv {
  return typeof env === "object" && env !== null && "NODE_ENV" in env;
}

function setMockedNodeEnv(value: string | undefined): void {
  if (!isProcessEnvMockable(process.env)) {
    throw new Error("process.env is not mockable");
  }
  vi.stubEnv("NODE_ENV", value || "test");
}

// Mock the fetch API for API calls
global.fetch = vi.fn();
const mockedFetch = vi.mocked(global.fetch);

let store: ReturnType<typeof createStore>;

/**
 * Reset test environment before each test
 */
function resetTestEnvironment(): void {
  store = createStore();
  vi.clearAllMocks();

  // Reset fetch mock
  mockedFetch.mockReset();
}

describe("Delete Task Mutation Tests", () => {
  beforeEach(() => {
    resetTestEnvironment();
    // Mock window to simulate browser environment for non-test-env tests
    Object.defineProperty(global, "window", {
      value: { localStorage: { getItem: vi.fn(), setItem: vi.fn() } },
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("deleteTaskMutationAtom", () => {
    it("should exist and be callable", () => {
      // Verify the atom exists and can be retrieved
      const deleteTaskMutation = store.get(deleteTaskMutationAtom);

      expect(deleteTaskMutation).toBeDefined();
      expect(typeof deleteTaskMutation.mutateAsync).toBe("function");
    });

    it("should handle successful API deletion in production environment", async () => {
      const mockTaskId = TEST_TASK_ID_1;
      const mockResponse = {
        success: true,
        taskIds: [mockTaskId],
        message: "Task deleted successfully",
      };

      // Set NODE_ENV to production to avoid test environment bypass
      const originalEnv = process.env.NODE_ENV;
      setMockedNodeEnv("production");

      try {
        // Mock successful API response with proper Response interface
        const mockFetchResponse: Partial<Response> = {
          ok: true,
          json: () => Promise.resolve(mockResponse),
        };
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        mockedFetch.mockResolvedValueOnce(mockFetchResponse as Response);

        // Get the mutation atom
        const deleteTaskMutation = store.get(deleteTaskMutationAtom);

        // Execute the mutation
        const result = await deleteTaskMutation.mutateAsync({
          ids: [mockTaskId],
        });

        // Verify the API was called correctly
        expect(global.fetch).toHaveBeenCalledWith("/api/v1/tasks", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids: [mockTaskId] }),
        });

        // Verify the response
        expect(result).toEqual(mockResponse);
        expect(result.success).toBe(true);
        expect(result.taskIds).toContain(mockTaskId);
      } finally {
        setMockedNodeEnv(originalEnv);
      }
    });

    it("should handle API errors gracefully in production environment", async () => {
      const mockTaskId = TEST_TASK_ID_1;

      // Set NODE_ENV to production to avoid test environment bypass
      const originalEnv = process.env.NODE_ENV;
      setMockedNodeEnv("production");

      try {
        // Mock API error response with proper Response interface
        const mockErrorResponse: Partial<Response> = {
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: () =>
            Promise.resolve({
              error: "Database connection failed",
              message: "Failed to delete task",
            }),
        };
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        mockedFetch.mockResolvedValueOnce(mockErrorResponse as Response);

        // Get the mutation atom
        const deleteTaskMutation = store.get(deleteTaskMutationAtom);

        // Execute the mutation and expect it to throw
        await expect(
          deleteTaskMutation.mutateAsync({ ids: [mockTaskId] }),
        ).rejects.toThrow("Failed API request: Failed to delete task");

        // Verify the API was called
        expect(global.fetch).toHaveBeenCalledWith("/api/v1/tasks", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids: [mockTaskId] }),
        });
      } finally {
        setMockedNodeEnv(originalEnv);
      }
    });

    it("should handle test environment correctly", async () => {
      const mockTaskId = TEST_TASK_ID_1;

      // Set test environment
      const originalEnv = process.env.NODE_ENV;
      setMockedNodeEnv("test");

      try {
        // Get the mutation atom
        const deleteTaskMutation = store.get(deleteTaskMutationAtom);

        // Execute the mutation
        const result = await deleteTaskMutation.mutateAsync({
          ids: [mockTaskId],
        });

        // Verify test mode response
        expect(result.success).toBe(true);
        expect(result.taskIds).toEqual([mockTaskId]);
        expect(result.message).toBe("Task deleted successfully (test mode)");

        // Verify fetch was not called in test mode
        expect(global.fetch).not.toHaveBeenCalled();
      } finally {
        setMockedNodeEnv(originalEnv);
      }
    });

    it("should handle network errors in production environment", async () => {
      const mockTaskId = TEST_TASK_ID_1;

      // Set NODE_ENV to production to avoid test environment bypass
      const originalEnv = process.env.NODE_ENV;
      setMockedNodeEnv("production");

      try {
        // Mock network error
        mockedFetch.mockRejectedValueOnce(new Error("Network error"));

        // Get the mutation atom
        const deleteTaskMutation = store.get(deleteTaskMutationAtom);

        // Execute the mutation and expect it to throw
        await expect(
          deleteTaskMutation.mutateAsync({ ids: [mockTaskId] }),
        ).rejects.toThrow("Network error");

        // Verify the API was called
        expect(global.fetch).toHaveBeenCalledWith("/api/v1/tasks", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids: [mockTaskId] }),
        });
      } finally {
        setMockedNodeEnv(originalEnv);
      }
    });
  });

  describe("deleteTaskAtom integration", () => {
    it("should be exported and callable", () => {
      // Verify the deleteTask atom is available in taskAtoms
      expect(taskAtoms.actions.deleteTask).toBeDefined();

      // Test that the atom exists
      const deleteTaskAtom = taskAtoms.actions.deleteTask;
      expect(deleteTaskAtom).toBeDefined();
    });

    it("should handle non-existent task gracefully", async () => {
      const nonExistentTaskId = createTaskId(
        "12345678-1234-4234-8234-123456789abc",
      );

      // This should not throw even if task doesn't exist
      await expect(
        store.set(taskAtoms.actions.deleteTask, nonExistentTaskId),
      ).resolves.not.toThrow();
    });

    it("should work in test environment without API calls", async () => {
      const mockTask = createMockTask({
        id: TEST_TASK_ID_2,
        title: "Test Environment Task",
      });

      // Set test environment
      const originalEnv = process.env.NODE_ENV;
      setMockedNodeEnv("test");

      try {
        // Execute the delete task action
        await store.set(taskAtoms.actions.deleteTask, mockTask.id);

        // Verify fetch was not called in test mode
        expect(global.fetch).not.toHaveBeenCalled();
      } finally {
        setMockedNodeEnv(originalEnv);
      }
    });
  });

  describe("Export verification", () => {
    it("should export deleteTaskMutationAtom correctly", () => {
      // Verify that the mutation atom is properly exported
      expect(deleteTaskMutationAtom).toBeDefined();

      // Verify it can be retrieved from store
      const mutation = store.get(deleteTaskMutationAtom);
      expect(mutation).toBeDefined();
      expect(typeof mutation.mutateAsync).toBe("function");
    });

    it("should include deleteTaskMutation in taskAtoms actions", () => {
      // Verify the mutation is available in the taskAtoms structure
      expect(taskAtoms.actions.deleteTaskMutation).toBeDefined();
      expect(taskAtoms.actions.deleteTaskMutation).toBe(deleteTaskMutationAtom);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid operations gracefully", async () => {
      // Test invalid task operations don't crash the system
      expect(() => {
        store.set(
          taskAtoms.actions.deleteTask,
          createTaskId("12345678-1234-4234-8234-123456789abc"),
        );
      }).not.toThrow();

      expect(() => {
        store.set(
          taskAtoms.actions.deleteTask,
          createTaskId("87654321-4321-4321-8321-210987654321"),
        );
      }).not.toThrow();
    });

    it("should log appropriate messages for different error scenarios in production", async () => {
      const { log } = (await vi.importMock("@tasktrove/atoms/utils")) as any;
      const mockTaskId = TEST_TASK_ID_2;

      // Set NODE_ENV to production to avoid test environment bypass
      const originalEnv = process.env.NODE_ENV;
      setMockedNodeEnv("production");

      try {
        // Mock API error with proper Response interface
        const mockErrorResponse: Partial<Response> = {
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: () =>
            Promise.resolve({
              error: "Database error",
              message: "Failed to delete",
            }),
        };
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        mockedFetch.mockResolvedValueOnce(mockErrorResponse as Response);

        // Get the mutation atom
        const deleteTaskMutation = store.get(deleteTaskMutationAtom);

        // Execute the mutation and catch the error
        try {
          await deleteTaskMutation.mutateAsync({ ids: [mockTaskId] });
        } catch {
          // Expected to throw
        }

        // Verify error logging (mocked)
        expect(log.error).toHaveBeenCalled();
      } finally {
        setMockedNodeEnv(originalEnv);
      }
    });
  });

  describe("Type Safety", () => {
    it("should have proper TypeScript types", () => {
      // Verify the atoms have proper types and can be used safely
      const deleteTaskMutation = store.get(deleteTaskMutationAtom);
      const deleteTaskAtom = taskAtoms.actions.deleteTask;

      // These should be defined and have the right shape
      expect(deleteTaskMutation).toBeDefined();
      expect(deleteTaskAtom).toBeDefined();

      // Verify mutation has expected methods
      expect(typeof deleteTaskMutation.mutateAsync).toBe("function");
      expect(typeof deleteTaskMutation.mutate).toBe("function");
    });
  });
});
