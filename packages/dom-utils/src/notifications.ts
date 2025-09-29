/**
 * Service Worker notification utilities for TaskTrove
 * Browser-specific notification functionality using Service Worker API
 */

/**
 * Service Worker notification options interface
 */
export interface ServiceWorkerNotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  data?: unknown;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

/**
 * Service Worker notification result interface
 */
export interface ServiceWorkerNotificationResult {
  success: boolean;
  error?: string;
}

/**
 * Browser environment check
 */
const isBrowser = () => typeof window !== "undefined";

/**
 * Check if the current context supports secure notifications
 * @returns true if running on secure context: https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts
 */
export function isSecureContext(): boolean {
  if (!isBrowser()) return false;

  const { protocol, hostname } = window.location;
  return (
    protocol === "https:" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  );
}

/**
 * Get service worker if available
 */
export function getServiceWorker() {
  if (!isBrowser() || !("serviceWorker" in navigator)) {
    return null;
  }
  return navigator.serviceWorker;
}

/**
 * Show a notification using service worker.
 * Only works in secure contexts (HTTPS or localhost).
 * Falls back to console logging in non-DOM environments.
 *
 * @param title - Notification title
 * @param options - Notification options
 * @param context - Context for logging (optional)
 * @returns Promise with result details
 */
export async function showServiceWorkerNotification(
  title: string,
  options: ServiceWorkerNotificationOptions = {},
  context = "service-worker-notifications",
): Promise<ServiceWorkerNotificationResult> {
  // Handle non-browser environments
  if (!isBrowser()) {
    console.log("Service worker notification requested:", {
      title,
      options,
      context,
    });
    return { success: true };
  }

  // Check secure context requirement
  if (!isSecureContext()) {
    const error = "Notifications require HTTPS or localhost";
    console.error(`[${context}]`, error);
    return { success: false, error };
  }

  // Check if notifications are available and permitted
  if (!("Notification" in window)) {
    const error = "Notifications not supported in this browser";
    console.error(`[${context}]`, error);
    return { success: false, error };
  }

  if (Notification.permission !== "granted") {
    const error = "Notification permission not granted";
    console.warn(`[${context}]`, error);
    return { success: false, error };
  }

  // Check service worker support
  const sw = getServiceWorker();
  if (!sw) {
    const error = "Service Worker not supported";
    console.error(`[${context}]`, error);
    return { success: false, error };
  }

  try {
    const registration = await sw.ready;
    await registration.showNotification(title, {
      body: options.body,
      icon: options.icon || "/favicon.ico",
      badge: options.badge || "/favicon.ico",
      requireInteraction: options.requireInteraction ?? false,
      silent: options.silent ?? false,
      tag: options.tag,
      data: options.data,
      ...(options.actions && { actions: options.actions }),
    });

    console.log(`[${context}]`, "Notification shown via service worker");
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${context}]`, "Failed to show notification:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Request notification permission from the user
 * @returns Promise with the permission state
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isBrowser() || !("Notification" in window)) {
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  // Request permission
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error("Failed to request notification permission:", error);
    return "denied";
  }
}

/**
 * Check current notification permission status
 * @returns Current notification permission state
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isBrowser() || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}
