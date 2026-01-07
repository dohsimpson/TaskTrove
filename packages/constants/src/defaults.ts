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

/** Default archived status for new tasks */
export const DEFAULT_TASK_ARCHIVED = false;

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

/** Default show archived tasks */
export const DEFAULT_SHOW_ARCHIVED = false;

/** Default show overdue tasks */
export const DEFAULT_SHOW_OVERDUE = true;

/** Default show side panel */
export const DEFAULT_SHOW_SIDE_PANEL = false;

/** Default show planner pane */
export const DEFAULT_SHOW_PLANNER = false;

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

/** Primary app sidebar width constraints (pixels) */
export const SIDEBAR_WIDTH_PX_MIN = 250;
export const SIDEBAR_WIDTH_PX_MAX = 480;
export const SIDEBAR_WIDTH_PX_DEFAULT = 300;

// =============================================================================
// AUDIO/SOUND DEFAULTS
// =============================================================================

/** Default sound enabled state */
export const DEFAULT_SOUND_ENABLED = true;

/** Default sound volume (0-1) */
export const DEFAULT_SOUND_VOLUME = 0.05;

/** Default notification volume (0-100) */
export const DEFAULT_NOTIFICATION_VOLUME = 5;

// =============================================================================
// NAVIGATION DEFAULTS
// =============================================================================

/** Default view id for the application */
export const DEFAULT_VIEW_ID = "inbox" as const;

/** Default route for the application (derived from DEFAULT_VIEW_ID) */
export const DEFAULT_ROUTE = `/${DEFAULT_VIEW_ID}` as const;

// =============================================================================
// STANDARD VIEW DEFINITIONS
// =============================================================================

/** Standard view identifiers used throughout the application */
export const STANDARD_VIEW_IDS = [
  "inbox",
  "today",
  "upcoming",
  "habits",
  "calendar",
  "recent",
  "all",
  "completed",
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
    description: "See every task across all projects and labels in one view",
    iconType: "all" as const,
  },
  inbox: {
    title: "Inbox",
    description: "Capture new tasks that don't have a home yet",
    iconType: "inbox" as const,
  },
  today: {
    title: "Today's Tasks",
    description: "Keep up with everything scheduled for today",
    iconType: "today" as const,
  },
  upcoming: {
    title: "Upcoming",
    description: "Plan ahead with tasks scheduled for future dates",
    iconType: "upcoming" as const,
  },
  recent: {
    title: "Recent",
    description: "Review tasks created or completed in the last few days",
    iconType: "recent" as const,
  },
  completed: {
    title: "Completed",
    description: "Celebrate progress with tasks you've finished",
    iconType: "completed" as const,
  },
  calendar: {
    title: "Calendar",
    description: "Visualize tasks with due dates on a calendar",
    iconType: "calendar" as const,
  },
  habits: {
    title: "Habits",
    description: "Track repeating tasks and routines that auto-rollover",
    iconType: "habits" as const,
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
    description: "Browse all projects and jump into dedicated views",
    iconType: "projects" as const,
  },
  labels: {
    title: "Labels",
    description: "Organize and filter tasks with custom labels",
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
  recent: {
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
// RECENT VIEW DEFAULTS
// =============================================================================

/** Default lookback window in days for the Recent view */
export const DEFAULT_RECENT_VIEW_DAYS = 7;

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

/** Default color palette for projects and labels (name → hex) */
export const DEFAULT_COLOR_PALETTE_MAP = {
  Blue: "#3b82f6",
  Red: "#ef4444",
  Green: "#10b981",
  Yellow: "#f59e0b",
  Purple: "#8b5cf6",
  Orange: "#f97316",
  Cyan: "#06b6d4",
  Lime: "#84cc16",
  Pink: "#ec4899",
  Indigo: "#6366f1",
  Gray: "#6b7280",
} as const;

export type DefaultColorName = keyof typeof DEFAULT_COLOR_PALETTE_MAP;

/** Ordered palette values derived from the map (preserves declaration order) */
export const DEFAULT_COLOR_PALETTE = [
  DEFAULT_COLOR_PALETTE_MAP.Blue,
  DEFAULT_COLOR_PALETTE_MAP.Red,
  DEFAULT_COLOR_PALETTE_MAP.Green,
  DEFAULT_COLOR_PALETTE_MAP.Yellow,
  DEFAULT_COLOR_PALETTE_MAP.Purple,
  DEFAULT_COLOR_PALETTE_MAP.Orange,
  DEFAULT_COLOR_PALETTE_MAP.Cyan,
  DEFAULT_COLOR_PALETTE_MAP.Lime,
  DEFAULT_COLOR_PALETTE_MAP.Pink,
  DEFAULT_COLOR_PALETTE_MAP.Indigo,
  DEFAULT_COLOR_PALETTE_MAP.Gray,
] as const;

/** Default project colors (use the full palette) */
export const DEFAULT_PROJECT_COLORS = DEFAULT_COLOR_PALETTE;

/** Default label colors (same as projects) */
export const DEFAULT_LABEL_COLORS = DEFAULT_PROJECT_COLORS;

/** Default section colors (same as projects) */
export const DEFAULT_SECTION_COLORS = DEFAULT_PROJECT_COLORS;

/** Color options with names for UI components (guaranteed non-empty tuple) */
type ColorOption = {
  name: DefaultColorName;
  value: (typeof DEFAULT_COLOR_PALETTE_MAP)[DefaultColorName];
};

export const COLOR_OPTIONS = [
  { name: "Blue", value: DEFAULT_COLOR_PALETTE_MAP.Blue },
  { name: "Red", value: DEFAULT_COLOR_PALETTE_MAP.Red },
  { name: "Green", value: DEFAULT_COLOR_PALETTE_MAP.Green },
  { name: "Yellow", value: DEFAULT_COLOR_PALETTE_MAP.Yellow },
  { name: "Purple", value: DEFAULT_COLOR_PALETTE_MAP.Purple },
  { name: "Orange", value: DEFAULT_COLOR_PALETTE_MAP.Orange },
  { name: "Cyan", value: DEFAULT_COLOR_PALETTE_MAP.Cyan },
  { name: "Lime", value: DEFAULT_COLOR_PALETTE_MAP.Lime },
  { name: "Pink", value: DEFAULT_COLOR_PALETTE_MAP.Pink },
  { name: "Indigo", value: DEFAULT_COLOR_PALETTE_MAP.Indigo },
  { name: "Gray", value: DEFAULT_COLOR_PALETTE_MAP.Gray },
] as const satisfies readonly [ColorOption, ...ColorOption[]];

/** Pick a random color from a given palette (defaults to the core palette) */
export function getRandomPaletteColor(
  palette: readonly string[] = DEFAULT_COLOR_PALETTE,
): string {
  if (palette.length === 0) {
    return "#6b7280"; // fallback to gray
  } else {
    const idx = Math.floor(Math.random() * palette.length);
    return palette[idx] || "#6b7280";
  }
}

// =============================================================================
// SEMANTIC COLOR CONSTANTS - TIER 2
// =============================================================================

/**
 * Semantic color constants that reference the core palette (DEFAULT_COLOR_PALETTE).
 * This ensures single source of truth and makes global color changes easier.
 *
 * Architecture:
 * - TIER 1: DEFAULT_COLOR_PALETTE (core) - foundational 10 colors
 * - TIER 2: Semantic constants below - reference Tier 1 by index
 * - TIER 3: GRAY_COLORS - neutral colors
 * - TIER 4: IMPORT_PRIORITY_COLORS - external system mapping
 * - TIER 5: THEME_COLORS - brand/PWA specific
 */

/** Chart colors for productivity metrics - references core palette */
export const CHART_COLORS = {
  /** Tasks completed metric (emerald) */
  completed: DEFAULT_COLOR_PALETTE[4],
  /** Tasks created metric (blue) */
  created: DEFAULT_COLOR_PALETTE[2],
  /** Focus time metric (amber) */
  focusTime: DEFAULT_COLOR_PALETTE[1],
  /** Productivity score metric (violet) */
  productivityScore: DEFAULT_COLOR_PALETTE[3],
  /** Grid line color for charts (gray-200 - unique) */
  gridLine: "#e5e7eb",
} as const;

/** UI state and status indicator colors - references core palette */
export const UI_STATE_COLORS = {
  /** Error/alert state (pure red - unique for visibility) */
  error: "#ff0000",
  /** Warning state (amber) */
  warning: DEFAULT_COLOR_PALETTE[1],
  /** Success/completed state (emerald) */
  success: DEFAULT_COLOR_PALETTE[4],
  /** Info/informational state (blue) */
  info: DEFAULT_COLOR_PALETTE[2],
} as const;

// =============================================================================
// GRAY/NEUTRAL COLORS - TIER 3
// =============================================================================

/** Consolidated neutral/gray colors for consistent use */
export const GRAY_COLORS = {
  /** Default gray for fallbacks and neutral elements (gray-500) */
  default: "#6b7280",
  /** Light gray for subtle backgrounds and borders (gray-200) */
  light: "#e5e7eb",
} as const;

// =============================================================================
// IMPORT/PARSER COLORS - TIER 4
// =============================================================================

/**
 * Priority color mapping for external task imports (Todoist, TickTick, etc.)
 * Uses darker shade variants to distinguish from core palette and preserve
 * source system semantics during import.
 */
export const IMPORT_PRIORITY_COLORS = {
  /** High priority (red-600) - darker than core red for visual distinction */
  1: "#dc2626",
  /** Medium-high priority (orange-600) */
  2: "#ea580c",
  /** Medium priority (amber-600) */
  3: "#d97706",
  /** Low/no priority (gray-500) */
  4: "#6b7280",
} as const;

// =============================================================================
// THEME & BRAND COLORS - TIER 5
// =============================================================================

/** Application theme colors for PWA manifest and branding */
export const THEME_COLORS = {
  /** PWA manifest background color (dark) */
  pwaBackground: "#1b1b1b",
  /** PWA manifest theme color (dark) */
  pwaTheme: "#1b1b1b",
  /** Navigation user icon fill color (near-black) */
  navIconFill: "#1f1f1f",
} as const;

// =============================================================================
// FALLBACK COLORS
// =============================================================================

/** Fallback color for entities without a specific color (gray-500) */
export const FALLBACK_COLOR = GRAY_COLORS.default;

// =============================================================================
// TEXT PLACEHOLDERS
// =============================================================================

/** Placeholder text for task input */
export const PLACEHOLDER_TASK_INPUT = "Task name";

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

/** Default auto backup run-on-init behavior */
export const DEFAULT_AUTO_BACKUP_RUN_ON_INIT = false;

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

/**
 * Avatar validation constants for TaskTrove applications
 */

/**
 * Supported image MIME types for avatars
 */
export const SUPPORTED_AVATAR_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
] as const;

/**
 * Regular expression to validate base64 encoded image data URLs
 */
export const AVATAR_DATA_URL_REGEX =
  /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/]+=*$/;

/**
 * Type for supported avatar MIME types
 */
export type SupportedAvatarMimeType =
  (typeof SUPPORTED_AVATAR_MIME_TYPES)[number];

// =============================================================================
// THEME CONSTANTS
// =============================================================================

/**
 * Base theme names for the application (base version only has default)
 */
export const BASE_THEME_OPTIONS = ["default"] as const;

/**
 * Available theme options for the application
 */
export const THEME_OPTIONS = BASE_THEME_OPTIONS;

export type Theme = (typeof THEME_OPTIONS)[number];

/**
 * Default theme values
 */
export const DEFAULT_THEME: Theme = "default";

/**
 * Theme display names for UI
 */
export const THEME_DISPLAY_NAMES = {
  default: "Default",
} as const satisfies Record<Theme, string>;

/**
 * Theme descriptions for UI (shown in settings)
 */
export const THEME_DESCRIPTIONS = {
  default: "Default theme",
} as const satisfies Record<Theme, string>;
