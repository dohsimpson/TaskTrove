/**
 * Visibility change detection utilities
 * Useful for detecting when the page becomes visible again (e.g., after sleep/background)
 */

import { format } from "date-fns";

/**
 * Returns the current date as a string (YYYY-MM-DD)
 */
export function getCurrentDateString(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/**
 * Register a visibility change handler
 * @param onVisibilityChange - Callback when visibility changes
 * @returns Cleanup function to remove the handler
 */
export function registerVisibilityHandler(
  onVisibilityChange: (isVisible: boolean) => void,
): () => void {
  const handler = () => {
    onVisibilityChange(!document.hidden);
  };

  document.addEventListener("visibilitychange", handler);

  return () => {
    document.removeEventListener("visibilitychange", handler);
  };
}

/**
 * Options for refresh condition checker
 */
export interface RefreshConditionOptions {
  /**
   * Check if day has changed since last check
   */
  checkDayChange?: boolean;
  /**
   * Custom condition checker - return true if refresh should be triggered
   */
  customCheck?: () => boolean;
}

/**
 * Register a visibility handler with automatic refresh trigger
 * Checks conditions when page becomes visible and calls onRefresh if any condition is met
 *
 * @param options - Conditions to check for refresh
 * @param onRefresh - Callback when refresh should be triggered
 * @returns Cleanup function to remove the handler
 *
 * @example
 * ```ts
 * // Check for day change
 * const cleanup = registerRefreshHandler(
 *   { checkDayChange: true },
 *   () => setRefreshTrigger(Date.now())
 * );
 *
 * // Custom condition
 * const cleanup = registerRefreshHandler(
 *   { customCheck: () => hasNewVersion() },
 *   () => setRefreshTrigger(Date.now())
 * );
 *
 * // Multiple conditions
 * const cleanup = registerRefreshHandler(
 *   {
 *     checkDayChange: true,
 *     customCheck: () => hasNewVersion() || hasSettingsChanged()
 *   },
 *   () => setRefreshTrigger(Date.now())
 * );
 * ```
 */
export function registerRefreshHandler(
  options: RefreshConditionOptions,
  onRefresh: () => void,
): () => void {
  let lastDate = getCurrentDateString();
  let isChecking = false; // flag to prevent multiple checks at once

  const checkConditions = () => {
    if (isChecking) {
      return;
    }
    isChecking = true;
    let shouldRefresh = false;

    // Check day change
    if (options.checkDayChange) {
      const currentDate = getCurrentDateString();
      if (currentDate !== lastDate) {
        lastDate = currentDate;
        shouldRefresh = true;
      }
    }

    // Check custom condition
    if (options.customCheck && options.customCheck()) {
      shouldRefresh = true;
    }

    isChecking = false;

    if (shouldRefresh) {
      onRefresh();
    }
  };

  // Visibility change handler (tab switching)
  const visibilityHandler = () => {
    if (!document.hidden) {
      checkConditions();
    }
  };

  // Focus handler (window/app switching)
  const focusHandler = () => {
    checkConditions();
  };

  // Page show handler (back/forward navigation, resume from background)
  const pageShowHandler = () => {
    checkConditions();
  };

  document.addEventListener("visibilitychange", visibilityHandler);
  window.addEventListener("focus", focusHandler);
  window.addEventListener("pageshow", pageShowHandler);

  return () => {
    document.removeEventListener("visibilitychange", visibilityHandler);
    window.removeEventListener("focus", focusHandler);
    window.removeEventListener("pageshow", pageShowHandler);
  };
}
