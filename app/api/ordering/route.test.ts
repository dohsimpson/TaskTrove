/**
 * Tests for the /api/ordering endpoint
 *
 * This file tests the separated ordering API endpoint functionality.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { PATCH } from "./route"
import { safeReadDataFile, safeWriteDataFile } from "@/lib/utils/safe-file-operations"
import {
  TEST_PROJECT_ID_1,
  TEST_PROJECT_ID_2,
  TEST_LABEL_ID_1,
  TEST_LABEL_ID_2,
  TEST_LABEL_ID_3,
} from "@/lib/utils/test-constants"

// Mock the safe file operations
vi.mock("@/lib/utils/safe-file-operations")

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

const mockSafeReadDataFile = vi.mocked(safeReadDataFile)
const mockSafeWriteDataFile = vi.mocked(safeWriteDataFile)

describe("PATCH /api/ordering", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock successful file read with sample data
    const mockFileData = {
      projects: [],
      tasks: [],
      labels: [],
      ordering: {
        projects: [TEST_PROJECT_ID_1, TEST_PROJECT_ID_2],
        labels: [TEST_LABEL_ID_1, TEST_LABEL_ID_2],
      },
    }

    mockSafeReadDataFile.mockResolvedValue(mockFileData)
    mockSafeWriteDataFile.mockResolvedValue(true)
  })

  it("should update project ordering successfully", async () => {
    const orderingUpdate = {
      projects: [TEST_PROJECT_ID_2, TEST_PROJECT_ID_1], // Reversed order from mock data
    }

    const request = new NextRequest("http://localhost:3000/api/ordering", {
      method: "PATCH",
      body: JSON.stringify(orderingUpdate),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.ordering.projects).toEqual([TEST_PROJECT_ID_2, TEST_PROJECT_ID_1])
    expect(responseData.ordering.labels).toEqual([TEST_LABEL_ID_1, TEST_LABEL_ID_2]) // Preserved from existing
    expect(responseData.message).toBe("Ordering updated successfully")
  })

  it("should update label ordering successfully", async () => {
    const orderingUpdate = {
      labels: [TEST_LABEL_ID_3, TEST_LABEL_ID_1], // Different ordering using available constants
    }

    const request = new NextRequest("http://localhost:3000/api/ordering", {
      method: "PATCH",
      body: JSON.stringify(orderingUpdate),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.ordering.projects).toEqual([TEST_PROJECT_ID_1, TEST_PROJECT_ID_2]) // Preserved from existing
    expect(responseData.ordering.labels).toEqual([TEST_LABEL_ID_3, TEST_LABEL_ID_1])
    expect(responseData.message).toBe("Ordering updated successfully")
  })

  it("should update both project and label ordering", async () => {
    const orderingUpdate = {
      projects: [TEST_PROJECT_ID_1],
      labels: [TEST_LABEL_ID_2, TEST_LABEL_ID_3, TEST_LABEL_ID_1],
    }

    const request = new NextRequest("http://localhost:3000/api/ordering", {
      method: "PATCH",
      body: JSON.stringify(orderingUpdate),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.ordering.projects).toEqual([TEST_PROJECT_ID_1])
    expect(responseData.ordering.labels).toEqual([
      TEST_LABEL_ID_2,
      TEST_LABEL_ID_3,
      TEST_LABEL_ID_1,
    ])
    expect(responseData.message).toBe("Ordering updated successfully")
  })

  it("should handle empty update (no-op) successfully", async () => {
    const emptyUpdate = {}

    const request = new NextRequest("http://localhost:3000/api/ordering", {
      method: "PATCH",
      body: JSON.stringify(emptyUpdate),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    // Should return existing ordering unchanged
    expect(responseData.ordering.projects).toEqual([TEST_PROJECT_ID_1, TEST_PROJECT_ID_2])
    expect(responseData.ordering.labels).toEqual([TEST_LABEL_ID_1, TEST_LABEL_ID_2])
    expect(responseData.message).toBe("Ordering updated successfully")
  })

  it("should handle file system errors gracefully", async () => {
    mockSafeReadDataFile.mockResolvedValue(undefined)

    const orderingUpdate = {
      projects: [TEST_PROJECT_ID_1, TEST_PROJECT_ID_2],
    }

    const request = new NextRequest("http://localhost:3000/api/ordering", {
      method: "PATCH",
      body: JSON.stringify(orderingUpdate),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await PATCH(request)
    const responseData = await response.json()

    expect(response.status).toBe(500)
    expect(responseData.error).toBe("Failed to update orderings")
  })
})
