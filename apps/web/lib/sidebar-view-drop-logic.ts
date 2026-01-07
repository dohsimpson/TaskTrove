import { INBOX_PROJECT_ID } from "@tasktrove/types/constants"
import type { UpdateTaskRequest } from "@tasktrove/types/api-requests"
import type { Task } from "@tasktrove/types/core"
import type { TaskId } from "@tasktrove/types/id"

export const SIDEBAR_VIEW_DROP_IDS = ["inbox", "today", "upcoming", "completed", "habits"] as const

export type SidebarViewDropId = (typeof SIDEBAR_VIEW_DROP_IDS)[number]

export const isSidebarViewDropId = (value: unknown): value is SidebarViewDropId =>
  SIDEBAR_VIEW_DROP_IDS.some((id) => id === value)

const normalizeToStartOfDay = (date: Date) => {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

const getTaskDueDate = (task: Task | undefined): Date | null => {
  if (!task?.dueDate) return null
  const date = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate)
  if (Number.isNaN(date.getTime())) return null
  return date
}

const getViewTargetDate = (viewId: SidebarViewDropId, now: Date): Date | null => {
  const today = normalizeToStartOfDay(now)

  if (viewId === "today") {
    return today
  }

  if (viewId === "upcoming") {
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    return tomorrow
  }

  return null
}

export const getSidebarViewDropUpdate = (
  taskId: TaskId,
  task: Task | undefined,
  viewId: SidebarViewDropId,
  now = new Date(),
  currentUserId?: string,
): UpdateTaskRequest | null => {
  const today = normalizeToStartOfDay(now)
  void currentUserId

  const dueDate = getTaskDueDate(task)
  const normalizedDueDate = dueDate ? normalizeToStartOfDay(dueDate) : null

  switch (viewId) {
    case "inbox":
      if (task && (!task.projectId || task.projectId === INBOX_PROJECT_ID)) {
        return null
      }
      return {
        id: taskId,
        projectId: INBOX_PROJECT_ID,
        sectionId: undefined,
      }
    case "completed":
      if (task?.completed) {
        return null
      }
      return {
        id: taskId,
        completed: true,
      }
    case "habits":
      if (task?.recurringMode === "autoRollover") {
        return null
      }
      return {
        id: taskId,
        recurringMode: "autoRollover",
      }
    case "today":
      if (normalizedDueDate && normalizedDueDate.getTime() === today.getTime()) {
        return null
      }
      return {
        id: taskId,
        dueDate: today,
      }
    case "upcoming":
      if (normalizedDueDate && normalizedDueDate.getTime() > today.getTime()) {
        return null
      }
      return {
        id: taskId,
        dueDate: getViewTargetDate(viewId, today) ?? today,
      }
  }
}

export const getSidebarViewDropSuccessMessage = (viewId: SidebarViewDropId, count: number) => {
  switch (viewId) {
    case "inbox":
      return count === 1 ? "Task moved to Inbox" : `${count} tasks moved to Inbox`
    case "today":
      return count === 1 ? "Task due today" : `${count} tasks due today`
    case "upcoming":
      return count === 1 ? "Task scheduled for tomorrow" : `${count} tasks scheduled for tomorrow`
    case "completed":
      return count === 1 ? "Task marked completed" : `${count} tasks marked completed`
    case "habits":
      return count === 1 ? "Task added to Habits" : `${count} tasks added to Habits`
  }
}

export const getSidebarViewDropNoChangeMessage = (viewId: SidebarViewDropId, count: number) => {
  switch (viewId) {
    case "inbox":
      return count === 1 ? "Task already in Inbox" : "All tasks already in Inbox"
    case "today":
      return count === 1 ? "Task already due today" : "All tasks already due today"
    case "upcoming":
      return count === 1 ? "Task already in Upcoming" : "All tasks already in Upcoming"
    case "completed":
      return count === 1 ? "Task already completed" : "All tasks already completed"
    case "habits":
      return count === 1 ? "Task already in Habits" : "All tasks already in Habits"
  }
}
