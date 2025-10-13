/**
 * Serialization Schemas
 *
 * Transforms entities for JSON serialization (Date → ISO string).
 */

import { z } from "zod";
import {
  TaskSchema,
  TaskCommentSchema,
  UserSchema,
  ProjectSchema,
  LabelSchema,
} from "./core";
import {
  flexibleDateSerializationSchema,
  flexibleTimeSerializationSchema,
  flexibleDateTimeSerializationSchema,
} from "./constants";

// =============================================================================
// COMMENT SERIALIZATION
// =============================================================================

/**
 * Serialization schema for TaskComment
 * Transforms Date objects to ISO strings for JSON storage
 */
export const TaskCommentSerializationSchema = z.object({
  ...TaskCommentSchema.shape,
  createdAt: flexibleDateTimeSerializationSchema,
});

// =============================================================================
// TASK SERIALIZATION
// =============================================================================

/**
 * Base serialization schema for Task
 * Transforms Date objects to strings for JSON storage
 */
export const TaskSerializationSchema = z.object({
  ...TaskSchema.shape,
  dueDate: flexibleDateSerializationSchema.optional(),
  dueTime: flexibleTimeSerializationSchema.optional(),
  createdAt: flexibleDateTimeSerializationSchema,
  completedAt: flexibleDateTimeSerializationSchema.optional(),
  comments: z.array(TaskCommentSerializationSchema).default([]),
});

/**
 * Serialization schema for task arrays
 */
export const TaskArraySerializationSchema = z.array(TaskSerializationSchema);

// =============================================================================
// USER SERIALIZATION
// =============================================================================

/**
 * Base serialization schema for User
 * (No date fields to transform in base User schema)
 */
export const UserSerializationSchema = UserSchema;

// =============================================================================
// PROJECT SERIALIZATION
// =============================================================================

/**
 * Base serialization schema for Project
 * (No date fields to transform in base Project schema)
 */
export const ProjectSerializationSchema = ProjectSchema;

// =============================================================================
// LABEL SERIALIZATION
// =============================================================================

/**
 * Base serialization schema for Label
 * (No date fields to transform in base Label schema)
 */
export const LabelSerializationSchema = LabelSchema;
