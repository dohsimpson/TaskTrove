"use client"

import { useEffect } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { notificationAtoms } from "@tasktrove/atoms/core/notifications"
import { tasksAtom } from "@tasktrove/atoms/data/base/atoms"
import { useNotificationServiceWorker } from "./use-notification-service-worker"
import { log } from "@/lib/utils/logger"

/**
 * Hook to initialize and manage the notification system
 * Should be called once at the app level to set up notification scheduling
 */
export function useNotificationSystem() {
  // Atoms
  const tasks = useAtomValue(tasksAtom)
  const notificationSettings = useAtomValue(notificationAtoms.settings)
  const notificationPermission = useAtomValue(notificationAtoms.permission)
  const scheduledNotifications = useAtomValue(notificationAtoms.scheduledNotifications)

  // Actions
  const scheduleTask = useSetAtom(notificationAtoms.actions.scheduleTask)
  const rescheduleAll = useSetAtom(notificationAtoms.actions.rescheduleAll)
  const requestPermission = useSetAtom(notificationAtoms.actions.requestPermission)

  // Service worker integration
  const serviceWorker = useNotificationServiceWorker()

  // Initialize notification system
  useEffect(() => {
    log.info({ module: "notifications" }, "Initializing notification system")

    // Check and update permission status on load
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default" && notificationSettings.enabled) {
        log.info({ module: "notifications" }, "Notification permission not yet requested")
      } else if (Notification.permission === "granted") {
        log.info({ module: "notifications" }, "Notification permission already granted")
      } else {
        log.warn({ module: "notifications" }, "Notification permission denied")
      }
    } else {
      log.warn({ module: "notifications" }, "Notifications not supported in this browser")
    }
  }, [notificationSettings.enabled])

  // Schedule notifications for all existing tasks with due dates
  // TODO: this could be optimized to not react to every tasks change (also, since we are doing optimistic rendering, this actually get called twice on every task change)
  useEffect(() => {
    if (!notificationSettings.enabled || notificationPermission !== "granted") {
      return
    }

    // Reschedule all notifications when tasks change or system is enabled
    rescheduleAll(tasks)

    log.info(
      {
        taskCount: tasks.length,
        scheduledCount: scheduledNotifications.size,
        module: "notifications",
      },
      "Rescheduled notifications for all tasks",
    )
  }, [tasks, notificationSettings.enabled, notificationPermission, rescheduleAll])

  // Auto-request permission on first task with due date (if enabled in settings)
  useEffect(() => {
    if (
      notificationSettings.enabled &&
      notificationPermission === "default" &&
      tasks.some((task) => task.dueDate && task.dueTime && !task.completed)
    ) {
      log.info(
        { module: "notifications" },
        "Auto-requesting notification permission for task with due date",
      )
      requestPermission()
    }
  }, [tasks, notificationSettings.enabled, notificationPermission, requestPermission])

  // Log notification system status changes
  useEffect(() => {
    log.info(
      {
        enabled: notificationSettings.enabled,
        permission: notificationPermission,
        scheduledCount: scheduledNotifications.size,
        serviceWorkerRegistered: serviceWorker.isServiceWorkerRegistered,
        module: "notifications",
      },
      "Notification system status",
    )
  }, [
    notificationSettings.enabled,
    notificationPermission,
    scheduledNotifications.size,
    serviceWorker.isServiceWorkerRegistered,
  ])

  // Provide notification system status and controls
  return {
    // Status
    isEnabled: notificationSettings.enabled,
    permission: notificationPermission,
    scheduledCount: scheduledNotifications.size,
    isServiceWorkerRegistered: serviceWorker.isServiceWorkerRegistered,

    // Settings
    settings: notificationSettings,

    // Actions
    requestPermission,
    scheduleTask,
    rescheduleAll,

    // Service worker integration
    serviceWorker,
  }
}
