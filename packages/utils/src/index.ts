/**
 * @tasktrove/utils - Shared utilities for TaskTrove applications
 *
 * Environment-agnostic utilities that work across CLI, mobile, desktop, and web platforms.
 * All utilities in this package are pure functions with no environment dependencies.
 */

// Core styling utilities
export * from "./styling";

// File utilities
export * from "./file";

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

// Encryption utilities
export * from "./encryption";

// Color utilities
export * from "./color-utils";

// Date filter utilities
export * from "./date-filter-utils";

// Task date formatter utilities
export * from "./task-date-formatter";

// Re-export commonly used utilities for convenience
export { cn } from "./styling";
export {
  encodeFileToBase64,
  encodeFileToDataUrl,
  AVATAR_DATA_URL_REGEX,
  SUPPORTED_AVATAR_MIME_TYPES,
  isValidAvatarDataUrl,
  parseAvatarDataUrl,
  isSupportedAvatarMimeType,
} from "./file";
export { getContrastColor } from "./color";
export { safeSetTimeout, MAX_SAFE_TIMEOUT_DELAY } from "./time";
export { formatTime, getEffectiveEstimation } from "./time-estimation";
export {
  shouldTaskBeInInbox,
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
  getPriorityBackgroundColor,
  getDateDisplay,
  getRecurringDisplay,
  getTimeDisplay,
  getDurationDisplay,
  DATE_SUGGESTIONS,
  TIME_SUGGESTIONS,
} from "./parser";
export { saltAndHashPassword, verifyPassword } from "./encryption";
export {
  getPriorityColor,
  getPriorityTextColor,
  getPriorityLabel,
  getDueDateTextColor,
  getScheduleIcons,
} from "./color-utils";
export {
  getDateRangeForPreset,
  matchesDueDateFilter,
  getPresetLabel,
  getCustomRangeLabel,
  getPresetTaskCounts,
} from "./date-filter-utils";
export type { DueDatePreset, DateRange } from "./date-filter-utils";
export {
  formatTaskDateTime,
  formatTimeShort,
  formatTaskDateTimeBadge,
  isTaskOverdue,
  getTaskDueDateStatus,
} from "./task-date-formatter";
export type {
  TaskDateFormat,
  TaskDateFormatOptions,
} from "./task-date-formatter";
