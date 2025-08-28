import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"
import { PATCH } from "./route"
import type { Task, DataFile } from "@/lib/types"
import { createTaskId, createProjectId, createLabelId, createSubtaskId } from "@/lib/types"

// Mock the file operations
vi.mock("@/lib/utils/safe-file-operations", () => ({
  safeReadDataFile: vi.fn(),
  safeWriteDataFile: vi.fn(),
}))

// Mock the recurring task processor
vi.mock("@/lib/utils/recurring-task-processor", () => ({
  processRecurringTaskCompletion: vi.fn(),
}))

// Mock API logging middleware
vi.mock("@/lib/middleware/api-logger", () => ({
  withApiLogging: (handler: (...args: unknown[]) => unknown) => handler,
  logBusinessEvent: vi.fn(),
  withFileOperationLogging: async (operation: () => Promise<unknown>) => {
    try {
      return await operation()
    } catch (error) {
      throw error // Re-throw to maintain test behavior
    }
  },
  withPerformanceLogging: async (operation: () => Promise<unknown>) => {
    try {
      return await operation()
    } catch (error) {
      throw error // Re-throw to maintain test behavior
    }
  },
}))

// Mock UUID generation
vi.mock("uuid", () => ({
  v4: vi.fn(() => "550e8400-e29b-41d4-a716-446655440000"),
}))

import { safeReadDataFile, safeWriteDataFile } from "@/lib/utils/safe-file-operations"
import { processRecurringTaskCompletion } from "@/lib/utils/recurring-task-processor"
import { logBusinessEvent } from "@/lib/middleware/api-logger"
import { DEFAULT_PROJECT_GROUP, DEFAULT_LABEL_GROUP } from "@/lib/types/defaults"

const mockReadDataFile = vi.mocked(safeReadDataFile)
const mockWriteDataFile = vi.mocked(safeWriteDataFile)
const mockProcessRecurringTaskCompletion = vi.mocked(processRecurringTaskCompletion)
const mockLogBusinessEvent = vi.mocked(logBusinessEvent)

describe("API Route - Recurring Tasks Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWriteDataFile.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: createTaskId("550e8400-e29b-41d4-a716-446655440001"),
    title: "Daily standup",
    completed: false,
    dueDate: new Date("2024-01-15T09:00:00.000Z"),
    recurring: "RRULE:FREQ=DAILY",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    status: "active" as const,
    priority: 2,
    labels: [],
    projectId: undefined,
    subtasks: [],
    comments: [],
    attachments: [],
    recurringMode: "dueDate",
    ...overrides,
  })

  const createMockDataFile = (tasks: Task[]): DataFile => ({
    tasks,
    projects: [],
    labels: [],
    ordering: {
      projects: [],
      labels: [],
    },
    projectGroups: DEFAULT_PROJECT_GROUP,
    labelGroups: DEFAULT_LABEL_GROUP,
  })

  it("should generate recurring task instance when completing a recurring task", async () => {
    const originalTask = createMockTask()
    const nextInstance = createMockTask({
      id: createTaskId("550e8400-e29b-41d4-a716-446655440000"),
      dueDate: new Date("2024-01-16T09:00:00.000Z"),
      completed: false,
      completedAt: undefined,
    })

    const mockDataFile = createMockDataFile([originalTask])

    mockReadDataFile.mockResolvedValue(mockDataFile)
    mockProcessRecurringTaskCompletion.mockReturnValue(nextInstance)

    const request = new NextRequest("http://localhost:3000/api/tasks", {
      method: "PATCH",
      body: JSON.stringify([
        {
          id: originalTask.id,
          completed: true,
          completedAt: new Date("2024-01-15T10:00:00.000Z"),
        },
      ]),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.message).toContain("1 recurring instance(s) created")
    expect(responseData.taskIds).toContain(originalTask.id)

    // Verify the completed task (with completedAt) was processed for recurring completion
    expect(mockProcessRecurringTaskCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        ...originalTask,
        completed: true,
        completedAt: expect.any(Date),
      }),
    )

    // Verify both updated task and new instance were saved
    expect(mockWriteDataFile).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tasks: expect.arrayContaining([
            expect.objectContaining({ id: originalTask.id, completed: true }),
            expect.objectContaining({ id: nextInstance.id, completed: false }),
          ]),
        }),
      }),
    )

    // Verify business event was logged
    expect(mockLogBusinessEvent).toHaveBeenCalledWith(
      "recurring_task_instance_created",
      expect.objectContaining({
        parentTaskId: originalTask.id,
        newTaskId: nextInstance.id,
        recurringPattern: originalTask.recurring,
        nextDueDate: nextInstance.dueDate,
      }),
      undefined,
    )
  })

  it("should handle multiple recurring tasks completion in single request", async () => {
    const task1 = createMockTask({
      id: createTaskId("550e8400-e29b-41d4-a716-446655440001"),
      title: "Daily standup",
    })
    const task2 = createMockTask({
      id: createTaskId("550e8400-e29b-41d4-a716-446655440002"),
      title: "Weekly review",
      recurring: "RRULE:FREQ=WEEKLY",
    })

    const nextInstance1 = createMockTask({
      id: createTaskId("550e8400-e29b-41d4-a716-446655440010"),
      title: "Daily standup",
      dueDate: new Date("2024-01-16T09:00:00.000Z"),
    })
    const nextInstance2 = createMockTask({
      id: createTaskId("550e8400-e29b-41d4-a716-446655440011"),
      title: "Weekly review",
      recurring: "RRULE:FREQ=WEEKLY",
      dueDate: new Date("2024-01-22T09:00:00.000Z"),
    })

    const mockDataFile = createMockDataFile([task1, task2])

    mockReadDataFile.mockResolvedValue(mockDataFile)
    mockProcessRecurringTaskCompletion
      .mockReturnValueOnce(nextInstance1)
      .mockReturnValueOnce(nextInstance2)

    const request = new NextRequest("http://localhost:3000/api/tasks", {
      method: "PATCH",
      body: JSON.stringify([
        { id: task1.id, completed: true },
        { id: task2.id, completed: true },
      ]),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.taskIds).toHaveLength(2)
    expect(responseData.message).toContain("2 recurring instance(s) created")

    // Verify both tasks were processed (with completedAt timestamps)
    expect(mockProcessRecurringTaskCompletion).toHaveBeenCalledTimes(2)
    expect(mockProcessRecurringTaskCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ ...task1, completed: true, completedAt: expect.any(Date) }),
    )
    expect(mockProcessRecurringTaskCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ ...task2, completed: true, completedAt: expect.any(Date) }),
    )

    // Verify business events were logged for both
    expect(mockLogBusinessEvent).toHaveBeenCalledWith(
      "recurring_task_instance_created",
      expect.objectContaining({ parentTaskId: task1.id }),
      undefined,
    )
    expect(mockLogBusinessEvent).toHaveBeenCalledWith(
      "recurring_task_instance_created",
      expect.objectContaining({ parentTaskId: task2.id }),
      undefined,
    )
  })

  it("should not generate instances for non-recurring tasks", async () => {
    const nonRecurringTask = createMockTask({
      recurring: undefined,
    })

    const mockDataFile = createMockDataFile([nonRecurringTask])

    mockReadDataFile.mockResolvedValue(mockDataFile)
    mockProcessRecurringTaskCompletion.mockReturnValue(null)

    const request = new NextRequest("http://localhost:3000/api/tasks", {
      method: "PATCH",
      body: JSON.stringify([
        {
          id: nonRecurringTask.id,
          completed: true,
        },
      ]),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.message).toBe("1 task(s) updated successfully")
    expect(responseData.taskIds).toHaveLength(1)

    expect(mockProcessRecurringTaskCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        ...nonRecurringTask,
        completed: true,
        completedAt: expect.any(Date),
      }),
    )

    // Should not log recurring instance creation event
    expect(mockLogBusinessEvent).not.toHaveBeenCalledWith(
      "recurring_task_instance_created",
      expect.anything(),
    )
  })

  it("should not generate instances when task is not being completed", async () => {
    const recurringTask = createMockTask()

    const mockDataFile = createMockDataFile([recurringTask])

    mockReadDataFile.mockResolvedValue(mockDataFile)

    const request = new NextRequest("http://localhost:3000/api/tasks", {
      method: "PATCH",
      body: JSON.stringify([
        {
          id: recurringTask.id,
          title: "Updated title", // Not completing the task
        },
      ]),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.message).toBe("1 task(s) updated successfully")

    // Should not process recurring completion since task wasn't completed
    expect(mockProcessRecurringTaskCompletion).not.toHaveBeenCalled()
  })

  it("should handle recurring task completion even when already completed", async () => {
    const alreadyCompletedTask = createMockTask({
      completed: true,
      completedAt: new Date("2024-01-14T10:00:00.000Z"),
    })

    const mockDataFile = createMockDataFile([alreadyCompletedTask])

    mockReadDataFile.mockResolvedValue(mockDataFile)

    const request = new NextRequest("http://localhost:3000/api/tasks", {
      method: "PATCH",
      body: JSON.stringify([
        {
          id: alreadyCompletedTask.id,
          completed: true,
        },
      ]),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)

    expect(response.status).toBe(200)

    // Should not process recurring completion since task was already completed
    expect(mockProcessRecurringTaskCompletion).not.toHaveBeenCalled()
  })

  it("should handle mixed updates with recurring and non-recurring tasks", async () => {
    const recurringTask = createMockTask({
      id: createTaskId("550e8400-e29b-41d4-a716-446655440001"),
    })
    const nonRecurringTask = createMockTask({
      id: createTaskId("550e8400-e29b-41d4-a716-446655440002"),
      recurring: undefined,
    })
    const otherTask = createMockTask({
      id: createTaskId("550e8400-e29b-41d4-a716-446655440003"),
      recurring: "RRULE:FREQ=WEEKLY",
    })

    const nextInstance = createMockTask({
      id: createTaskId("550e8400-e29b-41d4-a716-446655440010"),
      dueDate: new Date("2024-01-16T09:00:00.000Z"),
    })

    const mockDataFile = createMockDataFile([recurringTask, nonRecurringTask, otherTask])

    mockReadDataFile.mockResolvedValue(mockDataFile)
    mockProcessRecurringTaskCompletion
      .mockReturnValueOnce(nextInstance) // For recurringTask
      .mockReturnValueOnce(null) // For nonRecurringTask
      .mockReturnValueOnce(null) // For otherTask (not being completed)

    const request = new NextRequest("http://localhost:3000/api/tasks", {
      method: "PATCH",
      body: JSON.stringify([
        { id: recurringTask.id, completed: true },
        { id: nonRecurringTask.id, completed: true },
        { id: otherTask.id, title: "Updated title" }, // Not completing
      ]),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.taskIds).toHaveLength(3)
    expect(responseData.message).toContain("1 recurring instance(s) created")

    // Should only process the task that's being completed and has recurring
    expect(mockProcessRecurringTaskCompletion).toHaveBeenCalledTimes(2)
    expect(mockProcessRecurringTaskCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ ...recurringTask, completed: true, completedAt: expect.any(Date) }),
    )
    expect(mockProcessRecurringTaskCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        ...nonRecurringTask,
        completed: true,
        completedAt: expect.any(Date),
      }),
    )
  })

  it("should handle errors in recurring task processing gracefully", async () => {
    const recurringTask = createMockTask()

    const mockDataFile = createMockDataFile([recurringTask])

    mockReadDataFile.mockResolvedValue(mockDataFile)
    mockProcessRecurringTaskCompletion.mockImplementation(() => {
      throw new Error("Recurring processing failed")
    })

    const request = new NextRequest("http://localhost:3000/api/tasks", {
      method: "PATCH",
      body: JSON.stringify([
        {
          id: recurringTask.id,
          completed: true,
        },
      ]),
      headers: {
        "Content-Type": "application/json",
      },
    })

    // Should not throw - should complete the main task and log the error
    const response = await PATCH(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.message).toBe("1 task(s) updated successfully")

    // Main task should still be marked as completed
    expect(mockWriteDataFile).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tasks: expect.arrayContaining([
            expect.objectContaining({ id: recurringTask.id, completed: true }),
          ]),
        }),
      }),
    )

    // No recurring instances should be created due to the error
    expect(responseData.taskIds).toHaveLength(1)
  })

  it("should log comprehensive business events for recurring task creation", async () => {
    const recurringTask = createMockTask({
      recurring: "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR",
    })
    const nextInstance = createMockTask({
      id: createTaskId("550e8400-e29b-41d4-a716-446655440000"),
      dueDate: new Date("2024-01-17T09:00:00.000Z"),
      recurring: "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR",
    })

    const mockDataFile = createMockDataFile([recurringTask])

    mockReadDataFile.mockResolvedValue(mockDataFile)
    mockProcessRecurringTaskCompletion.mockReturnValue(nextInstance)

    const request = new NextRequest("http://localhost:3000/api/tasks", {
      method: "PATCH",
      body: JSON.stringify([
        {
          id: recurringTask.id,
          completed: true,
        },
      ]),
      headers: {
        "Content-Type": "application/json",
      },
    })

    await PATCH(request)

    expect(mockLogBusinessEvent).toHaveBeenCalledWith(
      "recurring_task_instance_created",
      {
        parentTaskId: recurringTask.id,
        newTaskId: nextInstance.id,
        recurringPattern: "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR",
        nextDueDate: nextInstance.dueDate,
      },
      undefined,
    )

    // Should also log the standard tasks_updated event
    expect(mockLogBusinessEvent).toHaveBeenCalledWith(
      "tasks_updated",
      expect.objectContaining({
        updatedCount: 1,
        taskIds: [recurringTask.id],
        totalTasks: 2, // Original + next instance
      }),
      undefined,
    )
  })

  it("should preserve task metadata in generated recurring instances", async () => {
    const recurringTaskWithMetadata = createMockTask({
      priority: 4 as const,
      labels: [
        createLabelId("550e8400-e29b-41d4-a716-446655440010"),
        createLabelId("550e8400-e29b-41d4-a716-446655440011"),
      ],
      projectId: createProjectId("550e8400-e29b-41d4-a716-446655440012"),
      description: "Important daily task",
      subtasks: [
        {
          id: createSubtaskId("550e8400-e29b-41d4-a716-446655440013"),
          title: "Prep notes",
          completed: false,
        },
      ],
      attachments: ["file1.pdf"],
    })

    const nextInstance = createMockTask({
      id: createTaskId("550e8400-e29b-41d4-a716-446655440000"),
      dueDate: new Date("2024-01-16T09:00:00.000Z"),
      priority: 4 as const,
      labels: [
        createLabelId("550e8400-e29b-41d4-a716-446655440010"),
        createLabelId("550e8400-e29b-41d4-a716-446655440011"),
      ],
      projectId: createProjectId("550e8400-e29b-41d4-a716-446655440012"),
      description: "Important daily task",
      subtasks: [
        {
          id: createSubtaskId("550e8400-e29b-41d4-a716-446655440013"),
          title: "Prep notes",
          completed: false,
        },
      ],
      attachments: ["file1.pdf"],
    })

    const mockDataFile = createMockDataFile([recurringTaskWithMetadata])

    mockReadDataFile.mockResolvedValue(mockDataFile)
    mockProcessRecurringTaskCompletion.mockReturnValue(nextInstance)

    const request = new NextRequest("http://localhost:3000/api/tasks", {
      method: "PATCH",
      body: JSON.stringify([
        {
          id: recurringTaskWithMetadata.id,
          completed: true,
        },
      ]),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)

    // Verify that task IDs are returned correctly
    expect(responseData.taskIds).toContain(recurringTaskWithMetadata.id)
    expect(responseData.success).toBe(true)
    expect(responseData.message).toContain("recurring instance(s) created")
  })

  it("should pass completed task with completedAt timestamp to recurring processor for recurringMode completedAt", async () => {
    const originalTask = createMockTask({
      id: createTaskId("550e8400-e29b-41d4-a716-446655440001"),
      title: "Workout recurring task",
      dueDate: new Date("2024-08-13T09:00:00.000Z"), // Original due date Aug 13
      recurring: "RRULE:FREQ=DAILY",
      recurringMode: "completedAt", // Key: this task uses completion date for next calculation
      completed: false,
      completedAt: undefined,
    })

    const nextInstance = createMockTask({
      id: createTaskId("550e8400-e29b-41d4-a716-446655440000"),
      title: "Workout recurring task",
      dueDate: new Date("2024-08-23T09:00:00.000Z"), // Next due date should be based on completion date, not original due date
      recurring: "RRULE:FREQ=DAILY",
      recurringMode: "completedAt",
      completed: false,
      completedAt: undefined,
    })

    const mockDataFile = createMockDataFile([originalTask])

    mockReadDataFile.mockResolvedValue(mockDataFile)
    mockProcessRecurringTaskCompletion.mockReturnValue(nextInstance)

    const request = new NextRequest("http://localhost:3000/api/tasks", {
      method: "PATCH",
      body: JSON.stringify([
        {
          id: originalTask.id,
          completed: true,
          // Note: completedAt is set by the API, not passed in the request
        },
      ]),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.message).toContain("1 recurring instance(s) created")

    // CRITICAL: Verify the recurring processor receives the completed task WITH completedAt timestamp
    // This prevents the bug where originalTask (without completedAt) was passed instead
    expect(mockProcessRecurringTaskCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        ...originalTask,
        completed: true,
        completedAt: expect.any(Date), // Must have completedAt for recurringMode: "completedAt" to work
        recurringMode: "completedAt", // Verify the mode is preserved
      }),
    )

    // Verify the completedAt timestamp was set to a recent time (within last few seconds)
    const callArgs = mockProcessRecurringTaskCompletion.mock.calls[0][0]
    expect(callArgs.completedAt).toBeDefined()
    if (callArgs.completedAt) {
      const completedAtTime = callArgs.completedAt.getTime()
      const now = Date.now()
      expect(completedAtTime).toBeGreaterThan(now - 5000) // Within last 5 seconds
      expect(completedAtTime).toBeLessThanOrEqual(now)
    }

    // Verify business event logging includes the completion timestamp
    expect(mockLogBusinessEvent).toHaveBeenCalledWith(
      "recurring_task_instance_created",
      expect.objectContaining({
        parentTaskId: originalTask.id,
        newTaskId: nextInstance.id,
        recurringPattern: originalTask.recurring,
        nextDueDate: nextInstance.dueDate,
      }),
      undefined,
    )
  })
})
