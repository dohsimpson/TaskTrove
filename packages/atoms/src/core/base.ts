/**
 * Base atoms for TaskTrove core state management
 *
 * This file now primarily serves as a re-export hub for:
 * - Data query atom (from data/base/query.ts)
 * - Mutation atoms (from mutations/)
 * - Base data atoms (from data/base/atoms.ts)
 */

// Import from query module
import { dataQueryAtom, queryClientAtom } from "../data/base/query";

// Re-export for backward compatibility
export { dataQueryAtom, queryClientAtom };

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
