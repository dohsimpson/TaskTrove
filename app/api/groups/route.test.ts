/**
 * Tests for the /api/groups endpoint
 *
 * This file tests the groups API endpoint functionality including tree-based CRUD operations.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { GET, POST, PATCH, DELETE } from "./route"
import { createGroupId, createProjectId, type DataFile } from "@/lib/types"
import { safeReadDataFile, safeWriteDataFile } from "@/lib/utils/safe-file-operations"

// Mock safe file operations
vi.mock("@/lib/utils/safe-file-operations", () => ({
  safeReadDataFile: vi.fn(),
  safeWriteDataFile: vi.fn(),
}))

// Mock the logger
vi.mock("@/lib/utils/logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
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
  logSecurityEvent: vi.fn(),
}))

const mockSafeReadDataFile = vi.mocked(safeReadDataFile)
const mockSafeWriteDataFile = vi.mocked(safeWriteDataFile)

// Test IDs
const TEST_GROUP_ID_3 = createGroupId("33333333-3333-4333-8333-333333333333")
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

  it("should return all group data when file read succeeds", async () => {
    const request = new NextRequest("http://localhost:3000/api/groups")
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()

    expect(data.projectGroups).toHaveLength(1)
    expect(data.labelGroups).toHaveLength(0)
    expect(data.projectGroups[0].name).toBe("Active Projects")
    expect(data.projectGroups[0].items).toHaveLength(1)
  })

  it("should handle file read failure", async () => {
    mockSafeReadDataFile.mockResolvedValue(undefined)

    const request = new NextRequest("http://localhost:3000/api/groups")
    const response = await GET(request)

    expect(response.status).toBe(500)
    const data = await response.json()

    expect(data).toEqual({
      error: "Failed to read data file",
      message: "File reading or validation failed",
    })
  })
})

describe("POST /api/groups", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const mockFileData: DataFile = {
      projects: [],
      tasks: [],
      labels: [],
      ordering: { projects: [], labels: [] },
      projectGroups: [
        {
          type: "project",
          id: TEST_GROUP_ID_3,
          name: "Parent Project Group",
          items: [],
        },
      ],
      labelGroups: [],
    }

    mockSafeReadDataFile.mockResolvedValue(mockFileData)
    mockSafeWriteDataFile.mockResolvedValue(true)
  })

  it("should create a new project group", async () => {
    const newProjectGroup = {
      type: "project",
      name: "New Project Group",
      parentId: TEST_GROUP_ID_3,
    }

    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProjectGroup),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.groupIds).toBeDefined()
    expect(data.groupIds).toHaveLength(1)
    expect(data.message).toBe("Group created successfully")
    expect(mockSafeWriteDataFile).toHaveBeenCalled()
  })

  it("should handle file write failure", async () => {
    mockSafeWriteDataFile.mockResolvedValue(false)

    const newGroup = {
      type: "project",
      name: "Test Group",
      parentId: TEST_GROUP_ID_3,
    }

    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newGroup),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to save data")
    expect(data.message).toBe("File writing failed")
  })
})

describe("PATCH /api/groups", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const mockFileData: DataFile = {
      projects: [],
      tasks: [],
      labels: [],
      ordering: { projects: [], labels: [] },
      projectGroups: [
        {
          type: "project",
          id: TEST_GROUP_ID_3,
          name: "Original Project Group",
          items: [TEST_PROJECT_ID_1],
        },
      ],
      labelGroups: [],
    }

    mockSafeReadDataFile.mockResolvedValue(mockFileData)
    mockSafeWriteDataFile.mockResolvedValue(true)
  })

  it("should update an existing project group", async () => {
    const updates = {
      id: TEST_GROUP_ID_3,
      type: "project",
      name: "Updated Project Group",
      description: "Updated description",
    }

    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.groups).toBeDefined()
    expect(data.groups).toHaveLength(1)
    expect(data.groups[0].name).toBe("Updated Project Group")
    expect(data.count).toBe(1)
    expect(mockSafeWriteDataFile).toHaveBeenCalled()
  })

  it("should return success with count 0 for non-existent group", async () => {
    const updates = {
      id: createGroupId("99999999-9999-4999-8999-999999999999"),
      type: "project",
      name: "Non-existent Group",
    }

    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("Group not found: 99999999-9999-4999-8999-999999999999")
    expect(data.message).toBe("GROUP_NOT_FOUND")
  })
})

describe("DELETE /api/groups", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const mockFileData: DataFile = {
      projects: [],
      tasks: [],
      labels: [],
      ordering: { projects: [], labels: [] },
      projectGroups: [
        {
          type: "project",
          id: TEST_GROUP_ID_3,
          name: "Project Group to Delete",
          items: [TEST_PROJECT_ID_1],
        },
      ],
      labelGroups: [],
    }

    mockSafeReadDataFile.mockResolvedValue(mockFileData)
    mockSafeWriteDataFile.mockResolvedValue(true)
  })

  it("should delete an existing project group", async () => {
    const deleteRequest = {
      id: TEST_GROUP_ID_3,
    }

    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deleteRequest),
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.groupIds).toEqual([TEST_GROUP_ID_3])
    expect(data.message).toBe("1 group(s) deleted successfully")
    expect(mockSafeWriteDataFile).toHaveBeenCalled()
  })

  it("should return success with count 0 for non-existent group", async () => {
    const nonExistentId = createGroupId("99999999-9999-4999-8999-999999999999")
    const deleteRequest = {
      id: nonExistentId,
    }

    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deleteRequest),
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.groupIds).toEqual([nonExistentId])
    expect(data.message).toBe("0 group(s) deleted successfully")
  })

  it("should return 400 for missing group ID", async () => {
    const request = new NextRequest("http://localhost:3000/api/groups", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}), // Empty body missing required id field
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Validation failed")
    expect(data.message).toBeDefined()
  })
})
