import { z } from "zod";
import type { ProjectId } from "@tasktrove/types/id";
import type { Task } from "@tasktrove/types/core";
import type {
  CreateTaskRequest,
  UpdateTaskRequest,
} from "@tasktrove/types/api-requests";
import { INBOX_PROJECT_ID } from "@tasktrove/types/constants";
import { clearNullValues } from "./object-utils";

/**
 * Check if a task should be displayed in the inbox (includes orphaned tasks)
 * @param projectId - The project ID to check (can be null/undefined)
 * @param projectIds - Set of all valid project IDs
 * @returns true if the task should be displayed in inbox
 */
export function shouldTaskBeInInbox(
  projectId: ProjectId | null | undefined,
  projectIds: Set<ProjectId>,
): boolean {
  // Task should be in inbox if:
  // 1. Explicitly in inbox (null projectId or INBOX_PROJECT_ID)
  // 2. Has projectId but that project doesn't exist (orphaned task)
  return (
    !projectId ||
    projectId === INBOX_PROJECT_ID ||
    (projectId && !projectIds.has(projectId))
  );
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
 * This function converts null values to undefined
 * to match the backend API behavior and ensure optimistic updates align with server responses
 */
export function normalizeTaskUpdate<
  T extends Task | CreateTaskRequest | UpdateTaskRequest,
>(task: T): T {
  return clearNullValues(task);
}
