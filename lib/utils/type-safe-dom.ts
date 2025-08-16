/**
 * Type-safe DOM utilities to replace type assertions
 */

/**
 * Safely get an HTMLElement of a specific type
 */
export function getTypedElement<T extends HTMLElement>(
  element: Element | null,
  elementType: new () => T,
): T | null {
  return element instanceof elementType ? element : null
}

/**
 * Safely get an HTMLInputElement
 */
export function getInputElement(element: Element | null): HTMLInputElement | null {
  return getTypedElement(element, HTMLInputElement)
}

/**
 * Safely get an HTMLSelectElement
 */
export function getSelectElement(element: Element | null): HTMLSelectElement | null {
  return getTypedElement(element, HTMLSelectElement)
}

/**
 * Safely get an HTMLTextAreaElement
 */
export function getTextAreaElement(element: Element | null): HTMLTextAreaElement | null {
  return getTypedElement(element, HTMLTextAreaElement)
}

/**
 * Safely get an HTMLButtonElement
 */
export function getButtonElement(element: Element | null): HTMLButtonElement | null {
  return getTypedElement(element, HTMLButtonElement)
}

/**
 * Safely get an HTMLDivElement
 */
export function getDivElement(element: Element | null): HTMLDivElement | null {
  return getTypedElement(element, HTMLDivElement)
}

/**
 * Create a typed event handler for keyboard events
 */
export function createKeyboardEventHandler(handler: (event: KeyboardEvent) => void) {
  return (event: Event) => {
    if (event instanceof KeyboardEvent) {
      handler(event)
    }
  }
}

/**
 * Create a typed event handler for mouse events
 */
export function createMouseEventHandler(handler: (event: MouseEvent) => void) {
  return (event: Event) => {
    if (event instanceof MouseEvent) {
      handler(event)
    }
  }
}

/**
 * Create a typed event handler for touch events
 */
export function createTouchEventHandler(handler: (event: TouchEvent) => void) {
  return (event: Event) => {
    if (event instanceof TouchEvent) {
      handler(event)
    }
  }
}

/**
 * Safely cast unknown data to a known type using runtime validation
 */
export function safeCast<T>(data: unknown, validator: (data: unknown) => data is T): T | null {
  return validator(data) ? data : null
}
