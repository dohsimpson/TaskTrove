import type { Task } from "./core";
import {
  CreateTaskRequestSchema,
  type CreateTaskRequest,
} from "./api-requests";

/**
 * Safely converts a Task to a CreateTaskRequest by removing fields that shouldn't be included.
 * Uses Zod validation to ensure the result conforms to CreateTaskRequestSchema.
 *
 * @param task - The task to convert
 * @returns A validated CreateTaskRequest object
 * @throws Error if the resulting data doesn't conform to CreateTaskRequestSchema
 */
export function taskToCreateTaskRequest(task: Task): CreateTaskRequest {
  // Extract only the fields that are valid for CreateTaskRequest, filtering out undefined values
  const taskData: Record<string, unknown> = {
    title: task.title,
  };

  // Only include defined optional fields
  if (task.description !== undefined) {
    taskData.description = task.description;
  }
  if (task.dueDate !== undefined) {
    taskData.dueDate = task.dueDate;
  }
  if (task.dueTime !== undefined) {
    taskData.dueTime = task.dueTime;
  }
  if (task.projectId !== undefined) {
    taskData.projectId = task.projectId;
  }
  if (task.recurring !== undefined) {
    taskData.recurring = task.recurring;
  }
  if (task.estimation !== undefined) {
    taskData.estimation = task.estimation;
  }
  // always truth values here
  taskData.labels = task.labels;
  taskData.subtasks = task.subtasks;
  taskData.comments = task.comments;
  taskData.recurringMode = task.recurringMode;
  taskData.priority = task.priority;

  // Validate with Zod schema to ensure type safety
  const result = CreateTaskRequestSchema.safeParse(taskData);

  if (!result.success) {
    throw new Error(
      `Failed to convert Task to CreateTaskRequest: ${result.error.message}`,
    );
  }

  return result.data;
}
