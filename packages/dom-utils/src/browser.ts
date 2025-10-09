/**
 * Browser utility functions
 */

/**
 * Refresh/reload the current page
 */
export function refreshBrowser(): void {
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}

/**
 * Refresh the browser after a specified delay
 */
export function refreshBrowserAfter(delay: number): void {
  setTimeout(() => {
    refreshBrowser();
  }, delay);
}

/**
 * Check if we're in a browser environment
 */
export function isBrowser(): boolean {
  return (
    typeof window !== "undefined" && typeof window.location !== "undefined"
  );
}

/**
 * Get the current URL
 */
export function getCurrentUrl(): string | null {
  return isBrowser() ? window.location.href : null;
}

/**
 * Navigate to a new URL
 */
export function navigateTo(url: string): void {
  if (isBrowser()) {
    window.location.href = url;
  }
}

/**
 * Navigate to a new URL replacing the current history entry
 */
export function navigateToReplace(url: string): void {
  if (isBrowser()) {
    window.location.replace(url);
  }
}
