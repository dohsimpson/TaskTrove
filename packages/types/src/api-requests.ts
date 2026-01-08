/**
 * API Request Schemas
 *
 * Zod schemas for validating API request payloads (Create, Update, Delete operations).
 */

import { z } from "zod";
import {
  TaskSchema,
  ProjectSchema,
  LabelSchema,
  UserSchema,
  TaskCommentSchema,
} from "./core";
import {
  TaskSerializationSchema,
  ProjectSerializationSchema,
  LabelSerializationSchema,
} from "./serialization";
import {
  TaskIdSchema,
  ProjectIdSchema,
  LabelIdSchema,
  GroupIdSchema,
} from "./id";
import { AvatarBase64Schema } from "./constants";
import { ProjectGroupSchema, LabelGroupSchema, GroupSchema } from "./group";
import { UserSettingsSchema } from "./settings";

// =============================================================================
// CREATE REQUEST SCHEMAS
// =============================================================================

/**
 * Schema for creating a new task via API
 * Uses .partial() to allow frontend to send partial data, with defaults applied in business logic
 * Includes sectionId for API compatibility (not part of Task schema itself)
 */
export const CreateTaskRequestSchema = TaskSchema.partial()
  .omit({
    id: true,
    createdAt: true,
    completedAt: true,
    completed: true,
  })
  .required({
    title: true,
  })
  .extend({
    sectionId: GroupIdSchema.optional(),
  });

// Serialization schemas for CreateTask (colocated with request schema)
export const TaskCreateSerializationSchema = TaskSerializationSchema.partial()
  .omit({
    id: true,
    createdAt: true,
    completedAt: true,
    completed: true,
  })
  .required({
    title: true,
  })
  .extend({
    sectionId: GroupIdSchema.optional(),
  });
export const TaskCreateArraySerializationSchema = z.array(
  TaskCreateSerializationSchema,
);

/**
 * Schema for creating a new project via API
 * Uses .partial() to allow frontend to send partial data, with defaults applied in business logic
 */
export const CreateProjectRequestSchema = ProjectSchema.partial()
  .omit({
    id: true,
  })
  .required({
    name: true,
  });

// Serialization schemas for CreateProject (colocated with request schema)
export const ProjectCreateSerializationSchema =
  ProjectSerializationSchema.partial()
    .omit({
      id: true,
    })
    .required({
      name: true,
      color: true,
    });
export const ProjectCreateArraySerializationSchema = z.array(
  ProjectCreateSerializationSchema,
);

/**
 * Schema for creating a new label via API
 * Uses .partial() to allow frontend to send partial data, with defaults applied in business logic
 */
export const CreateLabelRequestSchema = LabelSchema.partial()
  .omit({
    id: true,
  })
  .required({
    name: true,
  });

// Serialization schemas for CreateLabel (colocated with request schema)
export const LabelCreateSerializationSchema = LabelSerializationSchema.partial()
  .omit({
    id: true,
  })
  .required({
    name: true,
  });
export const LabelCreateArraySerializationSchema = z.array(
  LabelCreateSerializationSchema,
);

// =============================================================================
// UPDATE REQUEST SCHEMAS
// =============================================================================

/**
 * Schema for updating tasks via API
 * Includes sectionId for API compatibility (not part of Task schema itself)
 */
export const UpdateTaskRequestSchema = TaskSchema.partial()
  .required({
    id: true,
  })
  .omit({
    createdAt: true,
  })
  .extend({
    dueDate: TaskSchema.shape.dueDate.nullable(),
    dueTime: TaskSchema.shape.dueTime.nullable(),
    recurring: TaskSchema.shape.recurring.nullable(),
    estimation: TaskSchema.shape.estimation.nullable(),
    projectId: TaskSchema.shape.projectId.nullable(),
    sectionId: GroupIdSchema.optional(),
  });

// Serialization schemas for UpdateTask (colocated with request schema)
export const TaskUpdateSerializationSchema = TaskSerializationSchema.partial()
  .required({
    id: true,
  })
  .omit({
    createdAt: true,
  })
  .extend({
    dueDate: TaskSerializationSchema.shape.dueDate.nullable(),
    dueTime: TaskSerializationSchema.shape.dueTime.nullable(),
    recurring: TaskSerializationSchema.shape.recurring.nullable(),
    estimation: TaskSerializationSchema.shape.estimation.nullable(),
    projectId: TaskSerializationSchema.shape.projectId.nullable(),
    sectionId: GroupIdSchema.optional(),
  });
export const TaskUpdateArraySerializationSchema = z.array(
  TaskUpdateSerializationSchema,
);

/**
 * Union schema that accepts either single update or array of updates
 */
export const TaskUpdateUnionSchema = z.union([
  UpdateTaskRequestSchema,
  UpdateTaskRequestSchema.array(),
]);

/**
 * Schema for updating projects via API
 */
export const UpdateProjectRequestSchema = ProjectSchema.partial().required({
  id: true,
});

// Serialization schemas for UpdateProject (colocated with request schema)
export const ProjectUpdateSerializationSchema =
  ProjectSerializationSchema.partial().required({
    id: true,
  });
export const ProjectUpdateArraySerializationSchema = z.array(
  ProjectUpdateSerializationSchema,
);

/**
 * Union schema that accepts either single project update or array of updates
 */
export const ProjectUpdateUnionSchema = z.union([
  UpdateProjectRequestSchema,
  UpdateProjectRequestSchema.array(),
]);

/**
 * Schema for updating labels via API
 */
export const UpdateLabelRequestSchema = LabelSchema.partial().required({
  id: true,
});

// Serialization schemas for UpdateLabel (colocated with request schema)
export const LabelUpdateSerializationSchema =
  LabelSerializationSchema.partial().required({
    id: true,
  });
export const LabelUpdateArraySerializationSchema = z.array(
  LabelUpdateSerializationSchema,
);

/**
 * Schema for updating user via API
 */
export const UpdateUserRequestSchema = UserSchema.partial().extend({
  avatar: AvatarBase64Schema.nullable().optional(),
  apiToken: UserSchema.shape.apiToken.nullable(),
});

// Serialization schemas for UpdateUser (colocated with request schema)
export const UserUpdateSerializationSchema = UpdateUserRequestSchema;

/**
 * Schema for initial setup request - setting password for first time
 */
export const InitialSetupRequestSchema = z.object({
  username: z.string().optional(),
  password: z.string().min(1, "Password is required"),
});

/**
 * Schema for data file initialization request
 * Requires AUTH_SECRET verification to prevent unauthorized initialization
 */
export const DataInitializeRequestSchema = z.object({
  authSecret: z.string().optional(),
});

/**
 * Schema for updating user settings
 */
export const UpdateSettingsRequestSchema = z.object({
  settings: UserSettingsSchema,
});

/**
 * Schema for adding or updating a comment on a task
 * Can be used for both creating new comments and updating existing ones
 */
export const CommentUpdateRequestSchema = TaskCommentSchema.partial().extend({
  /** ID of the task this comment belongs to */
  taskId: TaskIdSchema,
  /** Comment content/text */
  content: z.string(),
});

// =============================================================================
// DELETE REQUEST SCHEMAS
// =============================================================================

/**
 * Schema for delete requests
 */
export const DeleteTaskRequestSchema = z.object({
  ids: z.array(TaskIdSchema).min(1, "At least one task ID is required"),
});

// Serialization schemas for DeleteTask (colocated with request schema)
export const TaskDeleteSerializationSchema = z.object({
  ids: z.array(TaskIdSchema),
});
export const TaskDeleteArraySerializationSchema = z.array(
  TaskDeleteSerializationSchema,
);

export const DeleteProjectRequestSchema = z.object({
  ids: z.array(ProjectIdSchema).min(1, "At least one project ID is required"),
});

// Serialization schemas for DeleteProject (colocated with request schema)
export const ProjectDeleteSerializationSchema = z.object({
  ids: z.array(ProjectIdSchema),
});
export const ProjectDeleteArraySerializationSchema = z.array(
  ProjectDeleteSerializationSchema,
);

export const DeleteLabelRequestSchema = LabelSchema.pick({ id: true });

// Serialization schemas for DeleteLabel (colocated with request schema)
export const LabelDeleteSerializationSchema = z.object({ id: LabelIdSchema });
export const LabelDeleteArraySerializationSchema = z.array(
  LabelDeleteSerializationSchema,
);

// =============================================================================
// GROUP REQUEST SCHEMAS
// =============================================================================

/**
 * Schema for creating a new group
 */
export const CreateGroupRequestSchema = z.object({
  /** Group type - determines what kind of items this group contains */
  type: z.literal("task").or(z.literal("project")).or(z.literal("label")),
  /** Group name */
  name: z.string(),
  /** Optional group description */
  description: z.string().optional(),
  /** Group color (hex code) */
  color: z.string().optional(),
  /** Parent group ID - where to add this new group (optional for root level) */
  parentId: GroupIdSchema.optional(),
});

/**
 * Payload schema for creating a group with client-computed fields
 */
export const GroupCreatePayloadSchema = z.object({
  /** Fully constructed group object (id/slug/color computed client-side) */
  group: GroupSchema,
  /** Optional parent group ID for insertion; omit for root level */
  parentId: GroupIdSchema.optional(),
});

/**
 * Type-specific update schema for project groups
 */
export const UpdateProjectGroupRequestSchema = z.object({
  /** Group ID to update */
  id: GroupIdSchema,
  /** Group type - must be "project" */
  type: z.literal("project"),
  /** Updated group name */
  name: z.string().optional(),
  /** Updated group description */
  description: z.string().optional(),
  /** Updated group color */
  color: z.string().optional(),
  /** Updated group items - allows updating the project assignments */
  items: z
    .array(z.union([ProjectIdSchema, z.lazy(() => ProjectGroupSchema)]))
    .optional(),
});

/**
 * Type-specific update schema for label groups
 */
export const UpdateLabelGroupRequestSchema = z.object({
  /** Group ID to update */
  id: GroupIdSchema,
  /** Group type - must be "label" */
  type: z.literal("label"),
  /** Updated group name */
  name: z.string().optional(),
  /** Updated group description */
  description: z.string().optional(),
  /** Updated group color */
  color: z.string().optional(),
  /** Updated group items - allows updating the label assignments */
  items: z
    .array(z.union([LabelIdSchema, z.lazy(() => LabelGroupSchema)]))
    .optional(),
});

/**
 * Discriminated union for group updates - Zod automatically validates based on type field
 */
export const UpdateGroupRequestSchema = z.discriminatedUnion("type", [
  UpdateProjectGroupRequestSchema,
  UpdateLabelGroupRequestSchema,
]);

/**
 * Union schema that accepts either single group update or array of updates
 */
export const GroupUpdateUnionSchema = z.union([
  UpdateGroupRequestSchema,
  UpdateGroupRequestSchema.array(),
]);

/**
 * Bulk group update schema for project groups
 */
export const BulkProjectGroupUpdateSchema = z.object({
  type: z.literal("project"),
  groups: z.array(ProjectGroupSchema),
});

/**
 * Bulk group update schema for label groups
 */
export const BulkLabelGroupUpdateSchema = z.object({
  type: z.literal("label"),
  groups: z.array(LabelGroupSchema),
});

/**
 * Discriminated union for bulk group updates
 */
export const BulkGroupUpdateSchema = z.discriminatedUnion("type", [
  BulkProjectGroupUpdateSchema,
  BulkLabelGroupUpdateSchema,
]);

/**
 * Schema for deleting a group
 */
export const DeleteGroupRequestSchema = z.object({
  /** Group ID to delete */
  id: GroupIdSchema,
});

// =============================================================================
// EXPORTED TYPES
// =============================================================================

// Create request types
export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type CreateLabelRequest = z.infer<typeof CreateLabelRequestSchema>;
export type CreateGroupRequest = z.infer<typeof CreateGroupRequestSchema>;
export type GroupCreatePayload = z.infer<typeof GroupCreatePayloadSchema>;

// Update request types
export type UpdateTaskRequest = z.infer<typeof UpdateTaskRequestSchema>;
export type TaskUpdateUnion = z.infer<typeof TaskUpdateUnionSchema>;
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;
export type ProjectUpdateUnion = z.infer<typeof ProjectUpdateUnionSchema>;
export type UpdateLabelRequest = z.infer<typeof UpdateLabelRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type UpdateSettingsRequest = z.infer<typeof UpdateSettingsRequestSchema>;
export type InitialSetupRequest = z.infer<typeof InitialSetupRequestSchema>;
export type DataInitializeRequest = z.infer<typeof DataInitializeRequestSchema>;
export type CommentUpdateRequest = z.infer<typeof CommentUpdateRequestSchema>;

// Group update types
export type UpdateProjectGroupRequest = z.infer<
  typeof UpdateProjectGroupRequestSchema
>;
export type UpdateLabelGroupRequest = z.infer<
  typeof UpdateLabelGroupRequestSchema
>;
export type UpdateGroupRequest = z.infer<typeof UpdateGroupRequestSchema>;
export type GroupUpdateUnion = z.infer<typeof GroupUpdateUnionSchema>;
export type BulkProjectGroupUpdate = z.infer<
  typeof BulkProjectGroupUpdateSchema
>;
export type BulkLabelGroupUpdate = z.infer<typeof BulkLabelGroupUpdateSchema>;
export type BulkGroupUpdate = z.infer<typeof BulkGroupUpdateSchema>;

// Delete request types
export type DeleteTaskRequest = z.infer<typeof DeleteTaskRequestSchema>;
export type DeleteProjectRequest = z.infer<typeof DeleteProjectRequestSchema>;
export type DeleteLabelRequest = z.infer<typeof DeleteLabelRequestSchema>;
export type DeleteGroupRequest = z.infer<typeof DeleteGroupRequestSchema>;

// Serialization types
export type TaskCreateSerialization = z.infer<
  typeof TaskCreateSerializationSchema
>;
export type TaskCreateArraySerialization = z.infer<
  typeof TaskCreateArraySerializationSchema
>;
export type TaskUpdateSerialization = z.infer<
  typeof TaskUpdateSerializationSchema
>;
export type TaskUpdateArraySerialization = z.infer<
  typeof TaskUpdateArraySerializationSchema
>;
export type ProjectCreateSerialization = z.infer<
  typeof ProjectCreateSerializationSchema
>;
export type ProjectCreateArraySerialization = z.infer<
  typeof ProjectCreateArraySerializationSchema
>;
export type ProjectUpdateSerialization = z.infer<
  typeof ProjectUpdateSerializationSchema
>;
export type ProjectUpdateArraySerialization = z.infer<
  typeof ProjectUpdateArraySerializationSchema
>;
export type LabelCreateSerialization = z.infer<
  typeof LabelCreateSerializationSchema
>;
export type LabelCreateArraySerialization = z.infer<
  typeof LabelCreateArraySerializationSchema
>;
export type LabelUpdateSerialization = z.infer<
  typeof LabelUpdateSerializationSchema
>;
export type LabelUpdateArraySerialization = z.infer<
  typeof LabelUpdateArraySerializationSchema
>;
export type TaskDeleteSerialization = z.infer<
  typeof TaskDeleteSerializationSchema
>;
export type TaskDeleteArraySerialization = z.infer<
  typeof TaskDeleteArraySerializationSchema
>;
export type ProjectDeleteSerialization = z.infer<
  typeof ProjectDeleteSerializationSchema
>;
export type ProjectDeleteArraySerialization = z.infer<
  typeof ProjectDeleteArraySerializationSchema
>;
export type LabelDeleteSerialization = z.infer<
  typeof LabelDeleteSerializationSchema
>;
export type LabelDeleteArraySerialization = z.infer<
  typeof LabelDeleteArraySerializationSchema
>;
export type UserUpdateSerialization = z.infer<
  typeof UserUpdateSerializationSchema
>;
