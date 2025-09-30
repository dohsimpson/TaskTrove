/**
 * Generic mutation factory for creating standardized mutation atoms
 *
 * Provides consistent patterns for:
 * - API request/response handling
 * - Optimistic updates
 * - Error handling and rollback
 * - Test environment simulation
 */

import { z } from "zod";
import { atomWithMutation } from "jotai-tanstack-query";
import type { DataFile } from "@tasktrove/types";
import { DATA_QUERY_KEY } from "@tasktrove/constants";
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
 * Default empty cache data structure that matches DataFile schema
 */
const EMPTY_CACHE_DATA: DataFile = {
  tasks: [],
  projects: [],
  labels: [],
  projectGroups: {
    type: "project",
    id: "root-project-group" as any,
    name: "All Projects",
    slug: "all-projects",
    items: [],
  },
  labelGroups: {
    type: "label",
    id: "root-label-group" as any,
    name: "All Labels",
    slug: "all-labels",
    items: [],
  },
  settings: {
    data: {
      autoBackup: {
        enabled: false,
        backupTime: "02:00",
        maxBackups: 10,
      },
    },
    notifications: {
      enabled: false,
      requireInteraction: false,
    },
    general: {
      startView: "today",
      soundEnabled: true,
      linkifyEnabled: true,
      popoverHoverOpen: false,
    },
  },
  user: {
    username: "defaultuser",
    password: "defaultpassword",
    avatar: undefined,
  },
};

/**
 * Type guard to check if data has the expected structure
 */
function isValidCacheData(data: unknown): data is DataFile {
  if (!data || typeof data !== "object") return false;

  // Type narrowing without assertion
  if (!("tasks" in data && "projects" in data && "labels" in data)) {
    return false;
  }

  return !!(
    Array.isArray(data.tasks) &&
    Array.isArray(data.projects) &&
    Array.isArray(data.labels)
  );
}

/**
 * Generic utility for optimistic cache updates
 */
function updateCache(
  queryClient: {
    getQueryData: (key: string[]) => unknown;
    setQueryData: (
      key: string[],
      updater: (oldData: unknown) => unknown,
    ) => void;
  },
  queryKey: string[],
  updater: (oldData: DataFile) => DataFile,
): unknown {
  const previousData = queryClient.getQueryData(queryKey);
  queryClient.setQueryData(queryKey, (oldData: unknown) => {
    if (!isValidCacheData(oldData)) return oldData;
    return updater(oldData);
  });
  return previousData;
}

// =============================================================================
// MUTATION FACTORY
// =============================================================================

/**
 * Configuration for creating a generic mutation atom
 */
export interface MutationConfig<
  TResponse,
  TRequest,
  TOptimisticData = unknown,
> {
  method: "POST" | "PATCH" | "DELETE";
  operationName: string;
  responseSchema: z.ZodType<TResponse>;
  serializationSchema: z.ZodType;
  testResponseFactory: (variables: TRequest) => TResponse;
  optimisticUpdateFn: (
    variables: TRequest,
    oldData: DataFile,
    optimisticData?: TOptimisticData,
  ) => DataFile;
  optimisticDataFactory?: (
    variables: TRequest,
    oldData?: DataFile,
  ) => TOptimisticData;
  logModule?: string;
  apiEndpoint?: string; // Optional API endpoint (defaults to '/api/tasks')
  queryKey?: string[]; // Optional query key (defaults to ['tasks'])
}

/**
 * Generic mutation factory
 *
 * Creates standardized mutation atoms with:
 * - Automatic test environment handling
 * - Input validation and serialization
 * - API request/response processing
 * - Optimistic updates with rollback
 * - Error handling and user notifications
 *
 * @param config - Mutation configuration
 * @returns Mutation atom ready for use with Jotai
 */
export function createMutation<
  TResponse,
  TVariables,
  TOptimisticData = unknown,
>(config: MutationConfig<TResponse, TVariables, TOptimisticData>) {
  const {
    method,
    operationName,
    responseSchema,
    serializationSchema,
    testResponseFactory,
    optimisticUpdateFn,
    optimisticDataFactory,
    logModule = "tasks",
    apiEndpoint = "/api/tasks",
    queryKey = DATA_QUERY_KEY,
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

      // Cancel queries - standardized
      await queryClient.cancelQueries({ queryKey });

      // Get current data for optimistic factory context
      const currentData = queryClient.getQueryData(queryKey);
      const validCurrentData = isValidCacheData(currentData)
        ? currentData
        : EMPTY_CACHE_DATA;

      // Create optimistic data if factory provided
      const optimisticData = optimisticDataFactory
        ? optimisticDataFactory(variables, validCurrentData)
        : undefined;

      // Optimistic cache update - parameterized logic
      const previousData = updateCache(queryClient, queryKey, (oldData) =>
        optimisticUpdateFn(variables, oldData, optimisticData),
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

      // Cache invalidation - standardized
      const queryClient = get(queryClientAtom);
      queryClient.invalidateQueries({ queryKey: DATA_QUERY_KEY });
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

      // Rollback - standardized
      const queryClient = get(queryClientAtom);
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
  }));
}
