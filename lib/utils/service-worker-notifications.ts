/**
 * Service Worker notification utilities
 */

import { log } from "./logger"

export interface ServiceWorkerNotificationOptions {
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

export interface ServiceWorkerNotificationResult {
  success: boolean
  error?: string
}

/**
 * Check if the current context supports secure notifications
 * @returns true if running on secure context: https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts
 */
export function isSecureContext(): boolean {
  if (typeof window === "undefined") return false

  const { protocol, hostname } = window.location
  return (
    protocol === "https:" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  )
}

/**
 * Show a notification using service worker.
 * Only works in secure contexts (HTTPS or localhost).
 *
 * @param title - Notification title
 * @param options - Notification options
 * @param context - Context for logging
 * @returns Promise with result details
 */
export async function showServiceWorkerNotification(
  title: string,
  options: ServiceWorkerNotificationOptions = {},
  context = "service-worker-notifications",
): Promise<ServiceWorkerNotificationResult> {
  // Check secure context requirement
  if (!isSecureContext()) {
    const error = "Notifications require HTTPS or localhost"
    log.error({ module: "utils", context }, error)
    return { success: false, error }
  }

  // Check if notifications are available and permitted
  if (!("Notification" in window)) {
    const error = "Notifications not supported in this browser"
    log.error({ module: "utils", context }, error)
    return { success: false, error }
  }

  if (Notification.permission !== "granted") {
    const error = "Notification permission not granted"
    log.warn({ module: "utils", context }, error)
    return { success: false, error }
  }

  // Check service worker support
  const sw = getServiceWorker()
  if (!sw) {
    const error = "Service Worker not supported"
    log.error({ module: "utils", context }, error)
    return { success: false, error }
  }

  try {
    const registration = await sw.ready
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

    log.info({ module: "utils", context }, "Notification shown via service worker")
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.error({ module: "utils", context, error: errorMessage }, "Failed to show notification")
    return { success: false, error: errorMessage }
  }
}

export function getServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return null
  } else {
    return navigator.serviceWorker
  }
}
