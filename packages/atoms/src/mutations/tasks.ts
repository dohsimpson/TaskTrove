/**
 * Task mutation atoms
 *
 * Contains mutation atoms for task operations:
 * - Creating tasks
 * - Updating tasks
 * - Deleting tasks
 */

import { v4 as uuidv4 } from "uuid";
import {
  type Task,
  type CreateTaskRequest,
  type CreateTaskResponse,
  CreateTaskResponseSchema,
  TaskCreateSerializationSchema,
  type UpdateTaskResponse,
  type TaskUpdateUnion,
  UpdateTaskResponseSchema,
  TaskUpdateArraySerializationSchema,
  type DeleteTaskRequest,
  type DeleteTaskResponse,
  DeleteTaskResponseSchema,
  TaskDeleteSerializationSchema,
  createTaskId,
  createSectionId,
  INBOX_PROJECT_ID,
} from "@tasktrove/types";
import {
  DEFAULT_TASK_PRIORITY,
  DEFAULT_TASK_TITLE,
  DEFAULT_TASK_COMPLETED,
  DEFAULT_TASK_STATUS,
  DEFAULT_UUID,
  DEFAULT_TASK_SUBTASKS,
  DEFAULT_TASK_COMMENTS,
  DEFAULT_TASK_ATTACHMENTS,
  DEFAULT_RECURRING_MODE,
} from "@tasktrove/constants";
import type { DataFile } from "@tasktrove/types";
import { createMutation } from "./factory";
import { createEntityMutation } from "./entity-factory";

// =============================================================================
// TASK MUTATION ATOMS
// =============================================================================

/**
 * Mutation atom for creating new tasks with optimistic updates
 *
 * Creates a new task and optimistically adds it to the task list.
 * The temporary ID will be replaced with the server-generated ID on success.
 */
export const createTaskMutationAtom = createMutation<
  CreateTaskResponse,
  CreateTaskRequest,
  Task
>({
  method: "POST",
  operationName: "Created task",
  responseSchema: CreateTaskResponseSchema,
  serializationSchema: TaskCreateSerializationSchema,
  testResponseFactory: () => {
    const taskId = createTaskId(uuidv4());
    return {
      success: true,
      taskIds: [taskId],
      message: "Task created successfully (test mode)",
    };
  },
  optimisticDataFactory: (taskData: CreateTaskRequest) => {
    // Create optimistic task with temporary ID
    return {
      id: createTaskId(uuidv4()), // Temporary ID that will be replaced by server response
      completed: DEFAULT_TASK_COMPLETED,
      subtasks: DEFAULT_TASK_SUBTASKS,
      comments: DEFAULT_TASK_COMMENTS,
      attachments: DEFAULT_TASK_ATTACHMENTS,
      status: DEFAULT_TASK_STATUS,
      order: 0,
      createdAt: new Date(), // Always set for new tasks
      completedAt: undefined, // Never set for new tasks
      // Apply all provided data
      ...taskData,
      // Ensure required fields have defaults
      title: taskData.title || DEFAULT_TASK_TITLE,
      priority: taskData.priority || DEFAULT_TASK_PRIORITY,
      sectionId: taskData.sectionId || createSectionId(DEFAULT_UUID),
      projectId: taskData.projectId || INBOX_PROJECT_ID,
      labels: taskData.labels || [],
      // Ensure dates are properly converted if they come in as strings
      dueDate: taskData.dueDate
        ? taskData.dueDate instanceof Date
          ? taskData.dueDate
          : new Date(taskData.dueDate)
        : undefined,
      recurringMode: taskData.recurringMode || DEFAULT_RECURRING_MODE,
    };
  },
  optimisticUpdateFn: (
    taskData: CreateTaskRequest,
    oldData: DataFile,
    optimisticTask?: Task,
  ) => {
    if (!optimisticTask) throw new Error("Optimistic task not provided");

    return {
      ...oldData,
      tasks: [...oldData.tasks, optimisticTask],
    };
  },
});
createTaskMutationAtom.debugLabel = "createTaskMutationAtom";

/**
 * Mutation atom for updating tasks with optimistic updates
 *
 * Updates one or more tasks and optimistically applies changes.
 * Supports both single task and bulk updates.
 *
 * Note: Uses custom optimistic update to handle task-specific logic:
 * - Predicts completedAt changes based on completion status
 * - Converts null to undefined to match API behavior
 */
export const updateTasksMutationAtom = createEntityMutation<
  Task[], // TEntity (optimistic data)
  TaskUpdateUnion, // TRequest (variables)
  UpdateTaskResponse // TResponse
>({
  entity: "task",
  operation: "update",
  schemas: {
    request: TaskUpdateArraySerializationSchema,
    response: UpdateTaskResponseSchema,
  },
  // Custom optimistic update for task-specific behavior
  optimisticUpdateFn: (tasks: TaskUpdateUnion, oldData: DataFile) => {
    // Convert TaskUpdateUnion to array of individual task updates
    const taskUpdates = Array.isArray(tasks) ? tasks : [tasks];

    // Create a map of new tasks for efficient lookup
    const newTasksMap = new Map(taskUpdates.map((task) => [task.id, task]));

    // Update the tasks array with optimistic data
    const updatedTasks = oldData.tasks.map((task: Task) => {
      const newTask = newTasksMap.get(task.id);
      if (!newTask) return task;

      // Smart optimistic update: predict what the server will do
      const optimisticTask = { ...task, ...newTask };

      // If completion status is changing, predict completedAt behavior like the backend
      if (
        newTask.completed !== undefined &&
        newTask.completed !== task.completed
      ) {
        if (newTask.completed === true && task.completed === false) {
          // Transitioning from incomplete to complete - set completedAt
          optimisticTask.completedAt = new Date();
        } else if (newTask.completed === false && task.completed === true) {
          // Transitioning from complete to incomplete - clear completedAt
          optimisticTask.completedAt = undefined;
        }
      }

      // Predict null-to-undefined conversion that the API will do
      // This ensures the optimistic update matches what the API will return
      const cleanedTask: Task = {
        ...optimisticTask,
        dueDate:
          optimisticTask.dueDate === null ? undefined : optimisticTask.dueDate,
        dueTime:
          optimisticTask.dueTime === null ? undefined : optimisticTask.dueTime,
        recurring:
          optimisticTask.recurring === null
            ? undefined
            : optimisticTask.recurring,
        estimation:
          optimisticTask.estimation === null
            ? undefined
            : optimisticTask.estimation,
        projectId:
          optimisticTask.projectId === null
            ? undefined
            : optimisticTask.projectId,
      };

      return cleanedTask;
    });

    return {
      ...oldData,
      tasks: updatedTasks,
    };
  },
});
updateTasksMutationAtom.debugLabel = "updateTasksMutationAtom";

/**
 * Mutation atom for deleting tasks
 *
 * Deletes one or more tasks and optimistically removes them from the task list.
 * Supports bulk deletion.
 *
 * Note: Uses default factory - test response and optimistic update auto-generated.
 */
export const deleteTaskMutationAtom = createEntityMutation<
  Task[],
  DeleteTaskRequest,
  DeleteTaskResponse
>({
  entity: "task",
  operation: "delete",
  schemas: {
    request: TaskDeleteSerializationSchema,
    response: DeleteTaskResponseSchema,
  },
  // Everything else is auto-generated by convention!
});
deleteTaskMutationAtom.debugLabel = "deleteTaskMutationAtom";
