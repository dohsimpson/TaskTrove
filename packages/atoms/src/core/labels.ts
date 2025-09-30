import { atom } from "jotai";
import {
  handleAtomError,
  namedAtom,
  withErrorHandling,
} from "../utils/atom-helpers";
import { Label, LabelId, CreateLabelRequest } from "@tasktrove/types";
import {
  createLabelMutationAtom,
  labelsAtom,
  deleteLabelMutationAtom,
} from "./base";
import { recordOperationAtom } from "./history";

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
  // Note: labelTaskCountsAtom moved to ui/task-counts.ts (UI-dependent)

  // Write-only action atoms
  addLabel: addLabelAtom,
  updateLabel: updateLabelAtom,
  deleteLabel: deleteLabelAtom,
} as const;

// Individual exports for backward compatibility
export { labelsAtom } from "./base";
