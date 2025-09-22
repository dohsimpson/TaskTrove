/**
 * @tasktrove/utils - Shared utilities for TaskTrove applications
 *
 * Environment-agnostic utilities that work across CLI, mobile, desktop, and web platforms.
 * All utilities in this package are pure functions with no environment dependencies.
 */

// Core styling utilities
export * from "./styling";

// Color utilities
export * from "./color";

// Time utilities
export * from "./time";
export * from "./time-estimation";

// Validation utilities
export * from "./validation";
export * from "./origin-validation";

// Routing utilities
export * from "./routing";

// Group utilities
export * from "./group-utils";

// Natural language parser
export * from "./parser";

// Shared patterns (used by parser for autocomplete/highlighting)
export * from "./shared-patterns";

// Re-export commonly used utilities for convenience
export { cn } from "./styling";
export { getContrastColor } from "./color";
export { safeSetTimeout, MAX_SAFE_TIMEOUT_DELAY } from "./time";
export { formatTime, getEffectiveEstimation } from "./time-estimation";
export {
  isTaskInInbox,
  formatZodErrors,
  normalizeTaskUpdate,
} from "./validation";
export { isValidOrigin } from "./origin-validation";
export {
  createSafeProjectNameSlug,
  createSafeLabelNameSlug,
  resolveProject,
  resolveLabel,
  isValidProjectId,
} from "./routing";
export {
  findGroupById,
  collectProjectIdsFromGroup,
  getAllGroupsFlat,
  resolveGroup,
} from "./group-utils";
export {
  parseEnhancedNaturalLanguage,
  convertToRRule,
  convertTimeToHHMMSS,
  getPriorityDisplay,
  getPriorityColor,
  getDateDisplay,
  getRecurringDisplay,
  getTimeDisplay,
  getDurationDisplay,
  DATE_SUGGESTIONS,
  TIME_SUGGESTIONS,
} from "./parser";
