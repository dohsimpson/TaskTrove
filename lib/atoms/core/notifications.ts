"use client"

import { atom } from "jotai"
import type {
  TaskId,
  ScheduledNotification,
  ScheduledNotificationSet,
  NotificationPermissionStatus,
  NotificationSettings,
  Task,
} from "@/lib/types"
import { createTaskId } from "@/lib/types"
import { tasksAtom } from "@/lib/atoms/core/tasks"
import { settingsAtom } from "@/lib/atoms/core/settings"
import { playSound } from "@/lib/utils/audio"
import { log } from "@/lib/utils/logger"
import { handleAtomError } from "../utils"
import { showCrossBrowserNotification } from "@/lib/utils/cross-browser-notifications"
import { DEFAULT_UUID } from "@/lib/constants/defaults"
import { DEFAULT_NOTIFICATION_SETTINGS } from "@/lib/types/defaults"

// ====================
// TYPE GUARDS
// ====================

/** Type guard to check if an object is NotificationSettings */
function isNotificationSettings(obj: unknown): obj is NotificationSettings {
  return (
    obj !== null && typeof obj === "object" && "enabled" in obj && typeof obj.enabled === "boolean"
  )
}

// ====================
// STATE ATOMS
// ====================

/** Current notification permission status */
const _notificationPermissionAtom = atom<NotificationPermissionStatus>(
  typeof window !== "undefined" && "Notification" in window
    ? validateNotificationPermission(Notification.permission)
    : "default",
)

export const notificationPermissionAtom = atom(
  (get) => get(_notificationPermissionAtom),
  (get, set, newValue: NotificationPermissionStatus) => {
    set(_notificationPermissionAtom, newValue)
  },
)

/** Map of scheduled notifications by task ID */
export const scheduledNotificationsAtom = atom<Map<TaskId, ScheduledNotification>>(new Map())

/** Current active notification timer ID */
export const activeNotificationTimerAtom = atom<NodeJS.Timeout | null>(null)

/** Whether notification system is active */
export const isNotificationSystemActiveAtom = atom<boolean>(false)

// ====================
// DERIVED ATOMS
// ====================

/** Get all notifications that should fire at the next time */
export const nextDueNotificationsAtom = atom((get): ScheduledNotificationSet => {
  const scheduledNotifications = get(scheduledNotificationsAtom)
  const now = new Date()

  let earliestTime = Infinity
  const dueNotifications: ScheduledNotificationSet = new Set()

  // Find the earliest time
  for (const notification of scheduledNotifications.values()) {
    const timeUntil = notification.notifyAt.getTime() - now.getTime()
    if (timeUntil > 0 && timeUntil < earliestTime) {
      earliestTime = timeUntil
    }
  }

  // Collect all notifications at that time (within 1 second tolerance)
  if (earliestTime !== Infinity) {
    for (const notification of scheduledNotifications.values()) {
      const timeUntil = notification.notifyAt.getTime() - now.getTime()
      if (timeUntil > 0 && Math.abs(timeUntil - earliestTime) < 1000) {
        dueNotifications.add(notification)
      }
    }
  }

  return dueNotifications
})

/** Get notification settings from user settings */
export const notificationSettingsAtom = atom(
  (get): NotificationSettings => {
    const settings = get(settingsAtom)

    // Default notification settings
    const defaultSettings: NotificationSettings = DEFAULT_NOTIFICATION_SETTINGS

    // Type-safe access to notifications - all settings now include notifications by default
    if (settings && typeof settings === "object" && "notifications" in settings) {
      const notifications = settings.notifications
      if (isNotificationSettings(notifications)) {
        return notifications
      }
    }
    return defaultSettings
  },
  async (get, set, updates: Partial<NotificationSettings>) => {
    // Use the core updateSettingsAtom to persist changes
    const { updateSettingsAtom } = await import("./settings")
    await set(updateSettingsAtom, { notifications: updates })
  },
)

/** Check if notifications should be shown now (simplified) */
export const shouldShowNotificationNowAtom = atom((get) => {
  const notificationSettings = get(notificationSettingsAtom)
  return notificationSettings.enabled
})

// ====================
// ACTION ATOMS
// ====================

/** Request notification permission from the user */
export const requestNotificationPermissionAtom = atom(null, async (get, set) => {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) {
      log.warn({ module: "notifications" }, "Notifications not supported in this environment")
      return "denied"
    }

    const permission = await Notification.requestPermission()
    set(notificationPermissionAtom, validateNotificationPermission(permission))

    if (permission === "granted") {
      log.info({ module: "notifications" }, "Notification permission granted")
      playSound("confirm").catch((error: unknown) => {
        log.warn({ error, module: "notifications" }, "Failed to play permission granted sound")
      })
    }

    return validateNotificationPermission(permission)
  } catch (error) {
    handleAtomError(error, "requestNotificationPermissionAtom")
    return "denied"
  }
})

/** Schedule a notification for a task */
export const scheduleTaskNotificationAtom = atom(
  null,
  (get, set, { taskId, task }: { taskId: TaskId; task: Task }) => {
    try {
      // Only schedule if task has due date and time
      if (!task.dueDate || !task.dueTime) {
        return
      }

      const notificationSettings = get(notificationSettingsAtom)
      if (!notificationSettings.enabled) {
        return
      }

      const permission = get(notificationPermissionAtom)
      if (permission !== "granted") {
        return
      }

      // Calculate notification time from due date and time
      const dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate)
      const dueTime = task.dueTime instanceof Date ? task.dueTime : new Date(task.dueTime)

      // Combine date and time
      const notifyAt = new Date(dueDate)
      notifyAt.setHours(dueTime.getHours(), dueTime.getMinutes(), 0, 0)

      // Don't schedule notifications for past due dates
      if (notifyAt <= new Date()) {
        return
      }

      const scheduledNotification: ScheduledNotification = {
        taskId,
        taskTitle: task.title,
        notifyAt,
        type: "due",
      }

      // Update scheduled notifications map
      const currentNotifications = new Map(get(scheduledNotificationsAtom))
      currentNotifications.set(taskId, scheduledNotification)
      set(scheduledNotificationsAtom, currentNotifications)

      // Reschedule the timer
      set(rescheduleNotificationTimerAtom)

      log.info(
        {
          taskId,
          taskTitle: task.title,
          notifyAt: notifyAt.toISOString(),
          module: "notifications",
        },
        "Scheduled task notification",
      )
    } catch (error) {
      handleAtomError(error, "scheduleTaskNotificationAtom")
    }
  },
)

/** Cancel a scheduled notification */
export const cancelTaskNotificationAtom = atom(null, (get, set, taskId: TaskId) => {
  try {
    const currentNotifications = new Map(get(scheduledNotificationsAtom))
    const wasRemoved = currentNotifications.delete(taskId)

    if (wasRemoved) {
      set(scheduledNotificationsAtom, currentNotifications)
      set(rescheduleNotificationTimerAtom)
      log.info({ taskId, module: "notifications" }, "Cancelled task notification")
    }
  } catch (error) {
    handleAtomError(error, "cancelTaskNotificationAtom")
  }
})

/** Reschedule the notification timer (internal) */
const rescheduleNotificationTimerAtom = atom(null, (get, set) => {
  try {
    // Clear existing timer
    const currentTimer = get(activeNotificationTimerAtom)
    if (currentTimer) {
      clearTimeout(currentTimer)
      set(activeNotificationTimerAtom, null)
    }

    // Get all notifications at next time
    const nextNotifications = get(nextDueNotificationsAtom)
    if (nextNotifications.size === 0) {
      set(isNotificationSystemActiveAtom, false)
      return
    }

    const now = new Date()
    // Get the first notification's time (they all have the same time)
    const firstNotification = nextNotifications.values().next().value
    if (!firstNotification) {
      // Should not happen since we checked size > 0
      return
    }
    const timeUntil = firstNotification.notifyAt.getTime() - now.getTime()

    if (timeUntil <= 0) {
      // Fire all immediately
      set(fireNotificationsAtom, nextNotifications)
    } else {
      // Schedule timer for all
      const timerId = setTimeout(() => {
        set(fireNotificationsAtom, nextNotifications)
      }, timeUntil)

      set(activeNotificationTimerAtom, timerId)
      set(isNotificationSystemActiveAtom, true)

      log.debug(
        {
          count: nextNotifications.size,
          timeUntil,
          notifyAt: firstNotification.notifyAt.toISOString(),
          module: "notifications",
        },
        "Scheduled notification timer for multiple tasks",
      )
    }
  } catch (error) {
    handleAtomError(error, "rescheduleNotificationTimerAtom")
  }
})

/** Fire multiple notifications (internal) */
const fireNotificationsAtom = atom(null, (get, set, notifications: ScheduledNotificationSet) => {
  try {
    const shouldShow = get(shouldShowNotificationNowAtom)
    const permission = get(notificationPermissionAtom)

    // Remove all from scheduled notifications first
    const currentNotifications = new Map(get(scheduledNotificationsAtom))
    notifications.forEach((notification) => {
      currentNotifications.delete(notification.taskId)
    })
    set(scheduledNotificationsAtom, currentNotifications)

    if (!shouldShow || permission !== "granted") {
      log.info(
        {
          count: notifications.size,
          shouldShow,
          permission,
          module: "notifications",
        },
        "Skipped notifications due to settings or permission",
      )
    } else {
      // Convert to array for indexed iteration with staggered delays
      const notificationArray = Array.from(notifications)
      notificationArray.forEach((notification, index) => {
        setTimeout(() => {
          set(showTaskDueNotificationAtom, notification)
          log.info(
            {
              taskId: notification.taskId,
              taskTitle: notification.taskTitle,
              module: "notifications",
            },
            "Showed notification",
          )
        }, index * 500) // 500ms between each notification
      })
    }

    // Schedule next batch
    set(rescheduleNotificationTimerAtom)

    log.info({ count: notifications.size, module: "notifications" }, "Processed notification batch")
  } catch (error) {
    handleAtomError(error, "fireNotificationsAtom")
  }
})

/** Show notification to user */
export const showTaskDueNotificationAtom = atom(
  null,
  async (get, set, notification: ScheduledNotification) => {
    try {
      const notificationSettings = get(notificationSettingsAtom)

      // Show browser notification using cross-browser utility
      const result = await showCrossBrowserNotification(
        `TaskTrove - Task Due`,
        {
          body: `${notification.taskTitle}`,
          requireInteraction: notificationSettings.requireInteraction,
          tag: `task-due-${notification.taskId}`,
          data: {
            taskId: notification.taskId,
            type: notification.type,
          },
        },
        "atom:showTaskDueNotificationAtom",
      )

      if (!result.success) {
        log.error(
          { module: "notifications", error: result.error, method: result.method },
          "Failed to show task due notification",
        )
      }

      // Play notification sound (always enabled for now)
      playSound("chime").catch((error: unknown) => {
        log.warn({ error, module: "notifications" }, "Failed to play notification sound")
      })

      log.info(
        {
          taskId: notification.taskId,
          taskTitle: notification.taskTitle,
          method: result.method,
          success: result.success,
          module: "notifications",
        },
        "Processed task due notification",
      )
    } catch (error) {
      handleAtomError(error, "showTaskDueNotificationAtom")
    }
  },
)

/** Reschedule all notifications (useful when tasks change) */
export const rescheduleAllNotificationsAtom = atom(null, (get, set) => {
  try {
    const tasks = get(tasksAtom)

    // Clear all existing notifications
    set(scheduledNotificationsAtom, new Map())

    // Reschedule for all tasks with due dates
    for (const task of tasks) {
      if (task.dueDate && task.dueTime && !task.completed) {
        set(scheduleTaskNotificationAtom, { taskId: task.id, task })
      }
    }

    log.info({ module: "notifications" }, "Rescheduled all notifications")
  } catch (error) {
    handleAtomError(error, "rescheduleAllNotificationsAtom")
  }
})

/** Test notification (for settings) */
export const testNotificationAtom = atom(null, (get, set) => {
  try {
    const permission = get(notificationPermissionAtom)

    if (permission !== "granted") {
      log.warn({ module: "notifications" }, "Cannot test notification - permission not granted")
      return false
    }

    const testNotification: ScheduledNotification = {
      taskId: createTestTaskId(),
      taskTitle: "Test Notification",
      notifyAt: new Date(),
      type: "reminder",
    }

    set(showTaskDueNotificationAtom, testNotification)
    return true
  } catch (error) {
    handleAtomError(error, "testNotificationAtom")
    return false
  }
})

// ====================
// UTILITY FUNCTIONS
// ====================

/** Validate and convert browser notification permission to our type */
function validateNotificationPermission(permission: string): NotificationPermissionStatus {
  if (permission === "default" || permission === "granted" || permission === "denied") {
    return permission
  }
  log.warn({ permission, module: "notifications" }, "Unknown notification permission value")
  return "default"
}

/** Create a test task ID */
function createTestTaskId(): TaskId {
  return createTaskId(DEFAULT_UUID)
}

// ====================
// EXPORTED ATOMS OBJECT
// ====================

export const notificationAtoms = {
  // State atoms
  permission: notificationPermissionAtom,
  scheduledNotifications: scheduledNotificationsAtom,
  activeTimer: activeNotificationTimerAtom,
  isSystemActive: isNotificationSystemActiveAtom,

  // Derived atoms
  nextDueNotifications: nextDueNotificationsAtom,
  settings: notificationSettingsAtom,
  shouldShowNow: shouldShowNotificationNowAtom,

  // Action atoms
  actions: {
    requestPermission: requestNotificationPermissionAtom,
    scheduleTask: scheduleTaskNotificationAtom,
    cancelTask: cancelTaskNotificationAtom,
    showNotification: showTaskDueNotificationAtom,
    rescheduleAll: rescheduleAllNotificationsAtom,
    test: testNotificationAtom,
  },
}
