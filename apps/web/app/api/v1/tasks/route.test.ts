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
  createGroupId,
} from "@/lib/types"
import { DEFAULT_EMPTY_DATA_FILE, DEFAULT_SECTION_ID } from "@/lib/types"
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
      sections: [],
    },
    {
      id: createProjectId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
      name: "Test Project 2",
      slug: "test-project-2",
      color: "#ef4444",
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

  describe("project and section handling", () => {
    const TASK_ID_1 = createTaskId("11111111-1111-4111-8111-111111111111")
    const TASK_ID_2 = createTaskId("22222222-2222-4222-8222-222222222222")
    const PROJECT_ID_1 = createProjectId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
    const PROJECT_ID_2 = createProjectId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")
    const SECTION_ID_1 = createGroupId("11111111-1111-4111-8111-111111111111")
    const SECTION_ID_2 = createGroupId("22222222-2222-4222-8222-222222222222")
    // DEFAULT_SECTION_ID is imported from @/lib/types

    beforeEach(() => {
      vi.clearAllMocks()

      // Create mock data with proper section structure
      const mockDataWithSections: DataFile = {
        ...mockDataFile,
        tasks: [
          {
            ...mockDataFile.tasks[0],
            id: TASK_ID_1,
            title: mockDataFile.tasks[0]?.title || "Test Task 1",
            completed: mockDataFile.tasks[0]?.completed ?? false,
            priority: mockDataFile.tasks[0]?.priority ?? 4,
            labels: mockDataFile.tasks[0]?.labels ?? [],
            subtasks: mockDataFile.tasks[0]?.subtasks ?? [],
            comments: mockDataFile.tasks[0]?.comments ?? [],
            recurringMode: mockDataFile.tasks[0]?.recurringMode ?? "dueDate",
            createdAt: mockDataFile.tasks[0]?.createdAt ?? new Date(),
            projectId: PROJECT_ID_1,
          },
          {
            ...mockDataFile.tasks[1],
            id: TASK_ID_2,
            title: mockDataFile.tasks[1]?.title || "Test Task 2",
            completed: mockDataFile.tasks[1]?.completed ?? false,
            priority: mockDataFile.tasks[1]?.priority ?? 4,
            labels: mockDataFile.tasks[1]?.labels ?? [],
            subtasks: mockDataFile.tasks[1]?.subtasks ?? [],
            comments: mockDataFile.tasks[1]?.comments ?? [],
            recurringMode: mockDataFile.tasks[1]?.recurringMode ?? "dueDate",
            createdAt: mockDataFile.tasks[1]?.createdAt ?? new Date(),
            projectId: PROJECT_ID_2,
          },
        ],
        projects: [
          {
            id: PROJECT_ID_1,
            name: "Test Project 1",
            slug: "test-project-1",
            color: "#3b82f6",
            sections: [
              {
                id: DEFAULT_SECTION_ID,
                name: "Default",
                slug: "",
                type: "section",
                items: [TASK_ID_1], // Task 1 is in default section
              },
              {
                id: SECTION_ID_1,
                name: "Section 1",
                slug: "",
                type: "section",
                items: [],
              },
            ],
          },
          {
            id: PROJECT_ID_2,
            name: "Test Project 2",
            slug: "test-project-2",
            color: "#ef4444",
            sections: [
              {
                id: DEFAULT_SECTION_ID,
                name: "Default",
                slug: "",
                type: "section",
                items: [TASK_ID_2], // Task 2 is in default section
              },
              {
                id: SECTION_ID_2,
                name: "Section 2",
                slug: "",
                type: "section",
                items: [],
              },
            ],
          },
        ],
      }

      mockSafeReadDataFile.mockResolvedValue(mockDataWithSections)
      mockSafeWriteDataFile.mockResolvedValue(true)
    })

    it("should move task to new project's default section when only projectId is updated", async () => {
      const taskUpdate = {
        id: TASK_ID_1,
        projectId: PROJECT_ID_2, // Move from Project 1 to Project 2
      }

      const request = new Request("http://localhost:3000/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskUpdate),
      })

      const response = await PATCH(createMockEnhancedRequest(request))
      expect(response.ok).toBe(true)

      const writtenData = getWrittenData()

      // Task should be removed from Project 1's default section
      const project1 = writtenData.projects.find((p) => p.id === PROJECT_ID_1)
      const project1DefaultSection = project1?.sections.find((s) => s.id === DEFAULT_SECTION_ID)
      expect(project1DefaultSection?.items).not.toContain(TASK_ID_1)

      // Task should be added to Project 2's default section
      const project2 = writtenData.projects.find((p) => p.id === PROJECT_ID_2)
      const project2DefaultSection = project2?.sections.find((s) => s.id === DEFAULT_SECTION_ID)
      expect(project2DefaultSection?.items).toContain(TASK_ID_1)

      // Task's projectId should be updated
      const updatedTask = writtenData.tasks.find((t) => t.id === TASK_ID_1)
      expect(updatedTask?.projectId).toBe(PROJECT_ID_2)
    })

    it("should move task within same project when only sectionId is updated", async () => {
      const taskUpdate = {
        id: TASK_ID_1,
        sectionId: SECTION_ID_1, // Move from default section to Section 1 in same project
      }

      const request = new Request("http://localhost:3000/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskUpdate),
      })

      const response = await PATCH(createMockEnhancedRequest(request))
      expect(response.ok).toBe(true)

      const writtenData = getWrittenData()

      // Task should be removed from default section
      const project1 = writtenData.projects.find((p) => p.id === PROJECT_ID_1)
      const defaultSection = project1?.sections.find((s) => s.id === DEFAULT_SECTION_ID)
      expect(defaultSection?.items).not.toContain(TASK_ID_1)

      // Task should be added to Section 1
      const section1 = project1?.sections.find((s) => s.id === SECTION_ID_1)
      expect(section1?.items).toContain(TASK_ID_1)

      // Task's projectId should remain unchanged
      const updatedTask = writtenData.tasks.find((t) => t.id === TASK_ID_1)
      expect(updatedTask?.projectId).toBe(PROJECT_ID_1)
    })

    it("should move task to new project's specified section when both projectId and sectionId are updated", async () => {
      const taskUpdate = {
        id: TASK_ID_1,
        projectId: PROJECT_ID_2, // Move from Project 1 to Project 2
        sectionId: SECTION_ID_2, // Move to Section 2 in Project 2
      }

      const request = new Request("http://localhost:3000/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskUpdate),
      })

      const response = await PATCH(createMockEnhancedRequest(request))
      expect(response.ok).toBe(true)

      const writtenData = getWrittenData()

      // Task should be removed from Project 1's default section
      const project1 = writtenData.projects.find((p) => p.id === PROJECT_ID_1)
      const project1DefaultSection = project1?.sections.find((s) => s.id === DEFAULT_SECTION_ID)
      expect(project1DefaultSection?.items).not.toContain(TASK_ID_1)

      // Task should NOT be in Project 2's default section
      const project2 = writtenData.projects.find((p) => p.id === PROJECT_ID_2)
      const project2DefaultSection = project2?.sections.find((s) => s.id === DEFAULT_SECTION_ID)
      expect(project2DefaultSection?.items).not.toContain(TASK_ID_1)

      // Task should be added to Project 2's Section 2
      const section2 = project2?.sections.find((s) => s.id === SECTION_ID_2)
      expect(section2?.items).toContain(TASK_ID_1)

      // Task's projectId should be updated
      const updatedTask = writtenData.tasks.find((t) => t.id === TASK_ID_1)
      expect(updatedTask?.projectId).toBe(PROJECT_ID_2)
    })

    it("should not modify sections when neither projectId nor sectionId are updated", async () => {
      const taskUpdate = {
        id: TASK_ID_1,
        title: "Updated title only",
        priority: 2,
      }

      const request = new Request("http://localhost:3000/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskUpdate),
      })

      const response = await PATCH(createMockEnhancedRequest(request))
      expect(response.ok).toBe(true)

      const writtenData = getWrittenData()

      // Task should remain in Project 1's default section
      const project1 = writtenData.projects.find((p) => p.id === PROJECT_ID_1)
      const defaultSection = project1?.sections.find((s) => s.id === DEFAULT_SECTION_ID)
      expect(defaultSection?.items).toContain(TASK_ID_1)

      // Task's projectId should remain unchanged
      const updatedTask = writtenData.tasks.find((t) => t.id === TASK_ID_1)
      expect(updatedTask?.projectId).toBe(PROJECT_ID_1)
      expect(updatedTask?.title).toBe("Updated title only")
      expect(updatedTask?.priority).toBe(2)
    })

    it("should handle multiple task updates with different project/section changes", async () => {
      const taskUpdates = [
        {
          id: TASK_ID_1,
          projectId: PROJECT_ID_2, // Move Task 1 to Project 2's default section
        },
        {
          id: TASK_ID_2,
          sectionId: SECTION_ID_2, // Move Task 2 to Section 2 within Project 2
        },
      ]

      const request = new Request("http://localhost:3000/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskUpdates),
      })

      const response = await PATCH(createMockEnhancedRequest(request))
      expect(response.ok).toBe(true)

      const writtenData = getWrittenData()

      // Task 1 should be in Project 2's default section
      const project2 = writtenData.projects.find((p) => p.id === PROJECT_ID_2)
      const project2DefaultSection = project2?.sections.find((s) => s.id === DEFAULT_SECTION_ID)
      expect(project2DefaultSection?.items).toContain(TASK_ID_1)

      // Task 2 should be in Project 2's Section 2
      const section2 = project2?.sections.find((s) => s.id === SECTION_ID_2)
      expect(section2?.items).toContain(TASK_ID_2)

      // Project 2's default section should NOT contain Task 2 (moved to Section 2)
      expect(project2DefaultSection?.items).not.toContain(TASK_ID_2)

      // Verify task projectIds
      const task1 = writtenData.tasks.find((t) => t.id === TASK_ID_1)
      const task2 = writtenData.tasks.find((t) => t.id === TASK_ID_2)
      expect(task1?.projectId).toBe(PROJECT_ID_2)
      expect(task2?.projectId).toBe(PROJECT_ID_2)
    })
  })
})
