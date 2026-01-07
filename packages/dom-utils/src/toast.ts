/**
 * Toast utilities for TaskTrove
 * Browser-specific toast functionality using Sonner
 */

import { toast as sonnerToast } from "sonner";

/**
 * Toast interface matching the placeholder API in atom-helpers.ts
 */
export type ToastHandler = (
  message: string,
  // Allow surface-specific option bags (e.g., Sonner or Capacitor)
  options?: unknown,
) => void | Promise<void>;

export interface ToastAPI {
  success: ToastHandler;
  error: ToastHandler;
  info: ToastHandler;
  warning: ToastHandler;
}

/**
 * Browser environment check
 */
const isBrowser = () => typeof window !== "undefined";

type SonnerOptions = Parameters<typeof sonnerToast.success>[1];
const isSonnerOptions = (value: unknown): value is SonnerOptions =>
  value === undefined || (typeof value === "object" && value !== null);

/**
 * Toast implementation that works in DOM environment
 * Falls back to console logging in non-DOM environments
 */
const defaultToast: ToastAPI = {
  success: (message: string, options?: unknown) => {
    if (isBrowser()) {
      sonnerToast.success(
        message,
        isSonnerOptions(options) ? options : undefined,
      );
    } else {
      console.log("Toast success:", message);
    }
  },

  error: (message: string, options?: unknown) => {
    if (isBrowser()) {
      sonnerToast.error(
        message,
        isSonnerOptions(options) ? options : undefined,
      );
    } else {
      console.error("Toast error:", message);
    }
  },

  info: (message: string, options?: unknown) => {
    if (isBrowser()) {
      sonnerToast.info(message, isSonnerOptions(options) ? options : undefined);
    } else {
      console.log("Toast info:", message);
    }
  },

  warning: (message: string, options?: unknown) => {
    if (isBrowser()) {
      sonnerToast.warning(
        message,
        isSonnerOptions(options) ? options : undefined,
      );
    } else {
      console.warn("Toast warning:", message);
    }
  },
};

let currentToast: ToastAPI = defaultToast;

const proxy =
  (variant: keyof ToastAPI): ToastHandler =>
  (message, options) =>
    currentToast[variant](message, options);

/**
 * Proxied toast API that delegates to the currently registered implementation.
 * By default, it uses the Sonner-backed implementation, but surfaces may
 * override it (e.g., Capacitor on mobile) via `setToastImplementation`.
 */
export const toast: ToastAPI = {
  success: proxy("success"),
  error: proxy("error"),
  info: proxy("info"),
  warning: proxy("warning"),
};

/**
 * Swap the underlying toast implementation used by atoms/dom-utils.
 * Returns the previously registered implementation so callers can restore it.
 */
export function setToastImplementation(next: ToastAPI): ToastAPI {
  const previous = currentToast;
  currentToast = next;
  return previous;
}

/**
 * Restore the default Sonner-backed implementation.
 */
export function resetToastImplementation() {
  currentToast = defaultToast;
}

/**
 * Re-export Sonner's full API for advanced usage
 * Only works in browser environment
 */
export { toast as sonner } from "sonner";
