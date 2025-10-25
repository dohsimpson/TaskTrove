import { atom } from "jotai";
import {
  handleAtomError,
  namedAtom,
  withErrorHandling,
} from "@tasktrove/atoms/utils/atom-helpers";
import { Label } from "@tasktrove/types/core";
import { LabelId } from "@tasktrove/types/id";
import { CreateLabelRequest } from "@tasktrove/types/api-requests";
import { labelsAtom } from "@tasktrove/atoms/data/base/atoms";
import {
  createLabelMutationAtom,
  createLabelWithoutOptimisticUpdateAtom,
  deleteLabelMutationAtom,
} from "@tasktrove/atoms/mutations/labels";
import { recordOperationAtom } from "@tasktrove/atoms/core/history";

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
export const labelsMapAtom = namedAtom(
  "labelsMapAtom",
  atom<Map<string, Label>>((get) =>
    withErrorHandling(
      () => {
        const labels = get(labelsAtom);
        return new Map(labels.map((label: Label) => [label.id, label]));
      },
      "labelsMapAtom",
      new Map(),
    ),
  ),
);

/**
 * Atom that returns a function to get label by ID
 */
export const labelByIdAtom = namedAtom(
  "labelByIdAtom",
  atom((get) => {
    const labelsMap = get(labelsMapAtom);
    return (id: string): Label | undefined =>
      withErrorHandling(() => labelsMap.get(id), "labelByIdAtom", undefined);
  }),
);

/**
 * Getter function for finding label by name
 * @param name - Label name to find
 * @returns Label or undefined if not found
 */
export const labelByNameAtom = namedAtom(
  "labelByNameAtom",
  atom((get) => {
    const labels = get(labelsAtom);
    return (name: string): Label | undefined =>
      withErrorHandling(
        () => labels.find((label: Label) => label.name === name),
        "labelByNameAtom",
        undefined,
      );
  }),
);

/**
 * Utility to get label names from an array of IDs
 */
export const labelNamesFromIdsAtom = namedAtom(
  "labelNamesFromIdsAtom",
  atom((get) => {
    const labelsMap = get(labelsMapAtom);
    return (labelIds: LabelId[]): string[] =>
      withErrorHandling(
        () =>
          labelIds.map((id) => labelsMap.get(id)?.name || id).filter(Boolean),
        "labelNamesFromIdsAtom",
        [],
      );
  }),
);

/**
 * Utility to get label objects from an array of IDs
 */
export const labelsFromIdsAtom = namedAtom(
  "labelsFromIdsAtom",
  atom((get) => {
    const labelsMap = get(labelsMapAtom);
    return (labelIds: LabelId[]): Label[] =>
      withErrorHandling(
        () =>
          labelIds
            .map((id) => labelsMap.get(id))
            .filter((label): label is Label => label !== undefined),
        "labelsFromIdsAtom",
        [],
      );
  }),
);

// =============================================================================
// WRITE-ONLY ACTION ATOMS
// =============================================================================

/**
 * Adds a new label with optimistic updates (default behavior)
 *
 * Use this for better UX when you don't need the real server ID immediately.
 * For adding labels to tasks during task creation, use `addLabelAndWaitForRealIdAtom`.
 */
export const addLabelAtom = atom(
  null,
  async (get, set, labelData: CreateLabelRequest) => {
    try {
      // Use mutation with optimistic updates for better UX
      const createLabelMutation = get(createLabelMutationAtom);

      // Wait for mutation to complete
      const result = await createLabelMutation.mutateAsync(labelData);

      // Get the first (and only) label ID from the response
      const newLabelId = result.labelIds[0];

      // Record the operation for undo/redo feedback
      set(recordOperationAtom, `Added label: "${labelData.name}"`);

      // Return the server-generated ID
      return newLabelId;
    } catch (error) {
      handleAtomError(error, "addLabelAtom");
      throw error;
    }
  },
);
addLabelAtom.debugLabel = "addLabelAtom";

/**
 * Adds a new label WITHOUT optimistic updates to get the real server ID immediately
 *
 * Use this when you need the real server-generated ID right away
 * (e.g., when adding a label to a task during task creation).
 */
export const addLabelAndWaitForRealIdAtom = atom(
  null,
  async (get, set, labelData: CreateLabelRequest) => {
    try {
      // Use mutation WITHOUT optimistic updates to get real ID immediately
      const createLabelMutation = get(createLabelWithoutOptimisticUpdateAtom);

      // Wait for mutation to complete
      const result = await createLabelMutation.mutateAsync(labelData);

      // Get the first (and only) label ID from the response
      const newLabelId = result.labelIds[0];

      // Record the operation for undo/redo feedback
      set(recordOperationAtom, `Added label: "${labelData.name}"`);

      // Return the real server-generated ID
      return newLabelId;
    } catch (error) {
      handleAtomError(error, "addLabelAndWaitForRealIdAtom");
      throw error;
    }
  },
);
addLabelAndWaitForRealIdAtom.debugLabel = "addLabelAndWaitForRealIdAtom";

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

/**
 * Reorders labels within the labels array.
 * This atom handles drag-and-drop reordering of labels.
 */
export const reorderLabelsAtom = atom(
  null,
  async (get, set, reorder: { fromIndex: number; toIndex: number }) => {
    try {
      const { fromIndex, toIndex } = reorder;

      // Validate indices
      if (fromIndex < 0 || toIndex < 0) {
        throw new Error(
          "Invalid reorder indices: indices must be non-negative",
        );
      }

      const labels = get(labelsAtom);

      // Additional validation against current labels array
      if (fromIndex >= labels.length || toIndex > labels.length) {
        throw new Error(
          `Invalid reorder indices: fromIndex=${fromIndex}, toIndex=${toIndex}, labels.length=${labels.length}`,
        );
      }

      // No-op if indices are the same
      if (fromIndex === toIndex) {
        return;
      }

      // Reorder the labels array using existing labelsAtom write functionality
      // This will trigger the mutation and update server state
      const reorderedLabels = [...labels];
      const [movedLabel] = reorderedLabels.splice(fromIndex, 1);

      // TypeScript safety: movedLabel should exist since we validated fromIndex
      if (!movedLabel) {
        throw new Error(`Label not found at source index ${fromIndex}`);
      }

      reorderedLabels.splice(toIndex, 0, movedLabel);

      // Use the existing labelsAtom write functionality to persist changes
      await set(labelsAtom, reorderedLabels);
    } catch (error) {
      handleAtomError(error, "reorderLabelsAtom");
      throw error;
    }
  },
);
reorderLabelsAtom.debugLabel = "reorderLabelsAtom";

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
  // Note: labelTaskCountsAtom moved to ui/task-counts.ts (UI-dependent)

  // Write-only action atoms
  addLabel: addLabelAtom,
  updateLabel: updateLabelAtom,
  deleteLabel: deleteLabelAtom,
  reorderLabels: reorderLabelsAtom,
} as const;

// Note: labelsAtom is imported from "../data/base/atoms"
