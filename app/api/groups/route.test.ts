/**
 * Tests for the /api/groups endpoint
 *
 * This file tests the groups API endpoint functionality including tree-based CRUD operations.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { GET, POST, PATCH, DELETE } from "./route"
import { createGroupId, createTaskId, createProjectId, type DataFile } from "@/lib/types"
import { safeReadDataFile, safeWriteDataFile } from "@/lib/utils/safe-file-operations"

// Mock safe file operations
vi.mock("@/lib/utils/safe-file-operations", () => ({
  safeReadDataFile: vi.fn(),
  safeWriteDataFile: vi.fn(),
}))

// Mock the logger
vi.mock("@/lib/utils/logger", () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock the middleware
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

// Mock UUID
vi.mock("uuid", () => ({
  v4: () => "12345678-1234-4123-8123-123456789012",
}))

// Mock mutex protection
vi.mock("@/lib/utils/api-mutex", () => ({
  withMutexProtection: (handler: (...args: unknown[]) => unknown) => handler,
}))

const mockSafeReadDataFile = vi.mocked(safeReadDataFile)
const mockSafeWriteDataFile = vi.mocked(safeWriteDataFile)

// Test IDs
const TEST_GROUP_ID_1 = createGroupId("11111111-1111-4111-8111-111111111111")
const TEST_GROUP_ID_2 = createGroupId("22222222-2222-4222-8222-222222222222")
const TEST_GROUP_ID_3 = createGroupId("33333333-3333-4333-8333-333333333333")
const TEST_TASK_ID_1 = createTaskId("44444444-4444-4444-8444-444444444444")
const TEST_PROJECT_ID_1 = createProjectId("55555555-5555-4555-8555-555555555555")
// const TEST_LABEL_ID_1 = createLabelId("66666666-6666-4666-8666-666666666666")

describe("GET /api/groups", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock successful file read with sample data including group trees
    const mockFileData: DataFile = {
      projects: [],
      tasks: [],
      labels: [],
      ordering: { projects: [], labels: [] },
      taskGroups: [
        {
          type: "task",
          id: TEST_GROUP_ID_1,
          name: "Work Tasks",
          description: "Tasks related to work",
          color: "#3b82f6",
          items: [
            {
              type: "task",
              id: TEST_GROUP_ID_2,
              name: "Urgent Tasks",
              items: [TEST_TASK_ID_1],
            },
          ],
        },
      ],
      projectGroups: [
        {
          type: "project",
          id: TEST_GROUP_ID_3,
          name: "Active Projects",
          items: [TEST_PROJECT_ID_1],
        },
      ],
      labelGroups: [],
    }

    mockSafeReadDataFile.mockResolvedValue(mockFileData)
  })

  it("should return all groups data successfully", async () => {
    const request = new NextRequest("http://localhost:3000/api/groups")
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()

    expect(data.taskGroups).toHaveLength(1)
    expect(data.projectGroups).toHaveLength(1)
    expect(data.labelGroups).toHaveLength(0)
    expect(data.taskGroups[0].name).toBe("Work Tasks")
    expect(data.taskGroups[0].items).toHaveLength(1)
  })

  it("should handle file read failure", async () => {
    mockSafeReadDataFile.mockResolvedValue(undefined)

    const request = new NextRequest("http://localhost:3000/api/groups")
    const response = await GET(request)

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe("Failed to read data file")
  })
})

describe("POST /api/groups", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock successful file read with sample data
    const mockFileData: DataFile = {
      projects: [],
      tasks: [],
      labels: [],
      ordering: { projects: [], labels: [] },
      taskGroups: [
        {
          type: "task" as const,
          id: TEST_GROUP_ID_1,
          name: "Work Tasks",
          items: [],
        },
      ],
      projectGroups: [
        {
          type: "project" as const,
          id: TEST_GROUP_ID_3,
          name: "Active Projects",
          items: [],
        },
      ],
      labelGroups: [],
    }

    mockSafeReadDataFile.mockResolvedValue(mockFileData)
    mockSafeWriteDataFile.mockResolvedValue(true)
  })

  it("should create a new task group successfully", async () => {
    const groupData = {
      type: "task",
      name: "New Task Group",
      description: "A new group for tasks",
      color: "#ef4444",
      parentId: TEST_GROUP_ID_1,
    }

    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "POST",
      body: JSON.stringify(groupData),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.groupIds).toHaveLength(1)
    expect(data.message).toBe("Group created successfully")
  })

  it("should create a new project group successfully", async () => {
    const groupData = {
      type: "project",
      name: "New Project Group",
      parentId: TEST_GROUP_ID_3,
    }

    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "POST",
      body: JSON.stringify(groupData),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.groupIds).toHaveLength(1)
  })

  it("should return error when parent group not found", async () => {
    const groupData = {
      type: "task",
      name: "Orphaned Group",
      parentId: createGroupId("99999999-9999-4999-8999-999999999999"),
    }

    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "POST",
      body: JSON.stringify(groupData),
    })

    const response = await POST(request)
    expect(response.status).toBe(404)

    const data = await response.json()
    expect(data.error).toBe("Parent group not found")
  })

  it("should return error when parent group type doesn't match", async () => {
    const groupData = {
      type: "project", // Different type
      name: "Mismatched Group",
      parentId: TEST_GROUP_ID_1, // This is a task group
    }

    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "POST",
      body: JSON.stringify(groupData),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBe("Type mismatch")
  })

  it("should return error for invalid request body", async () => {
    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "POST",
      body: JSON.stringify({ name: "Missing required fields" }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it("should handle file write failure", async () => {
    mockSafeWriteDataFile.mockResolvedValue(false)

    const groupData = {
      type: "task",
      name: "New Group",
      parentId: TEST_GROUP_ID_1,
    }

    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "POST",
      body: JSON.stringify(groupData),
    })

    const response = await POST(request)
    expect(response.status).toBe(500)

    const data = await response.json()
    expect(data.error).toBe("Failed to save data")
  })
})

describe("PATCH /api/groups", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock successful file read with sample data
    const mockFileData: DataFile = {
      projects: [],
      tasks: [],
      labels: [],
      ordering: { projects: [], labels: [] },
      taskGroups: [
        {
          type: "task" as const,
          id: TEST_GROUP_ID_1,
          name: "Work Tasks",
          description: "Work related tasks",
          color: "#3b82f6",
          items: [],
        },
      ],
      projectGroups: [
        {
          type: "project" as const,
          id: TEST_GROUP_ID_3,
          name: "Active Projects",
          items: [],
        },
      ],
      labelGroups: [],
    }

    mockSafeReadDataFile.mockResolvedValue(mockFileData)
    mockSafeWriteDataFile.mockResolvedValue(true)
  })

  it("should update a single group successfully", async () => {
    const groupUpdate = {
      id: TEST_GROUP_ID_1,
      name: "Updated Work Tasks",
      description: "Updated description",
      color: "#ef4444",
    }

    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "PATCH",
      body: JSON.stringify(groupUpdate),
    })

    const response = await PATCH(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.groups).toHaveLength(1)
    expect(data.count).toBe(1)
    expect(data.message).toBe("1 group(s) updated successfully")
  })

  it("should update multiple groups successfully", async () => {
    const groupUpdates = [
      {
        id: TEST_GROUP_ID_1,
        name: "Updated Work Tasks",
      },
      {
        id: TEST_GROUP_ID_3,
        name: "Updated Active Projects",
      },
    ]

    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "PATCH",
      body: JSON.stringify(groupUpdates),
    })

    const response = await PATCH(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.groups).toHaveLength(2)
    expect(data.count).toBe(2)
  })

  it("should skip non-existent groups", async () => {
    const groupUpdates = [
      {
        id: TEST_GROUP_ID_1,
        name: "Updated Work Tasks",
      },
      {
        id: createGroupId("99999999-9999-4999-8999-999999999999"),
        name: "Non-existent Group",
      },
    ]

    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "PATCH",
      body: JSON.stringify(groupUpdates),
    })

    const response = await PATCH(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.groups).toHaveLength(1) // Only one group was updated
    expect(data.count).toBe(1)
  })

  it("should return error for invalid request body", async () => {
    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "PATCH",
      body: JSON.stringify({ invalid: "data" }),
    })

    const response = await PATCH(request)
    expect(response.status).toBe(400)
  })

  it("should handle file write failure", async () => {
    mockSafeWriteDataFile.mockResolvedValue(false)

    const groupUpdate = {
      id: TEST_GROUP_ID_1,
      name: "Updated Name",
    }

    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "PATCH",
      body: JSON.stringify(groupUpdate),
    })

    const response = await PATCH(request)
    expect(response.status).toBe(500)

    const data = await response.json()
    expect(data.error).toBe("Failed to save data")
  })
})

describe("DELETE /api/groups", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock successful file read with nested group structure
    const mockFileData: DataFile = {
      projects: [],
      tasks: [],
      labels: [],
      ordering: { projects: [], labels: [] },
      taskGroups: [
        {
          type: "task" as const,
          id: TEST_GROUP_ID_1,
          name: "Work Tasks",
          items: [
            {
              type: "task" as const,
              id: TEST_GROUP_ID_2,
              name: "Nested Group",
              items: [],
            },
          ],
        },
      ],
      projectGroups: [
        {
          type: "project" as const,
          id: TEST_GROUP_ID_3,
          name: "Active Projects",
          items: [],
        },
      ],
      labelGroups: [],
    }

    mockSafeReadDataFile.mockResolvedValue(mockFileData)
    mockSafeWriteDataFile.mockResolvedValue(true)
  })

  it("should delete a top-level group successfully", async () => {
    const deleteRequest = {
      id: TEST_GROUP_ID_1,
    }

    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "DELETE",
      body: JSON.stringify(deleteRequest),
    })

    const response = await DELETE(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.groupIds).toEqual([TEST_GROUP_ID_1])
    expect(data.message).toBe("1 group(s) deleted successfully")
  })

  it("should delete a nested group successfully", async () => {
    const deleteRequest = {
      id: TEST_GROUP_ID_2, // Nested group
    }

    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "DELETE",
      body: JSON.stringify(deleteRequest),
    })

    const response = await DELETE(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.groupIds).toEqual([TEST_GROUP_ID_2])
  })

  it("should handle deletion of non-existent group gracefully", async () => {
    const deleteRequest = {
      id: createGroupId("99999999-9999-4999-8999-999999999999"),
    }

    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "DELETE",
      body: JSON.stringify(deleteRequest),
    })

    const response = await DELETE(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.message).toBe("0 group(s) deleted successfully")
  })

  it("should return error for invalid request body", async () => {
    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "DELETE",
      body: JSON.stringify({ invalid: "data" }),
    })

    const response = await DELETE(request)
    expect(response.status).toBe(400)
  })

  it("should handle file write failure", async () => {
    mockSafeWriteDataFile.mockResolvedValue(false)

    const deleteRequest = {
      id: TEST_GROUP_ID_1,
    }

    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "DELETE",
      body: JSON.stringify(deleteRequest),
    })

    const response = await DELETE(request)
    expect(response.status).toBe(500)

    const data = await response.json()
    expect(data.error).toBe("Failed to save changes")
  })

  it("should handle file read failure", async () => {
    mockSafeReadDataFile.mockResolvedValue(undefined)

    const deleteRequest = {
      id: TEST_GROUP_ID_1,
    }

    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "DELETE",
      body: JSON.stringify(deleteRequest),
    })

    const response = await DELETE(request)
    expect(response.status).toBe(500)

    const data = await response.json()
    expect(data.error).toBe("Failed to read data file")
  })
})
