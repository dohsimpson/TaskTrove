import type {
  DataFile,
  ProjectGroup,
  LabelGroup,
  ViewState,
  GroupId,
  User,
} from "./index";
import { createGroupId } from "./index";
import {
  DEFAULT_UUID,
  DEFAULT_AUTO_BACKUP_ENABLED,
  DEFAULT_BACKUP_TIME,
  DEFAULT_MAX_BACKUPS,
  DEFAULT_VIEW_MODE,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_DIRECTION,
  DEFAULT_SHOW_COMPLETED,
  DEFAULT_SHOW_OVERDUE,
  DEFAULT_SEARCH_QUERY,
  DEFAULT_SHOW_SIDE_PANEL,
  DEFAULT_COMPACT_VIEW,
  DEFAULT_ACTIVE_FILTERS,
} from "@tasktrove/constants";

/**
 * Default ROOT project group for empty data files
 */
/**
 * Root group ID constants - these are the foundational group IDs that should be used
 * consistently across the entire application for the root project and label groups.
 */
export const ROOT_PROJECT_GROUP_ID: GroupId = createGroupId(DEFAULT_UUID);
export const ROOT_LABEL_GROUP_ID: GroupId = createGroupId(DEFAULT_UUID);

export const DEFAULT_PROJECT_GROUP: ProjectGroup = {
  type: "project",
  id: ROOT_PROJECT_GROUP_ID,
  name: "All Projects",
  slug: "all-projects",
  items: [],
};

/**
 * Default ROOT label group for empty data files
 */
export const DEFAULT_LABEL_GROUP: LabelGroup = {
  type: "label",
  id: ROOT_LABEL_GROUP_ID,
  name: "All Labels",
  slug: "all-labels",
  items: [],
};

/**
 * Default notification settings
 */
export const DEFAULT_NOTIFICATION_SETTINGS = {
  enabled: true,
  requireInteraction: true,
};
export const DEFAULT_GENERAL_SETTINGS = {
  startView: "all" as const, // Corresponds to DEFAULT_ROUTE "/all"
  soundEnabled: true,
  linkifyEnabled: true,
  popoverHoverOpen: false,
} as const;

/**
 * Default view state configuration
 * Matches the defaultViewState from useTaskManager
 */
export const DEFAULT_VIEW_STATE: ViewState = {
  viewMode: DEFAULT_VIEW_MODE,
  sortBy: DEFAULT_SORT_BY,
  sortDirection: DEFAULT_SORT_DIRECTION,
  showCompleted: DEFAULT_SHOW_COMPLETED,
  showOverdue: DEFAULT_SHOW_OVERDUE,
  searchQuery: DEFAULT_SEARCH_QUERY,
  showSidePanel: DEFAULT_SHOW_SIDE_PANEL,
  compactView: DEFAULT_COMPACT_VIEW,
  collapsedSections: [],
  activeFilters: DEFAULT_ACTIVE_FILTERS,
};

/**
 * Default user settings structure
 */
export const DEFAULT_USER_SETTINGS = {
  data: {
    autoBackup: {
      enabled: DEFAULT_AUTO_BACKUP_ENABLED,
      backupTime: DEFAULT_BACKUP_TIME,
      maxBackups: DEFAULT_MAX_BACKUPS,
    },
  },
  notifications: DEFAULT_NOTIFICATION_SETTINGS,
  general: DEFAULT_GENERAL_SETTINGS,
};

/**
 * Default user for initial setup
 */
export const DEFAULT_USER: User = {
  username: "admin",
  password: "",
};

/**
 * Default empty data structure for initializing a new TaskTrove data file
 */
export const DEFAULT_EMPTY_DATA_FILE: DataFile = {
  tasks: [],
  projects: [],
  labels: [],
  projectGroups: DEFAULT_PROJECT_GROUP,
  labelGroups: DEFAULT_LABEL_GROUP,
  settings: DEFAULT_USER_SETTINGS,
  user: DEFAULT_USER,
};
