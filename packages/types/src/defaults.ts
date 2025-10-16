import type { ViewState, GlobalViewOptions } from "./index";
import type { GroupId } from "./id";
import type { User, ProjectSection, Project } from "./core";
import type { ProjectGroup, LabelGroup } from "./group";
import type { DataFile, UserData } from "./data-file";
import { SIDE_PANEL_WIDTH_DEFAULT } from "@tasktrove/constants";
import { createGroupId, createUserId } from "./id";
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
  DEFAULT_SECTION_NAME,
  DEFAULT_SECTION_COLOR,
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

/**
 * Default project section template.
 * Note: The specific ID value doesn't matter - sections are identified as default
 * by the isDefault flag or by being the first section in the array.
 * Use getDefaultSectionId(project) to dynamically get the default section ID.
 */
export const DEFAULT_PROJECT_SECTION: ProjectSection = {
  id: createGroupId(DEFAULT_UUID),
  name: DEFAULT_SECTION_NAME,
  slug: "",
  color: DEFAULT_SECTION_COLOR,
  type: "section",
  items: [],
  isDefault: true,
};

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
 * Helper Functions for Default Sections
 */

/**
 * Get the default section from a project
 * Priority: 1) Section with isDefault flag, 2) First section, 3) Section with DEFAULT_UUID
 * @param project - The project to get the default section from
 * @returns The default section or null if no sections exist
 */
export function getDefaultSection(project: Project): ProjectSection | null {
  if (project.sections.length === 0) {
    return null;
  }

  // Priority 1: Section explicitly marked as default
  const markedDefault = project.sections.find((s) => s.isDefault === true);
  if (markedDefault) {
    return markedDefault;
  }

  // Priority 2: First section in array
  return project.sections[0] ?? null;
}

/**
 * Get the default section ID from a project
 * @param project - The project to get the default section ID from
 * @returns The default section ID or null if no sections exist
 */
export function getDefaultSectionId(project: Project): GroupId | null {
  const defaultSection = getDefaultSection(project);
  return defaultSection?.id ?? null;
}

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
 * Default global view options
 */
export const DEFAULT_GLOBAL_VIEW_OPTIONS: GlobalViewOptions = {
  sidePanelWidth: SIDE_PANEL_WIDTH_DEFAULT,
  peopleOwnerCollapsed: false,
  peopleAssigneesCollapsed: false,
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

export const DEFAULT_USER: User = {
  id: createUserId(DEFAULT_UUID),
  username: "",
  password: "",
};

export const DEFAULT_USER_DATA: UserData = DEFAULT_USER;

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
