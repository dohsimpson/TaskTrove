/**
 * Data File Schema
 *
 * Complete data structure for TaskTrove data files (tasks.json).
 */

import { z } from "zod";
import { TaskSchema, ProjectSchema, LabelSchema, UserSchema } from "./core";
import {
  TaskSerializationSchema,
  ProjectSerializationSchema,
  LabelSerializationSchema,
  UserSerializationSchema,
} from "./serialization";
import { ProjectGroupSchema, LabelGroupSchema } from "./group";
import { UserSettingsSchema } from "./settings";
import { VersionStringSchema } from "./id";

/**
 * Data File Schema
 * Main data structure containing all tasks, projects, labels, groups, settings, and user
 */
export const DataFileSchema = z.object({
  tasks: z.array(TaskSchema),
  projects: z.array(ProjectSchema),
  labels: z.array(LabelSchema),
  projectGroups: ProjectGroupSchema,
  labelGroups: LabelGroupSchema,
  settings: UserSettingsSchema,
  user: UserSchema,
  version: VersionStringSchema.optional(), // TODO: make this required after v0.9.0
});

/**
 * Data File Serialization Schema
 * Used for API responses - includes serialized date formats
 */
export const DataFileSerializationSchema = z.object({
  ...DataFileSchema.shape,
  tasks: z.array(TaskSerializationSchema),
  projects: z.array(ProjectSerializationSchema),
  labels: z.array(LabelSerializationSchema),
  user: UserSerializationSchema,
});

// =============================================================================
// GENERATED TYPESCRIPT TYPES
// =============================================================================

export type DataFile = z.infer<typeof DataFileSchema>;
export type DataFileSerialization = z.infer<typeof DataFileSerializationSchema>;
export type UserData = z.infer<typeof DataFileSchema.shape.user>;
