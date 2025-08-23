import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  parseRRule,
  calculateNextDueDate,
  generateNextTaskInstance,
  shouldGenerateNextInstance,
  processRecurringTaskCompletion,
} from "./recurring-task-processor"
import type { Task, TaskPriority } from "@/lib/types"
import { createTaskId, createProjectId, createLabelId, createSubtaskId } from "@/lib/types"

// Mock UUID generation for consistent testing
vi.mock("uuid", () => ({
  v4: vi.fn(() => "550e8400-e29b-41d4-a716-446655440000"),
}))

describe("parseRRule", () => {
  it("should parse basic daily recurring rule", () => {
    const result = parseRRule("RRULE:FREQ=DAILY")
    expect(result).toEqual({
      freq: "DAILY",
    })
  })

  it("should parse weekly recurring rule with interval", () => {
    const result = parseRRule("RRULE:FREQ=WEEKLY;INTERVAL=2")
    expect(result).toEqual({
      freq: "WEEKLY",
      interval: 2,
    })
  })

  it("should parse monthly recurring rule with specific days", () => {
    const result = parseRRule("RRULE:FREQ=MONTHLY;BYMONTHDAY=15,30")
    expect(result).toEqual({
      freq: "MONTHLY",
      bymonthday: [15, 30],
    })
  })

  it("should parse weekly recurring rule with specific weekdays", () => {
    const result = parseRRule("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR")
    expect(result).toEqual({
      freq: "WEEKLY",
      byday: ["MO", "WE", "FR"],
    })
  })

  it("should parse rule with count and until constraints", () => {
    const result = parseRRule("RRULE:FREQ=DAILY;COUNT=10;UNTIL=20241231")
    expect(result).toEqual({
      freq: "DAILY",
      count: 10,
      until: "20241231",
    })
  })

  it("should return null for invalid RRULE format", () => {
    expect(parseRRule("INVALID:FREQ=DAILY")).toBeNull()
    expect(parseRRule("RRULE:INVALID=DAILY")).toBeNull()
    expect(parseRRule("")).toBeNull()
  })

  it("should handle yearly recurring with month specification", () => {
    const result = parseRRule("RRULE:FREQ=YEARLY;BYMONTH=3,6,9,12")
    expect(result).toEqual({
      freq: "YEARLY",
      bymonth: [3, 6, 9, 12],
    })
  })
})

describe("calculateNextDueDate", () => {
  const baseDate = new Date("2024-01-15T10:00:00.000Z")

  it("should calculate next daily occurrence", () => {
    const nextDate = calculateNextDueDate("RRULE:FREQ=DAILY", baseDate)
    expect(nextDate).toEqual(new Date("2024-01-16T10:00:00.000Z"))
  })

  it("should calculate next daily occurrence with interval", () => {
    const nextDate = calculateNextDueDate("RRULE:FREQ=DAILY;INTERVAL=3", baseDate)
    expect(nextDate).toEqual(new Date("2024-01-18T10:00:00.000Z"))
  })

  it("should calculate next weekly occurrence", () => {
    const nextDate = calculateNextDueDate("RRULE:FREQ=WEEKLY", baseDate)
    expect(nextDate).toEqual(new Date("2024-01-22T10:00:00.000Z"))
  })

  it("should calculate next weekly occurrence with specific weekdays", () => {
    // Starting from Monday (2024-01-15), next occurrence should be Wednesday
    const nextDate = calculateNextDueDate("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR", baseDate)
    expect(nextDate).toEqual(new Date("2024-01-17T10:00:00.000Z"))
  })

  it("should calculate next monthly occurrence", () => {
    const nextDate = calculateNextDueDate("RRULE:FREQ=MONTHLY", baseDate)
    expect(nextDate).toEqual(new Date("2024-02-15T10:00:00.000Z"))
  })

  it("should calculate next monthly occurrence with specific day", () => {
    const nextDate = calculateNextDueDate("RRULE:FREQ=MONTHLY;BYMONTHDAY=28", baseDate)
    expect(nextDate).toEqual(new Date("2024-02-28T10:00:00.000Z"))
  })

  it("should handle month-end dates correctly", () => {
    // January 31st should go to February 28th (last day of February)
    const endOfMonth = new Date("2023-01-31T10:00:00.000Z")
    const nextDate = calculateNextDueDate("RRULE:FREQ=MONTHLY", endOfMonth)
    // Should go to February 28th, not March 31st
    expect(nextDate).toEqual(new Date("2023-02-28T10:00:00.000Z"))
  })

  it("should handle leap year month-end dates correctly", () => {
    // January 31st 2024 (leap year) should go to February 29th
    const endOfMonth = new Date("2024-01-31T10:00:00.000Z")
    const nextDate = calculateNextDueDate("RRULE:FREQ=MONTHLY", endOfMonth)
    // Should go to February 29th in leap year
    expect(nextDate).toEqual(new Date("2024-02-29T10:00:00.000Z"))
  })

  it("should handle multiple month-end transitions", () => {
    // May 31st should go to June 30th (June has only 30 days)
    const endOfMonth = new Date("2023-05-31T10:00:00.000Z")
    const nextDate = calculateNextDueDate("RRULE:FREQ=MONTHLY", endOfMonth)
    // Should go to June 30th, not July 1st
    expect(nextDate).toEqual(new Date("2023-06-30T10:00:00.000Z"))
  })

  it("should calculate next yearly occurrence", () => {
    const nextDate = calculateNextDueDate("RRULE:FREQ=YEARLY", baseDate)
    expect(nextDate).toEqual(new Date("2025-01-15T10:00:00.000Z"))
  })

  it("should respect UNTIL constraint", () => {
    const untilDate = "20240117" // January 17, 2024 (one day after next occurrence)
    const nextDate = calculateNextDueDate(`RRULE:FREQ=DAILY;UNTIL=${untilDate}`, baseDate)
    expect(nextDate).toEqual(new Date("2024-01-16T10:00:00.000Z"))
  })

  it("should return null when past UNTIL constraint", () => {
    const untilDate = "20240115" // Same day as base date
    const nextDate = calculateNextDueDate(`RRULE:FREQ=DAILY;UNTIL=${untilDate}`, baseDate)
    expect(nextDate).toBeNull()
  })

  it("should return null for invalid RRULE", () => {
    const nextDate = calculateNextDueDate("INVALID:FREQ=DAILY", baseDate)
    expect(nextDate).toBeNull()
  })

  it("should handle weekly recurrence with no matching weekdays gracefully", () => {
    const nextDate = calculateNextDueDate("RRULE:FREQ=WEEKLY;BYDAY=", baseDate)
    // Returns null for empty BYDAY array
    expect(nextDate).toBeNull()
  })

  describe("includeFromDate flag", () => {
    // Mock the current date to be consistent across tests
    const mockToday = new Date("2024-01-20T15:30:00.000Z")

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(mockToday)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("should include today for daily recurring when fromDate is today", () => {
      const todayDate = new Date("2024-01-20T10:00:00.000Z")
      const nextDate = calculateNextDueDate("RRULE:FREQ=DAILY", todayDate, true)
      // Should return today's date (same day, preserving time)
      expect(nextDate).toEqual(new Date("2024-01-20T10:00:00.000Z"))
    })

    it("should not affect calculation when fromDate is in the past", () => {
      const pastDate = new Date("2024-01-19T10:00:00.000Z")
      const nextDate = calculateNextDueDate("RRULE:FREQ=DAILY", pastDate, true)
      // Should return next day regardless of includeFromDate flag
      expect(nextDate).toEqual(new Date("2024-01-20T10:00:00.000Z"))
    })

    it("should not affect calculation when fromDate is in the future", () => {
      const futureDate = new Date("2024-01-22T10:00:00.000Z")
      const nextDate = calculateNextDueDate("RRULE:FREQ=DAILY", futureDate, true)
      // Should return next day regardless of includeFromDate flag
      expect(nextDate).toEqual(new Date("2024-01-23T10:00:00.000Z"))
    })

    it("should work with weekly recurrence when today is the due date", () => {
      const todayDate = new Date("2024-01-20T14:00:00.000Z")
      const nextDate = calculateNextDueDate("RRULE:FREQ=WEEKLY", todayDate, true)
      // Should return today (same day, preserving time)
      expect(nextDate).toEqual(new Date("2024-01-20T14:00:00.000Z"))
    })

    it("should work with monthly recurrence when today is the due date", () => {
      const todayDate = new Date("2024-01-20T09:00:00.000Z")
      const nextDate = calculateNextDueDate("RRULE:FREQ=MONTHLY", todayDate, true)
      // Should return today (same day, preserving time)
      expect(nextDate).toEqual(new Date("2024-01-20T09:00:00.000Z"))
    })

    it("should work with yearly recurrence when today is the due date", () => {
      const todayDate = new Date("2024-01-20T12:00:00.000Z")
      const nextDate = calculateNextDueDate("RRULE:FREQ=YEARLY", todayDate, true)
      // Should return today (same day, preserving time)
      expect(nextDate).toEqual(new Date("2024-01-20T12:00:00.000Z"))
    })

    it("should ignore includeFromDate flag when set to false", () => {
      const todayDate = new Date("2024-01-20T10:00:00.000Z")
      const nextDate = calculateNextDueDate("RRULE:FREQ=DAILY", todayDate, false)
      // Should return tomorrow (normal behavior)
      expect(nextDate).toEqual(new Date("2024-01-21T10:00:00.000Z"))
    })

    it("should handle timezone differences correctly", () => {
      // Test with a date that's today in one timezone but different in UTC
      const todayDifferentTime = new Date("2024-01-20T23:59:59.000Z")
      const nextDate = calculateNextDueDate("RRULE:FREQ=DAILY", todayDifferentTime, true)
      // Should still return the same date (UTC comparison should work)
      expect(nextDate).toEqual(new Date("2024-01-20T23:59:59.000Z"))
    })

    it("should handle different time zones for same calendar day", () => {
      // Test with early morning today (could be yesterday in some timezones)
      const earlyTodayUTC = new Date("2024-01-20T01:00:00.000Z")
      const nextDate = calculateNextDueDate("RRULE:FREQ=DAILY", earlyTodayUTC, true)
      // Should return the same date since it's the same calendar day in UTC
      expect(nextDate).toEqual(new Date("2024-01-20T01:00:00.000Z"))
    })

    it("should work with complex RRULE when today matches", () => {
      const todayDate = new Date("2024-01-20T16:00:00.000Z") // Saturday
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=WEEKLY;BYDAY=SA;INTERVAL=2",
        todayDate,
        true,
      )
      // Should return today since it's Saturday and matches the pattern
      expect(nextDate).toEqual(new Date("2024-01-20T16:00:00.000Z"))
    })

    it("should handle UNTIL constraint with includeFromDate", () => {
      const todayDate = new Date("2024-01-20T10:00:00.000Z")
      const nextDate = calculateNextDueDate("RRULE:FREQ=DAILY;UNTIL=20240120", todayDate, true)
      // Should return today since it's within the UNTIL constraint
      expect(nextDate).toEqual(new Date("2024-01-20T10:00:00.000Z"))
    })

    it("should return null when today exceeds UNTIL constraint", () => {
      const todayDate = new Date("2024-01-20T10:00:00.000Z")
      const nextDate = calculateNextDueDate("RRULE:FREQ=DAILY;UNTIL=20240119", todayDate, true)
      // Should return null since today is past the UNTIL date
      expect(nextDate).toBeNull()
    })
  })
})

describe("generateNextTaskInstance", () => {
  const baseTask: Task = {
    id: createTaskId("550e8400-e29b-41d4-a716-446655440001"),
    title: "Daily standup",
    completed: true,
    completedAt: new Date("2024-01-15T10:00:00.000Z"),
    dueDate: new Date("2024-01-15T09:00:00.000Z"),
    recurring: "RRULE:FREQ=DAILY",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    recurringMode: "dueDate",
    status: "completed" satisfies Task["status"],
    priority: 2 satisfies TaskPriority,
    labels: [],
    projectId: undefined,
    description: "Daily team standup meeting",
    subtasks: [],
    comments: [],
    attachments: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should generate next task instance for daily recurring task", () => {
    const nextTask = generateNextTaskInstance(baseTask)

    expect(nextTask).not.toBeNull()
    if (nextTask) {
      expect(nextTask.id).toBe("550e8400-e29b-41d4-a716-446655440000")
      expect(nextTask.title).toBe("Daily standup")
      expect(nextTask.completed).toBe(false)
      expect(nextTask.completedAt).toBeUndefined()
      expect(nextTask.dueDate).toEqual(new Date("2024-01-16T09:00:00.000Z"))
      expect(nextTask.recurring).toBe("RRULE:FREQ=DAILY")
      expect(nextTask.status).toBe("active")
      expect(nextTask.description).toBe("Daily team standup meeting")
    }
  })

  it("should return null for task without recurring pattern", () => {
    const nonRecurringTask = { ...baseTask, recurring: undefined }
    const nextTask = generateNextTaskInstance(nonRecurringTask)
    expect(nextTask).toBeNull()
  })

  it("should return null for task without due date", () => {
    const taskWithoutDueDate = { ...baseTask, dueDate: undefined }
    const nextTask = generateNextTaskInstance(taskWithoutDueDate)
    expect(nextTask).toBeNull()
  })

  it("should return null when RRULE reaches end constraint", () => {
    const taskWithEndDate = {
      ...baseTask,
      recurring: "RRULE:FREQ=DAILY;UNTIL=20240115", // Same as due date
    }
    const nextTask = generateNextTaskInstance(taskWithEndDate)
    expect(nextTask).toBeNull()
  })

  it("should preserve all task metadata in next instance", () => {
    const taskWithMetadata: Task = {
      ...baseTask,
      priority: 4 satisfies TaskPriority,
      labels: [
        createLabelId("550e8400-e29b-41d4-a716-446655440010"),
        createLabelId("550e8400-e29b-41d4-a716-446655440011"),
      ],
      projectId: createProjectId("550e8400-e29b-41d4-a716-446655440012"),
      subtasks: [
        {
          id: createSubtaskId("550e8400-e29b-41d4-a716-446655440013"),
          title: "Prep notes",
          completed: false,
        },
      ],
      attachments: ["file1.pdf"],
    }

    const nextTask = generateNextTaskInstance(taskWithMetadata)

    if (nextTask) {
      expect(nextTask.priority).toBe(4)
      expect(nextTask.labels).toEqual([
        createLabelId("550e8400-e29b-41d4-a716-446655440010"),
        createLabelId("550e8400-e29b-41d4-a716-446655440011"),
      ])
      expect(nextTask.projectId).toBe(createProjectId("550e8400-e29b-41d4-a716-446655440012"))
      expect(nextTask.subtasks).toEqual([
        {
          id: createSubtaskId("550e8400-e29b-41d4-a716-446655440013"),
          title: "Prep notes",
          completed: false,
        },
      ])
      expect(nextTask.attachments).toEqual(["file1.pdf"])
    }
  })

  it("should generate new creation date for next instance", () => {
    const nextTask = generateNextTaskInstance(baseTask)
    if (nextTask) {
      expect(nextTask.createdAt).toBeInstanceOf(Date)
      // Should be different from original creation date
      expect(nextTask.createdAt).not.toEqual(baseTask.createdAt)
    }
  })

  it("should reset subtask completion status in next instance", () => {
    const taskWithCompletedSubtasks: Task = {
      ...baseTask,
      subtasks: [
        {
          id: createSubtaskId("550e8400-e29b-41d4-a716-446655440013"),
          title: "Prep notes",
          completed: true, // This subtask is completed
        },
        {
          id: createSubtaskId("550e8400-e29b-41d4-a716-446655440014"),
          title: "Send invites",
          completed: false, // This subtask is not completed
        },
      ],
    }

    const nextTask = generateNextTaskInstance(taskWithCompletedSubtasks)

    expect(nextTask).not.toBeNull()
    if (nextTask) {
      // All subtasks in the new instance should be reset to not completed
      expect(nextTask.subtasks).toHaveLength(2)
      expect(nextTask.subtasks[0].completed).toBe(false)
      expect(nextTask.subtasks[1].completed).toBe(false)
      // But titles and IDs should be preserved
      expect(nextTask.subtasks[0].title).toBe("Prep notes")
      expect(nextTask.subtasks[1].title).toBe("Send invites")
      expect(nextTask.subtasks[0].id).toBe(createSubtaskId("550e8400-e29b-41d4-a716-446655440013"))
      expect(nextTask.subtasks[1].id).toBe(createSubtaskId("550e8400-e29b-41d4-a716-446655440014"))
    }
  })
})

describe("shouldGenerateNextInstance", () => {
  it("should return true for task with recurring pattern and due date", () => {
    const task: Task = {
      id: createTaskId("550e8400-e29b-41d4-a716-446655440010"),
      title: "Test task",
      completed: false,
      status: "active",
      priority: 1,
      labels: [],
      projectId: undefined,
      subtasks: [],
      comments: [],
      attachments: [],
      createdAt: new Date(),
      recurringMode: "dueDate",
      recurring: "RRULE:FREQ=DAILY",
      dueDate: new Date(),
    }

    expect(shouldGenerateNextInstance(task)).toBe(true)
  })

  it("should return false for task without recurring pattern", () => {
    const task: Task = {
      id: createTaskId("550e8400-e29b-41d4-a716-446655440010"),
      title: "Test task",
      completed: false,
      status: "active",
      priority: 1,
      labels: [],
      projectId: undefined,
      subtasks: [],
      comments: [],
      attachments: [],
      createdAt: new Date(),
      recurringMode: "dueDate",
      recurring: undefined,
      dueDate: new Date(),
    }

    expect(shouldGenerateNextInstance(task)).toBe(false)
  })

  it("should return false for task without due date", () => {
    const task: Task = {
      id: createTaskId("550e8400-e29b-41d4-a716-446655440010"),
      title: "Test task",
      completed: false,
      status: "active",
      priority: 1,
      labels: [],
      projectId: undefined,
      subtasks: [],
      comments: [],
      attachments: [],
      createdAt: new Date(),
      recurringMode: "dueDate",
      recurring: "RRULE:FREQ=DAILY",
      dueDate: undefined,
    }

    expect(shouldGenerateNextInstance(task)).toBe(false)
  })

  it("should return false for task with empty recurring string", () => {
    const task: Task = {
      id: createTaskId("550e8400-e29b-41d4-a716-446655440010"),
      title: "Test task",
      completed: false,
      status: "active",
      priority: 1,
      labels: [],
      projectId: undefined,
      subtasks: [],
      comments: [],
      attachments: [],
      createdAt: new Date(),
      recurringMode: "dueDate",
      recurring: "",
      dueDate: new Date(),
    }

    expect(shouldGenerateNextInstance(task)).toBe(false)
  })
})

describe("processRecurringTaskCompletion", () => {
  const recurringTask: Task = {
    id: createTaskId("550e8400-e29b-41d4-a716-446655440002"),
    title: "Weekly review",
    completed: false,
    dueDate: new Date("2024-01-15T14:00:00.000Z"),
    recurring: "RRULE:FREQ=WEEKLY",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    recurringMode: "dueDate",
    status: "active" satisfies Task["status"],
    priority: 2,
    labels: [],
    projectId: undefined,
    subtasks: [],
    comments: [],
    attachments: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should process recurring task and generate next instance", () => {
    const nextTask = processRecurringTaskCompletion(recurringTask)

    expect(nextTask).not.toBeNull()
    if (nextTask) {
      expect(nextTask.id).toBe("550e8400-e29b-41d4-a716-446655440000")
      expect(nextTask.dueDate).toEqual(new Date("2024-01-22T14:00:00.000Z"))
      expect(nextTask.completed).toBe(false)
    }
  })

  it("should return null for non-recurring task", () => {
    const nonRecurringTask = { ...recurringTask, recurring: undefined }
    const nextTask = processRecurringTaskCompletion(nonRecurringTask)
    expect(nextTask).toBeNull()
  })

  it("should return null for task without due date", () => {
    const taskWithoutDueDate = { ...recurringTask, dueDate: undefined }
    const nextTask = processRecurringTaskCompletion(taskWithoutDueDate)
    expect(nextTask).toBeNull()
  })

  it("should handle complex RRULE patterns", () => {
    const complexRecurringTask = {
      ...recurringTask,
      recurring: "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;INTERVAL=2",
    }

    const nextTask = processRecurringTaskCompletion(complexRecurringTask)
    expect(nextTask).not.toBeNull()
    if (nextTask) {
      expect(nextTask.recurring).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;INTERVAL=2")
    }
  })

  it("should handle task with COUNT limitation", () => {
    const limitedTask = {
      ...recurringTask,
      recurring: "RRULE:FREQ=DAILY;COUNT=1",
    }

    // COUNT=1 means this was the last occurrence, no next instance should be created
    const nextTask = processRecurringTaskCompletion(limitedTask)
    expect(nextTask).toBeNull()
  })

  it("should decrement COUNT in next instance", () => {
    const limitedTask = {
      ...recurringTask,
      recurring: "RRULE:FREQ=DAILY;COUNT=3",
    }

    // COUNT=3 should generate next instance with COUNT=2
    const nextTask = processRecurringTaskCompletion(limitedTask)
    expect(nextTask).not.toBeNull()
    if (nextTask) {
      expect(nextTask.recurring).toBe("RRULE:FREQ=DAILY;COUNT=2")
    }
  })

  it("should handle COUNT=2 correctly", () => {
    const limitedTask = {
      ...recurringTask,
      recurring: "RRULE:FREQ=DAILY;COUNT=2",
    }

    // COUNT=2 should generate next instance with COUNT=1 (the final occurrence)
    const nextTask = processRecurringTaskCompletion(limitedTask)
    expect(nextTask).not.toBeNull()
    if (nextTask) {
      expect(nextTask.recurring).toBe("RRULE:FREQ=DAILY;COUNT=1")
    }
  })
})

describe("Edge Cases and Error Handling", () => {
  it("should handle leap year calculations", () => {
    // February 29, 2024 (leap year) recurring monthly
    const leapYearDate = new Date("2024-02-29T10:00:00.000Z")
    const nextDate = calculateNextDueDate("RRULE:FREQ=MONTHLY", leapYearDate)

    // Should preserve the same time (10:00 UTC) without DST shifts
    expect(nextDate).toEqual(new Date("2024-03-29T10:00:00.000Z"))
  })

  it("should preserve time across DST transitions for daily recurring", () => {
    // March 9, 2024 was a DST transition date in many timezones
    const beforeDST = new Date("2024-03-09T14:00:00.000Z")
    const nextDate = calculateNextDueDate("RRULE:FREQ=DAILY", beforeDST)

    // Should preserve the same UTC time, not shift due to DST
    expect(nextDate).toEqual(new Date("2024-03-10T14:00:00.000Z"))
  })

  it("should preserve time across DST transitions for weekly recurring", () => {
    // Test across a week that includes DST transition
    const beforeDST = new Date("2024-03-07T15:30:00.000Z")
    const nextDate = calculateNextDueDate("RRULE:FREQ=WEEKLY", beforeDST)

    // Should preserve the same UTC time
    expect(nextDate).toEqual(new Date("2024-03-14T15:30:00.000Z"))
  })

  it("should handle invalid weekday in BYDAY", () => {
    const baseDate = new Date("2024-01-15T10:00:00.000Z")
    const nextDate = calculateNextDueDate("RRULE:FREQ=WEEKLY;BYDAY=XX,YY", baseDate)

    // Returns null for invalid weekday codes
    expect(nextDate).toBeNull()
  })

  it("should handle malformed UNTIL date", () => {
    const baseDate = new Date("2024-01-15T10:00:00.000Z")
    const nextDate = calculateNextDueDate("RRULE:FREQ=DAILY;UNTIL=invalid-date", baseDate)

    // Should return null for invalid UNTIL date format
    expect(nextDate).toBeNull()
  })

  it("should handle UNTIL date with wrong format", () => {
    const baseDate = new Date("2024-01-15T10:00:00.000Z")
    const nextDate = calculateNextDueDate("RRULE:FREQ=DAILY;UNTIL=2024-01-20", baseDate)

    // Should return null for wrong UNTIL format (should be YYYYMMDD, not YYYY-MM-DD)
    expect(nextDate).toBeNull()
  })

  it("should handle invalid UNTIL date (impossible date)", () => {
    const baseDate = new Date("2024-01-15T10:00:00.000Z")
    const nextDate = calculateNextDueDate("RRULE:FREQ=DAILY;UNTIL=20240231", baseDate)

    // Should return null for impossible date (Feb 31st doesn't exist)
    expect(nextDate).toBeNull()
  })

  it("should handle extreme interval values", () => {
    const baseDate = new Date("2024-01-15T10:00:00.000Z")
    const nextDate = calculateNextDueDate("RRULE:FREQ=DAILY;INTERVAL=365", baseDate)

    // Add 365 days from Jan 15, 2024 → Jan 14, 2025 (2024 is leap year)
    expect(nextDate).toEqual(new Date("2025-01-14T10:00:00.000Z"))
  })

  it("should handle task with null/undefined properties gracefully", () => {
    const minimalTask: Task = {
      id: createTaskId("550e8400-e29b-41d4-a716-446655440003"),
      title: "Minimal task",
      completed: false,
      status: "active" satisfies Task["status"],
      priority: 1 satisfies TaskPriority,
      labels: [],
      projectId: undefined,
      subtasks: [],
      comments: [],
      attachments: [],
      createdAt: new Date(),
      recurringMode: "dueDate",
      dueDate: new Date("2024-01-15T10:00:00.000Z"),
      recurring: "RRULE:FREQ=DAILY",
    }

    const nextTask = processRecurringTaskCompletion(minimalTask)
    expect(nextTask).not.toBeNull()
    if (nextTask) {
      expect(nextTask.title).toBe("Minimal task")
    }
  })
})

describe("recurringMode functionality", () => {
  const baseTask: Task = {
    id: createTaskId("550e8400-e29b-41d4-a716-446655440010"),
    title: "Recurring mode test task",
    completed: true,
    dueDate: new Date("2024-01-15T14:00:00.000Z"), // Monday
    completedAt: new Date("2024-01-17T16:30:00.000Z"), // Wednesday
    recurring: "RRULE:FREQ=WEEKLY",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    recurringMode: "dueDate",
    status: "active" satisfies Task["status"],
    priority: 2,
    labels: [],
    projectId: undefined,
    subtasks: [],
    comments: [],
    attachments: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should use due date when recurringMode is 'dueDate' (default behavior)", () => {
    const taskWithDueDateMode = { ...baseTask, recurringMode: "dueDate" as const }

    const nextTask = generateNextTaskInstance(taskWithDueDateMode)

    expect(nextTask).not.toBeNull()
    if (nextTask) {
      // Should calculate from due date (Monday): next Monday
      expect(nextTask.dueDate).toEqual(new Date("2024-01-22T14:00:00.000Z"))
    }
  })

  it("should use completion date when recurringMode is 'completedAt'", () => {
    const taskWithCompletedAtMode = {
      ...baseTask,
      recurringMode: "completedAt" as const,
    }

    const nextTask = generateNextTaskInstance(taskWithCompletedAtMode)

    expect(nextTask).not.toBeNull()
    if (nextTask) {
      // Should calculate from completion date (Wednesday): next Wednesday
      expect(nextTask.dueDate).toEqual(new Date("2024-01-24T16:30:00.000Z"))
    }
  })

  it("should fallback to due date when recurringMode is 'completedAt' but completedAt is missing", () => {
    const taskWithoutCompletedAt = {
      ...baseTask,
      recurringMode: "completedAt" as const,
      completedAt: undefined,
    }

    const nextTask = generateNextTaskInstance(taskWithoutCompletedAt)

    expect(nextTask).not.toBeNull()
    if (nextTask) {
      // Should fallback to due date calculation
      expect(nextTask.dueDate).toEqual(new Date("2024-01-22T14:00:00.000Z"))
    }
  })

  it("should work with daily recurring pattern using completion date", () => {
    const dailyTask = {
      ...baseTask,
      recurring: "RRULE:FREQ=DAILY",
      recurringMode: "completedAt" as const,
      dueDate: new Date("2024-01-15T09:00:00.000Z"), // Monday 9 AM
      completedAt: new Date("2024-01-16T14:30:00.000Z"), // Tuesday 2:30 PM
    }

    const nextTask = generateNextTaskInstance(dailyTask)

    expect(nextTask).not.toBeNull()
    if (nextTask) {
      // Should calculate from completion date: Tuesday + 1 day = Wednesday 2:30 PM
      expect(nextTask.dueDate).toEqual(new Date("2024-01-17T14:30:00.000Z"))
    }
  })

  it("should work with monthly recurring pattern using completion date", () => {
    const monthlyTask = {
      ...baseTask,
      recurring: "RRULE:FREQ=MONTHLY",
      recurringMode: "completedAt" as const,
      dueDate: new Date("2024-01-31T10:00:00.000Z"), // January 31st
      completedAt: new Date("2024-02-05T15:45:00.000Z"), // February 5th
    }

    const nextTask = generateNextTaskInstance(monthlyTask)

    expect(nextTask).not.toBeNull()
    if (nextTask) {
      // Should calculate from completion date: February 5th + 1 month = March 5th
      expect(nextTask.dueDate).toEqual(new Date("2024-03-05T15:45:00.000Z"))
    }
  })

  it("should preserve recurringMode in the new task instance", () => {
    const taskWithMode = {
      ...baseTask,
      recurringMode: "completedAt" as const,
    }

    const nextTask = generateNextTaskInstance(taskWithMode)

    expect(nextTask).not.toBeNull()
    if (nextTask) {
      expect(nextTask.recurringMode).toBe("completedAt")
    }
  })

  it("should preserve recurringMode 'dueDate' in new task", () => {
    const taskWithDueDateMode = { ...baseTask, recurringMode: "dueDate" as const }

    const nextTask = generateNextTaskInstance(taskWithDueDateMode)

    expect(nextTask).not.toBeNull()
    if (nextTask) {
      expect(nextTask.recurringMode).toBe("dueDate")
    }
  })

  describe("recurringMode completedAt - early completion bug prevention", () => {
    it("should never move schedule backwards when completing early", () => {
      // Bug scenario: Daily task due tomorrow, completed today
      // Without fix: next due = today + 1 day = tomorrow (stuck!)
      // With fix: next due = max(today, tomorrow) + 1 day = day after tomorrow

      const tomorrow = new Date("2024-08-23T09:00:00.000Z")
      const today = new Date("2024-08-22T10:00:00.000Z")
      const dayAfterTomorrow = new Date("2024-08-24T09:00:00.000Z")

      const task: Task = {
        id: createTaskId("550e8400-e29b-41d4-a716-446655440001"),
        title: "Daily workout",
        completed: true,
        completedAt: today, // Completed early (today)
        dueDate: tomorrow, // Originally due tomorrow
        recurring: "RRULE:FREQ=DAILY",
        recurringMode: "completedAt",
        createdAt: new Date("2024-08-20T00:00:00.000Z"),
        status: "completed",
        priority: 2,
        labels: [],
        projectId: undefined,
        subtasks: [],
        comments: [],
        attachments: [],
      }

      const nextTask = generateNextTaskInstance(task)

      expect(nextTask).not.toBeNull()
      if (nextTask) {
        // Should advance to day after tomorrow, not get stuck at tomorrow
        expect(nextTask.dueDate).toEqual(dayAfterTomorrow)
        expect(nextTask.completed).toBe(false)
        expect(nextTask.completedAt).toBeUndefined()
        expect(nextTask.recurringMode).toBe("completedAt")
      }
    })

    it("should use completion date when completing on time", () => {
      const today = new Date("2024-08-22T09:00:00.000Z")
      const completionTime = new Date("2024-08-22T10:00:00.000Z") // Later same day
      const tomorrow = new Date("2024-08-23T10:00:00.000Z") // Preserves completion time

      const task: Task = {
        id: createTaskId("550e8400-e29b-41d4-a716-446655440001"),
        title: "Daily workout",
        completed: true,
        completedAt: completionTime,
        dueDate: today, // Due today
        recurring: "RRULE:FREQ=DAILY",
        recurringMode: "completedAt",
        createdAt: new Date("2024-08-20T00:00:00.000Z"),
        status: "completed",
        priority: 2,
        labels: [],
        projectId: undefined,
        subtasks: [],
        comments: [],
        attachments: [],
      }

      const nextTask = generateNextTaskInstance(task)

      expect(nextTask).not.toBeNull()
      if (nextTask) {
        // Should use completion date as reference (both are same day, so next day)
        expect(nextTask.dueDate).toEqual(tomorrow)
        expect(nextTask.recurringMode).toBe("completedAt")
      }
    })

    it("should use completion date when completing late", () => {
      const yesterday = new Date("2024-08-21T09:00:00.000Z")
      const today = new Date("2024-08-22T10:00:00.000Z")
      const tomorrow = new Date("2024-08-23T10:00:00.000Z") // Preserves completion time

      const task: Task = {
        id: createTaskId("550e8400-e29b-41d4-a716-446655440001"),
        title: "Daily workout",
        completed: true,
        completedAt: today, // Completed late (today)
        dueDate: yesterday, // Was due yesterday
        recurring: "RRULE:FREQ=DAILY",
        recurringMode: "completedAt",
        createdAt: new Date("2024-08-20T00:00:00.000Z"),
        status: "completed",
        priority: 2,
        labels: [],
        projectId: undefined,
        subtasks: [],
        comments: [],
        attachments: [],
      }

      const nextTask = generateNextTaskInstance(task)

      expect(nextTask).not.toBeNull()
      if (nextTask) {
        // Should use completion date (today) as reference → tomorrow
        expect(nextTask.dueDate).toEqual(tomorrow)
        expect(nextTask.recurringMode).toBe("completedAt")
      }
    })

    it("should work correctly with weekly recurring tasks", () => {
      // Weekly task due next Monday, completed this Friday (early completion)
      const nextMonday = new Date("2024-08-26T09:00:00.000Z") // Monday
      const thisFriday = new Date("2024-08-23T10:00:00.000Z") // Friday (3 days early)
      const mondayAfterNext = new Date("2024-09-02T09:00:00.000Z") // Monday + 1 week

      const task: Task = {
        id: createTaskId("550e8400-e29b-41d4-a716-446655440001"),
        title: "Weekly report",
        completed: true,
        completedAt: thisFriday,
        dueDate: nextMonday,
        recurring: "RRULE:FREQ=WEEKLY",
        recurringMode: "completedAt",
        createdAt: new Date("2024-08-20T00:00:00.000Z"),
        status: "completed",
        priority: 2,
        labels: [],
        projectId: undefined,
        subtasks: [],
        comments: [],
        attachments: [],
      }

      const nextTask = generateNextTaskInstance(task)

      expect(nextTask).not.toBeNull()
      if (nextTask) {
        // Should use max(Friday, Monday) = Monday as reference → Monday + 1 week
        expect(nextTask.dueDate).toEqual(mondayAfterNext)
        expect(nextTask.recurringMode).toBe("completedAt")
      }
    })
  })
})
