/**
 * Label mutation atoms
 *
 * Contains mutation atoms for label operations:
 * - Creating labels
 * - Updating labels
 * - Deleting labels
 */

import { v4 as uuidv4 } from "uuid";
import {
  type Label,
  type CreateLabelRequest,
  type CreateLabelResponse,
  CreateLabelResponseSchema,
  LabelCreateSerializationSchema,
  type UpdateLabelResponse,
  UpdateLabelResponseSchema,
  LabelUpdateArraySerializationSchema,
  type DeleteLabelRequest,
  type DeleteLabelResponse,
  DeleteLabelResponseSchema,
  LabelDeleteSerializationSchema,
  createLabelId,
} from "@tasktrove/types";
import { DEFAULT_LABEL_COLORS } from "@tasktrove/constants";
import type { DataFile } from "@tasktrove/types";
import { createSafeLabelNameSlug } from "@tasktrove/utils/routing";
import { createEntityMutation } from "./entity-factory";

// =============================================================================
// LABEL MUTATION ATOMS
// =============================================================================

/**
 * Mutation atom for creating labels
 *
 * Creates a new label and optimistically adds it to the label list.
 * The temporary ID will be replaced with the server-generated ID on success.
 */
export const createLabelMutationAtom = createEntityMutation<
  Label,
  CreateLabelRequest,
  CreateLabelResponse
>({
  entity: "label",
  operation: "create",
  schemas: {
    request: LabelCreateSerializationSchema,
    response: CreateLabelResponseSchema,
  },
  // Custom optimistic data factory for label-specific defaults (slug, color)
  optimisticDataFactory: (
    labelData: CreateLabelRequest,
    oldData?: DataFile,
  ) => {
    return {
      id: createLabelId(uuidv4()), // Temporary ID that will be replaced by server response
      name: labelData.name,
      slug:
        labelData.slug ??
        createSafeLabelNameSlug(labelData.name, oldData?.labels || []),
      color: labelData.color || DEFAULT_LABEL_COLORS[0],
    };
  },
  // Auto-generates test response and optimistic update!
});
createLabelMutationAtom.debugLabel = "createLabelMutationAtom";

/**
 * Mutation atom for updating labels with optimistic updates
 *
 * Updates the entire labels array and optimistically applies changes.
 * Replaces the current labels with the provided array.
 */
export const updateLabelsMutationAtom = createEntityMutation<
  Label[],
  Label[],
  UpdateLabelResponse
>({
  entity: "label",
  operation: "update",
  schemas: {
    request: LabelUpdateArraySerializationSchema,
    response: UpdateLabelResponseSchema,
  },
  // Custom optimistic update: replace entire array (not merge)
  optimisticUpdateFn: (newLabels: Label[], oldData: DataFile) => {
    return {
      ...oldData,
      labels: newLabels,
    };
  },
});
updateLabelsMutationAtom.debugLabel = "updateLabelsMutationAtom";

/**
 * Mutation atom for deleting labels
 *
 * Deletes a label and optimistically removes it from the label list.
 */
export const deleteLabelMutationAtom = createEntityMutation<
  Label[],
  DeleteLabelRequest,
  DeleteLabelResponse
>({
  entity: "label",
  operation: "delete",
  schemas: {
    request: LabelDeleteSerializationSchema,
    response: DeleteLabelResponseSchema,
  },
  // Auto-generates test response and optimistic update!
});
deleteLabelMutationAtom.debugLabel = "deleteLabelMutationAtom";
