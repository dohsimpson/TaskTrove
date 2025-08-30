import type { DataFile, ProjectGroup, LabelGroup } from "./index"
import { createGroupId } from "./index"
import { DEFAULT_UUID } from "../constants/defaults"

/**
 * Default ROOT project group for empty data files
 */
/**
 * Root group ID constants - these are the foundational group IDs that should be used
 * consistently across the entire application for the root project and label groups.
 */
export const ROOT_PROJECT_GROUP_ID = createGroupId(DEFAULT_UUID)
export const ROOT_LABEL_GROUP_ID = createGroupId(DEFAULT_UUID)

export const DEFAULT_PROJECT_GROUP: ProjectGroup = {
  type: "project",
  id: ROOT_PROJECT_GROUP_ID,
  name: "All Projects",
  slug: "all-projects",
  items: [],
}

/**
 * Default ROOT label group for empty data files
 */
export const DEFAULT_LABEL_GROUP: LabelGroup = {
  type: "label",
  id: ROOT_LABEL_GROUP_ID,
  name: "All Labels",
  slug: "all-labels",
  items: [],
}

/**
 * Default empty data structure for initializing a new TaskTrove data file
 */
export const DEFAULT_EMPTY_DATA_FILE: DataFile = {
  tasks: [],
  projects: [],
  labels: [],
  projectGroups: DEFAULT_PROJECT_GROUP,
  labelGroups: DEFAULT_LABEL_GROUP,
}
