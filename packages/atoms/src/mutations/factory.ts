/**
 * Generic mutation factory for creating standardized mutation atoms
 *
 * Provides consistent patterns for:
 * - API request/response handling
 * - Optimistic updates with resource-specific arrays
 * - Error handling and rollback
 * - Test environment simulation
 * - Granular cache invalidation
 */

import { z } from "zod";
import { atomWithMutation } from "jotai-tanstack-query";
import type { QueryKey } from "@tanstack/react-query";
import { queryClientAtom } from "../data/base/query";
import { log, toast } from "../utils/atom-helpers";

// =============================================================================
// MUTATION UTILITIES
// =============================================================================

/**
 * Generic mutation context for rollback operations
 */
export interface MutationContext<TData = unknown, TVariables = unknown> {
  previousData: unknown;
  variables?: TVariables;
  optimisticData?: TData;
}

/**
 * Utility for handling API errors with detailed messages
 */
async function handleApiError(
  response: Response,
  module: string,
): Promise<never> {
  let errorDetails = `${response.status} ${response.statusText}`;
  try {
    const errorData = await response.json();
    errorDetails = errorData.message || errorData.error || errorDetails;
    log.error({ errorData, module }, "API Error Details");
  } catch (parseError) {
    log.error({ parseError, module }, "Could not parse error response");
  }
  throw new Error(`Failed API request: ${errorDetails}`);
}

/**
 * Type guard to check if data exists and is valid
 */
function isValidResource<T>(data: unknown): data is T {
  return data !== null && data !== undefined;
}

/**
 * Get default value for a resource type
 * Returns empty array for array types, undefined for object types
 */
function getDefaultResource<TResource>(sampleResource: TResource): TResource {
  if (Array.isArray(sampleResource)) {
    return [] as TResource;
  }
  // For non-array types (objects), return undefined
  // The caller should handle this case appropriately
  return undefined as TResource;
}

/**
 * Generic utility for optimistic cache updates with any resource type
 */
function updateCache<TResource>(
  queryClient: {
    getQueryData: (key: QueryKey) => unknown;
    setQueryData: (
      key: QueryKey,
      updater: (oldData: unknown) => unknown,
    ) => void;
  },
  queryKey: QueryKey,
  updater: (oldData: TResource) => TResource,
  defaultValue: TResource,
): unknown {
  const previousData = queryClient.getQueryData(queryKey);
  queryClient.setQueryData(queryKey, (oldData: unknown) => {
    if (!isValidResource<TResource>(oldData)) {
      // Use provided default value if cache is invalid
      return updater(defaultValue);
    }
    return updater(oldData);
  });
  return previousData;
}

// =============================================================================
// MUTATION FACTORY
// =============================================================================

/**
 * Configuration for creating a generic mutation atom
 *
 * @template TResponse - API response type
 * @template TRequest - API request payload type
 * @template TResource - Resource type stored in cache (e.g., Project, Label, Task)
 * @template TOptimisticData - Custom optimistic data type (defaults to TResource)
 */
export interface MutationConfig<
  TResponse,
  TRequest,
  TResource,
  TOptimisticData = TResource,
> {
  /** HTTP method for the API request */
  method: "POST" | "PATCH" | "DELETE";

  /** Human-readable operation name (e.g., "Created task", "Updated project") */
  operationName: string;

  /** Zod schema for validating API response */
  responseSchema: z.ZodType<TResponse>;

  /** Zod schema for validating/serializing request payload */
  serializationSchema: z.ZodType;

  /** Factory for generating test response in test environment */
  testResponseFactory: (variables: TRequest) => TResponse;

  /**
   * Query key for the resource being mutated (used for optimistic updates).
   * Example: ["data", "projects"] for project mutations
   */
  resourceQueryKey: QueryKey;

  /**
   * Default value for the resource when cache is empty or invalid.
   * For arrays: [] (empty array)
   * For objects: the object's default structure
   * Example: For tasks mutations, pass [] (empty Task array)
   * Example: For settings mutations, pass DEFAULT_USER_SETTINGS
   */
  defaultResourceValue: TResource;

  /**
   * Array of query keys to invalidate after successful mutation.
   * Example: [["data", "projects"], ["data", "groups"]] for project mutations
   * that affect both projects and groups.
   * Defaults to [resourceQueryKey] if not provided.
   */
  invalidateQueryKeys?: QueryKey[];

  /**
   * Function to compute optimistic update for the resource.
   *
   * @param variables - Request payload
   * @param oldResource - Current resource from cache (e.g., Project[], UserSettings, GroupsResource)
   * @param optimisticData - Pre-computed optimistic entity (if factory provided)
   * @returns Updated resource to write to cache
   */
  optimisticUpdateFn: (
    variables: TRequest,
    oldResource: TResource,
    optimisticData?: TOptimisticData,
  ) => TResource;

  /**
   * Optional factory for creating optimistic data with defaults.
   * Useful when you need to generate IDs, slugs, colors, etc.
   *
   * @param variables - Request payload
   * @param oldResource - Current resource (for context like ID generation)
   * @returns Optimistic entity with computed defaults
   */
  optimisticDataFactory?: (
    variables: TRequest,
    oldResource: TResource,
  ) => TOptimisticData;

  /** Module name for logging (e.g., "projects", "labels") */
  logModule?: string;

  /** API endpoint (defaults to "/api/v1/tasks") */
  apiEndpoint?: string;
}

/**
 * Generic mutation factory
 *
 * Creates standardized mutation atoms with:
 * - Automatic test environment handling
 * - Input validation and serialization
 * - API request/response processing
 * - Optimistic updates with resource arrays
 * - Rollback on error
 * - Granular cache invalidation
 *
 * @param config - Mutation configuration
 * @returns Mutation atom ready for use with Jotai
 */
export function createMutation<
  TResponse,
  TVariables,
  TResource,
  TOptimisticData = TResource,
>(config: MutationConfig<TResponse, TVariables, TResource, TOptimisticData>) {
  const {
    method,
    operationName,
    responseSchema,
    serializationSchema,
    testResponseFactory,
    resourceQueryKey,
    defaultResourceValue,
    invalidateQueryKeys = [resourceQueryKey],
    optimisticUpdateFn,
    optimisticDataFactory,
    logModule = "tasks",
    apiEndpoint = "/api/v1/tasks",
  } = config;

  return atomWithMutation<
    TResponse,
    TVariables,
    Error,
    MutationContext<TOptimisticData, TVariables>
  >((get) => ({
    mutationFn: async (variables: TVariables): Promise<TResponse> => {
      // 1. Test environment check - standardized
      if (typeof window === "undefined" || process.env.NODE_ENV === "test") {
        log.info(
          { module: "test" },
          `Test environment: Simulating ${operationName.toLowerCase()}`,
        );
        return testResponseFactory(variables);
      }

      // 2. Input validation/serialization - if schema provided
      let serializedData: unknown = variables;
      const serialized = serializationSchema.safeParse(variables, {
        reportInput: true,
      });
      if (!serialized.success) {
        throw new Error(
          `Failed to serialize ${operationName.toLowerCase()} data: ${serialized.error.message || "Unknown validation error"}`,
        );
      }
      serializedData = serialized.data;

      // 3. API request - standardized
      const response = await fetch(apiEndpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serializedData),
      });

      if (!response.ok) {
        await handleApiError(response, logModule);
      }

      // 4. Response validation - standardized
      const data = await response.json();
      const responseValidation = responseSchema.safeParse(data, {
        reportInput: true,
      });
      if (!responseValidation.success) {
        throw new Error(
          `Failed to parse ${operationName.toLowerCase()} response: ${responseValidation.error.message || "Unknown validation error"}`,
        );
      }

      if (!responseValidation.data) {
        throw new Error(
          `No data returned from ${operationName.toLowerCase()} response`,
        );
      }

      return responseValidation.data;
    },
    onMutate: async (variables: TVariables) => {
      const queryClient = get(queryClientAtom);

      // Cancel queries for the resource being mutated
      await queryClient.cancelQueries({ queryKey: resourceQueryKey });

      // Get current resource from cache
      const currentData = queryClient.getQueryData(resourceQueryKey);
      const currentResource = isValidResource<TResource>(currentData)
        ? currentData
        : defaultResourceValue;

      // Create optimistic data if factory provided
      const optimisticData = optimisticDataFactory
        ? optimisticDataFactory(variables, currentResource)
        : undefined;

      // Optimistic cache update with resource
      const previousData = updateCache<TResource>(
        queryClient,
        resourceQueryKey,
        (oldResource) =>
          optimisticUpdateFn(variables, oldResource, optimisticData),
        defaultResourceValue,
      );

      return { previousData, variables, optimisticData };
    },
    onSuccess: (response: TResponse) => {
      // Success logging - standardized with dynamic count extraction
      // Type guard to check if response has taskIds property
      function hasTaskIds(obj: unknown): obj is { taskIds: string[] } {
        return obj !== null && typeof obj === "object" && "taskIds" in obj;
      }

      const count = hasTaskIds(response) ? response.taskIds.length : 1;
      log.info({ count, module: logModule }, `${operationName} via API`);

      // Success toast notification
      toast.success(`${operationName} successfully`);

      // Cache invalidation - invalidate all specified query keys
      const queryClient = get(queryClientAtom);
      invalidateQueryKeys.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });
    },
    onError: (
      error: Error,
      variables: TVariables,
      context: MutationContext<TOptimisticData, TVariables> | undefined,
    ) => {
      // Error logging - standardized
      log.error(
        { error, module: logModule },
        `Failed to ${operationName.toLowerCase()} via API`,
      );

      // Error toast notification
      toast.error(`Failed to ${operationName.toLowerCase()}: ${error.message}`);

      // Rollback - restore previous resource array
      const queryClient = get(queryClientAtom);
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(resourceQueryKey, context.previousData);
      }
    },
  }));
}
