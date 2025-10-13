/**
 * API Response Schemas
 *
 * Zod schemas for API response payloads including success/error responses and GET endpoints.
 */

import { z } from "zod";
import {
  TaskIdSchema,
  ProjectIdSchema,
  LabelIdSchema,
  GroupIdSchema,
} from "#id";
import { ProjectSchema, LabelSchema, UserSchema } from "#core";
import {
  TaskSerializationSchema,
  ProjectSerializationSchema,
  LabelSerializationSchema,
  UserSerializationSchema,
} from "#serialization";
import { ProjectGroupSchema, LabelGroupSchema, GroupSchema } from "#group";
import { UserSettingsSchema } from "#settings";
import { ApiErrorCodeSchema } from "#api-errors";
import { DataFileSerializationSchema } from "#data-file";

// =============================================================================
// BASE RESPONSE SCHEMAS
// =============================================================================

/**
 * Generic API response schema
 */
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

/**
 * API Response Metadata - included in all GET responses
 */
export const ApiResponseMetaSchema = z.object({
  /** Number of items in the response */
  count: z.number(),
  /** ISO timestamp of when the response was generated */
  timestamp: z.string(),
  /** Data version (semantic versioning) */
  version: z.string(),
});

/**
 * Error response schema
 */
export const ErrorResponseSchema = z.object({
  code: ApiErrorCodeSchema,
  error: z.string(),
  message: z.string(),
  stack: z.string().optional(),
  filePath: z.string().optional(),
});

// =============================================================================
// ENTITY CREATION RESPONSE SCHEMAS
// =============================================================================

/**
 * Task creation response schema
 */
export const CreateTaskResponseSchema = ApiResponseSchema.extend({
  taskIds: z.array(TaskIdSchema),
});

/**
 * Label creation response schema
 */
export const CreateLabelResponseSchema = ApiResponseSchema.extend({
  labelIds: z.array(LabelIdSchema),
});

/**
 * Project creation response schema
 */
export const CreateProjectResponseSchema = ApiResponseSchema.extend({
  projectIds: z.array(ProjectIdSchema),
});

// =============================================================================
// ENTITY UPDATE RESPONSE SCHEMAS
// =============================================================================

/**
 * Task update response schema
 */
export const UpdateTaskResponseSchema = ApiResponseSchema.extend({
  taskIds: z.array(TaskIdSchema),
});

/**
 * Project update response schema
 */
export const UpdateProjectResponseSchema = ApiResponseSchema.extend({
  projects: z.array(ProjectSchema).optional(),
  count: z.number().optional(),
});

/**
 * Label update response schema
 */
export const UpdateLabelResponseSchema = ApiResponseSchema.extend({
  labels: z.array(LabelSchema).optional(),
  count: z.number().optional(),
});

/**
 * Schema for user update response
 */
export const UpdateUserResponseSchema = ApiResponseSchema.extend({
  user: UserSchema,
});

/**
 * Settings update response schema
 */
export const UpdateSettingsResponseSchema = ApiResponseSchema.extend({
  settings: UserSettingsSchema,
});

// =============================================================================
// ENTITY DELETION RESPONSE SCHEMAS
// =============================================================================

/**
 * Task deletion response schema
 */
export const DeleteTaskResponseSchema = ApiResponseSchema.extend({
  taskIds: z.array(TaskIdSchema),
});

/**
 * Project deletion response schema
 */
export const DeleteProjectResponseSchema = ApiResponseSchema.extend({
  projectIds: z.array(ProjectIdSchema),
});

/**
 * Label deletion response schema
 */
export const DeleteLabelResponseSchema = ApiResponseSchema.extend({
  labelIds: z.array(LabelIdSchema),
});

// =============================================================================
// GROUP RESPONSE SCHEMAS
// =============================================================================

/**
 * Group creation response schema
 */
export const CreateGroupResponseSchema = ApiResponseSchema.extend({
  groupIds: z.array(GroupIdSchema),
});

/**
 * Group update response schema
 */
export const UpdateGroupResponseSchema = ApiResponseSchema.extend({
  groups: z.array(GroupSchema).optional(),
  count: z.number().optional(),
});

/**
 * Group deletion response schema
 */
export const DeleteGroupResponseSchema = ApiResponseSchema.extend({
  groupIds: z.array(GroupIdSchema),
});

// =============================================================================
// SETUP RESPONSE SCHEMAS
// =============================================================================

/**
 * Initial setup response schema
 */
export const InitialSetupResponseSchema = ApiResponseSchema.extend({
  user: UserSchema,
});

// =============================================================================
// GET ENDPOINT RESPONSE SCHEMAS
// =============================================================================

/**
 * GET /api/tasks response schema - returns only tasks
 */
export const GetTasksResponseSchema = z.object({
  tasks: z.array(TaskSerializationSchema),
  meta: ApiResponseMetaSchema,
});

/**
 * GET /api/projects response schema - returns only projects
 */
export const GetProjectsResponseSchema = z.object({
  projects: z.array(ProjectSerializationSchema),
  meta: ApiResponseMetaSchema,
});

/**
 * GET /api/labels response schema - returns only labels
 */
export const GetLabelsResponseSchema = z.object({
  labels: z.array(LabelSerializationSchema),
  meta: ApiResponseMetaSchema,
});

/**
 * GET /api/groups response schema - returns both project and label groups
 */
export const GetGroupsResponseSchema = z.object({
  projectGroups: ProjectGroupSchema,
  labelGroups: LabelGroupSchema,
  meta: ApiResponseMetaSchema,
});

/**
 * GET /api/settings response schema - returns user settings
 */
export const GetSettingsResponseSchema = z.object({
  settings: UserSettingsSchema,
  meta: ApiResponseMetaSchema,
});

/**
 * GET /api/user response schema - returns user information
 */
export const GetUserResponseSchema = z.object({
  user: UserSerializationSchema,
  meta: ApiResponseMetaSchema,
});

/**
 * GET /api/data response schema - returns complete data structure
 * This endpoint is for clients that need the full data structure
 */
export const GetDataResponseSchema = DataFileSerializationSchema.extend({
  meta: ApiResponseMetaSchema,
});

// =============================================================================
// GENERATED TYPESCRIPT TYPES
// =============================================================================

export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type ApiResponseMeta = z.infer<typeof ApiResponseMetaSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export type CreateTaskResponse = z.infer<typeof CreateTaskResponseSchema>;
export type CreateLabelResponse = z.infer<typeof CreateLabelResponseSchema>;
export type CreateProjectResponse = z.infer<typeof CreateProjectResponseSchema>;

export type UpdateTaskResponse = z.infer<typeof UpdateTaskResponseSchema>;
export type UpdateProjectResponse = z.infer<typeof UpdateProjectResponseSchema>;
export type UpdateLabelResponse = z.infer<typeof UpdateLabelResponseSchema>;
export type UpdateUserResponse = z.infer<typeof UpdateUserResponseSchema>;
export type UpdateSettingsResponse = z.infer<
  typeof UpdateSettingsResponseSchema
>;

export type DeleteTaskResponse = z.infer<typeof DeleteTaskResponseSchema>;
export type DeleteProjectResponse = z.infer<typeof DeleteProjectResponseSchema>;
export type DeleteLabelResponse = z.infer<typeof DeleteLabelResponseSchema>;

export type CreateGroupResponse = z.infer<typeof CreateGroupResponseSchema>;
export type UpdateGroupResponse = z.infer<typeof UpdateGroupResponseSchema>;
export type DeleteGroupResponse = z.infer<typeof DeleteGroupResponseSchema>;

export type InitialSetupResponse = z.infer<typeof InitialSetupResponseSchema>;

export type GetTasksResponse = z.infer<typeof GetTasksResponseSchema>;
export type GetProjectsResponse = z.infer<typeof GetProjectsResponseSchema>;
export type GetLabelsResponse = z.infer<typeof GetLabelsResponseSchema>;
export type GetGroupsResponse = z.infer<typeof GetGroupsResponseSchema>;
export type GetSettingsResponse = z.infer<typeof GetSettingsResponseSchema>;
export type GetUserResponse = z.infer<typeof GetUserResponseSchema>;
export type GetDataResponse = z.infer<typeof GetDataResponseSchema>;
