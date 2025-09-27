/**
 * API Route Tests for User Operations
 *
 * Tests the GET and PATCH /api/user endpoints for user management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { GET, PATCH } from "./route"
import { DataFile, DataFileSchema, User } from "@/lib/types"
import { DEFAULT_EMPTY_DATA_FILE, DEFAULT_USER } from "@/lib/types"
import { safeReadDataFile, safeWriteDataFile } from "@/lib/utils/safe-file-operations"
import { createMockEnhancedRequest } from "@/lib/utils/test-helpers"

// Mock safe file operations
vi.mock("@/lib/utils/safe-file-operations")

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

// Mock the API mutex
vi.mock("@/lib/utils/api-mutex", () => ({
  withMutexProtection: (handler: (...args: unknown[]) => unknown) => handler,
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

// Mock data structure
const mockUser: User = {
  username: "testuser",
  password: "testpassword",
  avatar: "/test/avatar.jpg",
}

const mockDataFile: DataFile = {
  ...DEFAULT_EMPTY_DATA_FILE,
  user: mockUser,
}

describe("GET /api/user", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSafeReadDataFile.mockResolvedValue(mockDataFile)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should return current user data successfully", async () => {
    const request = new Request("http://localhost:3000/api/user", {
      method: "GET",
    })

    const response = await GET(createMockEnhancedRequest(request))
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(data).toEqual(mockUser)

    // Verify that readFile was called
    expect(mockSafeReadDataFile).toHaveBeenCalled()
  })

  it("should return default user when data file is empty", async () => {
    const emptyDataFile: DataFile = {
      ...DEFAULT_EMPTY_DATA_FILE,
      user: DEFAULT_USER,
    }
    mockSafeReadDataFile.mockResolvedValue(emptyDataFile)

    const request = new Request("http://localhost:3000/api/user", {
      method: "GET",
    })

    const response = await GET(createMockEnhancedRequest(request))
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(data).toEqual(DEFAULT_USER)
  })

  it("should handle file system errors gracefully", async () => {
    // Mock file system error
    mockSafeReadDataFile.mockResolvedValue(undefined)

    const request = new Request("http://localhost:3000/api/user", {
      method: "GET",
    })

    const response = await GET(createMockEnhancedRequest(request))
    const data = await response.json()

    expect(response.ok).toBe(false)
    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to read data file")
  })
})

describe("PATCH /api/user", () => {
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

  it("should update user successfully", async () => {
    const userUpdate = {
      username: "updateduser",
      avatar: "/new/avatar.jpg",
    }

    const request = new Request("http://localhost:3000/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userUpdate),
    })

    const response = await PATCH(createMockEnhancedRequest(request))
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(data.success).toBe(true)
    expect(data.message).toBe("User updated successfully")
    expect(data.user.username).toBe("updateduser")
    expect(data.user.avatar).toBe("/new/avatar.jpg")
    expect(data.user.password).toBe("testpassword") // Should preserve existing password

    // Verify that writeFile was called with updated user data
    expect(mockSafeWriteDataFile).toHaveBeenCalled()
    const writtenData = getWrittenData()

    // Verify the user was updated in the written data
    expect(writtenData.user.username).toBe("updateduser")
    expect(writtenData.user.avatar).toBe("/new/avatar.jpg")
    expect(writtenData.user.password).toBe("testpassword")
  })

  it("should handle partial updates correctly", async () => {
    const userUpdate = {
      username: "partialupdateuser",
      // No password or avatar provided
    }

    const request = new Request("http://localhost:3000/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userUpdate),
    })

    const response = await PATCH(createMockEnhancedRequest(request))
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(data.success).toBe(true)
    expect(data.user.username).toBe("partialupdateuser")
    expect(data.user.password).toBe("testpassword") // Should preserve existing
    expect(data.user.avatar).toBe("/test/avatar.jpg") // Should preserve existing

    const writtenData = getWrittenData()
    expect(writtenData.user.username).toBe("partialupdateuser")
    expect(writtenData.user.password).toBe("testpassword")
    expect(writtenData.user.avatar).toBe("/test/avatar.jpg")
  })

  it("should handle null values as cleanup", async () => {
    const userUpdate = {
      username: "userwithnullfields",
      password: null, // Should clear password
      avatar: null, // Should clear avatar
    }

    const request = new Request("http://localhost:3000/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userUpdate),
    })

    const response = await PATCH(createMockEnhancedRequest(request))
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(data.success).toBe(true)
    expect(data.user.username).toBe("userwithnullfields")
    expect(data.user.password).toBeUndefined() // Should be cleaned up
    expect(data.user.avatar).toBeUndefined() // Should be cleaned up

    const writtenData = getWrittenData()
    expect(writtenData.user.username).toBe("userwithnullfields")
    expect(writtenData.user.password).toBeUndefined()
    expect(writtenData.user.avatar).toBeUndefined()
  })

  it("should handle file read errors gracefully", async () => {
    // Mock file system error during read
    mockSafeReadDataFile.mockResolvedValue(undefined)

    const userUpdate = {
      username: "testuser",
    }

    const request = new Request("http://localhost:3000/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userUpdate),
    })

    const response = await PATCH(createMockEnhancedRequest(request))
    const data = await response.json()

    expect(response.ok).toBe(false)
    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to read data file")
  })

  it("should handle file write errors gracefully", async () => {
    // Mock file write failure
    mockSafeWriteDataFile.mockResolvedValue(false)

    const userUpdate = {
      username: "testuser",
    }

    const request = new Request("http://localhost:3000/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userUpdate),
    })

    const response = await PATCH(createMockEnhancedRequest(request))
    const data = await response.json()

    expect(response.ok).toBe(false)
    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to save data")
  })

  it("should handle invalid JSON in request body", async () => {
    const request = new Request("http://localhost:3000/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "invalid json",
    })

    const response = await PATCH(createMockEnhancedRequest(request))
    const data = await response.json()

    expect(response.ok).toBe(false)
    expect(response.status).toBe(400)
    expect(data.error).toBe("Invalid JSON in request body")
  })

  it("should handle validation errors", async () => {
    const invalidUserUpdate = {
      username: 123, // Invalid type - should be string
    }

    const request = new Request("http://localhost:3000/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invalidUserUpdate),
    })

    const response = await PATCH(createMockEnhancedRequest(request))
    const data = await response.json()

    expect(response.ok).toBe(false)
    expect(response.status).toBe(400)
    expect(data.error).toBe("Validation failed")
    expect(data.message).toContain("username")
  })

  it("should preserve other data when updating user", async () => {
    const userUpdate = {
      username: "newusername",
    }

    const request = new Request("http://localhost:3000/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userUpdate),
    })

    const response = await PATCH(createMockEnhancedRequest(request))
    expect(response.ok).toBe(true)

    const writtenData = getWrittenData()

    // Verify that other data in the file is preserved
    expect(writtenData.tasks).toEqual(mockDataFile.tasks)
    expect(writtenData.projects).toEqual(mockDataFile.projects)
    expect(writtenData.labels).toEqual(mockDataFile.labels)
    expect(writtenData.settings).toEqual(mockDataFile.settings)

    // Only user should be updated
    expect(writtenData.user.username).toBe("newusername")
  })

  it("should disable password protection when null is provided", async () => {
    const userUpdate = {
      username: "userwithdisabledpassword",
      password: null, // Explicitly disable password
    }

    const request = new Request("http://localhost:3000/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userUpdate),
    })

    const response = await PATCH(createMockEnhancedRequest(request))
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(data.success).toBe(true)
    expect(data.user.username).toBe("userwithdisabledpassword")
    expect(data.user.password).toBeUndefined() // Should be cleaned up (null -> undefined)

    const writtenData = getWrittenData()
    expect(writtenData.user.username).toBe("userwithdisabledpassword")
    expect(writtenData.user.password).toBeUndefined() // Should be cleaned up in written data too
  })

  it("should allow setting a new password", async () => {
    const userUpdate = {
      username: "userwithpassword",
      password: "newsecurepassword123",
    }

    const request = new Request("http://localhost:3000/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userUpdate),
    })

    const response = await PATCH(createMockEnhancedRequest(request))
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(data.success).toBe(true)
    expect(data.user.username).toBe("userwithpassword")
    expect(data.user.password).toBe("newsecurepassword123")

    const writtenData = getWrittenData()
    expect(writtenData.user.username).toBe("userwithpassword")
    expect(writtenData.user.password).toBe("newsecurepassword123")
  })
})
