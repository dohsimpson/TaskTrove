/**
 * Default values used throughout the application
 */

import type { Subtask, TaskComment, LabelId } from "../types"

// =============================================================================
// DEFAULT/MOCK UUID
// =============================================================================

/** Default UUID used for mock/default IDs throughout the application */
export const DEFAULT_UUID = "00000000-0000-0000-0000-000000000000"

// =============================================================================
// TASK DEFAULTS
// =============================================================================

/** Default priority for new tasks (4 = lowest priority) */
export const DEFAULT_TASK_PRIORITY = 4 as const

/** Default title for new tasks */
export const DEFAULT_TASK_TITLE = "Untitled Task"

/** Default completed status for new tasks */
export const DEFAULT_TASK_COMPLETED = false

/** Default task status */
export const DEFAULT_TASK_STATUS = "active" as const

/** Default empty arrays for task properties */
export const DEFAULT_TASK_LABELS: LabelId[] = []
export const DEFAULT_TASK_SUBTASKS: Subtask[] = []
export const DEFAULT_TASK_COMMENTS: TaskComment[] = []
export const DEFAULT_TASK_ATTACHMENTS: string[] = []

/** Default recurring mode */
export const DEFAULT_RECURRING_MODE = "dueDate"

// =============================================================================
// PROJECT DEFAULTS
// =============================================================================

/** Default inbox project name */
export const DEFAULT_INBOX_NAME = "Inbox"

/** Default inbox project color */
export const DEFAULT_INBOX_COLOR = "#6b7280"

/** Default section name for projects */
export const DEFAULT_SECTION_NAME = "Default"

/** Default section color for projects */
export const DEFAULT_SECTION_COLOR = "#6b7280"

/** Default project shared status */
export const DEFAULT_PROJECT_SHARED = false

// =============================================================================
// VIEW STATE DEFAULTS
// =============================================================================

/** Default view mode */
export const DEFAULT_VIEW_MODE = "list" as const

/** Default sort by field */
export const DEFAULT_SORT_BY = "default" as const

/** Default sort direction */
export const DEFAULT_SORT_DIRECTION = "asc" as const

/** Default show completed tasks */
export const DEFAULT_SHOW_COMPLETED = false

/** Default show side panel */
export const DEFAULT_SHOW_SIDE_PANEL = false

/** Default compact view */
export const DEFAULT_COMPACT_VIEW = false

/** Default search query */
export const DEFAULT_SEARCH_QUERY = ""

/** Default active filters */
export const DEFAULT_ACTIVE_FILTERS = {
  labels: [],
}

// =============================================================================
// AUDIO/SOUND DEFAULTS
// =============================================================================

/** Default sound enabled state */
export const DEFAULT_SOUND_ENABLED = true

/** Default sound volume (0-1) */
export const DEFAULT_SOUND_VOLUME = 0.3

/** Default notification volume (0-100) */
export const DEFAULT_NOTIFICATION_VOLUME = 70

// =============================================================================
// NAVIGATION DEFAULTS
// =============================================================================

/** Default route for the application */
export const DEFAULT_ROUTE = "/all" as const

// =============================================================================
// HISTORY DEFAULTS
// =============================================================================

/** Default history limit for projects */
export const DEFAULT_PROJECTS_HISTORY_LIMIT = 30

// =============================================================================
// ANALYTICS DEFAULTS
// =============================================================================

/** Default days for month analytics */
export const DEFAULT_ANALYTICS_MONTH_DAYS = 30

/** Default days for week analytics */
export const DEFAULT_ANALYTICS_WEEK_DAYS = 7

// =============================================================================
// UI COMPONENT DEFAULTS
// =============================================================================

/** Default debounce delay in milliseconds */
export const DEFAULT_DEBOUNCE_DELAY = 300

/** Default button variant */
export const DEFAULT_BUTTON_VARIANT = "default" as const

// =============================================================================
// COLOR PALETTE DEFAULTS
// =============================================================================

/** Default color palette for projects and labels */
export const DEFAULT_COLOR_PALETTE = [
  "#ef4444", // red
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#f97316", // orange
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#ec4899", // pink
  "#6366f1", // indigo
] as const

/** Default project colors (subset of main palette) */
export const DEFAULT_PROJECT_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#f97316", // orange
  "#06b6d4", // cyan
  "#84cc16", // lime
] as const

/** Default label colors (same as projects) */
export const DEFAULT_LABEL_COLORS = DEFAULT_PROJECT_COLORS

/** Default section colors (same as projects) */
export const DEFAULT_SECTION_COLORS = DEFAULT_PROJECT_COLORS

/** Color options with names for UI components */
export const COLOR_OPTIONS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Red", value: "#ef4444" },
  { name: "Green", value: "#10b981" },
  { name: "Yellow", value: "#f59e0b" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Orange", value: "#f97316" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Lime", value: "#84cc16" },
  { name: "Pink", value: "#ec4899" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Gray", value: "#6b7280" },
] as const

// =============================================================================
// TEXT PLACEHOLDERS
// =============================================================================

/** Placeholder text for task input */
export const PLACEHOLDER_TASK_INPUT = "What needs to be done?"

/** Placeholder text for project name */
export const PLACEHOLDER_PROJECT_NAME = "Enter project name"

/** Placeholder text for label name */
export const PLACEHOLDER_LABEL_NAME = "Enter label name"

/** Placeholder text for task description */
export const PLACEHOLDER_TASK_DESCRIPTION = "Add description..."

/** Placeholder text for search input */
export const PLACEHOLDER_SEARCH = "Search tasks..."

// =============================================================================
// FILE PATHS
// =============================================================================

/** Default data directory path */
export const DEFAULT_DATA_DIR = "data"

/** Default backup directory path */
export const DEFAULT_BACKUP_DIR = "backups"

// =============================================================================
// BACKUP DEFAULTS
// =============================================================================

/** Default auto backup enabled state */
export const DEFAULT_AUTO_BACKUP_ENABLED = false

/** Default backup time in HH:MM format (24-hour) */
export const DEFAULT_BACKUP_TIME = "02:00"

/** Default maximum number of backup files to keep (-1 for unlimited) */
export const DEFAULT_MAX_BACKUPS = -1

/** Default data file path */
export const DEFAULT_DATA_FILE_PATH = "data/data.json"

// =============================================================================
// MIGRATION DEFAULTS
// =============================================================================

/** Default project color for migration */
export const MIGRATION_DEFAULT_PROJECT_COLOR = "#3b82f6"

/** Default label color for migration */
export const MIGRATION_DEFAULT_LABEL_COLOR = "#6b7280"

// =============================================================================
// IMPORT DEFAULTS
// =============================================================================

/** Supported import sources for task management services */
export const SUPPORTED_IMPORT_SOURCES = ["ticktick", "todoist", "asana", "trello"] as const

/** Type for supported import sources */
export type SupportedImportSource = (typeof SUPPORTED_IMPORT_SOURCES)[number]
