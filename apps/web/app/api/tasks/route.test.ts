/**
 * API Route Tests for Task Operations
 *
 * Tests the PATCH /api/tasks endpoint for task-only operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { PATCH } from "./route"
import {
  DataFile,
  DataFileSchema,
  createTaskId,
  createProjectId,
  createLabelId,
  createSectionId,
} from "@/lib/types"
import { DEFAULT_EMPTY_DATA_FILE } from "@/lib/types"
import { safeReadDataFile, safeWriteDataFile } from "@/lib/utils/safe-file-operations"
import { createMockEnhancedRequest } from "@/lib/utils/test-helpers"

// Mock safe file operations
vi.mock("@/lib/utils/safe-file-operations")

// Mock UUID
vi.mock("uuid", () => ({
  v4: () => "12345678-1234-4123-8123-123456789012",
}))

const mockSafeReadDataFile = vi.mocked(safeReadDataFile)
const mockSafeWriteDataFile = vi.mocked(safeWriteDataFile)

// Helper function to safely get written data
function getWrittenData(): DataFile {
  const mockCall = mockSafeWriteDataFile.mock.calls[0]
  if (!mockCall || !mockCall[0]) {
    throw new Error("Expected mockSafeWriteDataFile to have been called with arguments")
  }
  const callData = mockCall[0].data
  return DataFileSchema.parse(callData)
}

// Mock enhanced request helper is imported from test-helpers

// Mock data structure
const mockDataFile: DataFile = {
  ...DEFAULT_EMPTY_DATA_FILE,
  tasks: [
    {
      id: createTaskId("11111111-1111-4111-8111-111111111111"),
      title: "Test Task 1",
      description: "Task description",
      completed: false,
      priority: 3,
      projectId: createProjectId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      labels: [],
      subtasks: [],
      comments: [],
      attachments: [],
      status: "active",
      order: 0,
      createdAt: new Date(),
      completedAt: undefined,
      dueDate: undefined,
      recurringMode: "dueDate",
    },
    {
      id: createTaskId("22222222-2222-4222-8222-222222222222"),
      title: "Test Task 2",
      description: "Another task",
      completed: true,
      priority: 1,
      projectId: createProjectId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
      labels: [createLabelId("cccccccc-cccc-4ccc-8ccc-cccccccccccc")],
      subtasks: [],
      comments: [],
      attachments: [],
      status: "active",
      order: 1,
      createdAt: new Date(),
      completedAt: new Date(),
      dueDate: undefined,
      recurringMode: "dueDate",
    },
  ],
  projects: [
    {
      id: createProjectId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      name: "Test Project 1",
      slug: "test-project-1",
      color: "#3b82f6",
      shared: false,
      sections: [],
    },
    {
      id: createProjectId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
      name: "Test Project 2",
      slug: "test-project-2",
      color: "#ef4444",
      shared: false,
      sections: [],
    },
  ],
  labels: [
    {
      id: createLabelId("cccccccc-cccc-4ccc-8ccc-cccccccccccc"),
      name: "Important",
      slug: "important",
      color: "#ef4444",
    },
    {
      id: createLabelId("dddddddd-dddd-4ddd-8ddd-dddddddddddd"),
      name: "Work",
      slug: "work",
      color: "#3b82f6",
    },
    {
      id: createLabelId("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"),
      name: "Personal",
      slug: "personal",
      color: "#10b981",
    },
  ],
}

describe("PATCH /api/tasks - Task Updates Only", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock successful async file read
    mockSafeReadDataFile.mockResolvedValue(mockDataFile)

    // Mock successful async file write
    mockSafeWriteDataFile.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should update a single task successfully", async () => {
    const taskUpdate = {
      id: createTaskId("11111111-1111-4111-8111-111111111111"),
      title: "Updated Task Title",
      completed: true,
      priority: 1,
    }

    const request = new Request("http://localhost:3000/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskUpdate),
    })

    const response = await PATCH(createMockEnhancedRequest(request))
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(data.success).toBe(true)
    expect(data.message).toContain("task(s) updated successfully")

    // Verify that writeFile was called with updated task data
    expect(mockSafeWriteDataFile).toHaveBeenCalled()
    const writtenData = getWrittenData()

    // Verify the task was updated in the written data
    const updatedTask = writtenData.tasks.find(
      (t) => t.id === createTaskId("11111111-1111-4111-8111-111111111111"),
    )
    expect(updatedTask).toBeDefined()
    expect(updatedTask?.title).toBe("Updated Task Title")
    expect(updatedTask?.completed).toBe(true)
    expect(updatedTask?.priority).toBe(1)
  })

  it("should update multiple tasks successfully", async () => {
    const taskUpdates = [
      {
        id: createTaskId("11111111-1111-4111-8111-111111111111"),
        title: "Updated Task 1",
        completed: true,
      },
      {
        id: createTaskId("22222222-2222-4222-8222-222222222222"),
        title: "Updated Task 2",
        priority: 2,
        completed: false,
      },
    ]

    const request = new Request("http://localhost:3000/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskUpdates),
    })

    const response = await PATCH(createMockEnhancedRequest(request))
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(data.success).toBe(true)
    expect(data.taskIds).toHaveLength(2)
    expect(data.message).toBe("2 task(s) updated successfully")

    // Verify both tasks were updated
    const writtenData = getWrittenData()
    const task1 = writtenData.tasks.find(
      (t) => t.id === createTaskId("11111111-1111-4111-8111-111111111111"),
    )
    const task2 = writtenData.tasks.find(
      (t) => t.id === createTaskId("22222222-2222-4222-8222-222222222222"),
    )

    expect(task1?.title).toBe("Updated Task 1")
    expect(task1?.completed).toBe(true)
    expect(task2?.title).toBe("Updated Task 2")
    expect(task2?.priority).toBe(2)
  })

  it("should handle file system errors gracefully", async () => {
    // Mock file system error
    mockSafeReadDataFile.mockResolvedValue(undefined)

    const request = new Request("http://localhost:3000/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: createTaskId("11111111-1111-4111-8111-111111111111"),
        title: "Updated Task",
      }),
    })

    const response = await PATCH(createMockEnhancedRequest(request))
    const data = await response.json()

    expect(response.ok).toBe(false)
    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to read data file")
  })

  describe("completedAt timestamp handling", () => {
    // Clean slate for each test to avoid contamination
    beforeEach(() => {
      vi.clearAllMocks()

      // Reset to default mock data
      mockSafeReadDataFile.mockResolvedValue(mockDataFile)
      mockSafeWriteDataFile.mockResolvedValue(true)
    })
    it("should set completedAt when task transitions from incomplete to complete", async () => {
      const taskUpdate = {
        id: createTaskId("11111111-1111-4111-8111-111111111111"), // This task starts as incomplete
        completed: true,
      }

      const request = new Request("http://localhost:3000/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskUpdate),
      })

      const response = await PATCH(createMockEnhancedRequest(request))
      expect(response.ok).toBe(true)

      const writtenData = getWrittenData()
      const updatedTask = writtenData.tasks.find((t) => t.id === taskUpdate.id)

      expect(updatedTask?.completed).toBe(true)
      expect(updatedTask?.completedAt).toBeDefined()
      expect(updatedTask?.completedAt).toBeInstanceOf(Date)
      if (updatedTask?.completedAt) {
        expect(updatedTask.completedAt).toBeInstanceOf(Date)
      }
    })

    it("should clear completedAt when task transitions from complete to incomplete", async () => {
      const taskUpdate = {
        id: createTaskId("22222222-2222-4222-8222-222222222222"), // This task starts as complete
        completed: false,
      }

      const request = new Request("http://localhost:3000/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskUpdate),
      })

      const response = await PATCH(createMockEnhancedRequest(request))
      expect(response.ok).toBe(true)

      const writtenData = getWrittenData()
      const updatedTask = writtenData.tasks.find((t) => t.id === taskUpdate.id)

      expect(updatedTask?.completed).toBe(false)
      expect(updatedTask?.completedAt).toBeUndefined()
    })

    it("should preserve completedAt when updating completed task without changing completion status", async () => {
      const originalCompletedAt = new Date("2023-01-01T10:00:00Z")

      // Simple approach: modify existing task in place, clear all mocks first
      vi.clearAllMocks()

      const testMockData = {
        ...mockDataFile,
        tasks: mockDataFile.tasks.map((task) =>
          task.id === createTaskId("22222222-2222-4222-8222-222222222222")
            ? { ...task, completed: true, completedAt: originalCompletedAt }
            : task,
        ),
      }

      // Clean mock setup
      mockSafeReadDataFile.mockResolvedValue(testMockData)
      mockSafeWriteDataFile.mockResolvedValue(true)

      const taskUpdate = {
        id: createTaskId("22222222-2222-4222-8222-222222222222"),
        title: "Updated title without changing completion",
      }

      const request = new Request("http://localhost:3000/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskUpdate),
      })

      const response = await PATCH(createMockEnhancedRequest(request))
      expect(response.ok).toBe(true)

      const writtenData = getWrittenData()
      const updatedTask = writtenData.tasks.find((t) => t.id === taskUpdate.id)

      expect(updatedTask?.title).toBe("Updated title without changing completion")
      expect(updatedTask?.completed).toBe(true) // Should remain completed
      expect(updatedTask?.completedAt).toEqual(originalCompletedAt) // Should preserve original date
    })

    it("should not change completedAt when marking already completed task as completed", async () => {
      const originalCompletedAt = new Date("2023-01-01T10:00:00Z")

      // Update the mock data to have a specific completedAt date
      const mockDataWithCompletedAt = {
        ...mockDataFile,
        tasks: mockDataFile.tasks.map((task) =>
          task.id === createTaskId("22222222-2222-4222-8222-222222222222")
            ? { ...task, completedAt: originalCompletedAt, completed: true }
            : task,
        ),
      }

      // Setup fresh mocks for this test
      mockSafeReadDataFile.mockResolvedValue(mockDataWithCompletedAt)
      mockSafeWriteDataFile.mockResolvedValue(true)

      const taskUpdate = {
        id: createTaskId("22222222-2222-4222-8222-222222222222"),
        completed: true, // Already completed, should not change completedAt
      }

      const request = new Request("http://localhost:3000/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskUpdate),
      })

      const response = await PATCH(createMockEnhancedRequest(request))
      expect(response.ok).toBe(true)

      const writtenData = getWrittenData()
      const updatedTask = writtenData.tasks.find((t) => t.id === taskUpdate.id)

      expect(updatedTask?.completed).toBe(true)
      expect(updatedTask?.completedAt).toEqual(originalCompletedAt) // Should preserve original date
    })

    it("should not change completedAt when marking already incomplete task as incomplete", async () => {
      const taskUpdate = {
        id: createTaskId("11111111-1111-4111-8111-111111111111"), // Already incomplete
        completed: false,
      }

      const request = new Request("http://localhost:3000/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskUpdate),
      })

      const response = await PATCH(createMockEnhancedRequest(request))
      expect(response.ok).toBe(true)

      const writtenData = getWrittenData()
      const updatedTask = writtenData.tasks.find((t) => t.id === taskUpdate.id)

      expect(updatedTask?.completed).toBe(false)
      expect(updatedTask?.completedAt).toBeUndefined() // Should remain undefined
    })
  })
})
