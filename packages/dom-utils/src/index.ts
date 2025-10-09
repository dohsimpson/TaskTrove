/**
 * DOM utilities for TaskTrove
 * Browser-specific utilities that require DOM environment
 */

export * from "./audio";
export * from "./toast";
export * from "./notifications";
export * from "./keyboard";
export * from "./type-safe-dom";
export * from "./pwa";
export * from "./drag-and-drop";
export * from "./browser";

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
export { showPWAInstallPrompt, isPWA } from "./pwa";
export {
  extractDropPayload,
  calculateInsertIndex,
  reorderItems,
} from "./drag-and-drop";
export type { DropPayload } from "./drag-and-drop";
