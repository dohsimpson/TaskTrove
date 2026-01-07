import { describe, expect, it } from "vitest"
import { INBOX_PROJECT_ID } from "@tasktrove/types/constants"
import { createProjectId, createTaskId } from "@tasktrove/types/id"
import type { Task } from "@tasktrove/types/core"
import {
  getSidebarViewDropUpdate,
  isSidebarViewDropId,
  SIDEBAR_VIEW_DROP_IDS,
} from "./sidebar-view-drop-logic"

const TASK_ID = createTaskId("11111111-1111-1111-8111-111111111111")
const PROJECT_ID = createProjectId("44444444-4444-4444-8444-444444444444")

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: TASK_ID,
  title: "Test task",
  description: "",
  completed: false,
  priority: 4,
  dueDate: undefined,
  dueTime: undefined,
  projectId: PROJECT_ID,
  labels: [],
  subtasks: [],
  comments: [],
  createdAt: new Date("2025-12-30T12:00:00Z"),
  recurringMode: "dueDate",
  ...overrides,
})

describe("sidebar-view-drop-logic", () => {
  it("recognizes supported sidebar view ids", () => {
    SIDEBAR_VIEW_DROP_IDS.forEach((id) => {
      expect(isSidebarViewDropId(id)).toBe(true)
    })

    expect(isSidebarViewDropId("all")).toBe(false)
    expect(isSidebarViewDropId("calendar")).toBe(false)
    expect(isSidebarViewDropId(null)).toBe(false)
  })

  it("returns inbox update when task is not already in inbox", () => {
    const update = getSidebarViewDropUpdate(TASK_ID, makeTask({ projectId: PROJECT_ID }), "inbox")

    expect(update).toEqual({
      id: TASK_ID,
      projectId: INBOX_PROJECT_ID,
      sectionId: undefined,
    })
  })

  it("returns null when task already in inbox", () => {
    const update = getSidebarViewDropUpdate(
      TASK_ID,
      makeTask({ projectId: INBOX_PROJECT_ID }),
      "inbox",
    )

    expect(update).toBeNull()
  })

  it("returns completed update when task is active", () => {
    const update = getSidebarViewDropUpdate(TASK_ID, makeTask({ completed: false }), "completed")

    expect(update).toEqual({ id: TASK_ID, completed: true })
  })

  it("returns null when task already completed", () => {
    const update = getSidebarViewDropUpdate(TASK_ID, makeTask({ completed: true }), "completed")

    expect(update).toBeNull()
  })

  it("returns habits update when task is not auto-rollover", () => {
    const update = getSidebarViewDropUpdate(
      TASK_ID,
      makeTask({ recurringMode: "dueDate" }),
      "habits",
    )

    expect(update).toEqual({ id: TASK_ID, recurringMode: "autoRollover" })
  })

  it("returns null when task already auto-rollover", () => {
    const update = getSidebarViewDropUpdate(
      TASK_ID,
      makeTask({ recurringMode: "autoRollover" }),
      "habits",
    )

    expect(update).toBeNull()
  })

  it("updates due date to today when dropping on today", () => {
    const now = new Date(2025, 11, 31, 15, 30)
    const update = getSidebarViewDropUpdate(
      TASK_ID,
      makeTask({ dueDate: new Date(2025, 11, 30, 9, 0) }),
      "today",
      now,
    )

    expect(update).toEqual({
      id: TASK_ID,
      dueDate: new Date(2025, 11, 31),
    })
  })

  it("returns null when task already due today", () => {
    const now = new Date(2025, 11, 31, 15, 30)
    const update = getSidebarViewDropUpdate(
      TASK_ID,
      makeTask({ dueDate: new Date(2025, 11, 31, 8, 0) }),
      "today",
      now,
    )

    expect(update).toBeNull()
  })

  it("updates due date to tomorrow when dropping on upcoming", () => {
    const now = new Date(2025, 11, 31, 9, 0)
    const update = getSidebarViewDropUpdate(
      TASK_ID,
      makeTask({ dueDate: new Date(2025, 11, 30, 9, 0) }),
      "upcoming",
      now,
    )

    expect(update).toEqual({
      id: TASK_ID,
      dueDate: new Date(2026, 0, 1),
    })
  })

  it("returns null when task already upcoming", () => {
    const now = new Date(2025, 11, 31, 9, 0)
    const update = getSidebarViewDropUpdate(
      TASK_ID,
      makeTask({ dueDate: new Date(2026, 0, 2, 9, 0) }),
      "upcoming",
      now,
    )

    expect(update).toBeNull()
  })
})
