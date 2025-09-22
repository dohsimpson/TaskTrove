/**
 * Type-safe DOM utility functions for testing
 *
 * Note: These functions have been moved to @/lib/dom-utils for production use.
 * This file now re-exports them for backward compatibility with existing tests.
 */

// Re-export from lib for backward compatibility in tests
export { getTypedElement } from "@/lib/utils/type-safe-dom"

// Add missing functions that were expected but don't exist in type-safe-dom
export function getTypedEventTarget<T extends EventTarget>(
  event: Event,
  targetType: new () => T,
): T | null {
  return event.target instanceof targetType ? event.target : null
}

export function getSafeElement<T extends HTMLElement>(
  selector: string,
  elementType: new () => T,
  container: Document | Element = document,
): T | null {
  const element = container.querySelector(selector)
  return element instanceof elementType ? element : null
}

/**
 * Type-safe element query with guaranteed result (throws if not found)
 * @param selector CSS selector string
 * @param elementType Constructor for the expected element type
 * @param container Optional container element to search within (defaults to document)
 * @returns Typed element (guaranteed to exist)
 * @throws Error if element not found or wrong type
 */
export function getRequiredTypedElement<T extends HTMLElement>(
  selector: string,
  elementType: new () => T,
  container: Document | Element = document,
): T {
  const element = container.querySelector(selector)
  if (element instanceof elementType) {
    return element
  }
  throw new Error(`Required element not found or wrong type: ${selector}`)
}
