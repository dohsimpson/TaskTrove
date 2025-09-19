import { describe, it, expect, beforeEach, vi } from "vitest"
import { createStore, Provider } from "jotai"
import { renderHook } from "@testing-library/react"
import { useAtomValue } from "jotai"
import React from "react"
import { notificationAtoms } from "./notifications"
import type { ScheduledNotification } from "@/lib/types"
import { createTaskId } from "@/lib/types"

// Mock the logger
vi.mock("@/lib/utils/logger", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock audio
vi.mock("@/lib/utils/audio", () => ({
  playSound: vi.fn(() => Promise.resolve()),
}))

describe("Notification Atoms - Set Uniqueness", () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    store = createStore()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  )

  describe("nextDueNotificationsAtom", () => {
    it("should return a Set with unique notifications", () => {
      // Create test notifications with same time
      const now = new Date()
      const dueTime = new Date(now.getTime() + 60000) // 1 minute from now

      const notification1: ScheduledNotification = {
        taskId: createTaskId("550e8400-e29b-41d4-a716-446655440001"),
        taskTitle: "Task 1",
        notifyAt: dueTime,
        type: "due",
      }

      const notification2: ScheduledNotification = {
        taskId: createTaskId("550e8400-e29b-41d4-a716-446655440002"),
        taskTitle: "Task 2",
        notifyAt: new Date(dueTime.getTime() + 500), // Within 1 second tolerance
        type: "due",
      }

      const notification3: ScheduledNotification = {
        taskId: createTaskId("550e8400-e29b-41d4-a716-446655440003"),
        taskTitle: "Task 3",
        notifyAt: new Date(dueTime.getTime() + 2000), // Outside 1 second tolerance
        type: "reminder",
      }

      // Set up the scheduled notifications
      const notificationsMap = new Map([
        [notification1.taskId, notification1],
        [notification2.taskId, notification2],
        [notification3.taskId, notification3],
      ])

      store.set(notificationAtoms.scheduledNotifications, notificationsMap)

      // Get the next due notifications
      const { result } = renderHook(() => useAtomValue(notificationAtoms.nextDueNotifications), {
        wrapper,
      })

      // Verify it's a Set
      expect(result.current).toBeInstanceOf(Set)

      // Should include notifications 1 and 2 (within tolerance), but not 3
      expect(result.current.size).toBe(2)
      expect(result.current.has(notification1)).toBe(true)
      expect(result.current.has(notification2)).toBe(true)
      expect(result.current.has(notification3)).toBe(false)
    })

    it("should handle duplicate notifications correctly", () => {
      const now = new Date()
      const dueTime = new Date(now.getTime() + 60000)

      const notification: ScheduledNotification = {
        taskId: createTaskId("550e8400-e29b-41d4-a716-446655440004"),
        taskTitle: "Task 1",
        notifyAt: dueTime,
        type: "due",
      }

      // Try to add the same notification multiple times
      const notificationsMap = new Map([
        [notification.taskId, notification],
        // Map already ensures uniqueness by taskId
      ])

      store.set(notificationAtoms.scheduledNotifications, notificationsMap)

      const { result } = renderHook(() => useAtomValue(notificationAtoms.nextDueNotifications), {
        wrapper,
      })

      // Set should have only one notification even if we tried to add duplicates
      expect(result.current.size).toBe(1)
      expect(result.current.has(notification)).toBe(true)
    })

    it("should return empty Set when no notifications are due", () => {
      const now = new Date()
      const pastTime = new Date(now.getTime() - 60000) // 1 minute ago

      const notification: ScheduledNotification = {
        taskId: createTaskId("550e8400-e29b-41d4-a716-446655440005"),
        taskTitle: "Past Task",
        notifyAt: pastTime,
        type: "due",
      }

      const notificationsMap = new Map([[notification.taskId, notification]])
      store.set(notificationAtoms.scheduledNotifications, notificationsMap)

      const { result } = renderHook(() => useAtomValue(notificationAtoms.nextDueNotifications), {
        wrapper,
      })

      expect(result.current).toBeInstanceOf(Set)
      expect(result.current.size).toBe(0)
    })

    it("should group notifications within 1 second tolerance", () => {
      const now = new Date()
      const baseTime = new Date(now.getTime() + 60000)

      const notifications = [
        {
          taskId: createTaskId("550e8400-e29b-41d4-a716-446655440006"),
          taskTitle: "Task 1",
          notifyAt: baseTime,
          type: "due" as const,
        },
        {
          taskId: createTaskId("550e8400-e29b-41d4-a716-446655440007"),
          taskTitle: "Task 2",
          notifyAt: new Date(baseTime.getTime() + 999), // Just within tolerance
          type: "due" as const,
        },
        {
          taskId: createTaskId("550e8400-e29b-41d4-a716-446655440008"),
          taskTitle: "Task 3",
          notifyAt: new Date(baseTime.getTime() + 1001), // Just outside tolerance
          type: "due" as const,
        },
        {
          taskId: createTaskId("550e8400-e29b-41d4-a716-446655440009"),
          taskTitle: "Task 4",
          notifyAt: new Date(baseTime.getTime() - 999), // Just within tolerance (before)
          type: "reminder" as const,
        },
      ]

      const notificationsMap = new Map(notifications.map((n) => [n.taskId, n]))

      store.set(notificationAtoms.scheduledNotifications, notificationsMap)

      const { result } = renderHook(() => useAtomValue(notificationAtoms.nextDueNotifications), {
        wrapper,
      })

      // Should include tasks 1 and 4 (within tolerance of earliest), but not 2 and 3
      // Task 4 is earliest at baseTime-999, task 1 is 999ms later (within 1s tolerance)
      // Task 2 is 1998ms after task 4 (outside tolerance)
      expect(result.current.size).toBe(2)

      const resultArray = Array.from(result.current)
      const taskIds = resultArray.map((n) => n.taskId)

      const notif0 = notifications[0]
      const notif1 = notifications[1]
      const notif2 = notifications[2]
      const notif3 = notifications[3]
      if (!notif0 || !notif1 || !notif2 || !notif3) {
        throw new Error("Expected to find all four notifications")
      }

      expect(taskIds).toContain(notif0.taskId) // Task 1
      expect(taskIds).toContain(notif3.taskId) // Task 4 (earliest)
      expect(taskIds).not.toContain(notif1.taskId) // Task 2 (outside tolerance)
      expect(taskIds).not.toContain(notif2.taskId) // Task 3 (outside tolerance)
    })
  })

  describe("Set iteration order", () => {
    it("should maintain consistent order when converting to array", () => {
      const now = new Date()
      const dueTime = new Date(now.getTime() + 60000)

      const notifications = Array.from({ length: 5 }, (_, i) => ({
        taskId: createTaskId(`550e8400-e29b-41d4-a716-44665544001${i}`),
        taskTitle: `Task ${i}`,
        notifyAt: new Date(dueTime.getTime() + i * 100), // All within tolerance
        type: "due" as const,
      }))

      const notificationsMap = new Map(notifications.map((n) => [n.taskId, n]))

      store.set(notificationAtoms.scheduledNotifications, notificationsMap)

      const { result } = renderHook(() => useAtomValue(notificationAtoms.nextDueNotifications), {
        wrapper,
      })

      // Convert to array multiple times
      const array1 = Array.from(result.current)
      const array2 = Array.from(result.current)

      // Should have same order
      expect(array1).toEqual(array2)
      expect(array1.length).toBe(5)
    })
  })
})
