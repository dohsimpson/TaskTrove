/**
 * Cross-browser notification utilities
 * Handles compatibility issues, especially Android Chrome's "Illegal constructor" error
 */

import { log } from "./logger"

export interface CrossBrowserNotificationOptions {
  body?: string
  icon?: string
  badge?: string
  requireInteraction?: boolean
  silent?: boolean
  tag?: string
  data?: unknown
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

export interface CrossBrowserNotificationResult {
  success: boolean
  method: "service-worker" | "direct-constructor" | "unsupported"
  error?: string
}

/**
 * Show a notification using the most compatible method available.
 * Prioritizes service worker registration to avoid Android Chrome "Illegal constructor" error.
 *
 * @param title - Notification title
 * @param options - Notification options
 * @param context - Context for logging (e.g., "hook:useNotificationManager")
 * @returns Promise with result details
 */
export async function showCrossBrowserNotification(
  title: string,
  options: CrossBrowserNotificationOptions = {},
  context = "cross-browser-notifications",
): Promise<CrossBrowserNotificationResult> {
  // Check if notifications are available and permitted
  if (!("Notification" in window)) {
    const error = "Notifications not supported in this browser"
    log.error({ module: "utils", context }, error)
    return { success: false, method: "unsupported", error }
  }

  if (Notification.permission !== "granted") {
    const error = "Notification permission not granted"
    log.warn({ module: "utils", context }, error)
    return { success: false, method: "unsupported", error }
  }

  try {
    // Method 1: Service Worker Registration (recommended, works on Android Chrome)
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(title, {
        body: options.body,
        icon: options.icon || "/favicon.ico",
        badge: options.badge || "/favicon.ico",
        requireInteraction: options.requireInteraction ?? false,
        silent: options.silent ?? false,
        tag: options.tag,
        data: options.data,
        ...(options.actions && { actions: options.actions }),
      })

      log.info(
        { module: "utils", context },
        "Notification shown via service worker (recommended method)",
      )
      return { success: true, method: "service-worker" }
    }

    // Method 2: Direct Constructor (fallback for browsers without service worker)
    else if ("Notification" in window) {
      log.warn(
        { module: "utils", context },
        "Using fallback direct Notification constructor - may fail on mobile browsers like Android Chrome",
      )

      new Notification(title, {
        body: options.body,
        icon: options.icon || "/favicon.ico",
        requireInteraction: options.requireInteraction ?? false,
        silent: options.silent ?? false,
        tag: options.tag,
        data: options.data,
      })

      log.info(
        { module: "utils", context },
        "Notification shown via direct constructor (fallback method)",
      )
      return { success: true, method: "direct-constructor" }
    } else {
      log.error(
        { module: "utils", context },
        "Failed to show notification - browser may not support the notification method used",
      )
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Log the error with context
    log.error(
      { module: "utils", context, error: errorMessage },
      "Failed to show notification - browser may not support the notification method used",
    )

    // Special handling for Android Chrome "Illegal constructor" error
    if (errorMessage?.includes("Illegal constructor")) {
      log.warn(
        { module: "utils", context },
        "Android Chrome detected - direct Notification constructor blocked. Service worker method should be used instead.",
      )
    }

    return { success: false, method: "unsupported", error: errorMessage }
  }

  // Should never reach here, but TypeScript requires it
  return { success: false, method: "unsupported", error: "Unknown error occurred" }
}

/**
 * Check if cross-browser notifications are available and what method would be used.
 * Useful for UI state management and feature detection.
 *
 * @returns Information about notification availability and preferred method
 */
export function getNotificationCapabilities() {
  if (!("Notification" in window)) {
    return {
      supported: false,
      permission: "unsupported" as const,
      preferredMethod: "unsupported" as const,
      requiresPermission: false,
    }
  }

  const permission = Notification.permission
  const hasServiceWorker = "serviceWorker" in navigator

  return {
    supported: true,
    permission,
    preferredMethod: hasServiceWorker
      ? ("service-worker" as const)
      : ("direct-constructor" as const),
    requiresPermission: permission !== "granted",
  }
}

/**
 * Request notification permission with proper error handling.
 *
 * @param context - Context for logging
 * @returns Promise resolving to permission status
 */
export async function requestNotificationPermission(
  context = "cross-browser-notifications",
): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    log.error({ module: "utils", context }, "Notifications not supported in this browser")
    return "denied"
  }

  try {
    const permission = await Notification.requestPermission()
    log.info(
      { module: "utils", context, permission },
      `Notification permission ${permission === "granted" ? "granted" : "denied"}`,
    )
    return permission
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.error(
      { module: "utils", context, error: errorMessage },
      "Failed to request notification permission",
    )
    return "denied"
  }
}
