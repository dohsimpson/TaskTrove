import { NextResponse } from "next/server"
import {
  Task,
  INBOX_PROJECT_ID,
  CreateTaskRequestSchema,
  DeleteTaskRequestSchema,
  createTaskId,
  TaskId,
  createSectionId,
  DataFileSerializationSchema,
  DataFileSerialization,
  TaskUpdateUnionSchema,
  UpdateTaskRequest,
  UpdateTaskResponse,
  DeleteTaskResponse,
  CreateTaskResponse,
  ErrorResponse,
} from "@/lib/types"
import { validateRequestBody, createErrorResponse } from "@/lib/utils/validation"
import { safeReadDataFile, safeWriteDataFile } from "@/lib/utils/safe-file-operations"
import {
  withApiLogging,
  logBusinessEvent,
  withFileOperationLogging,
  withPerformanceLogging,
  type EnhancedRequest,
} from "@/lib/middleware/api-logger"
import { withMutexProtection } from "@/lib/utils/api-mutex"
import { v4 as uuidv4 } from "uuid"
import {
  DEFAULT_TASK_COMPLETED,
  DEFAULT_TASK_PRIORITY,
  DEFAULT_TASK_LABELS,
  DEFAULT_TASK_SUBTASKS,
  DEFAULT_TASK_COMMENTS,
  DEFAULT_TASK_ATTACHMENTS,
  DEFAULT_TASK_STATUS,
  DEFAULT_UUID,
  DEFAULT_RECURRING_MODE,
} from "@/lib/constants/defaults"
import { processRecurringTaskCompletion } from "@/lib/utils/recurring-task-processor"

/**
 * GET /api/tasks
 *
 * Fetches all tasks data including tasks, projects, and labels.
 * This API route provides the complete data structure that matches
 * the Jotai atoms used for state management.
 */
async function getTasks(
  request: EnhancedRequest,
): Promise<NextResponse<DataFileSerialization | ErrorResponse>> {
  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-task-data-file",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse("Failed to read data file", "File reading or validation failed", 500)
  }

  // const tasks = fileData.tasks;
  //
  // logBusinessEvent('tasks_fetched', {
  //   tasksCount: tasks.length
  // }, request.context);
  //
  // const response = {
  //   tasks,
  //   meta: {
  //     tasksCount: tasks.length,
  //     timestamp: new Date().toISOString(),
  //   }
  // };

  const serializationResult = DataFileSerializationSchema.safeParse(fileData)
  if (!serializationResult.success) {
    return createErrorResponse("Failed to serialize data file", "Serialization failed", 500)
  }

  const serializedData = serializationResult.data

  return NextResponse.json<DataFileSerialization>(serializedData, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  })
}

export const GET = withMutexProtection(
  withApiLogging(getTasks, {
    endpoint: "/api/tasks",
    module: "api-tasks",
  }),
)

/**
 * POST /api/tasks
 *
 * Creates a new task with the provided data.
 * This endpoint would typically persist to a database.
 */
async function createTask(
  request: EnhancedRequest,
): Promise<NextResponse<CreateTaskResponse | ErrorResponse>> {
  // Validate request body using partial schema to allow defaults
  const validation = await validateRequestBody(request, CreateTaskRequestSchema)
  if (!validation.success) {
    return validation.error
  }

  // Apply defaults for fields that weren't provided and generate required fields
  const newTask: Task = {
    ...validation.data,
    id: createTaskId(uuidv4()),
    completed: DEFAULT_TASK_COMPLETED,
    priority: validation.data.priority ?? DEFAULT_TASK_PRIORITY,
    labels: validation.data.labels ?? DEFAULT_TASK_LABELS,
    subtasks: validation.data.subtasks ?? DEFAULT_TASK_SUBTASKS,
    comments: validation.data.comments ?? DEFAULT_TASK_COMMENTS,
    attachments: validation.data.attachments ?? DEFAULT_TASK_ATTACHMENTS,
    createdAt: new Date(),
    status: validation.data.status ?? DEFAULT_TASK_STATUS,
    sectionId: validation.data.sectionId ?? createSectionId(DEFAULT_UUID),
    projectId: validation.data.projectId ?? INBOX_PROJECT_ID,
    dueDate: validation.data.dueDate, // Use the provided due date
    recurringMode: validation.data.recurringMode ?? DEFAULT_RECURRING_MODE,
  }

  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-task-data-file",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse("Failed to read data file", "File reading or validation failed", 500)
  }

  fileData.tasks.push(newTask)

  const writeSuccess = await withPerformanceLogging(
    () => safeWriteDataFile({ data: fileData }),
    "write-task-data-file",
    request.context,
    500, // 500ms threshold for slow file writes
  )

  if (!writeSuccess) {
    return createErrorResponse("Failed to save data", "File writing failed", 500)
  }

  logBusinessEvent(
    "task_created",
    {
      taskId: newTask.id,
      title: newTask.title,
      projectId: newTask.projectId,
      priority: newTask.priority,
      totalTasks: fileData.tasks.length,
    },
    request.context,
  )

  const response: CreateTaskResponse = {
    success: true,
    taskIds: [newTask.id],
    message: "Task created successfully",
  }

  return NextResponse.json<CreateTaskResponse>(response)
}

export const POST = withMutexProtection(
  withApiLogging(createTask, {
    endpoint: "/api/tasks",
    module: "api-tasks",
  }),
)

/**
 * PATCH /api/tasks
 *
 * Updates multiple tasks. Accepts an array of task updates or single update.
 * This endpoint handles only task-related operations.
 */
async function updateTasks(
  request: EnhancedRequest,
): Promise<NextResponse<UpdateTaskResponse | ErrorResponse>> {
  // Validate request body using the union schema
  const validation = await validateRequestBody(request, TaskUpdateUnionSchema)
  if (!validation.success) {
    return validation.error
  }

  // Normalize to array format
  const updates: UpdateTaskRequest[] = Array.isArray(validation.data)
    ? validation.data
    : [validation.data]

  // Read and validate the current data from the file
  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-task-data-file-for-update",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse("Failed to read data file", "File reading or validation failed", 500)
  }

  // Create maps for efficient O(1) lookups
  const taskMap: Map<string, Task> = new Map(fileData.tasks.map((task) => [task.id, task]))
  const updateMap: Map<string, UpdateTaskRequest & { completedAt?: Date | undefined }> = new Map()

  // Pre-process updates to handle completedAt logic
  for (const update of updates) {
    const existingTask = taskMap.get(update.id)
    if (!existingTask) continue

    // Handle completedAt based on completion status transitions
    let completedAt = existingTask.completedAt
    if (update.completed !== undefined) {
      if (update.completed === true && existingTask.completed === false) {
        // Transitioning from incomplete to complete
        completedAt = new Date()
      } else if (update.completed === false && existingTask.completed === true) {
        // Transitioning from complete to incomplete
        completedAt = undefined
      }
    }

    // Convert null values to undefined for date/time/recurring/estimation fields
    const cleanedUpdate = { ...update, completedAt }
    if (cleanedUpdate.dueDate === null) cleanedUpdate.dueDate = undefined
    if (cleanedUpdate.dueTime === null) cleanedUpdate.dueTime = undefined
    if (cleanedUpdate.recurring === null) cleanedUpdate.recurring = undefined
    if (cleanedUpdate.estimation === null) cleanedUpdate.estimation = undefined

    updateMap.set(update.id, cleanedUpdate)
  }

  // Update the tasks in the file data
  const updatedTasks: Task[] = fileData.tasks.map((task: Task) => {
    const update = updateMap.get(task.id)
    if (!update) return task

    // Create the updated task and ensure null values are converted to undefined
    const updatedTask = { ...task, ...update }

    // Clean null values - TypeScript needs explicit assignment to understand type narrowing
    const cleanedTask: Task = {
      ...updatedTask,
      dueDate: updatedTask.dueDate === null ? undefined : updatedTask.dueDate,
      dueTime: updatedTask.dueTime === null ? undefined : updatedTask.dueTime,
      recurring: updatedTask.recurring === null ? undefined : updatedTask.recurring,
      estimation: updatedTask.estimation === null ? undefined : updatedTask.estimation,
    }

    return cleanedTask
  })

  // Process recurring tasks - generate next instances for completed recurring tasks
  const recurringInstances: Task[] = []
  console.log("Processing updates:", updates.length)
  for (const update of updates) {
    const originalTask = taskMap.get(update.id)
    if (!originalTask) continue
    console.log("Update:", update, "Original task:", originalTask.title)

    // Check if this update completes a recurring task
    if (update.completed === true && originalTask.completed === false) {
      console.log("Processing recurring task completion:", {
        taskId: originalTask.id,
        title: originalTask.title,
        recurring: originalTask.recurring,
        dueDate: originalTask.dueDate,
        hasRecurring: !!originalTask.recurring,
        hasDueDate: !!originalTask.dueDate,
      })

      // Create completed task with current timestamp for recurring processing
      try {
        const completedTask = { ...originalTask, completed: true, completedAt: new Date() }
        const nextInstance = processRecurringTaskCompletion(completedTask)

        console.log(
          "Next instance result:",
          nextInstance
            ? {
                id: nextInstance.id,
                title: nextInstance.title,
                dueDate: nextInstance.dueDate,
                recurring: nextInstance.recurring,
              }
            : "No instance created",
        )

        if (nextInstance) {
          recurringInstances.push(nextInstance)

          logBusinessEvent(
            "recurring_task_instance_created",
            {
              parentTaskId: originalTask.id,
              newTaskId: nextInstance.id,
              recurringPattern: originalTask.recurring,
              nextDueDate: nextInstance.dueDate,
            },
            request.context,
          )
        }
      } catch (error) {
        // Log the error but don't fail the entire request
        console.error("Failed to process recurring task completion:", {
          taskId: originalTask.id,
          title: originalTask.title,
          error: error instanceof Error ? error.message : String(error),
        })

        logBusinessEvent(
          "recurring_task_processing_error",
          {
            taskId: originalTask.id,
            title: originalTask.title,
            recurringPattern: originalTask.recurring,
            error: error instanceof Error ? error.message : String(error),
          },
          request.context,
        )
      }
    }
  }

  // Combine updated tasks with new recurring instances
  const allTasks = [...updatedTasks, ...recurringInstances]

  // Update the file data with all tasks
  const updatedFileData = {
    ...fileData,
    tasks: allTasks,
  }

  const writeSuccess = await withPerformanceLogging(
    () => safeWriteDataFile({ data: updatedFileData }),
    "write-updated-tasks",
    request.context,
    500,
  )

  if (!writeSuccess) {
    return createErrorResponse("Failed to save updated tasks", "File writing failed", 500)
  }

  logBusinessEvent(
    "tasks_updated",
    {
      updatedCount: updates.length,
      recurringInstancesCreated: recurringInstances.length,
      taskIds: updates.map((u) => u.id),
      totalTasks: updatedFileData.tasks.length,
    },
    request.context,
  )

  const responseMessage =
    recurringInstances.length > 0
      ? `${updates.length} task(s) updated successfully, ${recurringInstances.length} recurring instance(s) created`
      : `${updates.length} task(s) updated successfully`

  const response: UpdateTaskResponse = {
    success: true,
    message: responseMessage,
    taskIds: updates.map((u) => u.id),
  }

  return NextResponse.json<UpdateTaskResponse>(response)
}

export const PATCH = withMutexProtection(
  withApiLogging(updateTasks, {
    endpoint: "/api/tasks",
    module: "api-tasks",
  }),
)

/**
 * DELETE /api/tasks
 *
 * Deletes tasks by ID. Accepts either a single task ID or array of task IDs.
 * This endpoint removes tasks from the data file.
 */
async function deleteTasks(
  request: EnhancedRequest,
): Promise<NextResponse<DeleteTaskResponse | ErrorResponse>> {
  // Validate request body using Zod schema
  const validation = await validateRequestBody(request, DeleteTaskRequestSchema)
  if (!validation.success) {
    return validation.error
  }

  const deleteData = validation.data

  // deleteData is now an object with id property
  const taskIds: TaskId[] = [createTaskId(deleteData.id)]

  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-task-data-file-for-delete",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse("Failed to read data file", "File reading or validation failed", 500)
  }

  // Filter out the tasks to be deleted
  const originalTaskCount = fileData.tasks.length
  fileData.tasks = fileData.tasks.filter((task) => !taskIds.includes(task.id))
  const deletedCount = originalTaskCount - fileData.tasks.length

  // Write the updated data back to the file
  const writeSuccess = await withPerformanceLogging(
    () => safeWriteDataFile({ data: fileData }),
    "write-after-task-deletion",
    request.context,
    300,
  )

  if (!writeSuccess) {
    return createErrorResponse("Failed to save changes", "File writing failed", 500)
  }

  logBusinessEvent(
    "tasks_deleted",
    {
      requestedIds: taskIds,
      deletedCount,
      remainingTasks: fileData.tasks.length,
    },
    request.context,
  )

  const responseTaskIds: TaskId[] = taskIds.slice(0, deletedCount)
  const response: DeleteTaskResponse = {
    success: true,
    taskIds: responseTaskIds,
    message: `${deletedCount} task(s) deleted successfully`,
  }

  return NextResponse.json<DeleteTaskResponse>(response)
}

export const DELETE = withMutexProtection(
  withApiLogging(deleteTasks, {
    endpoint: "/api/tasks",
    module: "api-tasks",
  }),
)
