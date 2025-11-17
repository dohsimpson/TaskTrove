/**
 * Task mutation atoms
 *
 * Contains mutation atoms for task operations:
 * - Creating tasks
 * - Updating tasks
 * - Deleting tasks
 */

import { v4 as uuidv4 } from "uuid";
import { type Task } from "@tasktrove/types/core";
import {
  type CreateTaskRequest,
  type DeleteTaskRequest,
  TaskCreateSerializationSchema,
  type TaskUpdateUnion,
  TaskUpdateArraySerializationSchema,
  TaskDeleteSerializationSchema,
} from "@tasktrove/types/api-requests";
import {
  type CreateTaskResponse,
  CreateTaskResponseSchema,
  type UpdateTaskResponse,
  UpdateTaskResponseSchema,
  type DeleteTaskResponse,
  DeleteTaskResponseSchema,
} from "@tasktrove/types/api-responses";
import { createTaskId } from "@tasktrove/types/id";
import { INBOX_PROJECT_ID } from "@tasktrove/types/constants";
import {
  DEFAULT_TASK_PRIORITY,
  DEFAULT_TASK_TITLE,
  DEFAULT_TASK_COMPLETED,
  DEFAULT_TASK_SUBTASKS,
  DEFAULT_TASK_COMMENTS,
  DEFAULT_RECURRING_MODE,
  TASKS_QUERY_KEY,
  PROJECTS_QUERY_KEY,
} from "@tasktrove/constants";
import { clearNullValues } from "@tasktrove/utils";
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
  Task[],
  Task
>({
  method: "POST",
  operationName: "Created task",
  resourceQueryKey: TASKS_QUERY_KEY,
  defaultResourceValue: [],
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
      createdAt: new Date(), // Always set for new tasks
      completedAt: undefined, // Never set for new tasks
      // Apply all provided data
      ...taskData,
      // Ensure required fields have defaults
      title: taskData.title || DEFAULT_TASK_TITLE,
      priority: taskData.priority || DEFAULT_TASK_PRIORITY,
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
    _taskData: CreateTaskRequest,
    oldTasks: Task[],
    optimisticTask?: Task,
  ) => {
    if (!optimisticTask) throw new Error("Optimistic task not provided");
    return [...oldTasks, optimisticTask];
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
 * - Invalidates projects cache when tasks move between projects/sections
 */
export const updateTasksMutationAtom = createEntityMutation<
  Task, // TEntity (individual entity type)
  TaskUpdateUnion, // TRequest (variables)
  UpdateTaskResponse // TResponse
>({
  entity: "task",
  operation: "update",
  schemas: {
    request: TaskUpdateArraySerializationSchema,
    response: UpdateTaskResponseSchema,
  },
  // Invalidate both tasks and projects queries since task updates can modify project sections
  invalidateQueryKeys: [TASKS_QUERY_KEY, PROJECTS_QUERY_KEY],
  // Custom optimistic update for task-specific behavior
  optimisticUpdateFn: (tasks: TaskUpdateUnion, oldTasks: Task[]) => {
    // Convert TaskUpdateUnion to array of individual task updates
    const taskUpdates = Array.isArray(tasks) ? tasks : [tasks];

    // Create a map of new tasks for efficient lookup
    const newTasksMap = new Map(taskUpdates.map((task) => [task.id, task]));

    // Update the tasks array with optimistic data
    const updatedTasks = oldTasks.map((task: Task) => {
      const newTask = newTasksMap.get(task.id);
      if (!newTask) return task;

      const sanitizedNewTask: Partial<Task> = clearNullValues({
        ...newTask,
      });

      const isCompletingRecurringTask =
        task.recurring &&
        task.completed === false &&
        sanitizedNewTask.completed === true;

      // Smart optimistic update: predict what the server will do
      let optimisticTask: Task;
      if (isCompletingRecurringTask) {
        // Server keeps the anchor task incomplete; only merge non-completion fields
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { completed, completedAt, ...rest } = sanitizedNewTask;
        optimisticTask = { ...task, ...rest };
      } else {
        optimisticTask = { ...task, ...sanitizedNewTask };

        // If completion status is changing, predict completedAt behavior like the backend
        if (
          sanitizedNewTask.completed !== undefined &&
          sanitizedNewTask.completed !== task.completed
        ) {
          if (sanitizedNewTask.completed === true && task.completed === false) {
            // Transitioning from incomplete to complete - set completedAt
            optimisticTask.completedAt = new Date();
          } else if (
            sanitizedNewTask.completed === false &&
            task.completed === true
          ) {
            // Transitioning from complete to incomplete - clear completedAt
            optimisticTask.completedAt = undefined;
          }
        }
      }

      // Predict null-to-undefined conversion that the API will do
      // This ensures the optimistic update matches what the API will return
      return clearNullValues(optimisticTask);
    });

    return updatedTasks;
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
