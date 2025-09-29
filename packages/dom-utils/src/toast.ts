/**
 * Toast utilities for TaskTrove
 * Browser-specific toast functionality using Sonner
 */

import { toast as sonnerToast } from "sonner";

/**
 * Toast interface matching the placeholder API in atom-helpers.ts
 */
export interface ToastAPI {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

/**
 * Browser environment check
 */
const isBrowser = () => typeof window !== "undefined";

/**
 * Toast implementation that works in DOM environment
 * Falls back to console logging in non-DOM environments
 */
export const toast: ToastAPI = {
  success: (message: string) => {
    if (isBrowser()) {
      sonnerToast.success(message);
    } else {
      console.log("Toast success:", message);
    }
  },

  error: (message: string) => {
    if (isBrowser()) {
      sonnerToast.error(message);
    } else {
      console.error("Toast error:", message);
    }
  },

  info: (message: string) => {
    if (isBrowser()) {
      sonnerToast.info(message);
    } else {
      console.log("Toast info:", message);
    }
  },

  warning: (message: string) => {
    if (isBrowser()) {
      sonnerToast.warning(message);
    } else {
      console.warn("Toast warning:", message);
    }
  },
};

/**
 * Re-export Sonner's full API for advanced usage
 * Only works in browser environment
 */
export { toast as sonner } from "sonner";
