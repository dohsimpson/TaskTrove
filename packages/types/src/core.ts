/**
 * Core Entity Schemas
 *
 * Task, Project, Label, User, and related core domain entities.
 */

import { z } from "zod";
import {
  TaskIdSchema,
  SubtaskIdSchema,
  CommentIdSchema,
  ProjectIdSchema,
  LabelIdSchema,
  UserIdSchema,
} from "./id";
import {
  AvatarFilePathSchema,
  flexibleDateSchema,
  flexibleTimeSchema,
  flexibleDateTimeSchema,
  TaskPriority,
} from "./constants";
import { validateRRule } from "./validators";
import { ProjectSectionSchema } from "./group";

// =============================================================================
// CORE TASK SCHEMAS
// =============================================================================

/**
 * Schema for a subtask within a main task
 */
export const SubtaskSchema = z.object({
  /** Unique identifier for the subtask */
  id: SubtaskIdSchema,
  /** Title/description of the subtask */
  title: z.string(),
  /** Whether the subtask is completed */
  completed: z.boolean(),
  /** Order index for display/sorting */
  order: z.number().optional(),
  /** Task estimation in seconds */
  estimation: z.number().optional(),
});

/**
 * Schema for a comment on a task
 */
export const TaskCommentSchema = z.object({
  /** Unique identifier for the comment */
  id: CommentIdSchema,
  /** Comment content/text */
  content: z.string(),
  /** When the comment was created */
  createdAt: flexibleDateTimeSchema,
  /** User ID of the comment author */
  userId: UserIdSchema,
});

/**
 * Schema for a user account
 */
export const UserSchema = z.object({
  /** Unique identifier for the user */
  id: UserIdSchema,
  /** Username for the user */
  username: z.string(),
  /** Password for authentication */
  password: z.string(),
  /** File path to user's avatar image */
  avatar: AvatarFilePathSchema.optional(),
  /** API token for bearer authentication - 32 character hexadecimal string */
  apiToken: z
    .string()
    .length(32)
    .regex(
      /^[0-9a-f]{32}$/,
      "API token must be a 32-character hexadecimal string",
    )
    .optional(),
});

/**
 * Schema for view state configuration
 */
export const ViewStateSchema = z.object({
  /** Current view mode */
  viewMode: z.enum(["list", "kanban", "calendar"]),
  /** Field to sort by */
  sortBy: z.string(),
  /** Sort direction */
  sortDirection: z.enum(["asc", "desc"]),
  /** Whether to show completed tasks */
  showCompleted: z.boolean(),
  /** Whether to show overdue tasks */
  showOverdue: z.boolean(),
  /** Current search query */
  searchQuery: z.string(),
  /** Whether to show the side panel */
  showSidePanel: z.boolean(),
  /** Whether to use compact task item view */
  compactView: z.boolean(),
  /** Array of collapsed section IDs (for project views with sections) */
  collapsedSections: z.array(z.string()).optional(),
  /** Active task filters for current view */
  activeFilters: z
    .object({
      /** Filter by project IDs */
      projectIds: z.array(ProjectIdSchema).optional(),
      /** Filter by label names */
      labels: z.array(LabelIdSchema).nullable().optional(),
      /** Filter by priority levels */
      priorities: z
        .array(
          z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
        )
        .optional(),
      /** Filter by completion status */
      completed: z.boolean().optional(),
      /** Filter by due date (flexible preset or custom range) */
      dueDateFilter: z
        .object({
          /** Quick preset filters */
          preset: z
            .enum([
              "overdue",
              "today",
              "tomorrow",
              "thisWeek",
              "nextWeek",
              "noDueDate",
            ])
            .optional(),
          /** Custom date range */
          customRange: z
            .object({
              start: z.date().optional(),
              end: z.date().optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

/**
 * Schema for view states record - maps view IDs to view states
 */
export const ViewStatesSchema = z.record(z.string(), ViewStateSchema);

/**
 * Global view options schema - UI preferences that apply across all views
 */
export const GlobalViewOptionsSchema = z.object({
  sidePanelWidth: z.number().min(20).max(80),
  /** Whether to show the side panel globally */
  showSidePanel: z.boolean(),
  /** People panel owner section collapse state */
  peopleOwnerCollapsed: z.boolean(),
  /** People panel assignees section collapse state */
  peopleAssigneesCollapsed: z.boolean(),
});

/**
 * Main Task schema with all properties
 */
export const TaskSchema = z.object({
  /** Unique identifier for the task */
  id: TaskIdSchema,
  /** Task title */
  title: z.string(),
  /** Optional task description */
  description: z.string().optional(),
  /** Whether the task is completed */
  completed: z.boolean(),
  /** Task priority level (1=highest, 4=lowest) */
  priority: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  /** Due date for the task */
  dueDate: flexibleDateSchema.optional(),
  /** Due time for the task in HH:MM format */
  dueTime: flexibleTimeSchema.optional(),
  /** ID of the project this task belongs to (defaults to 'inbox' if not specified) */
  projectId: ProjectIdSchema.optional(),
  /** Array of label IDs associated with the task */
  labels: z.array(LabelIdSchema),
  /** Subtasks within this task */
  subtasks: z.array(SubtaskSchema),
  /** Comments on this task */
  comments: z.array(TaskCommentSchema),
  /** When the task was created */
  createdAt: flexibleDateTimeSchema,
  /** When the task was completed (if completed) */
  completedAt: flexibleDateTimeSchema.optional(),
  /** Recurring pattern using RRULE format (RFC 5545) */
  recurring: z.string().optional().superRefine(validateRRule),
  /** Mode for calculating next due date in recurring tasks (defaults to "dueDate") */
  recurringMode: z.union([
    z.literal("dueDate"),
    z.literal("completedAt"),
    z.literal("autoRollover"),
  ]),
  /** Task estimation in seconds */
  estimation: z.number().optional(),
  /** Tracking ID for linking tasks */
  trackingId: TaskIdSchema.optional(),
});

/**
 * Project schema with view state and sections
 */
export const ProjectSchema = z.object({
  /** Unique identifier for the project */
  id: ProjectIdSchema,
  /** Project name */
  name: z.string(),
  /** Unique SEO friendly Slug */
  slug: z.string(),
  /** Project color (hex code) */
  color: z.string(),
  /** Array of sections within this project */
  sections: z.array(ProjectSectionSchema).min(1),
});

/**
 * Label schema
 */
export const LabelSchema = z.object({
  /** Unique identifier for the label */
  id: LabelIdSchema,
  /** Label name */
  name: z.string(),
  /** Unique SEO friendly Slug */
  slug: z.string(),
  /** Label color (hex code) */
  color: z.string(),
});

/**
 * Schema for scheduled notification
 */
export const ScheduledNotificationSchema = z.object({
  /** Task ID */
  taskId: TaskIdSchema,
  /** Task title for notification */
  taskTitle: z.string(),
  /** When the notification should fire */
  notifyAt: flexibleDateTimeSchema,
  /** Type of notification */
  type: z.enum(["due", "reminder"]),
});

/**
 * Schema for a set of scheduled notifications
 */
export const ScheduledNotificationSetSchema = z.set(
  ScheduledNotificationSchema,
);

// =============================================================================
// GENERATED TYPESCRIPT TYPES
// =============================================================================

export type Subtask = z.infer<typeof SubtaskSchema>;
export type TaskComment = z.infer<typeof TaskCommentSchema>;
export type User = z.infer<typeof UserSchema>;
export type ViewState = z.infer<typeof ViewStateSchema>;
export type ViewStates = z.infer<typeof ViewStatesSchema>;
export type GlobalViewOptions = z.infer<typeof GlobalViewOptionsSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Label = z.infer<typeof LabelSchema>;
export type ScheduledNotification = z.infer<typeof ScheduledNotificationSchema>;
export type ScheduledNotificationSet = z.infer<
  typeof ScheduledNotificationSetSchema
>;

/** Notification permission status */
export type NotificationPermissionStatus = "default" | "granted" | "denied";

// Re-export TaskPriority type from constants
export type { TaskPriority };

// Re-export ProjectSection from group (needed for ProjectSchema dependency)
export type { ProjectSection } from "./group";
