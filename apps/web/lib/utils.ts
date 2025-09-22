import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ProjectId } from "@/lib/types"
import { INBOX_PROJECT_ID } from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get contrasting text color for a background color
 * @param backgroundColor - Hex color string (e.g., "#ff0000")
 * @returns "black" or "white" based on contrast ratio
 */
export function getContrastColor(backgroundColor: string): string {
  // Remove the hash if present
  const color = backgroundColor.replace("#", "")

  // Convert to RGB
  const r = parseInt(color.slice(0, 2), 16)
  const g = parseInt(color.slice(2, 4), 16)
  const b = parseInt(color.slice(4, 6), 16)

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Return black for light backgrounds, white for dark
  return luminance > 0.5 ? "black" : "white"
}

/**
 * Check if a task is in the inbox (either no projectId or explicitly set to INBOX_PROJECT_ID)
 * @param projectId - The project ID to check (can be null/undefined)
 * @returns true if the task is considered to be in the inbox
 */
export function isTaskInInbox(projectId: ProjectId | null | undefined): boolean {
  return !projectId || projectId === INBOX_PROJECT_ID
}

/**
 * Maximum safe delay for setTimeout in milliseconds (2^31 - 1)
 * Values above this may cause unpredictable behavior in setTimeout
 */
const MAX_SAFE_TIMEOUT_DELAY = 2_147_483_647

/**
 * Safe wrapper around setTimeout that validates the delay value
 *
 * @param callback - Function to execute after the delay
 * @param delay - Time in milliseconds to wait before executing the callback
 * @returns Timer ID that can be used with clearTimeout
 * @throws Error if delay exceeds the maximum safe value
 */
export function safeSetTimeout(callback: () => void, delay: number): NodeJS.Timeout {
  if (delay > MAX_SAFE_TIMEOUT_DELAY) {
    throw new Error(
      `setTimeout delay of ${delay}ms exceeds maximum safe value of ${MAX_SAFE_TIMEOUT_DELAY}ms. ` +
        "Consider using a different approach for long delays.",
    )
  }

  if (delay < 0) {
    throw new Error(`setTimeout delay cannot be negative: ${delay}ms`)
  }

  return setTimeout(callback, delay)
}

/**
 * Maximum safe delay constant for external use
 */
export { MAX_SAFE_TIMEOUT_DELAY }
