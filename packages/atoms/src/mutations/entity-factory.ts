/**
 * Simplified mutation factory using convention-over-configuration
 *
 * This is a higher-level factory that wraps createMutation() and auto-generates
 * common patterns for CRUD operations, reducing boilerplate by ~70%.
 *
 * @example Simple create mutation (auto-generates test response and optimistic update)
 * ```typescript
 * export const createTaskMutationAtom = createEntityMutation({
 *   entity: "task",
 *   operation: "create",
 *   schemas: {
 *     request: TaskCreateSerializationSchema,
 *     response: CreateTaskResponseSchema,
 *   },
 *   optimisticDataFactory: (taskData, oldTasks) => ({
 *     id: createTaskId(uuidv4()),
 *     // ... other fields
 *   }),
 * });
 * ```
 *
 * @example Simple update mutation (everything auto-generated)
 * ```typescript
 * export const updateProjectsMutationAtom = createEntityMutation({
 *   entity: "project",
 *   operation: "update",
 *   schemas: {
 *     request: ProjectUpdateArraySerializationSchema,
 *     response: UpdateProjectResponseSchema,
 *   },
 * });
 * ```
 *
 * @example Override conventions when needed
 * ```typescript
 * export const updateSettingsMutationAtom = createEntityMutation({
 *   entity: "setting",
 *   operation: "update",
 *   schemas: { ... },
 *   // Custom optimistic update for settings object structure
 *   optimisticUpdateFn: (variables, oldSettings) => ({
 *     ...oldSettings,
 *     ...variables.settings
 *   }),
 * });
 * ```
 */

import { v4 as uuidv4 } from "uuid";
import type { z } from "zod";
import type { QueryKey } from "@tanstack/react-query";
import {
  TASKS_QUERY_KEY,
  PROJECTS_QUERY_KEY,
  LABELS_QUERY_KEY,
  GROUPS_QUERY_KEY,
  SETTINGS_QUERY_KEY,
} from "@tasktrove/constants";
import { createMutation, type MutationConfig } from "./factory";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Entity types that follow standard array-based CRUD patterns
 */
type StandardEntity = "task" | "project" | "label";

/**
 * All supported entity types (includes special cases like groups and settings)
 */
type EntityType = StandardEntity | "group" | "setting";

/**
 * Standard CRUD operations
 */
type OperationType = "create" | "update" | "delete";

/**
 * Entity-specific configuration for the simplified factory
 *
 * This config uses conventions to minimize boilerplate while allowing
 * overrides for special cases.
 */
interface EntityMutationConfig<TEntity, TRequest, TResponse> {
  /** Entity type - determines conventions for API endpoint, query key, etc. */
  entity: EntityType;

  /** Operation type - determines HTTP method and optimistic update patterns */
  operation: OperationType;

  /** Required Zod schemas for validation */
  schemas: {
    request: z.ZodType; // Serialization schema (doesn't need to match TRequest exactly)
    response: z.ZodType<TResponse>;
  };

  // ===== Optional Overrides (conventions applied if not provided) =====

  /** Override API endpoint (default: `/api/${entity}s`) */
  apiEndpoint?: string;

  /**
   * Override resource query key for optimistic updates
   * (default: ["data", "${entity}s"])
   */
  resourceQueryKey?: QueryKey;

  /**
   * Override query keys to invalidate after mutation
   * (default: [resourceQueryKey])
   */
  invalidateQueryKeys?: QueryKey[];

  /** Override operation name (default: `${capitalize(operation)} ${entity}`) */
  operationName?: string;

  /** Override log module (default: `${entity}s`) */
  logModule?: string;

  /**
   * Override test response factory
   * Default: Generates standard `{ success: true, [entity]Ids: [...], message: "..." }`
   */
  testResponseFactory?: (variables: TRequest) => TResponse;

  /**
   * Override optimistic data factory (only for CREATE operations)
   * Required for CREATE if entity has complex defaults
   */
  optimisticDataFactory?: (
    variables: TRequest,
    oldResourceArray: TEntity[],
  ) => TEntity;

  /**
   * Override optimistic update function
   * Default: Smart defaults based on entity type and operation:
   * - CREATE: Append to array
   * - UPDATE: Merge updates into array
   * - DELETE: Filter out deleted items
   */
  optimisticUpdateFn?: (
    variables: TRequest,
    oldResourceArray: TEntity[],
    optimisticData?: TEntity,
  ) => TEntity[];
}

// =============================================================================
// CONVENTION UTILITIES
// =============================================================================

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get the query key for an entity type
 * @example getEntityQueryKey("task") → ["data", "tasks"]
 * @example getEntityQueryKey("project") → ["data", "projects"]
 */
function getEntityQueryKey(entity: EntityType): QueryKey {
  switch (entity) {
    case "task":
      return TASKS_QUERY_KEY;
    case "project":
      return PROJECTS_QUERY_KEY;
    case "label":
      return LABELS_QUERY_KEY;
    case "group":
      return GROUPS_QUERY_KEY;
    case "setting":
      return SETTINGS_QUERY_KEY;
    default:
      return ["data", `${entity}s`];
  }
}

/**
 * Get the response ID field name for an entity
 * @example getIdFieldName("task") → "taskIds"
 * @example getIdFieldName("project") → "projectIds"
 */
function getIdFieldName(entity: EntityType): string {
  return `${entity}Ids`;
}

// =============================================================================
// DEFAULT FACTORY GENERATORS
// =============================================================================

/**
 * Creates default test response factory following TaskTrove conventions
 *
 * All TaskTrove APIs return: `{ success: true, [entity]Ids: [...], message: "..." }`
 */
function createDefaultTestResponse<TRequest>(
  entity: EntityType,
  operation: OperationType,
): (variables: TRequest) => unknown {
  return (variables: TRequest) => {
    const entityName = capitalize(entity);
    const idField = getIdFieldName(entity);

    switch (operation) {
      case "create": {
        return {
          success: true,
          [idField]: [uuidv4()],
          message: `${entityName} created successfully (test mode)`,
        };
      }

      case "update": {
        // Handle both single and bulk updates
        const ids = Array.isArray(variables)
          ? (variables as unknown[]).map((v: unknown) =>
              typeof v === "object" && v !== null && "id" in v
                ? (v as { id: string }).id
                : uuidv4(),
            )
          : typeof variables === "object" &&
              variables !== null &&
              "id" in variables
            ? [(variables as { id: string }).id]
            : [uuidv4()];

        return {
          success: true,
          [idField]: ids,
          message: `${entityName}${ids.length > 1 ? "s" : ""} updated successfully (test mode)`,
        };
      }

      case "delete": {
        // Extract IDs from delete request
        const ids =
          typeof variables === "object" &&
          variables !== null &&
          "ids" in variables
            ? (variables as { ids: string[] }).ids
            : typeof variables === "object" &&
                variables !== null &&
                "id" in variables
              ? [(variables as { id: string }).id]
              : [uuidv4()];

        return {
          success: true,
          [idField]: ids,
          message: `${entityName}${ids.length > 1 ? "s" : ""} deleted successfully (test mode)`,
        };
      }

      default:
        return { success: true };
    }
  };
}

/**
 * Creates default optimistic update function based on entity type and operation
 *
 * Handles standard patterns:
 * - CREATE: Append optimistic data to entity array
 * - UPDATE: Merge updates into existing entities
 * - DELETE: Filter out deleted entities
 */
function createDefaultOptimisticUpdate<TEntity, TRequest>(
  entity: EntityType,
  operation: OperationType,
): (
  variables: TRequest,
  oldResourceArray: TEntity[],
  optimisticData?: TEntity,
) => TEntity[] {
  return (
    variables: TRequest,
    oldResourceArray: TEntity[],
    optimisticData?: TEntity,
  ): TEntity[] => {
    switch (operation) {
      case "create": {
        if (!optimisticData) {
          throw new Error(
            `Optimistic data required for ${entity} create operation`,
          );
        }
        return [...oldResourceArray, optimisticData];
      }

      case "update": {
        // Handle both single and bulk updates
        const updates = Array.isArray(variables) ? variables : [variables];
        const updatedEntities = oldResourceArray.map((entity: TEntity) => {
          if (
            typeof entity !== "object" ||
            entity === null ||
            !("id" in entity)
          ) {
            return entity;
          }

          const update = updates.find(
            (u: unknown) =>
              typeof u === "object" &&
              u !== null &&
              "id" in u &&
              u.id === (entity as { id: unknown }).id,
          );

          return update ? ({ ...entity, ...update } as TEntity) : entity;
        });

        return updatedEntities;
      }

      case "delete": {
        // Extract IDs from delete request
        const ids =
          typeof variables === "object" &&
          variables !== null &&
          "ids" in variables
            ? (variables as { ids: string[] }).ids
            : typeof variables === "object" &&
                variables !== null &&
                "id" in variables
              ? [(variables as { id: string }).id]
              : [];

        const filteredEntities = oldResourceArray.filter(
          (entity: TEntity) =>
            typeof entity === "object" &&
            entity !== null &&
            "id" in entity &&
            !ids.includes((entity as { id: string }).id),
        );

        return filteredEntities;
      }

      default:
        return oldResourceArray;
    }
  };
}

// =============================================================================
// ENTITY MUTATION FACTORY
// =============================================================================

/**
 * Creates an entity mutation with smart defaults and convention-over-configuration
 *
 * This factory wraps the generic `createMutation()` factory and applies TaskTrove
 * conventions to reduce boilerplate by ~70%.
 *
 * **Conventions applied (can be overridden):**
 * - API endpoint: `/api/${entity}s`
 * - Resource query key: `["data", "${entity}s"]`
 * - Invalidate query keys: `[resourceQueryKey, ["data", "groups"]]` (for project/label)
 * - Operation name: `${capitalize(operation)} ${entity}`
 * - Test response: Standard `{ success: true, [entity]Ids: [...], message: "..." }`
 * - Optimistic update: Smart defaults based on operation (create/update/delete)
 *
 * **When to use this vs createMutation():**
 * - Use this for standard CRUD operations on tasks, projects, labels
 * - Use createMutation() for custom operations that don't follow conventions
 * - Override specific conventions when entity has special requirements
 *
 * @param config Entity-specific configuration
 * @returns Mutation atom ready for use with Jotai
 */
export function createEntityMutation<TEntity, TRequest, TResponse>(
  config: EntityMutationConfig<TEntity, TRequest, TResponse>,
) {
  const {
    entity,
    operation,
    schemas,
    apiEndpoint,
    resourceQueryKey,
    invalidateQueryKeys,
    operationName,
    logModule,
    testResponseFactory,
    optimisticDataFactory,
    optimisticUpdateFn,
  } = config;

  // Get default resource query key
  const defaultResourceQueryKey = resourceQueryKey ?? getEntityQueryKey(entity);

  // Determine which queries to invalidate based on entity type
  // Projects and labels affect groups, so invalidate both
  const defaultInvalidateQueryKeys =
    invalidateQueryKeys ??
    (entity === "project" || entity === "label"
      ? [defaultResourceQueryKey, GROUPS_QUERY_KEY]
      : [defaultResourceQueryKey]);

  // Apply conventions with override capability
  const fullConfig: MutationConfig<TResponse, TRequest, TEntity[], TEntity> = {
    // Map operation to HTTP method
    method:
      operation === "create"
        ? "POST"
        : operation === "update"
          ? "PATCH"
          : "DELETE",

    // Apply convention-based defaults
    operationName: operationName ?? `${capitalize(operation)}d ${entity}`, // "Created task", "Updated project"
    apiEndpoint: apiEndpoint ?? `/api/v1/${entity}s`,
    resourceQueryKey: defaultResourceQueryKey,
    defaultResourceValue: [] as TEntity[], // Empty array as default for all entity mutations
    invalidateQueryKeys: defaultInvalidateQueryKeys,
    logModule: logModule ?? `${entity}s`,

    // Schemas (always required)
    responseSchema: schemas.response,
    serializationSchema: schemas.request,

    // Factories with smart defaults
    testResponseFactory:
      testResponseFactory ??
      (createDefaultTestResponse(entity, operation) as (
        variables: TRequest,
      ) => TResponse),

    optimisticDataFactory: optimisticDataFactory, // Optional, only for create

    optimisticUpdateFn:
      optimisticUpdateFn ??
      createDefaultOptimisticUpdate<TEntity, TRequest>(entity, operation),
  };

  return createMutation<TResponse, TRequest, TEntity[], TEntity>(fullConfig);
}
