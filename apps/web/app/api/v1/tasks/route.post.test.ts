/**
 * API Route Tests for Task Creation (POST)
 *
 * Tests the POST /api/tasks endpoint for task creation operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { POST } from "./route"
import { NextRequest } from "next/server"

// Mock filesystem operations
vi.mock("@/lib/utils/safe-file-operations", () => ({
  safeReadDataFile: vi.fn(),
  safeWriteDataFile: vi.fn(),
}))

// Mock UUID
vi.mock("uuid", () => ({
  v4: () => "12345678-1234-4123-8123-123456789012",
}))

import { safeReadDataFile, safeWriteDataFile } from "@/lib/utils/safe-file-operations"
import { DEFAULT_EMPTY_DATA_FILE } from "@/lib/types"

const mockReadDataFile = vi.mocked(safeReadDataFile)
const mockWriteDataFile = vi.mocked(safeWriteDataFile)

const mockDataFile = {
  ...DEFAULT_EMPTY_DATA_FILE,
}

describe("POST /api/tasks - Task Creation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mockDataFile to fresh state for each test
    mockDataFile.tasks = []
    mockDataFile.projects = []
    mockDataFile.labels = []
    mockReadDataFile.mockResolvedValue(mockDataFile)
    mockWriteDataFile.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should NOT automatically set due date for recurring tasks without due date (client-side logic)", async () => {
    const request = new NextRequest("http://localhost:3000/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: "Daily standup",
        recurring: "RRULE:FREQ=DAILY",
        // Note: no dueDate provided - server should NOT calculate one
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await POST(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.taskIds).toHaveLength(1)
    expect(responseData.taskIds[0]).toBe("12345678-1234-4123-8123-123456789012")

    // Get the created task from the written data
    const writeArgs = mockWriteDataFile.mock.calls[0]
    if (!writeArgs || !writeArgs[0]) {
      throw new Error("Expected mockWriteDataFile to have been called with arguments")
    }
    const writtenData = writeArgs[0].data
    const createdTask = writtenData.tasks.find(
      (task: { id: string }) => task.id === responseData.taskIds[0],
    )

    expect(createdTask).toBeDefined()
    if (createdTask) {
      expect(createdTask.recurring).toBe("RRULE:FREQ=DAILY")

      // Should NOT have a due date - server no longer calculates it automatically
      expect(createdTask.dueDate).toBeUndefined()
    }
  })

  it("should handle client-provided due date with recurring pattern", async () => {
    const clientDueDate = new Date()
    clientDueDate.setDate(clientDueDate.getDate() + 7) // Next week
    const dueDateParts = clientDueDate.toISOString().split("T")
    const dueDateString = dueDateParts[0] // Format as YYYY-MM-DD
    if (!dueDateString) {
      throw new Error("Failed to format due date")
    }

    const request = new NextRequest("http://localhost:3000/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: "Weekly review",
        recurring: "RRULE:FREQ=WEEKLY",
        dueDate: dueDateString, // Client provides the due date
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await POST(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.taskIds).toHaveLength(1)

    // Get the created task from the written data
    const writeArgs = mockWriteDataFile.mock.calls[0]
    if (!writeArgs || !writeArgs[0]) {
      throw new Error("Expected mockWriteDataFile to have been called with arguments")
    }
    const writtenData = writeArgs[0].data
    const createdTask = writtenData.tasks.find(
      (task: { id: string }) => task.id === responseData.taskIds[0],
    )

    expect(createdTask).toBeDefined()
    if (createdTask) {
      // Should use exactly the due date provided by the client
      expect(createdTask.dueDate).toBeDefined()
      expect(createdTask.recurring).toBe("RRULE:FREQ=WEEKLY")
      if (createdTask.dueDate) {
        const taskDueDate = new Date(createdTask.dueDate)
        const expectedDueDate = new Date(dueDateString)
        expect(taskDueDate.toISOString().split("T")[0]).toBe(
          expectedDueDate.toISOString().split("T")[0],
        )
      }
    }
  })

  it("should respect provided due date for recurring tasks", async () => {
    const customDueDate = "2024-12-25"

    const request = new NextRequest("http://localhost:3000/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: "Christmas task",
        dueDate: customDueDate,
        recurring: "RRULE:FREQ=DAILY",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await POST(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.taskIds).toHaveLength(1)

    // Get the created task from the written data
    const writeArgs = mockWriteDataFile.mock.calls[0]
    if (!writeArgs || !writeArgs[0]) {
      throw new Error("Expected mockWriteDataFile to have been called with arguments")
    }
    const writtenData = writeArgs[0].data
    const createdTask = writtenData.tasks.find(
      (task: { id: string }) => task.id === responseData.taskIds[0],
    )

    expect(createdTask).toBeDefined()
    if (createdTask) {
      // Should keep the provided due date, not default to today
      expect(createdTask.dueDate).toBeDefined()
      if (createdTask.dueDate) {
        const taskDueDate = new Date(createdTask.dueDate)
        const taskDueDateString = taskDueDate.toISOString().split("T")[0]
        expect(taskDueDateString).toBe(customDueDate)
      }
    }
  })

  it("should not set due date for non-recurring tasks without due date", async () => {
    const request = new NextRequest("http://localhost:3000/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: "One-time task",
        // No recurring, no dueDate
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await POST(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.taskIds).toHaveLength(1)

    // Get the created task from the written data
    const writeArgs = mockWriteDataFile.mock.calls[0]
    if (!writeArgs || !writeArgs[0]) {
      throw new Error("Expected mockWriteDataFile to have been called with arguments")
    }
    const writtenData = writeArgs[0].data
    const createdTask = writtenData.tasks.find(
      (task: { id: string }) => task.id === responseData.taskIds[0],
    )

    expect(createdTask).toBeDefined()
    if (createdTask) {
      expect(createdTask.dueDate).toBeUndefined()
    }
  })

  it("should pass through client-calculated due dates for recurring tasks exactly as provided", async () => {
    // This test verifies that the server no longer performs any due date calculations
    // and simply uses whatever the client provides
    const clientCalculatedDateString = "2024-03-15"

    const request = new NextRequest("http://localhost:3000/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: "Client-calculated recurring task",
        recurring: "RRULE:FREQ=MONTHLY",
        dueDate: clientCalculatedDateString,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await POST(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)

    // Get the created task from the written data
    const writeArgs = mockWriteDataFile.mock.calls[0]
    if (!writeArgs || !writeArgs[0]) {
      throw new Error("Expected mockWriteDataFile to have been called with arguments")
    }
    const writtenData = writeArgs[0].data
    const createdTask = writtenData.tasks.find(
      (task: { id: string }) => task.id === responseData.taskIds[0],
    )

    expect(createdTask).toBeDefined()
    if (createdTask) {
      expect(createdTask.recurring).toBe("RRULE:FREQ=MONTHLY")
      expect(createdTask.dueDate).toBeDefined()

      // Server should use the exact date provided by client without any modification
      if (createdTask.dueDate) {
        const taskDueDate = new Date(createdTask.dueDate)
        const expectedDate = new Date(clientCalculatedDateString)
        expect(taskDueDate.toISOString().split("T")[0]).toBe(
          expectedDate.toISOString().split("T")[0],
        )
      }
    }
  })

  it("should create recurring tasks without due dates when client doesn't provide them", async () => {
    // Test that server doesn't automatically generate due dates for recurring tasks anymore
    const request = new NextRequest("http://localhost:3000/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: "Recurring task without due date",
        recurring: "RRULE:FREQ=WEEKLY;INTERVAL=2",
        // Deliberately no dueDate - client should handle this calculation
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await POST(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)

    // Get the created task from the written data
    const writeArgs = mockWriteDataFile.mock.calls[0]
    if (!writeArgs || !writeArgs[0]) {
      throw new Error("Expected mockWriteDataFile to have been called with arguments")
    }
    const writtenData = writeArgs[0].data
    const createdTask = writtenData.tasks.find(
      (task: { id: string }) => task.id === responseData.taskIds[0],
    )

    expect(createdTask).toBeDefined()
    if (createdTask) {
      expect(createdTask.recurring).toBe("RRULE:FREQ=WEEKLY;INTERVAL=2")
      // Server should NOT set any due date - this is now client-side responsibility
      expect(createdTask.dueDate).toBeUndefined()
    }
  })
})
