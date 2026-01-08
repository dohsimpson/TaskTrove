/**
 * Label mutation atoms
 *
 * Contains mutation atoms for label operations:
 * - Creating labels
 * - Updating labels
 * - Deleting labels
 */

import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { atom } from "jotai";
import { type Label } from "@tasktrove/types/core";
import {
  type CreateLabelRequest,
  type DeleteLabelRequest,
  LabelDeleteSerializationSchema,
} from "@tasktrove/types/api-requests";
import {
  type CreateLabelResponse,
  CreateLabelResponseSchema,
  type UpdateLabelResponse,
  UpdateLabelResponseSchema,
  type DeleteLabelResponse,
  DeleteLabelResponseSchema,
} from "@tasktrove/types/api-responses";
import { createLabelId } from "@tasktrove/types/id";
import { LabelSerializationSchema } from "@tasktrove/types/serialization";
import {
  DEFAULT_LABEL_COLORS,
  GROUPS_QUERY_KEY,
  LABELS_QUERY_KEY,
} from "@tasktrove/constants";
import { API_ROUTES } from "@tasktrove/types/constants";
import { createMutation } from "./factory";
import { createEntityMutation } from "./entity-factory";

export type LabelCreatePayload = Label;

export const LabelCreatePayloadSchema = LabelSerializationSchema;

export const buildLabelCreatePayload = (
  labelData: CreateLabelRequest,
): LabelCreatePayload => {
  return {
    id: createLabelId(uuidv4()),
    name: labelData.name,
    color: labelData.color ?? DEFAULT_LABEL_COLORS[0],
  };
};

// =============================================================================
// LABEL MUTATION ATOMS
// =============================================================================

/**
 * Base mutation for creating labels.
 * Accepts a fully-computed Label payload (id/color already set by the client).
 */
const createLabelMutationAtomBase = createMutation<
  CreateLabelResponse,
  LabelCreatePayload,
  Label[],
  Label
>({
  method: "POST",
  operationName: "Created label",
  resourceQueryKey: LABELS_QUERY_KEY,
  defaultResourceValue: [],
  responseSchema: CreateLabelResponseSchema,
  serializationSchema: LabelCreatePayloadSchema,
  apiEndpoint: API_ROUTES.V1_LABELS,
  invalidateQueryKeys: [LABELS_QUERY_KEY, GROUPS_QUERY_KEY],
  logModule: "labels",
  testResponseFactory: () => ({
    success: true,
    labelIds: [createLabelId(uuidv4())],
    message: "Label created successfully (test mode)",
  }),
  optimisticDataFactory: (payload) => payload,
  optimisticUpdateFn: (
    _payload: LabelCreatePayload,
    oldLabels: Label[],
    optimisticLabel?: Label,
  ) => {
    if (!optimisticLabel) {
      throw new Error("Optimistic label missing for label creation");
    }
    return [...oldLabels, optimisticLabel];
  },
});

/**
 * Public mutation atom that builds the full payload on the client
 * (color, id) before hitting the API. Optimistic update is kept simple
 * because the final object is already computed.
 */
export const createLabelMutationAtom = atom((get) => {
  const baseMutation = get(createLabelMutationAtomBase);

  return {
    ...baseMutation,
    mutateAsync: async (labelData: CreateLabelRequest) => {
      const payload = buildLabelCreatePayload(labelData);
      return baseMutation.mutateAsync(payload);
    },
    mutate: (
      labelData: CreateLabelRequest,
      options?: Parameters<typeof baseMutation.mutate>[1],
    ) => {
      const payload = buildLabelCreatePayload(labelData);
      return baseMutation.mutate(payload, options);
    },
  };
});
createLabelMutationAtom.debugLabel = "createLabelMutationAtom";

/**
 * Mutation atom for creating labels WITHOUT optimistic updates
 * Useful when the caller needs to wait for server confirmation (e.g., chaining IDs).
 */
const createLabelWithoutOptimisticUpdateAtomBase = createMutation<
  CreateLabelResponse,
  LabelCreatePayload,
  Label[],
  Label
>({
  method: "POST",
  operationName: "Created label",
  resourceQueryKey: LABELS_QUERY_KEY,
  defaultResourceValue: [],
  responseSchema: CreateLabelResponseSchema,
  serializationSchema: LabelCreatePayloadSchema,
  apiEndpoint: API_ROUTES.V1_LABELS,
  invalidateQueryKeys: [LABELS_QUERY_KEY, GROUPS_QUERY_KEY],
  logModule: "labels",
  testResponseFactory: () => ({
    success: true,
    labelIds: [createLabelId(uuidv4())],
    message: "Label created successfully (test mode)",
  }),
  // No optimistic data; keep cache unchanged until server responds
  optimisticUpdateFn: (_payload, oldLabels) => oldLabels,
});

export const createLabelWithoutOptimisticUpdateAtom = atom((get) => {
  const baseMutation = get(createLabelWithoutOptimisticUpdateAtomBase);

  return {
    ...baseMutation,
    mutateAsync: async (labelData: CreateLabelRequest) => {
      const payload = buildLabelCreatePayload(labelData);
      return baseMutation.mutateAsync(payload);
    },
    mutate: (
      labelData: CreateLabelRequest,
      options?: Parameters<typeof baseMutation.mutate>[1],
    ) => {
      const payload = buildLabelCreatePayload(labelData);
      return baseMutation.mutate(payload, options);
    },
  };
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
    request: z.array(LabelSerializationSchema),
    response: UpdateLabelResponseSchema,
  },
  // Custom optimistic update: replace entire array (not merge)
  optimisticUpdateFn: (newLabels: Label[]) => {
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
