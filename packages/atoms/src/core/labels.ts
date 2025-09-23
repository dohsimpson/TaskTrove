import { atom } from "jotai";
import { handleAtomError } from "../utils/atom-helpers";
import {
  Label,
  Task,
  LabelId,
  ViewStates,
  CreateLabelRequest,
} from "@tasktrove/types";
import {
  createLabelMutationAtom,
  labelsAtom,
  deleteLabelMutationAtom,
} from "./base";
import { recordOperationAtom } from "./history";
import { activeTasksAtom } from "./tasks";
import { viewStatesAtom, getViewStateOrDefault } from "../ui/views";

/**
 * Core label atoms for TaskTrove
 */

// =============================================================================
// BASE ATOMS
// =============================================================================

// labelsAtom now imported from './base' to avoid circular dependencies

// =============================================================================
// DERIVED READ ATOMS
// =============================================================================

/**
 * Atom that provides a Map of label ID → Label object for efficient lookups
 */
export const labelsMapAtom = atom<Map<string, Label>>((get) => {
  try {
    const labels = get(labelsAtom);
    return new Map(labels.map((label: Label) => [label.id, label]));
  } catch (error) {
    handleAtomError(error, "labelsMapAtom");
    return new Map();
  }
});
labelsMapAtom.debugLabel = "labelsMapAtom";

/**
 * Atom that returns a function to get label by ID
 */
export const labelByIdAtom = atom((get) => {
  const labelsMap = get(labelsMapAtom);
  return (id: string): Label | undefined => {
    try {
      return labelsMap.get(id);
    } catch (error) {
      handleAtomError(error, "labelByIdAtom");
      return undefined;
    }
  };
});
labelByIdAtom.debugLabel = "labelByIdAtom";

/**
 * Getter function for finding label by name
 * @param name - Label name to find
 * @returns Label or undefined if not found
 */
export const labelByNameAtom = atom((get) => {
  const labels = get(labelsAtom);
  return (name: string): Label | undefined => {
    try {
      return labels.find((label: Label) => label.name === name);
    } catch (error) {
      handleAtomError(error, "labelByNameAtom");
      return undefined;
    }
  };
});
labelByNameAtom.debugLabel = "labelByNameAtom";

/**
 * Utility to get label names from an array of IDs
 */
export const labelNamesFromIdsAtom = atom((get) => {
  const labelsMap = get(labelsMapAtom);
  return (labelIds: LabelId[]): string[] => {
    try {
      return labelIds
        .map((id) => labelsMap.get(id)?.name || id)
        .filter(Boolean);
    } catch (error) {
      handleAtomError(error, "labelNamesFromIdsAtom");
      return [];
    }
  };
});
labelNamesFromIdsAtom.debugLabel = "labelNamesFromIdsAtom";

/**
 * Utility to get label objects from an array of IDs
 */
export const labelsFromIdsAtom = atom((get) => {
  const labelsMap = get(labelsMapAtom);
  return (labelIds: LabelId[]): Label[] => {
    try {
      return labelIds
        .map((id) => labelsMap.get(id))
        .filter((label): label is Label => label !== undefined);
    } catch (error) {
      handleAtomError(error, "labelsFromIdsAtom");
      return [];
    }
  };
});
labelsFromIdsAtom.debugLabel = "labelsFromIdsAtom";

/**
 * Task counts per label calculated from active tasks
 * Returns filtered counts that respect view-specific showCompleted settings
 * Unified interface with taskCountsAtom and projectTaskCountsAtom - returns simple numbers
 */
export const labelTaskCountsAtom = atom<Record<LabelId, number>>((get) => {
  try {
    const labels = get(labelsAtom);
    const activeTasks = get(activeTasksAtom);
    const rawViewStates = get(viewStatesAtom);
    const viewStates: ViewStates = rawViewStates;

    // Filter tasks based on label view's showCompleted setting
    const filterByViewCompleted = (tasks: Task[], labelId: LabelId) => {
      const showCompleted = getViewStateOrDefault(
        viewStates,
        labelId,
      ).showCompleted;
      return showCompleted ? tasks : tasks.filter((task) => !task.completed);
    };

    const counts: Record<LabelId, number> = {};

    for (const label of labels) {
      const labelTasks = activeTasks.filter((task: Task) =>
        task.labels.includes(label.id),
      );
      const filteredTasks = filterByViewCompleted(labelTasks, label.id);
      counts[label.id] = filteredTasks.length;
    }

    return counts;
  } catch (error) {
    handleAtomError(error, "labelTaskCounts");
    return {};
  }
});
labelTaskCountsAtom.debugLabel = "labelTaskCountsAtom";

// =============================================================================
// WRITE-ONLY ACTION ATOMS
// =============================================================================

/**
 * Adds a new label
 */
export const addLabelAtom = atom(
  null,
  async (get, set, labelData: CreateLabelRequest) => {
    try {
      // Add to labels data using server mutation for optimistic updates
      const createLabelMutation = get(createLabelMutationAtom);
      const result = await createLabelMutation.mutateAsync(labelData);

      // Get the first (and only) label ID from the response
      const newLabelId = result.labelIds[0];

      // Record the operation for undo/redo feedback
      set(recordOperationAtom, `Added label: "${labelData.name}"`);

      return newLabelId;
    } catch (error) {
      handleAtomError(error, "addLabelAtom");
      throw error;
    }
  },
);
addLabelAtom.debugLabel = "addLabelAtom";

/**
 * Updates an existing label's properties (name, color)
 */
export const updateLabelAtom = atom(
  null,
  (
    get,
    set,
    update: { id: string; changes: Partial<Pick<Label, "name" | "color">> },
  ) => {
    try {
      const labels = get(labelsAtom);
      const updatedLabels = labels.map((label: Label) =>
        label.id === update.id ? { ...label, ...update.changes } : label,
      );
      set(labelsAtom, updatedLabels);
    } catch (error) {
      handleAtomError(error, "updateLabelAtom");
    }
  },
);
updateLabelAtom.debugLabel = "updateLabelAtom";

/**
 * Removes a label - group membership is handled by group management
 */
export const deleteLabelAtom = atom(
  null,
  async (get, set, labelId: LabelId) => {
    try {
      const labels = get(labelsAtom);
      const labelToDelete = labels.find((l: Label) => l.id === labelId);

      if (!labelToDelete) return;

      // Remove from labels data using DELETE endpoint for proper deletion
      const deleteLabelMutation = get(deleteLabelMutationAtom);
      await deleteLabelMutation.mutateAsync({ id: labelId });
    } catch (error) {
      handleAtomError(error, "deleteLabelAtom");
      throw error;
    }
  },
);
deleteLabelAtom.debugLabel = "deleteLabelAtom";

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Main export object containing all label-related atoms
 */
export const labelAtoms = {
  // Base atoms
  labels: labelsAtom,

  // Derived read atoms
  labelsMap: labelsMapAtom,
  labelById: labelByIdAtom,
  labelByName: labelByNameAtom,
  labelNamesFromIds: labelNamesFromIdsAtom,
  labelsFromIds: labelsFromIdsAtom,
  labelTaskCounts: labelTaskCountsAtom,

  // Write-only action atoms
  addLabel: addLabelAtom,
  updateLabel: updateLabelAtom,
  deleteLabel: deleteLabelAtom,
} as const;

// Individual exports for backward compatibility
export { labelsAtom } from "./base";
