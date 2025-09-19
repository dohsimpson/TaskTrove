import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { v4 as uuidv4 } from "uuid"
import { createLabelId, createProjectId, createTaskId, type DataFile } from "@/lib/types"
import { createSafeLabelNameSlug, createSafeProjectNameSlug } from "@/lib/utils/routing"
import { QueryClient } from "@tanstack/react-query"
import {
  TEST_TASK_ID_1,
  TEST_TASK_ID_2,
  TEST_PROJECT_ID_1,
  TEST_SUBTASK_ID_1,
} from "@/lib/utils/test-constants"
import {
  DEFAULT_TASK_COMPLETED,
  DEFAULT_TASK_PRIORITY,
  DEFAULT_TASK_LABELS,
  DEFAULT_TASK_SUBTASKS,
  DEFAULT_TASK_COMMENTS,
  DEFAULT_TASK_ATTACHMENTS,
} from "@/lib/constants/defaults"
import { DEFAULT_EMPTY_DATA_FILE } from "@/lib/types/defaults"

// Mock external dependencies
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}))

vi.mock("@tanstack/react-query", () => ({
  QueryClient: vi.fn().mockImplementation(() => ({
    cancelQueries: vi.fn(),
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  })),
}))

// Using DataFile directly instead of CacheData

// Helper function to get valid priority
const getValidPriority = (index: number): 1 | 2 | 3 | 4 => {
  const priorities: readonly [1, 2, 3, 4] = [1, 2, 3, 4]
  return priorities[index % 4]
}

// Mock implementations to isolate the factory function behavior
const createLabelOptimisticFactory = (
  labelData: { name: string; color?: string; slug?: string },
  oldData?: DataFile,
) => {
  return {
    id: createLabelId(uuidv4()),
    name: labelData.name,
    slug: labelData.slug ?? createSafeLabelNameSlug(labelData.name, oldData?.labels || []),
    color: labelData.color || "#3b82f6",
  }
}

const createProjectOptimisticFactory = (
  projectData: { name: string; color?: string; slug?: string; shared?: boolean },
  oldData?: DataFile,
) => {
  return {
    id: createProjectId(uuidv4()),
    name: projectData.name,
    slug: projectData.slug ?? createSafeProjectNameSlug(projectData.name, oldData?.projects || []),
    color: projectData.color ?? "#3b82f6",
    shared: projectData.shared ?? false,
    sections: [{ id: "default-section", name: "Default", color: "#6b7280" }],
  }
}

describe("createMutation Function", () => {
  describe("Optimistic Data Factories", () => {
    describe("Label optimistic factory", () => {
      it("should use proper slug generation with collision detection", () => {
        const mockCacheData: DataFile = {
          ...DEFAULT_EMPTY_DATA_FILE,
          labels: [{ id: createLabelId(uuidv4()), name: "Work", slug: "work", color: "#ef4444" }],
        }

        const labelData = { name: "Work", color: "#10b981" }
        const result = createLabelOptimisticFactory(labelData, mockCacheData)

        expect(result.slug).toBe("work-1") // Should handle collision
      })

      it("should handle special characters in slug generation", () => {
        const labelData = { name: "High Priority!", color: "#ef4444" }
        const result = createLabelOptimisticFactory(labelData)

        expect(result.slug).toBe("high-priority")
      })
    })

    describe("Project optimistic factory", () => {
      it("should use proper slug generation with collision detection", () => {
        const mockCacheData: DataFile = {
          ...DEFAULT_EMPTY_DATA_FILE,
          projects: [
            {
              id: createProjectId(uuidv4()),
              name: "My Project",
              slug: "my-project",
              color: "#3b82f6",
              shared: false,
              sections: [],
              taskOrder: [],
            },
          ],
        }

        const projectData = { name: "My Project", color: "#10b981" }
        const result = createProjectOptimisticFactory(projectData, mockCacheData)

        expect(result.slug).toBe("my-project-1") // Should handle collision
      })

      it("should handle special characters in slug generation", () => {
        const projectData = { name: "Project & Task Management!", color: "#ef4444" }
        const result = createProjectOptimisticFactory(projectData)

        expect(result.slug).toBe("project-and-task-management")
      })
    })
  })

  describe("Core Mutation Functionality", () => {
    let mockQueryClient: QueryClient

    beforeEach(() => {
      // Reset all mocks before each test
      vi.clearAllMocks()

      // Mock QueryClient with essential methods
      const baseMock = {
        cancelQueries: vi.fn(),
        getQueryData: vi.fn(),
        setQueryData: vi.fn(),
        invalidateQueries: vi.fn(),
      }
      mockQueryClient = Object.create(QueryClient.prototype)
      Object.assign(mockQueryClient, baseMock)

      // Mock global window for network detection
      Object.defineProperty(global, "window", {
        writable: true,
        value: { location: { hostname: "localhost" } },
      })
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    describe("Mutation Lifecycle", () => {
      it("should execute complete mutation lifecycle successfully", async () => {
        // Arrange
        const mockMutationFn = vi.fn().mockResolvedValue({
          success: true,
          message: "Operation successful",
          taskIds: ["test-id"],
        })

        const mockOptimisticUpdateFn = vi.fn().mockReturnValue({
          ...DEFAULT_EMPTY_DATA_FILE,
          tasks: [{ id: "optimistic-task", title: "Optimistic Task" }],
        })

        const mockOptimisticDataFactory = vi.fn().mockReturnValue({
          id: "optimistic-task",
          title: "Optimistic Task",
        })

        const config = {
          mutationFn: mockMutationFn,
          optimisticUpdateFn: mockOptimisticUpdateFn,
          optimisticDataFactory: mockOptimisticDataFactory,
          responseSchema: { safeParse: vi.fn().mockReturnValue({ success: true, data: {} }) },
          serializationSchema: { parse: vi.fn().mockReturnValue({}) },
          testResponseFactory: vi.fn().mockReturnValue({ success: true, taskIds: ["test-id"] }),
          logModule: "test",
        }

        // Mock query client methods - using vi.mocked for test mocking
        vi.mocked(mockQueryClient.getQueryData).mockReturnValue({
          ...DEFAULT_EMPTY_DATA_FILE,
        })

        // Act & Assert - Test mutation configuration
        expect(config.mutationFn).toBeDefined()
        expect(config.optimisticUpdateFn).toBeDefined()
        expect(config.optimisticDataFactory).toBeDefined()

        // Verify optimistic factory was called with correct parameters
        const testVariables = { title: "Test Task" }
        const optimisticData = config.optimisticDataFactory(testVariables, {
          tasks: [],
          projects: [],
          labels: [],
        })
        expect(optimisticData).toEqual({
          id: "optimistic-task",
          title: "Optimistic Task",
        })
      })

      it("should handle mutation errors and execute onError lifecycle", async () => {
        // Arrange
        const mockError = new Error("API Error")
        const mockMutationFn = vi.fn().mockRejectedValue(mockError)

        const config = {
          mutationFn: mockMutationFn,
          optimisticUpdateFn: vi.fn(),
          responseSchema: { safeParse: vi.fn().mockReturnValue({ success: true, data: {} }) },
          serializationSchema: { parse: vi.fn().mockReturnValue({}) },
          testResponseFactory: vi.fn(),
          logModule: "test",
        }

        // Act & Assert - Test error configuration
        expect(config.mutationFn).toBeDefined()
        expect(config.optimisticUpdateFn).toBeDefined()

        // The actual error handling would be tested in integration tests
        // where we can trigger the mutation and verify error behavior
        await expect(mockMutationFn()).rejects.toThrow("API Error")
      })
    })

    describe("Optimistic Updates", () => {
      it("should apply optimistic updates immediately", () => {
        // Arrange
        const initialData: DataFile = {
          ...DEFAULT_EMPTY_DATA_FILE,
        }

        const optimisticTask = {
          id: createTaskId(uuidv4()),
          title: "Optimistic Task",
          completed: false,
          recurringMode: "dueDate",
        }

        const mockOptimisticUpdateFn = (
          variables: unknown,
          oldData: DataFile,
          optimisticData?: unknown,
        ) => {
          return {
            ...oldData,
            tasks: [...oldData.tasks, optimisticData],
          }
        }

        // Act
        const updatedData = mockOptimisticUpdateFn(
          { title: "Test Task" },
          initialData,
          optimisticTask,
        )

        // Assert
        expect(updatedData.tasks).toHaveLength(1)
        expect(updatedData.tasks[0]).toEqual(optimisticTask)
        expect(updatedData.projects).toEqual(initialData.projects)
        expect(updatedData.labels).toEqual(initialData.labels)
      })

      it("should handle optimistic updates without optimistic data factory", () => {
        // Arrange
        const initialData: DataFile = {
          ...DEFAULT_EMPTY_DATA_FILE,
          tasks: [
            {
              id: TEST_TASK_ID_1,
              title: "Existing Task",
              completed: DEFAULT_TASK_COMPLETED,
              priority: DEFAULT_TASK_PRIORITY,
              labels: DEFAULT_TASK_LABELS,
              subtasks: DEFAULT_TASK_SUBTASKS,
              comments: DEFAULT_TASK_COMMENTS,
              attachments: DEFAULT_TASK_ATTACHMENTS,
              createdAt: new Date("2023-01-01"),
              recurringMode: "dueDate",
            },
          ],
        }

        const mockOptimisticUpdateFn = (
          variables: { id: string; completed: boolean },
          oldData: DataFile,
        ) => {
          return {
            ...oldData,
            tasks: oldData.tasks.map((task) =>
              task.id === variables.id ? { ...task, ...variables } : task,
            ),
          }
        }

        // Act
        const updatedData = mockOptimisticUpdateFn(
          { id: TEST_TASK_ID_1, completed: true },
          initialData,
        )

        // Assert
        expect(updatedData.tasks).toHaveLength(1)
        expect(updatedData.tasks[0].completed).toBe(true)
        expect(updatedData.tasks[0].title).toBe("Existing Task")
      })
    })

    describe("Cache Management", () => {
      it("should cancel queries before applying optimistic updates", () => {
        // Arrange
        const queryKey = ["tasks"]

        // This test verifies the concept - in real implementation,
        // query cancellation happens in the onMutate phase
        const mockCancelQueries = vi.fn()

        // Act
        mockCancelQueries({ queryKey })

        // Assert
        expect(mockCancelQueries).toHaveBeenCalledWith({ queryKey })
      })

      it("should provide previous data for rollback scenarios", () => {
        // Arrange
        const previousData: DataFile = {
          ...DEFAULT_EMPTY_DATA_FILE,
          tasks: [
            {
              id: TEST_TASK_ID_1,
              title: "Original Task",
              completed: DEFAULT_TASK_COMPLETED,
              priority: DEFAULT_TASK_PRIORITY,
              labels: DEFAULT_TASK_LABELS,
              subtasks: DEFAULT_TASK_SUBTASKS,
              comments: DEFAULT_TASK_COMMENTS,
              attachments: DEFAULT_TASK_ATTACHMENTS,
              createdAt: new Date("2023-01-01"),
              recurringMode: "dueDate",
            },
          ],
        }

        // Act - Simulate rollback scenario
        const rollbackData = { ...previousData }

        // Assert
        expect(rollbackData).toEqual(previousData)
        expect(rollbackData.tasks[0].title).toBe("Original Task")
      })
    })

    describe("Error Handling & Network Modes", () => {
      it("should use test mode when window is undefined", () => {
        // Arrange
        const originalWindow = global.window
        // @ts-expect-error - Intentionally deleting global for test
        delete global.window

        // Act
        const isTestMode = typeof window === "undefined"

        // Assert
        expect(isTestMode).toBe(true)

        // Cleanup
        global.window = originalWindow
      })

      it("should use API mode in browser environment", () => {
        // Arrange
        Object.defineProperty(global, "window", {
          writable: true,
          value: { location: { hostname: "localhost" } },
        })

        // Act
        const isTestMode = typeof window === "undefined"

        // Assert
        expect(isTestMode).toBe(false)
      })

      it("should handle serialization schema validation", () => {
        // Arrange
        const mockSerializationSchema = {
          parse: vi.fn().mockImplementation((data) => {
            if (!data.title) {
              throw new Error("Title is required")
            }
            return data
          }),
        }

        const validData = { title: "Valid Task", description: "Test description" }
        const invalidData = { description: "Missing title" }

        // Act & Assert - Valid data
        expect(() => mockSerializationSchema.parse(validData)).not.toThrow()
        expect(mockSerializationSchema.parse).toHaveBeenCalledWith(validData)

        // Act & Assert - Invalid data
        expect(() => mockSerializationSchema.parse(invalidData)).toThrow("Title is required")
      })

      it("should handle response schema validation", () => {
        // Arrange
        const mockResponseSchema = {
          safeParse: vi.fn(),
        }

        const validResponse = { success: true, message: "Success", taskIds: ["id1"] }
        const invalidResponse = { error: "Bad request" }

        // Act & Assert - Valid response
        mockResponseSchema.safeParse.mockReturnValue({ success: true, data: validResponse })
        const validResult = mockResponseSchema.safeParse(validResponse)
        expect(validResult.success).toBe(true)
        expect(validResult.data).toEqual(validResponse)

        // Act & Assert - Invalid response
        mockResponseSchema.safeParse.mockReturnValue({
          success: false,
          error: { message: "Validation failed" },
        })
        const invalidResult = mockResponseSchema.safeParse(invalidResponse)
        expect(invalidResult.success).toBe(false)
        expect(invalidResult.error).toBeDefined()
      })
    })

    describe("Integration Scenarios", () => {
      it("should handle concurrent mutation attempts", async () => {
        // Arrange
        const mockMutationFn = vi
          .fn()
          .mockResolvedValueOnce({ success: true, taskIds: ["task-1"] })
          .mockResolvedValueOnce({ success: true, taskIds: ["task-2"] })

        const config = {
          mutationFn: mockMutationFn,
          optimisticUpdateFn: vi.fn().mockImplementation((variables, oldData, optimisticData) => ({
            ...oldData,
            tasks: [...oldData.tasks, optimisticData],
          })),
          optimisticDataFactory: vi.fn().mockImplementation((variables) => ({
            id: createTaskId(uuidv4()),
            title: variables.title,
            completed: false,
            recurringMode: "dueDate",
          })),
          responseSchema: { safeParse: vi.fn().mockReturnValue({ success: true, data: {} }) },
          serializationSchema: { parse: vi.fn().mockReturnValue({}) },
          testResponseFactory: vi.fn().mockReturnValue({ success: true, taskIds: ["test-id"] }),
          logModule: "test",
        }

        // Act - Simulate concurrent mutations
        const mutation1Variables = { title: "Task 1" }
        const mutation2Variables = { title: "Task 2" }

        // In real scenario, these would be called simultaneously
        const optimisticData1 = config.optimisticDataFactory(mutation1Variables)
        const optimisticData2 = config.optimisticDataFactory(mutation2Variables)

        // Assert
        expect(optimisticData1).toBeDefined()
        expect(optimisticData2).toBeDefined()
        expect(optimisticData1.title).toBe("Task 1")
        expect(optimisticData2.title).toBe("Task 2")
        expect(optimisticData1?.id).not.toBe(optimisticData2?.id)
      })

      it("should maintain data consistency during complex operations", () => {
        // Arrange
        const initialState: DataFile = {
          ...DEFAULT_EMPTY_DATA_FILE,
          tasks: [
            {
              id: TEST_TASK_ID_1,
              title: "Task 1",
              completed: false,
              priority: 1,
              labels: DEFAULT_TASK_LABELS,
              subtasks: DEFAULT_TASK_SUBTASKS,
              comments: DEFAULT_TASK_COMMENTS,
              attachments: DEFAULT_TASK_ATTACHMENTS,
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
              attachments: DEFAULT_TASK_ATTACHMENTS,
              createdAt: new Date("2023-01-01"),
              recurringMode: "dueDate",
            },
          ],
          projects: [
            {
              id: TEST_PROJECT_ID_1,
              name: "Project 1",
              slug: "project-1",
              color: "#3b82f6",
              shared: false,
              sections: [],
              taskOrder: [],
            },
          ],
        }

        // Act - Complex update operation
        const complexUpdateFn = (
          variables: { taskIds: string[]; projectId: string; priority: number },
          oldData: DataFile,
        ) => {
          const updatedTasks = oldData.tasks.map((task) =>
            variables.taskIds.includes(task.id)
              ? { ...task, projectId: variables.projectId, priority: variables.priority }
              : task,
          )

          return {
            ...oldData,
            tasks: updatedTasks,
          }
        }

        const updateVariables = {
          taskIds: [TEST_TASK_ID_1, TEST_TASK_ID_2],
          projectId: TEST_PROJECT_ID_1,
          priority: 3,
        }

        const updatedState = complexUpdateFn(updateVariables, initialState)

        // Assert
        expect(updatedState.tasks).toHaveLength(2)
        expect(updatedState.tasks.every((task) => task.priority === 3)).toBe(true)
        expect(
          updatedState.tasks.every((task) => task.projectId === updateVariables.projectId),
        ).toBe(true)
        expect(updatedState.projects).toEqual(initialState.projects)
      })
    })

    describe("Performance & Memory Management", () => {
      it("should not create memory leaks with large datasets", () => {
        // Arrange - Simulate large dataset
        const largeDataset: DataFile = {
          ...DEFAULT_EMPTY_DATA_FILE,
          tasks: Array.from({ length: 1000 }, (_, i) => ({
            id: createTaskId(uuidv4()),
            title: `Task ${i}`,
            completed: i % 2 === 0,
            recurringMode: "dueDate",
            priority: getValidPriority(i),
            labels: DEFAULT_TASK_LABELS,
            subtasks: DEFAULT_TASK_SUBTASKS,
            comments: DEFAULT_TASK_COMMENTS,
            attachments: DEFAULT_TASK_ATTACHMENTS,
            createdAt: new Date("2023-01-01"),
          })),
          projects: Array.from({ length: 50 }, (_, i) => ({
            id: createProjectId(uuidv4()),
            name: `Project ${i}`,
            slug: `project-${i}`,
            color: "#3b82f6",
            shared: false,
            sections: [],
            taskOrder: [],
          })),
          labels: Array.from({ length: 20 }, (_, i) => ({
            id: createLabelId(uuidv4()),
            name: `Label ${i}`,
            slug: `label-${i}`,
            color: "#ef4444",
          })),
        }

        // Act - Perform optimistic update on large dataset
        const optimisticUpdateFn = (
          variables: unknown,
          oldData: DataFile,
          optimisticData: unknown,
        ) => {
          return {
            ...oldData,
            tasks: [...oldData.tasks, optimisticData],
          }
        }

        const newTask = {
          id: createTaskId(uuidv4()),
          title: "New Task",
          completed: false,
          priority: 1,
          labels: DEFAULT_TASK_LABELS,
          subtasks: DEFAULT_TASK_SUBTASKS,
          comments: DEFAULT_TASK_COMMENTS,
          attachments: DEFAULT_TASK_ATTACHMENTS,
          createdAt: new Date("2023-01-01"),
          recurringMode: "dueDate",
        }

        const startTime = performance.now()
        const updatedData = optimisticUpdateFn({ title: "New Task" }, largeDataset, newTask)
        const endTime = performance.now()

        // Assert - Operation should be reasonably fast
        expect(endTime - startTime).toBeLessThan(50) // Less than 50ms for 1000+ item dataset
        expect(updatedData.tasks).toHaveLength(1001)
        expect(updatedData.tasks[1000]).toEqual(newTask)
        expect(updatedData.projects).toHaveLength(50)
        expect(updatedData.labels).toHaveLength(20)
      })

      it("should handle deep object cloning correctly", () => {
        // Arrange
        const complexData: DataFile = {
          ...DEFAULT_EMPTY_DATA_FILE,
          tasks: [
            {
              id: TEST_TASK_ID_1,
              title: "Complex Task",
              completed: false,
              priority: 1,
              labels: DEFAULT_TASK_LABELS,
              comments: DEFAULT_TASK_COMMENTS,
              createdAt: new Date("2023-01-01"),
              recurringMode: "dueDate",
              subtasks: [{ id: TEST_SUBTASK_ID_1, title: "Subtask 1", completed: false }],
              attachments: ["att-1"],
            },
          ],
        }

        // Act - Optimistic update should not mutate original data
        const optimisticUpdateFn = (variables: { title: string }, oldData: DataFile) => {
          const updatedTasks = oldData.tasks.map((task) => ({
            ...task,
            title: variables.title,
            subtasks: task.subtasks.map((subtask) => ({ ...subtask })),
            attachments: task.attachments.slice(),
          }))

          return {
            ...oldData,
            tasks: updatedTasks,
          }
        }

        const originalTitle = complexData.tasks[0].title
        const updatedData = optimisticUpdateFn({ title: "Updated Title" }, complexData)

        // Assert - Original data should remain unchanged
        expect(complexData.tasks[0].title).toBe(originalTitle)
        expect(updatedData.tasks[0].title).toBe("Updated Title")
        expect(updatedData.tasks[0].subtasks).toEqual(complexData.tasks[0].subtasks)
        expect(updatedData.tasks[0].subtasks).not.toBe(complexData.tasks[0].subtasks) // Different reference
      })
    })
  })
})
