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
import { createSafeLabelNameSlug } from "@tasktrove/utils/routing";
import { createEntityMutation } from "./entity-factory";

// =============================================================================
// LABEL MUTATION ATOMS
// =============================================================================

/**
 * Mutation atom for creating labels with optimistic updates
 *
 * Creates a new label and optimistically adds it to the label list.
 * The temporary ID will be replaced with the server-generated ID on success.
 * Use this for better UX when the caller doesn't need the real server ID immediately.
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
    oldLabels: Label[],
  ) => {
    return {
      id: createLabelId(uuidv4()), // Temporary ID that will be replaced by server response
      name: labelData.name,
      slug:
        labelData.slug ?? createSafeLabelNameSlug(labelData.name, oldLabels),
      color: labelData.color || DEFAULT_LABEL_COLORS[0],
    };
  },
});
createLabelMutationAtom.debugLabel = "createLabelMutationAtom";

/**
 * Mutation atom for creating labels WITHOUT optimistic updates
 *
 * Creates a new label and waits for server response before updating cache.
 * Use this when you need the real server-generated ID immediately
 * (e.g., when adding a label to a task during task creation).
 *
 * This mutation provides an optimistic update function that doesn't modify the cache,
 * effectively disabling optimistic updates while still satisfying the mutation factory requirements.
 */
export const createLabelWithoutOptimisticUpdateAtom = createEntityMutation<
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
  // No optimistic data factory - we don't create temporary labels
  // Custom optimistic update function that returns unchanged labels
  // This effectively disables optimistic updates while satisfying factory requirements
  optimisticUpdateFn: (_variables: CreateLabelRequest, oldLabels: Label[]) => {
    return oldLabels; // Return unchanged - no optimistic update
  },
});

/**
 * Mutation atom for updating labels with optimistic updates
 *
 * Updates the entire labels array and optimistically applies changes.
 * Replaces the current labels with the provided array.
 */
export const updateLabelsMutationAtom = createEntityMutation<
  Label,
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
  optimisticUpdateFn: (newLabels: Label[], _oldLabels: Label[]) => {
    return newLabels;
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
