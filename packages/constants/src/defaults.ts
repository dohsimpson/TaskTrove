/**
 * Default values used throughout the application
 */

// =============================================================================
// DEFAULT/MOCK UUID
// =============================================================================

/** Default UUID used for mock/default IDs throughout the application */
export const DEFAULT_UUID = "00000000-0000-0000-0000-000000000000";

// =============================================================================
// TASK DEFAULTS
// =============================================================================

/** Default priority for new tasks (4 = lowest priority) */
export const DEFAULT_TASK_PRIORITY = 4 as const;

/** Default title for new tasks */
export const DEFAULT_TASK_TITLE = "Untitled Task";

/** Default completed status for new tasks */
export const DEFAULT_TASK_COMPLETED = false;

/** Default task status */
export const DEFAULT_TASK_STATUS = "active" as const;

/** Default empty arrays for task properties */
export const DEFAULT_TASK_LABELS = [];
export const DEFAULT_TASK_SUBTASKS = [];
export const DEFAULT_TASK_COMMENTS = [];
export const DEFAULT_TASK_ATTACHMENTS = [];

/** Default recurring mode */
export const DEFAULT_RECURRING_MODE = "dueDate";

// =============================================================================
// PROJECT DEFAULTS
// =============================================================================

/** Default inbox project name */
export const DEFAULT_INBOX_NAME = "Inbox";

/** Default inbox project color */
export const DEFAULT_INBOX_COLOR = "#6b7280";

/** Default section name for projects */
export const DEFAULT_SECTION_NAME = "Default";

/** Default section color for projects */
export const DEFAULT_SECTION_COLOR = "#6b7280";

/** Default section color for groups */
export const DEFAULT_GROUP_COLOR = "#6b7280";

// =============================================================================
// VIEW STATE DEFAULTS
// =============================================================================

/** Default view mode */
export const DEFAULT_VIEW_MODE = "list" as const;

/** Default sort by field */
export const DEFAULT_SORT_BY = "default" as const;

/** Default sort direction */
export const DEFAULT_SORT_DIRECTION = "asc" as const;

/** Default show completed tasks */
export const DEFAULT_SHOW_COMPLETED = false;

/** Default show overdue tasks */
export const DEFAULT_SHOW_OVERDUE = true;

/** Default show side panel */
export const DEFAULT_SHOW_SIDE_PANEL = false;

/** Default compact view */
export const DEFAULT_COMPACT_VIEW = false;

/** Default search query */
export const DEFAULT_SEARCH_QUERY = "";

/** Default active filters */
export const DEFAULT_ACTIVE_FILTERS = {
  labels: [],
};

/** Side panel width constraints (percentages) */
export const SIDE_PANEL_WIDTH_MIN = 20;
export const SIDE_PANEL_WIDTH_MAX = 80;
export const SIDE_PANEL_WIDTH_DEFAULT = 25;

// =============================================================================
// AUDIO/SOUND DEFAULTS
// =============================================================================

/** Default sound enabled state */
export const DEFAULT_SOUND_ENABLED = true;

/** Default sound volume (0-1) */
export const DEFAULT_SOUND_VOLUME = 0.3;

/** Default notification volume (0-100) */
export const DEFAULT_NOTIFICATION_VOLUME = 70;

// =============================================================================
// NAVIGATION DEFAULTS
// =============================================================================

/** Default route for the application */
export const DEFAULT_ROUTE = "/all" as const;

// =============================================================================
// STANDARD VIEW DEFINITIONS
// =============================================================================

/** Standard view identifiers used throughout the application */
export const STANDARD_VIEW_IDS = [
  "all",
  "inbox",
  "today",
  "upcoming",
  "completed",
  "calendar",
  // "analytics",
  // "search",
  // "shortcuts",
  // "profile",
  // "debug",
  // "filters",
  "projects",
  "labels",
  "not-found",
] as const;

/** Standard view metadata for UI display */
export const STANDARD_VIEW_METADATA: Record<
  (typeof STANDARD_VIEW_IDS)[number],
  {
    title: string;
    description: string;
    iconType: string;
  }
> = {
  all: {
    title: "All Tasks",
    description: "View all your tasks in one place",
    iconType: "all" as const,
  },
  inbox: {
    title: "Inbox",
    description: "Start with unorganized tasks",
    iconType: "inbox" as const,
  },
  today: {
    title: "Today",
    description: "Focus on today's tasks",
    iconType: "today" as const,
  },
  upcoming: {
    title: "Upcoming",
    description: "See what's coming up next",
    iconType: "upcoming" as const,
  },
  completed: {
    title: "Completed",
    description: "Review completed tasks",
    iconType: "completed" as const,
  },
  calendar: {
    title: "Calendar",
    description: "View tasks in calendar format",
    iconType: "calendar" as const,
  },
  // analytics: {
  //   title: "Analytics",
  //   description: "Start with productivity insights",
  //   iconType: "analytics" as const,
  // },
  // search: {
  //   title: "Search",
  //   description: "Begin by searching tasks",
  //   iconType: "search" as const,
  // },
  // shortcuts: {
  //   title: "Shortcuts",
  //   description: "Keyboard shortcuts and quick actions",
  //   iconType: "shortcuts" as const,
  // },
  // profile: {
  //   title: "Profile",
  //   description: "User profile and account settings",
  //   iconType: "profile" as const,
  // },
  // debug: {
  //   title: "Debug",
  //   description: "Development and debugging tools",
  //   iconType: "debug" as const,
  // },
  // filters: {
  //   title: "Filters",
  //   description: "Advanced task filtering options",
  //   iconType: "filters" as const,
  // },
  projects: {
    title: "Projects",
    description: "Manage and organize projects",
    iconType: "projects" as const,
  },
  labels: {
    title: "Labels",
    description: "Organize tasks with labels",
    iconType: "labels" as const,
  },
  "not-found": {
    title: "Not Found",
    description: "The requested resource could not be found",
    iconType: "error" as const,
  },
} as const;

/** Additional start view options for settings */
export const START_VIEW_METADATA = {
  ...STANDARD_VIEW_METADATA,
  lastViewed: {
    title: "Last Viewed",
    description: "Return to your last active page",
    iconType: "lastViewed" as const,
  },
} as const;

/** View configuration options for UI components */
export const VIEW_CONFIG_OPTIONS = {
  today: {
    calendarDisabled: true,
    showCompletedDisabled: false,
  },
  inbox: {
    calendarDisabled: false,
    showCompletedDisabled: false,
  },
  upcoming: {
    calendarDisabled: false,
    showCompletedDisabled: false,
  },
  completed: {
    calendarDisabled: false,
    showCompletedDisabled: true,
  },
  all: {
    calendarDisabled: false,
    showCompletedDisabled: false,
  },
  calendar: {
    calendarDisabled: true,
    showCompletedDisabled: false,
  },
} as const;

// =============================================================================
// HISTORY DEFAULTS
// =============================================================================

/** Default history limit for projects */
export const DEFAULT_PROJECTS_HISTORY_LIMIT = 30;

// =============================================================================
// ANALYTICS DEFAULTS
// =============================================================================

/** Default days for month analytics */
export const DEFAULT_ANALYTICS_MONTH_DAYS = 30;

/** Default days for week analytics */
export const DEFAULT_ANALYTICS_WEEK_DAYS = 7;

// =============================================================================
// UI COMPONENT DEFAULTS
// =============================================================================

/** Default debounce delay in milliseconds */
export const DEFAULT_DEBOUNCE_DELAY = 300;

/** Default button variant */
export const DEFAULT_BUTTON_VARIANT = "default" as const;

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
] as const;

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
] as const;

/** Default label colors (same as projects) */
export const DEFAULT_LABEL_COLORS = DEFAULT_PROJECT_COLORS;

/** Default section colors (same as projects) */
export const DEFAULT_SECTION_COLORS = DEFAULT_PROJECT_COLORS;

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
] as const;

// =============================================================================
// TEXT PLACEHOLDERS
// =============================================================================

/** Placeholder text for task input */
export const PLACEHOLDER_TASK_INPUT = "What needs to be done?";

/** Placeholder text for project name */
export const PLACEHOLDER_PROJECT_NAME = "Enter project name";

/** Placeholder text for label name */
export const PLACEHOLDER_LABEL_NAME = "Enter label name";

/** Placeholder text for task description */
export const PLACEHOLDER_TASK_DESCRIPTION = "Add description...";

/** Placeholder text for search input */
export const PLACEHOLDER_SEARCH = "Search tasks...";

// =============================================================================
// FILE PATHS
// =============================================================================

/** Default data directory path */
export const DEFAULT_DATA_DIR = "data";

/** Default backup directory path */
export const DEFAULT_BACKUP_DIR = "backups";

/** Default assets directory path (within data directory) */
export const DEFAULT_ASSETS_DIR = "assets";

/** Default avatar directory path (within assets directory) */
export const DEFAULT_AVATAR_DIR = `${DEFAULT_ASSETS_DIR}/avatar`;

// =============================================================================
// API/QUERY DEFAULTS
// =============================================================================

/**
 * Individual resource query keys for granular cache management.
 * Each resource has its own query key following the hierarchical pattern ["data", "resource"].
 * This enables precise cache invalidation and optimistic updates per resource type.
 */

/** Query key for tasks data */
export const TASKS_QUERY_KEY = ["data", "tasks"] as const;

/** Query key for projects data */
export const PROJECTS_QUERY_KEY = ["data", "projects"] as const;

/** Query key for labels data */
export const LABELS_QUERY_KEY = ["data", "labels"] as const;

/** Query key for groups data (both project and label groups) */
export const GROUPS_QUERY_KEY = ["data", "groups"] as const;

/** Query key for settings data */
export const SETTINGS_QUERY_KEY = ["data", "settings"] as const;

/** Query key for user data */
export const USER_QUERY_KEY = ["data", "user"] as const;

/**
 * Parent query key for invalidating all data queries at once.
 * Use this when you need to invalidate all resource queries simultaneously.
 * Due to TanStack Query's hierarchical invalidation, this will match all ["data", *] keys.
 */
export const DATA_QUERY_KEY = ["data"] as const;

// =============================================================================
// BACKUP DEFAULTS
// =============================================================================

/** Default auto backup enabled state */
export const DEFAULT_AUTO_BACKUP_ENABLED = false;

/** Default backup time in HH:MM format (24-hour) */
export const DEFAULT_BACKUP_TIME = "02:00";

/** Default maximum number of backup files to keep (-1 for unlimited) */
export const DEFAULT_MAX_BACKUPS = -1;

/** Default data file path */
export const DEFAULT_DATA_FILE_PATH = "data/data.json";

// =============================================================================
// MIGRATION DEFAULTS
// =============================================================================

/** Default project color for migration */
export const MIGRATION_DEFAULT_PROJECT_COLOR = "#3b82f6";

/** Default label color for migration */
export const MIGRATION_DEFAULT_LABEL_COLOR = "#6b7280";

// =============================================================================
// IMPORT DEFAULTS
// =============================================================================

/** Supported import sources for task management services */
export const SUPPORTED_IMPORT_SOURCES = [
  "ticktick",
  "todoist",
  "asana",
  "trello",
] as const;

/** Type for supported import sources */
export type SupportedImportSource = (typeof SUPPORTED_IMPORT_SOURCES)[number];
