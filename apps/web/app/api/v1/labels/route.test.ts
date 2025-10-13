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
import { DEFAULT_EMPTY_DATA_FILE } from "@/lib/types"

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
          slug: "important",
          color: "#ef4444",
        },
        {
          id: TEST_LABEL_ID_2,
          name: "Work",
          slug: "work",
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

  it("should handle single label update", async () => {
    const labelUpdate = {
      id: TEST_LABEL_ID_1,
      name: "Updated Label",
      color: "#8b5cf6",
    }

    const request = new NextRequest("http://localhost:3000/api/labels", {
      method: "PATCH",
      body: JSON.stringify(labelUpdate),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.labels).toHaveLength(1)
    expect(responseData.labels[0].name).toBe("Updated Label")
    expect(responseData.labels[0].color).toBe("#8b5cf6")
    expect(responseData.count).toBe(1)
  })

  it("should regenerate slug when name is updated without explicit slug", async () => {
    const labelUpdate = {
      id: TEST_LABEL_ID_1,
      name: "New Label Name",
      color: "#8b5cf6",
    }

    const request = new NextRequest("http://localhost:3000/api/labels", {
      method: "PATCH",
      body: JSON.stringify(labelUpdate),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.labels).toHaveLength(1)
    expect(responseData.labels[0].name).toBe("New Label Name")

    // Verify that the file was written with the regenerated slug
    expect(mockSafeWriteDataFile).toHaveBeenCalled()
    const writeCall = mockSafeWriteDataFile.mock.calls[0]
    if (!writeCall || !writeCall[0]) {
      throw new Error("Expected mockSafeWriteDataFile to have been called with arguments")
    }
    const writtenData = writeCall[0].data
    const updatedLabel = writtenData.labels.find((l: { id: string }) => l.id === TEST_LABEL_ID_1)

    expect(updatedLabel).toBeDefined()
    if (updatedLabel) {
      expect(updatedLabel.slug).toBe("new-label-name") // Should regenerate slug from new name
      expect(updatedLabel.slug).not.toBe("test-label-1") // Should not keep old slug
    }
  })

  it("should preserve explicit slug when both name and slug are updated", async () => {
    const labelUpdate = {
      id: TEST_LABEL_ID_1,
      name: "New Label Name",
      slug: "custom-label-slug",
      color: "#8b5cf6",
    }

    const request = new NextRequest("http://localhost:3000/api/labels", {
      method: "PATCH",
      body: JSON.stringify(labelUpdate),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)

    // Verify that explicit slug is preserved
    expect(mockSafeWriteDataFile).toHaveBeenCalled()
    const writeCall = mockSafeWriteDataFile.mock.calls[0]
    if (!writeCall || !writeCall[0]) {
      throw new Error("Expected mockSafeWriteDataFile to have been called with arguments")
    }
    const writtenData = writeCall[0].data
    const updatedLabel = writtenData.labels.find((l: { id: string }) => l.id === TEST_LABEL_ID_1)

    expect(updatedLabel).toBeDefined()
    if (updatedLabel) {
      expect(updatedLabel.slug).toBe("custom-label-slug") // Should preserve explicit slug
      expect(updatedLabel.name).toBe("New Label Name")
    }
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

    const labelUpdate = {
      id: TEST_LABEL_ID_1,
      name: "Updated Label",
    }

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
          slug: "important",
          color: "#ef4444",
        },
        {
          id: TEST_LABEL_ID_2,
          name: "Work",
          slug: "work",
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
          slug: "existing-label",
          color: "#ef4444",
        },
      ],
    }

    mockSafeReadDataFile.mockResolvedValue(mockFileData)
    mockSafeWriteDataFile.mockResolvedValue(true)
  })

  it("should create a new label successfully with all fields", async () => {
    const newLabelRequest = {
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
    expect(responseData.labelIds[0]).toBe("12345678-1234-4123-8123-123456789012") // Mocked UUID
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
    expect(writeCall.data.labels[1]).toEqual({
      id: "12345678-1234-4123-8123-123456789012",
      name: "New Label",
      slug: "new-label",
      color: "#10b981",
    })
  })

  it("should create a new label with default color when color is not provided", async () => {
    const newLabelRequest = {
      name: "Label Without Color",
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

    // Verify the label was created with default color
    const writeArgs = mockSafeWriteDataFile.mock.calls[0]
    if (!writeArgs || !writeArgs[0]) {
      throw new Error("Expected mockSafeWriteDataFile to have been called with arguments")
    }
    const writeCall = writeArgs[0]
    expect(writeCall.data.labels[1]).toEqual({
      id: "12345678-1234-4123-8123-123456789012",
      name: "Label Without Color",
      slug: "label-without-color",
      color: "#3b82f6", // Default blue color from DEFAULT_LABEL_COLORS[0]
    })
  })

  it("should return 400 error when name is missing", async () => {
    const invalidRequest = {
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
