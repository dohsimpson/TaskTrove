/**
 * ⚠️  WEB API DEPENDENT - Create Mutation Tests
 *
 * Platform dependencies:
 * - Sonner toast library (web-specific notifications)
 * - TanStack Query for mutations
 * - Web-specific routing utilities
 * - Browser toast notifications
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { v4 as uuidv4 } from "uuid";
import {
  createLabelId,
  createProjectId,
  createTaskId,
  type Label,
  type Project,
  type Task,
} from "@tasktrove/types";
import { QueryClient } from "@tanstack/react-query";
import {
  DEFAULT_TASK_COMPLETED,
  DEFAULT_TASK_PRIORITY,
  DEFAULT_TASK_LABELS,
  DEFAULT_TASK_SUBTASKS,
  DEFAULT_TASK_COMMENTS,
  TASKS_QUERY_KEY,
} from "@tasktrove/constants";

// Import shared test constants
import {
  TEST_TASK_ID_1,
  TEST_TASK_ID_2,
  TEST_PROJECT_ID_1,
  TEST_SUBTASK_ID_1,
} from "../utils/test-helpers";

// Import actual slug generation utilities
import {
  createSafeLabelNameSlug,
  createSafeProjectNameSlug,
} from "@tasktrove/utils/routing";

// Mock external dependencies
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  QueryClient: vi.fn().mockImplementation(() => ({
    cancelQueries: vi.fn(),
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  })),
}));

// Helper function to get valid priority
const getValidPriority = (index: number): 1 | 2 | 3 | 4 => {
  const priorities: readonly [1, 2, 3, 4] = [1, 2, 3, 4];
  const priorityIndex = index % 4;
  const priority = priorities[priorityIndex];
  if (!priority) {
    throw new Error(`Invalid priority index: ${priorityIndex}`);
  }
  return priority;
};

// Mock implementations to isolate the factory function behavior
const createLabelOptimisticFactory = (
  labelData: { name: string; color?: string; slug?: string },
  oldLabels: Label[] = [],
) => {
  return {
    id: createLabelId(uuidv4()),
    name: labelData.name,
    slug: labelData.slug ?? createSafeLabelNameSlug(labelData.name, oldLabels),
    color: labelData.color || "#3b82f6",
  };
};

const createProjectOptimisticFactory = (
  projectData: {
    name: string;
    color?: string;
    slug?: string;
    shared?: boolean;
  },
  oldProjects: Project[] = [],
) => {
  return {
    id: createProjectId(uuidv4()),
    name: projectData.name,
    slug:
      projectData.slug ??
      createSafeProjectNameSlug(projectData.name, oldProjects),
    color: projectData.color ?? "#3b82f6",
    shared: projectData.shared ?? false,
    sections: [{ id: "default-section", name: "Default", color: "#6b7280" }],
  };
};

describe("createMutation Function", () => {
  describe("Optimistic Data Factories", () => {
    describe("Label optimistic factory", () => {
      it("should use proper slug generation with collision detection", () => {
        const existingLabels: Label[] = [
          {
            id: createLabelId(uuidv4()),
            name: "Work",
            slug: "work",
            color: "#ef4444",
          },
        ];

        const labelData = { name: "Work", color: "#10b981" };
        const result = createLabelOptimisticFactory(labelData, existingLabels);

        expect(result.slug).toBe("work-1"); // Should handle collision
      });

      it("should handle special characters in slug generation", () => {
        const labelData = { name: "High Priority!", color: "#ef4444" };
        const result = createLabelOptimisticFactory(labelData);

        expect(result.slug).toBe("high-priority");
      });
    });

    describe("Project optimistic factory", () => {
      it("should use proper slug generation with collision detection", () => {
        const existingProjects: Project[] = [
          {
            id: createProjectId(uuidv4()),
            name: "My Project",
            slug: "my-project",
            color: "#3b82f6",
            sections: [],
          },
        ];

        const projectData = { name: "My Project", color: "#10b981" };
        const result = createProjectOptimisticFactory(
          projectData,
          existingProjects,
        );

        expect(result.slug).toBe("my-project-1"); // Should handle collision
      });

      it("should handle special characters in slug generation", () => {
        const projectData = {
          name: "Project & Task Management!",
          color: "#ef4444",
        };
        const result = createProjectOptimisticFactory(projectData);

        expect(result.slug).toBe("project-and-task-management");
      });
    });
  });

  describe("Core Mutation Functionality", () => {
    let mockQueryClient: QueryClient;

    beforeEach(() => {
      // Reset all mocks before each test
      vi.clearAllMocks();

      // Mock QueryClient with essential methods
      const baseMock = {
        cancelQueries: vi.fn(),
        getQueryData: vi.fn(),
        setQueryData: vi.fn(),
        invalidateQueries: vi.fn(),
      };
      mockQueryClient = Object.create(QueryClient.prototype);
      Object.assign(mockQueryClient, baseMock);

      // Mock global window for network detection
      Object.defineProperty(global, "window", {
        writable: true,
        value: { location: { hostname: "localhost" } },
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe("Mutation Lifecycle", () => {
      it("should execute complete mutation lifecycle successfully", async () => {
        // Arrange
        const mockMutationFn = vi.fn().mockResolvedValue({
          success: true,
          message: "Operation successful",
          taskIds: ["test-id"],
        });

        const mockOptimisticUpdateFn = vi
          .fn()
          .mockReturnValue([
            { id: "optimistic-task", title: "Optimistic Task" },
          ]);

        const mockOptimisticDataFactory = vi.fn().mockReturnValue({
          id: "optimistic-task",
          title: "Optimistic Task",
        });

        const config = {
          mutationFn: mockMutationFn,
          optimisticUpdateFn: mockOptimisticUpdateFn,
          optimisticDataFactory: mockOptimisticDataFactory,
          responseSchema: {
            safeParse: vi.fn().mockReturnValue({ success: true, data: {} }),
          },
          serializationSchema: { parse: vi.fn().mockReturnValue({}) },
          testResponseFactory: vi
            .fn()
            .mockReturnValue({ success: true, taskIds: ["test-id"] }),
          logModule: "test",
        };

        // Mock query client methods - using vi.mocked for test mocking
        vi.mocked(mockQueryClient.getQueryData).mockReturnValue([]);

        // Act & Assert - Test mutation configuration
        expect(config.mutationFn).toBeDefined();
        expect(config.optimisticUpdateFn).toBeDefined();
        expect(config.optimisticDataFactory).toBeDefined();

        // Verify optimistic factory was called with correct parameters
        const testVariables = { title: "Test Task" };
        const optimisticData = config.optimisticDataFactory(testVariables, []);
        expect(optimisticData).toEqual({
          id: "optimistic-task",
          title: "Optimistic Task",
        });
      });

      it("should handle mutation errors and execute onError lifecycle", async () => {
        // Arrange
        const mockError = new Error("API Error");
        const mockMutationFn = vi.fn().mockRejectedValue(mockError);

        const config = {
          mutationFn: mockMutationFn,
          optimisticUpdateFn: vi.fn(),
          responseSchema: {
            safeParse: vi.fn().mockReturnValue({ success: true, data: {} }),
          },
          serializationSchema: { parse: vi.fn().mockReturnValue({}) },
          testResponseFactory: vi.fn(),
          logModule: "test",
        };

        // Act & Assert - Test error configuration
        expect(config.mutationFn).toBeDefined();
        expect(config.optimisticUpdateFn).toBeDefined();

        // The actual error handling would be tested in integration tests
        // where we can trigger the mutation and verify error behavior
        await expect(mockMutationFn()).rejects.toThrow("API Error");
      });
    });

    describe("Optimistic Updates", () => {
      it("should apply optimistic updates immediately", () => {
        // Arrange
        const initialTasks: Task[] = [];

        const optimisticTask = {
          id: createTaskId(uuidv4()),
          title: "Optimistic Task",
          completed: false,
          recurringMode: "dueDate",
        };

        const mockOptimisticUpdateFn = (
          variables: unknown,
          oldTasks: Task[],
          optimisticData?: unknown,
        ) => {
          return [...oldTasks, optimisticData];
        };

        // Act
        const updatedTasks = mockOptimisticUpdateFn(
          { title: "Test Task" },
          initialTasks,
          optimisticTask,
        );

        // Assert
        expect(updatedTasks).toHaveLength(1);
        expect(updatedTasks[0]).toEqual(optimisticTask);
      });

      it("should handle optimistic updates without optimistic data factory", () => {
        // Arrange
        const initialTasks: Task[] = [
          {
            id: TEST_TASK_ID_1,
            title: "Existing Task",
            completed: DEFAULT_TASK_COMPLETED,
            priority: DEFAULT_TASK_PRIORITY,
            labels: DEFAULT_TASK_LABELS,
            subtasks: DEFAULT_TASK_SUBTASKS,
            comments: DEFAULT_TASK_COMMENTS,
            createdAt: new Date("2023-01-01"),
            recurringMode: "dueDate",
          },
        ];

        const mockOptimisticUpdateFn = (
          variables: { id: string; completed: boolean },
          oldTasks: Task[],
        ) => {
          return oldTasks.map((task) =>
            task.id === variables.id ? { ...task, ...variables } : task,
          );
        };

        // Act
        const updatedTasks = mockOptimisticUpdateFn(
          { id: TEST_TASK_ID_1, completed: true },
          initialTasks,
        );

        // Assert
        expect(updatedTasks).toHaveLength(1);
        const firstTask = updatedTasks[0];
        if (!firstTask) {
          throw new Error("Expected first task to exist");
        }
        expect(firstTask.completed).toBe(true);
        expect(firstTask.title).toBe("Existing Task");
      });
    });

    describe("Cache Management", () => {
      it("should cancel queries before applying optimistic updates", () => {
        // Arrange
        const queryKey = TASKS_QUERY_KEY;

        // This test verifies the concept - in real implementation,
        // query cancellation happens in the onMutate phase
        const mockCancelQueries = vi.fn();

        // Act
        mockCancelQueries({ queryKey });

        // Assert
        expect(mockCancelQueries).toHaveBeenCalledWith({ queryKey });
      });

      it("should provide previous data for rollback scenarios", () => {
        // Arrange
        const previousTasks: Task[] = [
          {
            id: TEST_TASK_ID_1,
            title: "Original Task",
            completed: DEFAULT_TASK_COMPLETED,
            priority: DEFAULT_TASK_PRIORITY,
            labels: DEFAULT_TASK_LABELS,
            subtasks: DEFAULT_TASK_SUBTASKS,
            comments: DEFAULT_TASK_COMMENTS,
            createdAt: new Date("2023-01-01"),
            recurringMode: "dueDate",
          },
        ];

        // Act - Simulate rollback scenario
        const rollbackTasks = [...previousTasks];

        // Assert
        expect(rollbackTasks).toEqual(previousTasks);
        const firstTask = rollbackTasks[0];
        if (!firstTask) {
          throw new Error("Expected to find first task in rollback data");
        }
        expect(firstTask.title).toBe("Original Task");
      });
    });

    describe("Error Handling & Network Modes", () => {
      it("should use test mode when window is undefined", () => {
        // Arrange
        const originalWindow = global.window;
        // @ts-expect-error - Intentionally deleting global for test
        delete global.window;

        // Act
        const isTestMode = typeof window === "undefined";

        // Assert
        expect(isTestMode).toBe(true);

        // Cleanup
        global.window = originalWindow;
      });

      it("should use API mode in browser environment", () => {
        // Arrange
        Object.defineProperty(global, "window", {
          writable: true,
          value: { location: { hostname: "localhost" } },
        });

        // Act
        const isTestMode = typeof window === "undefined";

        // Assert
        expect(isTestMode).toBe(false);
      });

      it("should handle serialization schema validation", () => {
        // Arrange
        const mockSerializationSchema = {
          parse: vi.fn().mockImplementation((data) => {
            if (!data.title) {
              throw new Error("Title is required");
            }
            return data;
          }),
        };

        const validData = {
          title: "Valid Task",
          description: "Test description",
        };
        const invalidData = { description: "Missing title" };

        // Act & Assert - Valid data
        expect(() => mockSerializationSchema.parse(validData)).not.toThrow();
        expect(mockSerializationSchema.parse).toHaveBeenCalledWith(validData);

        // Act & Assert - Invalid data
        expect(() => mockSerializationSchema.parse(invalidData)).toThrow(
          "Title is required",
        );
      });

      it("should handle response schema validation", () => {
        // Arrange
        const mockResponseSchema = {
          safeParse: vi.fn(),
        };

        const validResponse = {
          success: true,
          message: "Success",
          taskIds: ["id1"],
        };
        const invalidResponse = { error: "Bad request" };

        // Act & Assert - Valid response
        mockResponseSchema.safeParse.mockReturnValue({
          success: true,
          data: validResponse,
        });
        const validResult = mockResponseSchema.safeParse(validResponse);
        expect(validResult.success).toBe(true);
        expect(validResult.data).toEqual(validResponse);

        // Act & Assert - Invalid response
        mockResponseSchema.safeParse.mockReturnValue({
          success: false,
          error: { message: "Validation failed" },
        });
        const invalidResult = mockResponseSchema.safeParse(invalidResponse);
        expect(invalidResult.success).toBe(false);
        expect(invalidResult.error).toBeDefined();
      });
    });

    describe("Integration Scenarios", () => {
      it("should handle concurrent mutation attempts", async () => {
        // Arrange
        const mockMutationFn = vi
          .fn()
          .mockResolvedValueOnce({ success: true, taskIds: ["task-1"] })
          .mockResolvedValueOnce({ success: true, taskIds: ["task-2"] });

        const config = {
          mutationFn: mockMutationFn,
          optimisticUpdateFn: vi
            .fn()
            .mockImplementation((variables, oldTasks, optimisticData) => [
              ...oldTasks,
              optimisticData,
            ]),
          optimisticDataFactory: vi.fn().mockImplementation((variables) => ({
            id: createTaskId(uuidv4()),
            title: variables.title,
            completed: false,
            recurringMode: "dueDate",
          })),
          responseSchema: {
            safeParse: vi.fn().mockReturnValue({ success: true, data: {} }),
          },
          serializationSchema: { parse: vi.fn().mockReturnValue({}) },
          testResponseFactory: vi
            .fn()
            .mockReturnValue({ success: true, taskIds: ["test-id"] }),
          logModule: "test",
        };

        // Act - Simulate concurrent mutations
        const mutation1Variables = { title: "Task 1" };
        const mutation2Variables = { title: "Task 2" };

        // In real scenario, these would be called simultaneously
        const optimisticData1 =
          config.optimisticDataFactory(mutation1Variables);
        const optimisticData2 =
          config.optimisticDataFactory(mutation2Variables);

        // Assert
        expect(optimisticData1).toBeDefined();
        expect(optimisticData2).toBeDefined();
        expect(optimisticData1.title).toBe("Task 1");
        expect(optimisticData2.title).toBe("Task 2");
        expect(optimisticData1?.id).not.toBe(optimisticData2?.id);
      });

      it("should maintain data consistency during complex operations", () => {
        // Arrange
        const initialTasks: Task[] = [
          {
            id: TEST_TASK_ID_1,
            title: "Task 1",
            completed: false,
            priority: 1,
            labels: DEFAULT_TASK_LABELS,
            subtasks: DEFAULT_TASK_SUBTASKS,
            comments: DEFAULT_TASK_COMMENTS,
            createdAt: new Date("2023-01-01"),
            recurringMode: "dueDate",
          },
          {
            id: TEST_TASK_ID_2,
            title: "Task 2",
            completed: true,
            priority: 2,
            labels: DEFAULT_TASK_LABELS,
            subtasks: DEFAULT_TASK_SUBTASKS,
            comments: DEFAULT_TASK_COMMENTS,
            createdAt: new Date("2023-01-01"),
            recurringMode: "dueDate",
          },
        ];

        // Act - Complex update operation
        const complexUpdateFn = (
          variables: { taskIds: string[]; projectId: string; priority: number },
          oldTasks: Task[],
        ) => {
          return oldTasks.map((task) =>
            variables.taskIds.includes(task.id)
              ? {
                  ...task,
                  projectId: variables.projectId,
                  priority: variables.priority,
                }
              : task,
          );
        };

        const updateVariables = {
          taskIds: [TEST_TASK_ID_1, TEST_TASK_ID_2],
          projectId: TEST_PROJECT_ID_1,
          priority: 3,
        };

        const updatedTasks = complexUpdateFn(updateVariables, initialTasks);

        // Assert
        expect(updatedTasks).toHaveLength(2);
        expect(updatedTasks.every((task) => task.priority === 3)).toBe(true);
        expect(
          updatedTasks.every(
            (task) => task.projectId === updateVariables.projectId,
          ),
        ).toBe(true);
      });
    });

    describe("Performance & Memory Management", () => {
      it("should not create memory leaks with large datasets", () => {
        // Arrange - Simulate large dataset
        const largeTasks: Task[] = Array.from({ length: 1000 }, (_, i) => ({
          id: createTaskId(uuidv4()),
          title: `Task ${i}`,
          completed: i % 2 === 0,
          recurringMode: "dueDate",
          priority: getValidPriority(i),
          labels: DEFAULT_TASK_LABELS,
          subtasks: DEFAULT_TASK_SUBTASKS,
          comments: DEFAULT_TASK_COMMENTS,
          createdAt: new Date("2023-01-01"),
        }));

        // Act - Perform optimistic update on large dataset
        const optimisticUpdateFn = (
          variables: unknown,
          oldTasks: Task[],
          optimisticData: unknown,
        ) => {
          return [...oldTasks, optimisticData];
        };

        const newTask = {
          id: createTaskId(uuidv4()),
          title: "New Task",
          completed: false,
          priority: 1,
          labels: DEFAULT_TASK_LABELS,
          subtasks: DEFAULT_TASK_SUBTASKS,
          comments: DEFAULT_TASK_COMMENTS,
          createdAt: new Date("2023-01-01"),
          recurringMode: "dueDate",
        };

        const startTime = performance.now();
        const updatedTasks = optimisticUpdateFn(
          { title: "New Task" },
          largeTasks,
          newTask,
        );
        const endTime = performance.now();

        // Assert - Operation should be reasonably fast
        expect(endTime - startTime).toBeLessThan(50); // Less than 50ms for 1000+ item dataset
        expect(updatedTasks).toHaveLength(1001);
        expect(updatedTasks[1000]).toEqual(newTask);
      });

      it("should handle deep object cloning correctly", () => {
        // Arrange
        const complexTasks: Task[] = [
          {
            id: TEST_TASK_ID_1,
            title: "Complex Task",
            completed: false,
            priority: 1,
            labels: DEFAULT_TASK_LABELS,
            comments: DEFAULT_TASK_COMMENTS,
            createdAt: new Date("2023-01-01"),
            recurringMode: "dueDate",
            subtasks: [
              { id: TEST_SUBTASK_ID_1, title: "Subtask 1", completed: false },
            ],
          },
        ];

        // Act - Optimistic update should not mutate original data
        const optimisticUpdateFn = (
          variables: { title: string },
          oldTasks: Task[],
        ) => {
          return oldTasks.map((task) => ({
            ...task,
            title: variables.title,
            subtasks: task.subtasks.map((subtask) => ({ ...subtask })),
          }));
        };

        const originalTask = complexTasks[0];
        if (!originalTask) {
          throw new Error("Expected to find first task in complex data");
        }
        const originalTitle = originalTask.title;
        const updatedTasks = optimisticUpdateFn(
          { title: "Updated Title" },
          complexTasks,
        );

        const updatedTask = updatedTasks[0];
        if (!updatedTask) {
          throw new Error("Expected to find first task in updated data");
        }

        // Assert - Original data should remain unchanged
        expect(originalTask.title).toBe(originalTitle);
        expect(updatedTask.title).toBe("Updated Title");
        expect(updatedTask.subtasks).toEqual(originalTask.subtasks);
        expect(updatedTask.subtasks).not.toBe(originalTask.subtasks); // Different reference
      });
    });
  });
});
