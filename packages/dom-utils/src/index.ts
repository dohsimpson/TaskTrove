/**
 * DOM utilities for TaskTrove
 * Browser-specific utilities that require DOM environment
 */

export * from "./audio";
export * from "./toast";
export * from "./notifications";
export * from "./keyboard";
export * from "./type-safe-dom";

// Named exports for convenience
export {
  createKeyboardHandler,
  getKeyboardShortcuts,
  formatKeyboardShortcut,
  shouldIgnoreKeyboardEvent,
  shouldIgnoreNativeKeyboardEvent,
} from "./keyboard";
export type { KeyboardHandlerOptions } from "./keyboard";
export {
  getTypedElement,
  getInputElement,
  getSelectElement,
  getTextAreaElement,
  getButtonElement,
  getDivElement,
  createKeyboardEventHandler,
  createMouseEventHandler,
  createTouchEventHandler,
  safeCast,
} from "./type-safe-dom";
