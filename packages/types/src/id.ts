/**
 * Branded ID Types
 *
 * All ID types in TaskTrove use branded types for compile-time type safety.
 * These prevent mixing different ID types (e.g., using a TaskId where a ProjectId is expected).
 */

import { z } from "zod";

// =============================================================================
// BRANDED ID SCHEMAS
// =============================================================================

/**
 * Task ID - string type that must be a UUID
 */
export const TaskIdSchema = z.uuid().brand("TaskId");

/**
 * Project ID - string type that must be a UUID
 */
export const ProjectIdSchema = z.uuid().brand("ProjectId");

/**
 * Label ID - string type that must be a UUID
 */
export const LabelIdSchema = z.uuid().brand("LabelId");

/**
 * Subtask ID - string type that must be a UUID
 */
export const SubtaskIdSchema = z.uuid().brand("SubtaskId");

/**
 * Comment ID - string type that must be a UUID
 */
export const CommentIdSchema = z.uuid().brand("CommentId");

/**
 * User ID - string type that must be a UUID
 */
export const UserIdSchema = z.uuid().brand("UserId");

/**
 * Voice Command ID - string type that must be a UUID
 */
export const VoiceCommandIdSchema = z.uuid().brand("VoiceCommandId");

/**
 * Section ID - number type for project sections
 */
export const SectionIdSchema = z.string().uuid().brand("SectionId");

/**
 * Group ID - string type that must be a UUID
 */
export const GroupIdSchema = z.uuid().brand("GroupId");

/**
 * Version String - string type that must follow semantic versioning format (v\d.\d.\d)
 */
export const VersionStringSchema = z
  .string()
  .regex(/^v\d+\.\d+\.\d+$/, "Version must follow format v0.0.0")
  .brand("VersionString");

// =============================================================================
// INFERRED TYPES
// =============================================================================

export type TaskId = z.infer<typeof TaskIdSchema>;
export type ProjectId = z.infer<typeof ProjectIdSchema>;
export type LabelId = z.infer<typeof LabelIdSchema>;
export type SubtaskId = z.infer<typeof SubtaskIdSchema>;
export type CommentId = z.infer<typeof CommentIdSchema>;
export type UserId = z.infer<typeof UserIdSchema>;
export type VoiceCommandId = z.infer<typeof VoiceCommandIdSchema>;
export type SectionId = z.infer<typeof SectionIdSchema>;
export type GroupId = z.infer<typeof GroupIdSchema>;
export type VersionString = z.infer<typeof VersionStringSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Helper functions to create ID types (for migration and testing)
 */
export const createTaskId = (id: string): TaskId => TaskIdSchema.parse(id);
export const createProjectId = (id: string): ProjectId =>
  ProjectIdSchema.parse(id);
export const createLabelId = (id: string): LabelId => LabelIdSchema.parse(id);
export const createSubtaskId = (id: string): SubtaskId =>
  SubtaskIdSchema.parse(id);
export const createCommentId = (id: string): CommentId =>
  CommentIdSchema.parse(id);
export const createUserId = (id: string): UserId => UserIdSchema.parse(id);
export const createVoiceCommandId = (id: string): VoiceCommandId =>
  VoiceCommandIdSchema.parse(id);
export const createSectionId = (id: string): SectionId =>
  SectionIdSchema.parse(id);
export const createGroupId = (id: string): GroupId => GroupIdSchema.parse(id);
export const createVersionString = (version: string): VersionString =>
  VersionStringSchema.parse(version);

// =============================================================================
// VIEW IDS
// =============================================================================

/**
 * Standard view identifiers for built-in views
 * Examples: "all", "inbox", "today", "upcoming", "completed", "calendar"
 */
export type StandardViewId =
  | "all"
  | "inbox"
  | "today"
  | "upcoming"
  | "completed"
  | "calendar";

/**
 * View identifier - can be a standard view ID, project slug, label slug, or custom view
 * This is a broader type that includes StandardViewId plus dynamic identifiers
 */
export type ViewId = string;
