"use client"

import { useEffect, useRef, useCallback } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { notificationAtoms } from "@/lib/atoms/core/notifications"
import { tasksAtom, updateTaskAtom } from "@/lib/atoms/core/tasks"
import { log } from "@/lib/utils/logger"
import type { TaskId, ScheduledNotification } from "@/lib/types"

interface ServiceWorkerMessage {
  type: string
  taskId?: TaskId
  snoozeMinutes?: number
  payload?: any
}

export function useNotificationServiceWorker() {
  const swRef = useRef<ServiceWorkerRegistration | null>(null)
  const isRegistered = useRef(false)

  // Atoms
  const scheduledNotifications = useAtomValue(notificationAtoms.scheduledNotifications)
  const isSystemActive = useAtomValue(notificationAtoms.isSystemActive)
  const updateTask = useSetAtom(updateTaskAtom)
  const showNotification = useSetAtom(notificationAtoms.actions.showNotification)
  const scheduleTask = useSetAtom(notificationAtoms.actions.scheduleTask)
  const tasks = useAtomValue(tasksAtom)

  // Handle messages from service worker
  const handleServiceWorkerMessage = useCallback(
    (event: MessageEvent<ServiceWorkerMessage>) => {
      const { type, taskId, snoozeMinutes } = event.data

      log.info({ type, taskId, module: "notifications" }, "Received message from service worker")

      switch (type) {
        case "FOCUS_TASK":
          if (taskId) {
            // Navigate to task (would integrate with router)
            const url = new URL(window.location.href)
            url.searchParams.set("focus", taskId)
            window.history.pushState({}, "", url.toString())

            // Focus the task in the UI
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`)
            taskElement?.scrollIntoView({ behavior: "smooth", block: "center" })
          }
          break

        case "COMPLETE_TASK":
          if (taskId) {
            const task = tasks.find((t) => t.id === taskId)
            if (task) {
              updateTask({
                updateRequest: { id: taskId, completed: true },
              })
              log.info(
                { taskId, module: "notifications" },
                "Task completed via notification action",
              )
            }
          }
          break

        case "SNOOZE_TASK":
          if (taskId && snoozeMinutes) {
            const task = tasks.find((t) => t.id === taskId)
            if (task && task.dueDate) {
              // Add snooze time to due date
              const newDueDate = new Date(task.dueDate)
              newDueDate.setMinutes(newDueDate.getMinutes() + snoozeMinutes)

              updateTask({
                updateRequest: { id: taskId, dueDate: newDueDate },
              })

              // Reschedule notification
              scheduleTask({ taskId, task: { ...task, dueDate: newDueDate } })

              log.info(
                { taskId, snoozeMinutes, module: "notifications" },
                "Task snoozed via notification action",
              )
            }
          }
          break

        case "PONG":
          log.debug({ module: "notifications" }, "Service worker ping successful")
          break

        default:
          log.warn({ type, module: "notifications" }, "Unknown message type from service worker")
      }
    },
    [tasks, updateTask, scheduleTask],
  )

  // Register service worker following Next.js best practices
  const registerServiceWorker = useCallback(async () => {
    if (typeof window === "undefined" || isRegistered.current) {
      return null
    }

    if (!("serviceWorker" in navigator)) {
      log.warn({ module: "notifications" }, "Service Worker not supported")
      return null
    }

    return new Promise<ServiceWorkerRegistration | null>((resolve) => {
      // Wait for page load to avoid blocking initial render
      const handleLoad = async () => {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
            // Use 'classic' script type for better compatibility
            type: "classic",
          })

          swRef.current = registration
          isRegistered.current = true

          log.info(
            {
              scope: registration.scope,
              module: "notifications",
            },
            "Service worker registered successfully",
          )

          // Listen for messages from service worker
          navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage)

          // Handle updates with better user experience
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  log.info(
                    { module: "notifications" },
                    "New service worker available - will update on next visit",
                  )
                  // Note: In production, you might want to show a user-friendly update notification
                }
              })
            }
          })

          resolve(registration)
        } catch (error) {
          log.error({ error, module: "notifications" }, "Failed to register service worker")
          resolve(null)
        }
      }

      // Register immediately if already loaded, otherwise wait for load event
      if (document.readyState === "complete") {
        handleLoad()
      } else {
        window.addEventListener("load", handleLoad, { once: true })
      }
    })
  }, [handleServiceWorkerMessage])

  // Send message to service worker
  const sendMessageToServiceWorker = useCallback(async (message: any) => {
    if (!swRef.current?.active) {
      log.warn({ module: "notifications" }, "Service worker not active, cannot send message")
      return false
    }

    try {
      swRef.current.active.postMessage(message)
      return true
    } catch (error) {
      log.error({ error, module: "notifications" }, "Failed to send message to service worker")
      return false
    }
  }, [])

  // Schedule notification via service worker
  const scheduleNotificationInServiceWorker = useCallback(
    async (notification: ScheduledNotification) => {
      return sendMessageToServiceWorker({
        type: "SCHEDULE_NOTIFICATION",
        payload: notification,
      })
    },
    [sendMessageToServiceWorker],
  )

  // Cancel notification via service worker
  const cancelNotificationInServiceWorker = useCallback(
    async (taskId: TaskId) => {
      return sendMessageToServiceWorker({
        type: "CANCEL_NOTIFICATION",
        payload: { taskId },
      })
    },
    [sendMessageToServiceWorker],
  )

  // Show notification via service worker
  const showNotificationInServiceWorker = useCallback(
    async (notification: ScheduledNotification) => {
      return sendMessageToServiceWorker({
        type: "SHOW_NOTIFICATION",
        payload: notification,
      })
    },
    [sendMessageToServiceWorker],
  )

  // Ping service worker
  const pingServiceWorker = useCallback(async () => {
    if (!swRef.current?.active) return false

    return new Promise<boolean>((resolve) => {
      const channel = new MessageChannel()

      channel.port1.onmessage = (event) => {
        resolve(event.data?.type === "PONG")
      }

      // Timeout after 5 seconds
      setTimeout(() => resolve(false), 5000)

      swRef.current!.active!.postMessage({ type: "PING" }, [channel.port2])
    })
  }, [])

  // Initialize service worker on mount
  useEffect(() => {
    registerServiceWorker()

    return () => {
      if (typeof window !== "undefined") {
        navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage)
      }
    }
  }, [registerServiceWorker, handleServiceWorkerMessage])

  // Sync scheduled notifications with service worker
  useEffect(() => {
    if (!isSystemActive || scheduledNotifications.size === 0) return

    const syncNotifications = async () => {
      for (const notification of scheduledNotifications.values()) {
        await scheduleNotificationInServiceWorker(notification)
      }
    }

    syncNotifications().catch((error) => {
      log.error(
        { error, module: "notifications" },
        "Failed to sync notifications with service worker",
      )
    })
  }, [scheduledNotifications, isSystemActive, scheduleNotificationInServiceWorker])

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Page became visible, ping service worker to ensure it's alive
        pingServiceWorker().then((alive) => {
          if (!alive) {
            log.warn(
              { module: "notifications" },
              "Service worker not responding, attempting to reregister",
            )
            registerServiceWorker()
          }
        })
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [pingServiceWorker, registerServiceWorker])

  // Handle beforeunload to ensure service worker can handle notifications
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Ensure all scheduled notifications are synced with service worker
      if (scheduledNotifications.size > 0) {
        // Use navigator.sendBeacon for reliable delivery on page unload
        const notificationsData = Array.from(scheduledNotifications.values())
        const data = JSON.stringify({
          type: "SYNC_NOTIFICATIONS",
          notifications: notificationsData,
        })

        try {
          navigator.sendBeacon("/api/notifications/sync", data)
        } catch (error) {
          log.error({ error, module: "notifications" }, "Failed to sync notifications on unload")
        }
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [scheduledNotifications])

  return {
    isServiceWorkerRegistered: isRegistered.current,
    serviceWorkerRegistration: swRef.current,
    sendMessageToServiceWorker,
    scheduleNotificationInServiceWorker,
    cancelNotificationInServiceWorker,
    showNotificationInServiceWorker,
    pingServiceWorker,
  }
}
