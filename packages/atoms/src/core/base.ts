/**
 * Base atoms for TaskTrove core state management
 *
 * This file now primarily serves as a re-export hub for:
 * - Individual query atoms (from data/base/query.ts)
 * - Mutation atoms (from mutations/)
 * - Base data atoms (from data/base/atoms.ts)
 */

// Import all query atoms
import {
  tasksQueryAtom,
  projectsQueryAtom,
  labelsQueryAtom,
  groupsQueryAtom,
  settingsQueryAtom,
  userQueryAtom,
  queryClientAtom,
} from "../data/base/query";

// Re-export all query atoms
export {
  tasksQueryAtom,
  projectsQueryAtom,
  labelsQueryAtom,
  groupsQueryAtom,
  settingsQueryAtom,
  userQueryAtom,
  queryClientAtom,
};

// =============================================================================
// MUTATION ATOMS - Re-exported from mutations/
// =============================================================================

// Task mutations
export {
  createTaskMutationAtom,
  updateTasksMutationAtom,
  deleteTaskMutationAtom,
} from "../mutations/tasks";

// Project mutations
export {
  createProjectMutationAtom,
  updateProjectsMutationAtom,
  deleteProjectMutationAtom,
} from "../mutations/projects";

// Label mutations
export {
  createLabelMutationAtom,
  createLabelWithoutOptimisticUpdateAtom,
  updateLabelsMutationAtom,
  deleteLabelMutationAtom,
} from "../mutations/labels";

// Group mutations
export {
  createProjectGroupMutationAtom,
  updateProjectGroupMutationAtom,
  deleteProjectGroupMutationAtom,
  bulkUpdateGroupsMutationAtom,
} from "../mutations/groups";

// Settings mutations
export { updateSettingsMutationAtom } from "../mutations/settings";

// User mutations
export { updateUserMutationAtom } from "../mutations/user";

// =============================================================================
// BASE ATOMS - Re-exported from data/base/atoms.ts
// =============================================================================

export {
  tasksAtom,
  projectsAtom,
  labelsAtom,
  settingsAtom,
  userAtom,
} from "../data/base/atoms";
