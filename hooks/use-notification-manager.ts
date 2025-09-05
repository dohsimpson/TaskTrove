"use client"

import { useState, useEffect } from "react"
import { log } from "@/lib/utils/logger"
import { showCrossBrowserNotification } from "@/lib/utils/cross-browser-notifications"

export function useNotificationManager() {
  log.warn(
    { module: "hooks" },
    "DEPRECATED: useNotificationManager hook is deprecated and will be removed in a future version. This feature should be implemented using atoms from @/lib/atoms. See ACTUAL_MIGRATION_PLAN.md for migration guidance.",
  )

  const [notifications, setNotifications] = useState([
    {
      id: "1",
      type: "reminder",
      title: "Task Due Soon",
      message: "Review quarterly reports is due in 1 hour",
      timestamp: new Date(),
      read: false,
      priority: "high",
      category: "deadlines",
    },
    {
      id: "2",
      type: "collaboration",
      title: "New Comment",
      message: "Sarah commented on your task",
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      read: false,
      priority: "medium",
      category: "team",
    },
  ])

  const [settings, setSettings] = useState({
    enabled: true,
    channels: {
      push: true,
      email: true,
      desktop: true,
      mobile: true,
    },
    schedule: {
      quietHours: {
        enabled: false,
        start: "22:00",
        end: "08:00",
      },
      weekends: true,
      holidays: true,
    },
    types: {
      reminders: true,
      deadlines: true,
      collaboration: true,
      achievements: true,
      system: true,
    },
    frequency: {
      immediate: true,
      digest: "daily",
      digestTime: "09:00",
    },
    sound: {
      enabled: true,
      volume: 70,
    },
  })

  const [permissionStatus, setPermissionStatus] = useState("default")

  useEffect(() => {
    if ("Notification" in window) {
      setPermissionStatus(Notification.permission)
    }
  }, [])

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
    )
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const deleteNotification = (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
  }

  const requestPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission()
      setPermissionStatus(permission)
      return permission === "granted"
    }
    return false
  }

  const testNotification = async () => {
    const result = await showCrossBrowserNotification(
      "Test Notification",
      {
        body: "This is a test notification from TaskTrove",
        tag: "tasktrove-test-notification",
      },
      "hook:useNotificationManager",
    )

    if (!result.success) {
      log.warn(
        { module: "hooks", hook: "useNotificationManager", error: result.error },
        "Test notification failed",
      )
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return {
    notifications,
    settings,
    permissionStatus,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    requestPermission,
    testNotification,
    updateSettings: setSettings,
  }
}
