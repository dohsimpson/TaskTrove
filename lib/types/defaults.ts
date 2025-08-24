import type { DataFile } from "./index"

/**
 * Default empty data structure for initializing a new TaskTrove data file
 */
export const DEFAULT_EMPTY_DATA_FILE: DataFile = {
  tasks: [],
  projects: [],
  labels: [],
  ordering: {
    projects: [],
    labels: [],
  },
  taskGroups: [],
  projectGroups: [],
  labelGroups: [],
}
