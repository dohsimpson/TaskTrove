/**
 * Re-export all types from @tasktrove/types package
 * This maintains backward compatibility for existing imports
 */

// Core types and schemas
export * from "@tasktrove/types/core"
export * from "@tasktrove/types/id"
// Note: Don't export * from constants due to ViewId/StandardViewId conflicts with id
// If you need specific exports from constants, import them directly from @tasktrove/types/constants
export * from "@tasktrove/types/defaults"
export * from "@tasktrove/types/analytics"
export * from "@tasktrove/types/group"
export * from "@tasktrove/types/settings"
export * from "@tasktrove/types/team"
export * from "@tasktrove/types/notifications"
export * from "@tasktrove/types/voice-commands"
export * from "@tasktrove/types/validators"
export * from "@tasktrove/types/api-errors"
export * from "@tasktrove/types/api-requests"
export * from "@tasktrove/types/api-responses"
export * from "@tasktrove/types/data-file"
export * from "@tasktrove/types/serialization"

// Selective exports to avoid conflicts
export type { SortConfig, TimePeriod } from "@tasktrove/types/utils"
export type { Json } from "@tasktrove/types/constants"
export {
  API_ROUTES,
  INBOX_PROJECT_ID,
  CommonRRules,
  RRuleFrequency,
  RRuleWeekday,
  buildRRule,
  parseRRule,
  JsonSchema,
} from "@tasktrove/types/constants"

// Export data-file items
export { DataFileSchema } from "@tasktrove/types/data-file"

// Export utility functions that need to be re-exported
export { taskToCreateTaskRequest } from "@tasktrove/types/utils"
