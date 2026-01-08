/**
 * Tests for the /api/labels endpoint
 *
 * This file tests the separated labels API endpoint functionality.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { POST, PATCH, DELETE } from "./route"
import { TEST_LABEL_ID_1, TEST_LABEL_ID_2 } from "@tasktrove/types/test-constants"
import { safeReadDataFile, safeWriteDataFile } from "@/lib/utils/safe-file-operations"
import { DEFAULT_EMPTY_DATA_FILE } from "@tasktrove/types/defaults"
import { createLabelId } from "@tasktrove/types/id"

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
    return await operation()
  },
  withPerformanceLogging: async (operation: () => Promise<unknown>) => {
    return await operation()
  },
}))

// Mock UUID
vi.mock("uuid", () => ({
  v4: () => "12345678-1234-4123-8123-123456789012",
}))

const mockSafeReadDataFile = vi.mocked(safeReadDataFile)
const mockSafeWriteDataFile = vi.mocked(safeWriteDataFile)

describe("PATCH /api/labels", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock successful file read with sample data
    const mockFileData = {
      ...DEFAULT_EMPTY_DATA_FILE,
      labels: [
        {
          id: TEST_LABEL_ID_1,
          name: "Important",
          color: "#ef4444",
        },
        {
          id: TEST_LABEL_ID_2,
          name: "Work",
          color: "#3b82f6",
        },
      ],
    }

    mockSafeReadDataFile.mockResolvedValue(mockFileData)
    mockSafeWriteDataFile.mockResolvedValue(true)
  })

  it("should update labels successfully (replaces entire array)", async () => {
    const labelUpdates = [
      {
        id: TEST_LABEL_ID_1,
        name: "Critical",
        color: "#dc2626",
      },
      {
        id: TEST_LABEL_ID_2,
        name: "Personal",
        color: "#10b981",
      },
    ]

    const request = new NextRequest("http://localhost:3000/api/labels", {
      method: "PATCH",
      body: JSON.stringify(labelUpdates),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.labels).toHaveLength(2)
    expect(responseData.labels[0].name).toBe("Critical")
    expect(responseData.labels[0].color).toBe("#dc2626")
    expect(responseData.labels[1].name).toBe("Personal")
    expect(responseData.labels[1].color).toBe("#10b981")
    expect(responseData.count).toBe(2)
    expect(responseData.message).toBe("2 label(s) updated successfully")
  })

  it("should return 400 error for missing label ID", async () => {
    const invalidUpdate = {
      name: "Label without ID",
      color: "#10b981",
    }

    const request = new NextRequest("http://localhost:3000/api/labels", {
      method: "PATCH",
      body: JSON.stringify(invalidUpdate),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)
    const responseData = await response.json()

    expect(response.status).toBe(400)
    expect(responseData.error).toBe("Validation failed")
  })

  it("should handle file system errors gracefully", async () => {
    mockSafeReadDataFile.mockResolvedValue(undefined) // Simulate read failure

    const labelUpdate = [
      {
        id: TEST_LABEL_ID_1,
        name: "Updated Label",
        color: "#8b5cf6",
      },
    ]

    const request = new NextRequest("http://localhost:3000/api/labels", {
      method: "PATCH",
      body: JSON.stringify(labelUpdate),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)
    const responseData = await response.json()

    expect(response.status).toBe(500)
    expect(responseData.error).toBe("Failed to update labels")
  })
})

describe("DELETE /api/labels", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock successful file read with sample data
    const mockFileData = {
      ...DEFAULT_EMPTY_DATA_FILE,
      labels: [
        {
          id: TEST_LABEL_ID_1,
          name: "Important",
          color: "#ef4444",
        },
        {
          id: TEST_LABEL_ID_2,
          name: "Work",
          color: "#3b82f6",
        },
      ],
    }

    mockSafeReadDataFile.mockResolvedValue(mockFileData)
    mockSafeWriteDataFile.mockResolvedValue(true)
  })

  it("should delete a label successfully", async () => {
    const request = new NextRequest("http://localhost:3000/api/labels", {
      method: "DELETE",
      body: JSON.stringify({ id: TEST_LABEL_ID_1 }),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await DELETE(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.labelIds).toEqual([TEST_LABEL_ID_1])
    expect(responseData.message).toBe("1 label(s) deleted successfully")
  })

  it("should return 400 error for invalid label ID", async () => {
    const request = new NextRequest("http://localhost:3000/api/labels", {
      method: "DELETE",
      body: JSON.stringify("invalid-id"),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await DELETE(request)
    const responseData = await response.json()

    expect(response.status).toBe(400)
    expect(responseData.error).toBeDefined()
  })

  it("should handle file system errors gracefully during deletion", async () => {
    mockSafeReadDataFile.mockResolvedValue(undefined) // Simulate read failure

    const request = new NextRequest("http://localhost:3000/api/labels", {
      method: "DELETE",
      body: JSON.stringify({ id: TEST_LABEL_ID_1 }),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await DELETE(request)
    const responseData = await response.json()

    expect(response.status).toBe(500)
    expect(responseData.error).toBe("Failed to read data file")
  })

  it("should handle non-existent label deletion gracefully", async () => {
    const nonExistentLabelId = "abcdef01-abcd-4bcd-8bcd-abcdefabcde9" // Valid UUID but not in test data
    const request = new NextRequest("http://localhost:3000/api/labels", {
      method: "DELETE",
      body: JSON.stringify({ id: nonExistentLabelId }),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await DELETE(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.labelIds).toEqual([nonExistentLabelId])
    expect(responseData.message).toBe("0 label(s) deleted successfully")
  })

  it("should handle write file system errors gracefully", async () => {
    mockSafeWriteDataFile.mockResolvedValue(false) // Simulate write failure

    const request = new NextRequest("http://localhost:3000/api/labels", {
      method: "DELETE",
      body: JSON.stringify({ id: TEST_LABEL_ID_1 }),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await DELETE(request)
    const responseData = await response.json()

    expect(response.status).toBe(500)
    expect(responseData.error).toBe("Failed to save changes")
  })
})

describe("POST /api/labels", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock successful file operations
    const mockFileData = {
      ...DEFAULT_EMPTY_DATA_FILE,
      labels: [
        {
          id: TEST_LABEL_ID_1,
          name: "Existing Label",
          color: "#ef4444",
        },
      ],
    }

    mockSafeReadDataFile.mockResolvedValue(mockFileData)
    mockSafeWriteDataFile.mockResolvedValue(true)
  })

  it("should create a new label successfully with all fields", async () => {
    const newLabelId = createLabelId("12345678-1234-4123-8123-123456789012")
    const newLabelRequest = {
      id: newLabelId,
      name: "New Label",
      color: "#10b981",
    }

    const request = new NextRequest("http://localhost:3000/api/labels", {
      method: "POST",
      body: JSON.stringify(newLabelRequest),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await POST(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.labelIds).toHaveLength(1)
    expect(responseData.labelIds[0]).toBe(newLabelId)
    expect(responseData.message).toBe("Label created successfully")

    // Verify file operations were called
    expect(mockSafeReadDataFile).toHaveBeenCalledTimes(1)
    expect(mockSafeWriteDataFile).toHaveBeenCalledTimes(1)

    // Verify the label was added to the data
    const writeArgs = mockSafeWriteDataFile.mock.calls[0]
    if (!writeArgs || !writeArgs[0]) {
      throw new Error("Expected mockSafeWriteDataFile to have been called with arguments")
    }
    const writeCall = writeArgs[0]
    expect(writeCall.data.labels).toHaveLength(2)
    expect(writeCall.data.labels[1]).toEqual(newLabelRequest)
  })

  it("should return 400 error when name is missing", async () => {
    const invalidRequest = {
      id: createLabelId("99999999-1234-4123-8123-123456789012"),
      color: "#10b981",
      // Missing required name field
    }

    const request = new NextRequest("http://localhost:3000/api/labels", {
      method: "POST",
      body: JSON.stringify(invalidRequest),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await POST(request)
    const responseData = await response.json()

    expect(response.status).toBe(400)
    expect(responseData.error).toBeDefined()
  })

  it("should handle file read errors gracefully", async () => {
    mockSafeReadDataFile.mockResolvedValue(undefined) // Simulate read failure

    const newLabelRequest = {
      id: createLabelId("bbbbbbbb-1234-4123-8123-123456789012"),
      name: "Test Label",
      color: "#10b981",
    }

    const request = new NextRequest("http://localhost:3000/api/labels", {
      method: "POST",
      body: JSON.stringify(newLabelRequest),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await POST(request)
    const responseData = await response.json()

    expect(response.status).toBe(500)
    expect(responseData.error).toBe("Failed to read data file")
    expect(responseData.message).toBe("File operation failed")
  })

  it("should handle file write errors gracefully", async () => {
    mockSafeWriteDataFile.mockResolvedValue(false) // Simulate write failure

    const newLabelRequest = {
      id: createLabelId("cccccccc-1234-4123-8123-123456789012"),
      name: "Test Label",
      color: "#10b981",
    }

    const request = new NextRequest("http://localhost:3000/api/labels", {
      method: "POST",
      body: JSON.stringify(newLabelRequest),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await POST(request)
    const responseData = await response.json()

    expect(response.status).toBe(500)
    expect(responseData.error).toBe("Failed to save data")
    expect(responseData.message).toBe("File writing failed")
  })

  it("should validate label name is a string", async () => {
    const invalidRequest = {
      id: createLabelId("99999999-1234-4123-8123-123456789012"),
      name: 123, // Invalid type
      color: "#10b981",
    }

    const request = new NextRequest("http://localhost:3000/api/labels", {
      method: "POST",
      body: JSON.stringify(invalidRequest),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await POST(request)
    const responseData = await response.json()

    expect(response.status).toBe(400)
    expect(responseData.error).toBeDefined()
  })

  it("should validate color is a string when provided", async () => {
    const invalidRequest = {
      name: "Valid Name",
      id: createLabelId("aaaaaaaa-1234-4123-8123-123456789012"),
      color: 123, // Invalid type
    }

    const request = new NextRequest("http://localhost:3000/api/labels", {
      method: "POST",
      body: JSON.stringify(invalidRequest),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await POST(request)
    const responseData = await response.json()

    expect(response.status).toBe(400)
    expect(responseData.error).toBeDefined()
  })
})
