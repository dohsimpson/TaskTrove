import { z } from "zod";
import type {
  ProjectId,
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
} from "@tasktrove/types";
import { INBOX_PROJECT_ID } from "@tasktrove/types";

/**
 * Check if a task is in the inbox (either no projectId or explicitly set to INBOX_PROJECT_ID)
 * @param projectId - The project ID to check (can be null/undefined)
 * @returns true if the task is considered to be in the inbox
 */
export function isTaskInInbox(
  projectId: ProjectId | null | undefined,
): boolean {
  return !projectId || projectId === INBOX_PROJECT_ID;
}

/**
 * Formats Zod validation errors into a readable string
 */
export function formatZodErrors(error: z.ZodError): string {
  return error.issues
    .map((err: z.ZodIssue) => {
      const path = err.path.length > 0 ? `${err.path.join(".")}: ` : "";
      return `${path}${err.message}`;
    })
    .join("; ");
}

/**
 * Normalizes null values to undefined for API consistency
 * This function converts null values for specific task fields to undefined
 * to match the backend API behavior and ensure optimistic updates align with server responses
 */
export function normalizeTaskUpdate<
  T extends Task | CreateTaskRequest | UpdateTaskRequest,
>(task: T): T {
  return {
    ...task,
    dueDate: task.dueDate === null ? undefined : task.dueDate,
    dueTime: task.dueTime === null ? undefined : task.dueTime,
    recurring: task.recurring === null ? undefined : task.recurring,
  };
}
