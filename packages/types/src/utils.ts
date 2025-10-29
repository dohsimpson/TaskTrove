import type { Task, Project } from "./core";
import {
  CreateTaskRequestSchema,
  type CreateTaskRequest,
} from "./api-requests";
import { getDefaultSectionId } from "./defaults";

/**
 * Safely converts a Task to a CreateTaskRequest by removing fields that shouldn't be included.
 * Uses Zod validation to ensure the result conforms to CreateTaskRequestSchema.
 *
 * @param options - Options object
 * @param options.task - The task to convert
 * @param options.omit - Optional array of field names to exclude from the result
 * @returns A validated CreateTaskRequest object
 * @throws Error if the resulting data doesn't conform to CreateTaskRequestSchema
 */
export function taskToCreateTaskRequest(options: {
  task: Task;
  omit?: (keyof Task)[];
}): CreateTaskRequest {
  const { task, omit = [] } = options;
  const omitSet = new Set(omit);

  // Fields that should always be excluded when converting Task to CreateTaskRequest
  // These are managed by the system and shouldn't be copied
  const excludedFields = new Set<keyof Task>([
    "id",
    "createdAt",
    "completedAt",
    "completed",
  ]);

  // Build the task data dynamically by iterating over all task properties
  const taskData: Record<string, unknown> = {};

  for (const key in task) {
    if (Object.prototype.hasOwnProperty.call(task, key)) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Safe: key is guaranteed to be keyof Task from for...in loop
      const typedKey = key as keyof Task;

      // Skip if field is in excluded list or omit list
      if (excludedFields.has(typedKey) || omitSet.has(typedKey)) {
        continue;
      }

      const value = task[typedKey];

      // Only include defined values (skip undefined to keep request clean)
      if (value !== undefined) {
        taskData[key] = value;
      }
    }
  }

  // Validate with Zod schema to ensure type safety
  const result = CreateTaskRequestSchema.safeParse(taskData);

  if (!result.success) {
    throw new Error(
      `Failed to convert Task to CreateTaskRequest: ${result.error.message}`,
    );
  }

  return result.data;
}

/**
 * Cleans up dangling task assignments in a project.
 *
 * A dangling task is one that has a projectId but its ID is not present in any
 * section.items array within that project. After v0.7.0, task-section membership
 * is tracked via section.items arrays, not task.sectionId.
 *
 * This function finds dangling tasks and adds them to the project's default section.
 *
 * @param tasks - Array of all tasks
 * @param project - The project to clean up
 * @returns Updated project with dangling tasks added to default section
 */
export function cleanupDanglingTasks(tasks: Task[], project: Project): Project {
  const defaultSectionId = getDefaultSectionId(project);

  // If project has no sections, can't clean up (shouldn't happen after v0.8.0)
  if (!defaultSectionId) {
    console.warn(
      `Project ${project.id} has no sections. Cannot clean up dangling tasks.`,
    );
    return project;
  }

  // Find all task IDs that belong to this project
  const projectTaskIds = new Set(
    tasks
      .filter((task) => task.projectId === project.id)
      .map((task) => task.id),
  );

  // Find all task IDs already assigned to sections
  const assignedTaskIds = new Set<string>();
  for (const section of project.sections) {
    for (const taskId of section.items) {
      assignedTaskIds.add(taskId);
    }
  }

  // Find dangling task IDs (belong to project but not in any section)
  const danglingTaskIds = Array.from(projectTaskIds).filter(
    (taskId) => !assignedTaskIds.has(taskId),
  );

  // If no dangling tasks, return project unchanged
  if (danglingTaskIds.length === 0) {
    return project;
  }

  console.log(
    `Found ${danglingTaskIds.length} dangling task(s) in project ${project.id}. Adding to default section ${defaultSectionId}.`,
  );

  // Add dangling tasks to the default section
  return {
    ...project,
    sections: project.sections.map((section) => {
      if (section.id === defaultSectionId) {
        return {
          ...section,
          items: [...section.items, ...danglingTaskIds],
        };
      }
      return section;
    }),
  };
}

/**
 * Cleans up all dangling tasks across all projects in a data file.
 *
 * @param tasks - Array of all tasks
 * @param projects - Array of all projects
 * @returns Array of projects with dangling tasks assigned to default sections
 */
export function cleanupAllDanglingTasks(
  tasks: Task[],
  projects: Project[],
): Project[] {
  return projects.map((project) => cleanupDanglingTasks(tasks, project));
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Generic linked list node
 */
export interface LinkedListNode {
  /** Unique identifier */
  id: string;
  /** ID of the next item in the list */
  nextId: string | null;
}

/**
 * Date range for filtering and analytics
 */
export interface DateRange {
  /** Start date */
  start: Date;
  /** End date */
  end: Date;
}

/**
 * Time period options for analytics
 */
export type TimePeriod = "today" | "week" | "month" | "year";

/**
 * Color palette for themes
 */
export interface ColorPalette {
  /** Primary color */
  primary: string;
  /** Secondary color */
  secondary: string;
  /** Accent color */
  accent: string;
  /** Background color */
  background: string;
  /** Text color */
  text: string;
  /** Border color */
  border: string;
  /** Success color */
  success: string;
  /** Warning color */
  warning: string;
  /** Error color */
  error: string;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error message if unsuccessful */
  error?: string;
  /** Additional metadata */
  meta?: {
    /** Total count for paginated results */
    total?: number;
    /** Current page */
    page?: number;
    /** Items per page */
    limit?: number;
    /** Request timestamp */
    timestamp: Date;
  };
}

/**
 * Filter criteria for tasks
 */
export interface TaskFilter {
  /** Filter by project IDs */
  projectIds?: import("./id").ProjectId[];
  /** Filter by label names */
  labels?: string[];
  /** Filter by priority levels */
  priorities?: Array<1 | 2 | 3 | 4>;
  /** Filter by completion status */
  completed?: boolean;
  /** Filter by due date range */
  dueDateRange?: {
    start?: Date;
    end?: Date;
  };
  /** Filter by assigned team members */
  assignedTo?: import("./id").UserId[];
  /** Filter by task status */
  status?: string[];
  /** Search query for title/description */
  searchQuery?: string;
}

/**
 * Sort configuration
 */
export interface SortConfig {
  /** Field to sort by */
  field: string;
  /** Sort direction */
  direction: "asc" | "desc";
}

/**
 * Sync status for data synchronization
 */
export type SyncStatus = "idle" | "syncing" | "error" | "success";

/**
 * Sync configuration
 */
export interface SyncConfig {
  /** Whether auto-sync is enabled */
  autoSync: boolean;
  /** Sync interval in milliseconds */
  syncInterval: number;
  /** Whether to sync on window focus */
  syncOnFocus: boolean;
  /** Whether to sync on network reconnection */
  syncOnReconnect: boolean;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Delay between retry attempts in milliseconds */
  retryDelay: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Number of tasks */
  taskCount: number;
  /** Current sync status */
  syncStatus: SyncStatus;
}

/**
 * Scheduled notification set type
 */
export type ScheduledNotificationSet = Set<
  import("./core").ScheduledNotification
>;
