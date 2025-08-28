import type { DataFile, ProjectGroup, LabelGroup } from "./index"
import { createGroupId } from "./index"

/**
 * Default ROOT project group for empty data files
 */
export const DEFAULT_PROJECT_GROUP: ProjectGroup = {
  type: "project",
  id: createGroupId("00000000-0000-4000-8000-000000000001"),
  name: "All Projects",
  items: [],
}

/**
 * Default ROOT label group for empty data files
 */
export const DEFAULT_LABEL_GROUP: LabelGroup = {
  type: "label",
  id: createGroupId("00000000-0000-4000-8000-000000000002"),
  name: "All Labels",
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
