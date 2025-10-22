/// <reference lib="webworker" />

// TaskTrove Notification Service Worker
// Handles background notifications when the app is closed or inactive
//
// Next.js Best Practices Implemented:
// 1. Located in /public/ for direct browser access
// 2. Registered with deferred loading (after page load)
// 3. Minimal caching to avoid conflicts with Next.js optimizations
// 4. Scoped to '/' for full app coverage
// 5. Proper lifecycle management (install/activate/message handling)
// 6. Non-blocking registration pattern

declare const self: ServiceWorkerGlobalScope

const CACHE_NAME = "tasktrove-notifications-v1"
const NOTIFICATION_TAG_PREFIX = "task-due-"

// Type definitions
interface NotificationData {
  taskId: string
  taskTitle: string
  type: string
  notifyAt?: number
}

interface NotificationClickData {
  taskId: string
  url?: string
}

interface SyncEventLike extends ExtendableEvent {
  tag: string
}

// Install event - minimal caching to avoid conflicts with Next.js
self.addEventListener("install", (event: ExtendableEvent) => {
  console.log("[TaskTrove SW] Installing...")

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Only cache notification-specific assets to avoid Next.js conflicts
      return cache.addAll([
        "/favicon.ico",
        // Only cache assets specifically needed for notifications
        // Let Next.js handle page caching
      ])
    }),
  )

  // Don't take control immediately - let the current page finish loading
  // This follows Next.js best practices for smoother user experience
})

// Activate event - follows Next.js best practices
self.addEventListener("activate", (event: ExtendableEvent) => {
  console.log("[TaskTrove SW] Activating...")

  event.waitUntil(
    Promise.all([
      // Clean up old notification caches only (avoid Next.js cache conflicts)
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith("tasktrove-notifications") && cacheName !== CACHE_NAME,
            )
            .map((cacheName) => {
              console.log("[TaskTrove SW] Deleting old cache:", cacheName)
              return caches.delete(cacheName)
            }),
        )
      }),
      // Take control of clients after activation (Next.js best practice)
      self.clients.claim(),
    ]),
  )
})

// Handle notification click events
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  console.log("[Notification SW] Notification clicked:", event.notification.data)

  const notification = event.notification
  const data = notification.data || {}

  notification.close()

  // Handle different notification actions
  if (event.action === "complete-task") {
    // Send message to mark task as complete
    handleTaskComplete(data.taskId)
  } else if (event.action === "snooze-task") {
    // Send message to snooze task
    handleTaskSnooze(data.taskId)
  } else {
    // Default action - focus on the task
    handleNotificationClick(data)
  }
})

// Handle notification close events
self.addEventListener("notificationclose", (event: NotificationEvent) => {
  console.log("[Notification SW] Notification closed:", event.notification.data)

  // Track notification dismissals for analytics
  const data = event.notification.data || {}
  if (data.taskId && data.type) {
    trackNotificationDismissal(data.taskId, data.type)
  }
})

// Handle messages from the main thread
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  console.log("[Notification SW] Received message:", event.data)

  const { type, payload } = event.data

  switch (type) {
    case "SCHEDULE_NOTIFICATION":
      scheduleNotification(payload)
      break
    case "CANCEL_NOTIFICATION":
      cancelNotification(payload.taskId)
      break
    case "SHOW_NOTIFICATION":
      showNotification(payload)
      break
    case "PING":
      if (event.ports[0]) {
        event.ports[0].postMessage({ type: "PONG" })
      }
      break
    default:
      console.warn("[Notification SW] Unknown message type:", type)
  }
})

// Handle push events (for future server-side notifications)
self.addEventListener("push", (event: PushEvent) => {
  console.log("[Notification SW] Push received:", event.data?.text())

  if (!event.data) return

  try {
    const data = event.data.json()

    if (data.type === "task-due") {
      event.waitUntil(showTaskDueNotification(data))
    }
  } catch (error) {
    console.error("[Notification SW] Error handling push:", error)
  }
})

// Core notification functions
async function showNotification(notificationData: NotificationData) {
  const { taskId, taskTitle, type, notifyAt } = notificationData

  try {
    // Check if we should show the notification (client might handle this)
    const shouldShow = await checkNotificationSettings()
    if (!shouldShow) {
      console.log("[Notification SW] Notification blocked by settings")
      return
    }

    // Create the notification
    const notificationOptions = {
      body: `Your task "${taskTitle}" is now due.`,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: `${NOTIFICATION_TAG_PREFIX}${taskId}`,
      requireInteraction: true,
      silent: false,
      timestamp: Date.now(),
      data: {
        taskId,
        taskTitle,
        type,
        url: `/?highlight=${taskId}`,
        notifyAt,
      },
      actions: [
        {
          action: "complete-task",
          title: "Mark Complete",
          icon: "/icons/check.png", // Would need to add this icon
        },
        {
          action: "snooze-task",
          title: "Snooze",
          icon: "/icons/snooze.png", // Would need to add this icon
        },
      ],
    }

    await self.registration.showNotification(`Task Due: ${taskTitle}`, notificationOptions)

    // Track notification shown
    trackNotificationShown(taskId, type)

    console.log("[Notification SW] Showed notification for task:", taskId)
  } catch (error) {
    console.error("[Notification SW] Error showing notification:", error)
  }
}

async function showTaskDueNotification(data: NotificationData) {
  return showNotification({
    taskId: data.taskId,
    taskTitle: data.taskTitle,
    type: "due",
    notifyAt: data.notifyAt,
  })
}

function scheduleNotification(notificationData: NotificationData) {
  // Service workers can't use setTimeout for long delays
  // Instead, we rely on the main thread to schedule and message us
  console.log("[Notification SW] Notification scheduled:", notificationData.taskId)

  // Store in IndexedDB for persistence across SW restarts
  storeScheduledNotification(notificationData)
}

function cancelNotification(taskId: string) {
  console.log("[Notification SW] Cancelling notification for task:", taskId)

  // Remove from storage
  removeScheduledNotification(taskId)

  // Close any existing notifications
  self.registration
    .getNotifications({
      tag: `${NOTIFICATION_TAG_PREFIX}${taskId}`,
    })
    .then((notifications) => {
      notifications.forEach((notification) => notification.close())
    })
}

async function handleNotificationClick(data: NotificationClickData) {
  const { taskId } = data

  try {
    // Try to focus existing window/tab
    const allClients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    })

    // Look for existing TaskTrove tab - filter to WindowClient type
    const windowClients = allClients.filter((client): client is WindowClient => "focus" in client)

    for (const client of windowClients) {
      if (client.url.includes(self.location.origin)) {
        await client.focus()
        // Send message to navigate to task
        client.postMessage({
          type: "FOCUS_TASK",
          taskId: taskId,
        })
        return
      }
    }

    // No existing tab, open new one
    await self.clients.openWindow(`${self.location.origin}/?highlight=${taskId}`)
  } catch (error) {
    console.error("[Notification SW] Error handling notification click:", error)
  }
}

async function handleTaskComplete(taskId: string) {
  console.log("[Notification SW] Completing task:", taskId)

  try {
    // Send message to all clients to complete the task
    const clients = await self.clients.matchAll()
    clients.forEach((client) => {
      client.postMessage({
        type: "COMPLETE_TASK",
        taskId: taskId,
      })
    })

    // Show feedback notification
    await self.registration.showNotification("Task Completed", {
      body: "Task has been marked as complete.",
      icon: "/favicon.ico",
      tag: `task-completed-${taskId}`,
      requireInteraction: false,
      silent: true,
    })

    trackNotificationAction(taskId, "complete")
  } catch (error) {
    console.error("[Notification SW] Error completing task:", error)
  }
}

async function handleTaskSnooze(taskId: string) {
  console.log("[Notification SW] Snoozing task:", taskId)

  try {
    // Send message to all clients to snooze the task
    const clients = await self.clients.matchAll()
    clients.forEach((client) => {
      client.postMessage({
        type: "SNOOZE_TASK",
        taskId: taskId,
        snoozeMinutes: 15, // Default 15 minutes
      })
    })

    trackNotificationAction(taskId, "snooze")
  } catch (error) {
    console.error("[Notification SW] Error snoozing task:", error)
  }
}

// Storage functions (using IndexedDB for persistence)
function storeScheduledNotification(notificationData: NotificationData) {
  // Implementation would use IndexedDB to persist scheduled notifications
  // This ensures notifications survive service worker restarts
  console.log("[Notification SW] Storing scheduled notification:", notificationData.taskId)
}

function removeScheduledNotification(taskId: string) {
  console.log("[Notification SW] Removing scheduled notification:", taskId)
}

// Settings check
async function checkNotificationSettings(): Promise<boolean> {
  // In a real implementation, this would check user settings
  // For now, assume notifications are enabled
  return true
}

// Analytics tracking
function trackNotificationShown(taskId: string, type: string) {
  console.log("[Notification SW] Tracking notification shown:", { taskId, type })
  // Send analytics event to track notification engagement
}

function trackNotificationDismissal(taskId: string, type: string) {
  console.log("[Notification SW] Tracking notification dismissal:", { taskId, type })
}

function trackNotificationAction(taskId: string, action: string) {
  console.log("[Notification SW] Tracking notification action:", { taskId, action })
}

// Keep service worker alive (if needed)
self.addEventListener("sync", (event) => {
  // SyncEvent is not fully typed in lib.webworker.d.ts
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const syncEvent = event as unknown as SyncEventLike
  console.log("[Notification SW] Background sync:", syncEvent.tag)

  if (syncEvent.tag === "notification-check") {
    syncEvent.waitUntil(checkPendingNotifications())
  }
})

async function checkPendingNotifications() {
  // Check for any pending notifications that need to be shown
  console.log("[Notification SW] Checking pending notifications")
}

console.log("[Notification SW] Service Worker loaded")
