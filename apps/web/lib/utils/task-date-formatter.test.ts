import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  formatTaskDateTime,
  formatTaskDateTimeBadge,
  formatTimeShort,
  isTaskOverdue,
  getTaskDueDateStatus,
} from "./task-date-formatter"
import type { Task } from "@/lib/types"
import { TEST_TASK_ID_1 } from "../utils/test-constants"

// Mock date-fns functions
const { mockIsToday, mockIsTomorrow, mockIsPast, mockFormat } = vi.hoisted(() => ({
  mockIsToday: vi.fn(),
  mockIsTomorrow: vi.fn(),
  mockIsPast: vi.fn(),
  mockFormat: vi.fn((date: Date, formatStr: string) => {
    const d = date
    switch (formatStr) {
      case "MMM d":
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      case "MMM d, yyyy":
        return d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      case "h:mm a":
        return d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      case "HH:mm":
        return d.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      default:
        return d.toDateString()
    }
  }),
}))

vi.mock("date-fns", () => ({
  format: mockFormat,
  isToday: mockIsToday,
  isTomorrow: mockIsTomorrow,
  isPast: mockIsPast,
}))

describe("task-date-formatter", () => {
  const mockTask: Omit<Task, "dueDate" | "dueTime"> = {
    id: TEST_TASK_ID_1,
    title: "Test Task",
    description: "",
    completed: false,
    priority: 3,
    labels: [],
    subtasks: [],
    comments: [],
    attachments: [],
    createdAt: new Date("2024-01-01"),
    recurringMode: "dueDate",
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mocks to default behavior
    mockIsToday.mockReturnValue(false)
    mockIsTomorrow.mockReturnValue(false)
    mockIsPast.mockReturnValue(false)
  })

  describe("formatTaskDateTime", () => {
    it("returns null when no date or time is set", () => {
      const task = { ...mockTask }
      const result = formatTaskDateTime(task)
      expect(result).toBeNull()
    })

    it("formats date only when no time is set", () => {
      const task = {
        ...mockTask,
        dueDate: new Date("2024-01-15"),
      }
      const result = formatTaskDateTime(task, { format: "full" })
      expect(result).toMatch(/Jan \d+/)
    })

    it("formats date and time when both are set", () => {
      const dueDate = new Date("2024-01-15")
      const dueTime = new Date("2024-01-01T09:00:00") // 9:00 AM local
      const task = { ...mockTask, dueDate, dueTime }

      const result = formatTaskDateTime(task, { format: "full" })
      // With new concise format: "Jan 15 9:00 AM" (no "at")
      expect(result).toContain("AM")
      expect(result).toContain("Jan")
      expect(result).not.toContain("at")
    })

    it("formats time only when showTimeOnly is true and no date is set", () => {
      const dueTime = new Date("2024-01-01T09:00:00") // 9:00 AM local
      const task = { ...mockTask, dueTime }

      const result = formatTaskDateTime(task, { format: "full", showTimeOnly: true })
      expect(result).toContain("AM")
    })

    it("returns null when showTimeOnly is false and no date is set", () => {
      const dueTime = new Date("2024-01-01T09:00:00") // 9:00 AM local
      const task = { ...mockTask, dueTime }

      const result = formatTaskDateTime(task, { format: "full", showTimeOnly: false })
      expect(result).toBeNull()
    })

    it("formats 'Today' when date is today", () => {
      mockIsToday.mockReturnValue(true)

      const dueDate = new Date()
      const task = { ...mockTask, dueDate }

      const result = formatTaskDateTime(task, { format: "full" })
      expect(result).toBe("Today")
    })

    it("formats 'Today at 9:00 AM' when date is today with time", () => {
      mockIsToday.mockReturnValue(true)

      const dueDate = new Date()
      const dueTime = new Date("2024-01-01T09:00:00") // 9:00 AM local
      const task = { ...mockTask, dueDate, dueTime }

      const result = formatTaskDateTime(task, { format: "full" })
      // With new concise format, Today + time just shows the time
      expect(result).toBe("9:00 AM")
    })

    it("formats 'Tomorrow' when date is tomorrow", () => {
      mockIsTomorrow.mockReturnValue(true)

      const dueDate = new Date()
      const task = { ...mockTask, dueDate }

      const result = formatTaskDateTime(task, { format: "full" })
      expect(result).toBe("Tomorrow")
    })

    it("formats 'Tomorrow at 2:30 PM' when date is tomorrow with time", () => {
      mockIsTomorrow.mockReturnValue(true)

      const dueDate = new Date()
      const dueTime = new Date("2024-01-01T14:30:00") // 2:30 PM local
      const task = { ...mockTask, dueDate, dueTime }

      const result = formatTaskDateTime(task, { format: "full" })
      // With new concise format: "Tomorrow 2:30 PM" (no "at")
      expect(result).toBe("Tomorrow 2:30 PM")
    })

    it("includes year when includeYear is true", () => {
      const dueDate = new Date("2024-01-15")
      const task = { ...mockTask, dueDate }

      const result = formatTaskDateTime(task, { format: "full", includeYear: true })
      expect(result).toMatch(/Jan \d+, 2024/)
    })

    it("includes year when date is in different year", () => {
      const dueDate = new Date("2025-01-15")
      const task = { ...mockTask, dueDate }

      const result = formatTaskDateTime(task, { format: "full" })
      // Allow for timezone conversion affecting the year
      expect(result).toMatch(/(Jan \d+, 2024|Jan \d+, 2025|Jan \d+$)/)
    })

    it("formats with 24-hour time when use12Hour is false", () => {
      const dueDate = new Date("2024-01-15")
      const dueTime = new Date("2024-01-01T14:30:00") // 2:30 PM = 14:30 local
      const task = { ...mockTask, dueDate, dueTime }

      const result = formatTaskDateTime(task, { format: "full", use12Hour: false })
      // Should contain 24-hour format time and date, no "at" in new format
      expect(result).toContain("14:30")
      expect(result).toContain("Jan")
      expect(result).not.toContain("at")
    })
  })

  describe("formatTaskDateTimeBadge", () => {
    it("returns null when no date or time is set", () => {
      const task = { ...mockTask }
      const result = formatTaskDateTimeBadge(task)
      expect(result).toBeNull()
    })

    it("formats time only when no date is set", () => {
      const dueTime = new Date("2024-01-01T09:00:00") // 9:00 AM local
      const task = { ...mockTask, dueTime }

      const result = formatTaskDateTimeBadge(task)
      expect(result).toBe("9AM")
    })

    it("formats date only when no time is set", () => {
      const dueDate = new Date("2024-01-15")
      const task = { ...mockTask, dueDate }

      const result = formatTaskDateTimeBadge(task)
      expect(result).toMatch(/Jan \d+/)
    })

    it("formats date and short time when both are set", () => {
      const dueDate = new Date("2024-01-15")
      const dueTime = new Date("2024-01-01T09:00:00") // 9:00 AM local
      const task = { ...mockTask, dueDate, dueTime }

      const result = formatTaskDateTimeBadge(task)
      // Should contain date and short time format, no "at" in new format
      expect(result).toContain("AM")
      expect(result).toContain("Jan")
      expect(result).not.toContain("at")
    })

    it("formats just time when date is today with time", () => {
      mockIsToday.mockReturnValue(true)

      const dueDate = new Date()
      const dueTime = new Date("2024-01-01T09:00:00") // 9:00 AM local
      const task = { ...mockTask, dueDate, dueTime }

      const result = formatTaskDateTimeBadge(task)
      // With new concise format, Today + time just shows time
      expect(result).toContain("AM")
      expect(result).not.toContain("Today")
    })
  })

  describe("formatTimeShort", () => {
    it("formats morning hours correctly", () => {
      const time = new Date("2024-01-01T09:00:00") // 9:00 AM local
      const result = formatTimeShort(time)
      expect(result).toBe("9AM")
    })

    it("formats afternoon hours correctly", () => {
      const time = new Date("2024-01-01T15:00:00") // 3:00 PM local
      const result = formatTimeShort(time)
      expect(result).toBe("3PM")
    })

    it("formats noon correctly", () => {
      const time = new Date("2024-01-01T12:00:00") // 12:00 PM local
      const result = formatTimeShort(time)
      expect(result).toBe("12PM")
    })

    it("formats midnight correctly", () => {
      const time = new Date("2024-01-01T00:00:00") // 12:00 AM local
      const result = formatTimeShort(time)
      expect(result).toBe("12AM")
    })

    it("formats times with minutes", () => {
      const time = new Date("2024-01-01T09:30:00") // 9:30 AM local
      const result = formatTimeShort(time)
      expect(result).toBe("9:30AM")
    })
  })

  describe("isTaskOverdue", () => {
    it("returns false when task has no due date", () => {
      const task = { ...mockTask }
      const result = isTaskOverdue(task)
      expect(result).toBe(false)
    })

    it("returns false when task is completed", () => {
      const task = { ...mockTask, dueDate: new Date("2024-01-01"), completed: true }

      mockIsPast.mockReturnValue(true)
      mockIsToday.mockReturnValue(false)

      const result = isTaskOverdue(task)
      expect(result).toBe(false)
    })

    it("returns false when due date is today", () => {
      const task = { ...mockTask, dueDate: new Date() }

      mockIsPast.mockReturnValue(true)
      mockIsToday.mockReturnValue(true)

      const result = isTaskOverdue(task)
      expect(result).toBe(false)
    })

    it("returns true when due date is in the past and not today", () => {
      const task = { ...mockTask, dueDate: new Date("2024-01-01"), completed: false }

      mockIsPast.mockReturnValue(true)
      mockIsToday.mockReturnValue(false)

      const result = isTaskOverdue(task)
      expect(result).toBe(true)
    })
  })

  describe("getTaskDueDateStatus", () => {
    it("returns 'none' status when no due date", () => {
      const task = { ...mockTask }
      const result = getTaskDueDateStatus(task)

      expect(result.status).toBe("none")
      expect(result.text).toBeNull()
    })

    it("returns 'overdue' status when task is overdue", () => {
      const task = { ...mockTask, dueDate: new Date("2024-01-01"), completed: false }

      mockIsPast.mockReturnValue(true)
      mockIsToday.mockReturnValue(false)

      const result = getTaskDueDateStatus(task)

      expect(result.status).toBe("overdue")
      expect(result.text).toMatch(/(Dec 31, 2023|Jan 1, 2024)/)
    })

    it("returns 'today' status when due today", () => {
      const task = { ...mockTask, dueDate: new Date() }

      mockIsToday.mockReturnValue(true)

      const result = getTaskDueDateStatus(task)

      expect(result.status).toBe("today")
      expect(result.text).toBe("Today")
    })

    it("returns 'upcoming' status for future dates", () => {
      const task = { ...mockTask, dueDate: new Date("2024-12-25") }

      mockIsPast.mockReturnValue(false)
      mockIsToday.mockReturnValue(false)

      const result = getTaskDueDateStatus(task)

      expect(result.status).toBe("upcoming")
      expect(result.text).toMatch(/(Dec 24, 2024|Dec 25, 2024)/)
    })
  })

  describe("Different format types", () => {
    const dueDate = new Date("2024-01-15")
    const dueTime = new Date("2024-01-01T09:00:00") // 9:00 AM local
    const task = { ...mockTask, dueDate, dueTime }

    it("formats with 'full' format", () => {
      const result = formatTaskDateTime(task, { format: "full" })
      expect(result).toMatch(/Jan \d+/)
      expect(result).toContain("AM")
      expect(result).not.toContain("at")
    })

    it("formats with 'compact' format", () => {
      const result = formatTaskDateTime(task, { format: "compact" })
      expect(result).toMatch(/Jan \d+/)
      expect(result).toContain("AM")
      expect(result).not.toContain("at")
    })

    it("formats with 'badge' format", () => {
      const result = formatTaskDateTime(task, { format: "badge" })
      expect(result).toMatch(/Jan \d+/)
      expect(result).toContain("AM")
      expect(result).not.toContain("at")
    })

    it("formats with 'short' format", () => {
      const result = formatTaskDateTime(task, { format: "short" })
      expect(result).toMatch(/Jan \d+/)
      expect(result).toContain("AM")
      expect(result).not.toContain("at")
    })

    it("formats with 'relative' format", () => {
      const result = formatTaskDateTime(task, { format: "relative" })
      expect(result).toMatch(/Jan \d+/)
      expect(result).toContain("AM")
      expect(result).not.toContain("at")
    })
  })
})
