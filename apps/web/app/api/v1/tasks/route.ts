import { NextResponse } from "next/server"
import {
  Task,
  INBOX_PROJECT_ID,
  CreateTaskRequestSchema,
  DeleteTaskRequestSchema,
  createTaskId,
  TaskId,
  DataFileSerializationSchema,
  DataFileSerialization,
  TaskUpdateUnionSchema,
  UpdateTaskRequest,
  UpdateTaskResponse,
  DeleteTaskResponse,
  CreateTaskResponse,
  ErrorResponse,
  ApiErrorCode,
  GetTasksResponse,
  type GroupId,
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
import { withAuthentication } from "@/lib/middleware/auth"
import { withApiVersion } from "@/lib/middleware/api-version"
import { v4 as uuidv4 } from "uuid"
import {
  DEFAULT_TASK_COMPLETED,
  DEFAULT_TASK_PRIORITY,
  DEFAULT_TASK_LABELS,
  DEFAULT_TASK_SUBTASKS,
  DEFAULT_TASK_COMMENTS,
  DEFAULT_RECURRING_MODE,
} from "@tasktrove/constants"
import { DEFAULT_SECTION_ID } from "@tasktrove/types/defaults"
import { processRecurringTaskCompletion } from "@/lib/utils/recurring-task-processor"
import { addTaskToSection, removeTaskFromSection } from "@tasktrove/atoms/data/tasks/ordering"

/**
 * GET /api/v1/tasks
 *
 * Fetches only tasks data with metadata.
 * Returns tasks array with count, timestamp, and version information.
 */
async function getTasks(
  request: EnhancedRequest,
): Promise<NextResponse<GetTasksResponse | ErrorResponse>> {
  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-task-data-file",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse(
      "Failed to read data file",
      "File reading or validation failed",
      500,
      ApiErrorCode.DATA_FILE_READ_ERROR,
    )
  }

  const serializationResult = DataFileSerializationSchema.safeParse(fileData)
  if (!serializationResult.success) {
    return createErrorResponse(
      "Failed to serialize data file",
      "Serialization failed",
      500,
      ApiErrorCode.DATA_FILE_VALIDATION_ERROR,
    )
  }

  const serializedData = serializationResult.data

  // Log business event
  logBusinessEvent(
    "tasks_fetched",
    {
      tasksCount: serializedData.tasks.length,
    },
    request.context,
  )

  // Build response with only tasks and metadata
  const response: GetTasksResponse = {
    tasks: serializedData.tasks,
    meta: {
      count: serializedData.tasks.length,
      timestamp: new Date().toISOString(),
      version: serializedData.version || "v0.7.0",
    },
  }

  return NextResponse.json<GetTasksResponse>(response, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  })
}

export const GET = withApiVersion(
  withMutexProtection(
    withAuthentication(
      withApiLogging(getTasks, {
        endpoint: "/api/v1/tasks",
        module: "api-v1-tasks",
      }),
      { allowApiToken: true },
    ),
  ),
)

/**
 * POST /api/v1/tasks
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
    createdAt: new Date(),
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
    return createErrorResponse(
      "Failed to read data file",
      "File reading or validation failed",
      500,
      ApiErrorCode.DATA_FILE_READ_ERROR,
    )
  }

  fileData.tasks.push(newTask)

  // Determine target section (default section if not specified)
  const targetSectionId: GroupId =
    (validation.data.sectionId as GroupId | undefined) ?? DEFAULT_SECTION_ID
  const projectId = newTask.projectId

  // Find the project and add task to section
  const project = fileData.projects.find((p) => p.id === projectId)
  if (project) {
    project.sections = addTaskToSection(
      newTask.id,
      targetSectionId,
      undefined, // append to end
      project.sections,
    )
  }

  const writeSuccess = await withPerformanceLogging(
    () => safeWriteDataFile({ data: fileData }),
    "write-task-data-file",
    request.context,
    500, // 500ms threshold for slow file writes
  )

  if (!writeSuccess) {
    return createErrorResponse(
      "Failed to save data",
      "File writing failed",
      500,
      ApiErrorCode.DATA_FILE_WRITE_ERROR,
    )
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

export const POST = withApiVersion(
  withMutexProtection(
    withAuthentication(
      withApiLogging(createTask, {
        endpoint: "/api/v1/tasks",
        module: "api-v1-tasks",
      }),
      { allowApiToken: true },
    ),
  ),
)

/**
 * PATCH /api/v1/tasks
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
    return createErrorResponse(
      "Failed to read data file",
      "File reading or validation failed",
      500,
      ApiErrorCode.DATA_FILE_READ_ERROR,
    )
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

    // Convert null values to undefined for date/time/recurring/estimation/projectId fields
    const cleanedUpdate = { ...update, completedAt }
    if (cleanedUpdate.dueDate === null) cleanedUpdate.dueDate = undefined
    if (cleanedUpdate.dueTime === null) cleanedUpdate.dueTime = undefined
    if (cleanedUpdate.recurring === null) cleanedUpdate.recurring = undefined
    if (cleanedUpdate.estimation === null) cleanedUpdate.estimation = undefined
    if (cleanedUpdate.projectId === null) cleanedUpdate.projectId = undefined

    updateMap.set(update.id, cleanedUpdate)
  }

  // Handle project and section changes - update section.items arrays
  for (const update of updates) {
    const originalTask = taskMap.get(update.id)
    if (!originalTask) continue

    // Skip if neither project nor section is changing
    if (update.projectId === undefined && update.sectionId === undefined) continue

    const taskId = createTaskId(update.id)
    const oldProjectId = originalTask.projectId
    const newProjectId = update.projectId !== undefined ? update.projectId : oldProjectId

    // Determine target section
    // If sectionId is specified, use it; otherwise use default section (for project changes)
    const targetSectionId: GroupId = (update.sectionId as GroupId | undefined) ?? DEFAULT_SECTION_ID

    // Remove from old project's section
    const oldProject = fileData.projects.find((p) => p.id === oldProjectId)
    if (oldProject) {
      const oldSection = oldProject.sections.find((s) => s.items.includes(taskId))
      if (oldSection) {
        oldProject.sections = removeTaskFromSection(taskId, oldSection.id, oldProject.sections)
      }
    }

    // Add to new project's section
    const newProject = fileData.projects.find((p) => p.id === newProjectId)
    if (newProject) {
      newProject.sections = addTaskToSection(
        taskId,
        targetSectionId,
        undefined,
        newProject.sections,
      )
    }
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
      projectId: updatedTask.projectId === null ? undefined : updatedTask.projectId,
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
    return createErrorResponse(
      "Failed to save updated tasks",
      "File writing failed",
      500,
      ApiErrorCode.DATA_FILE_WRITE_ERROR,
    )
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

export const PATCH = withApiVersion(
  withMutexProtection(
    withAuthentication(
      withApiLogging(updateTasks, {
        endpoint: "/api/v1/tasks",
        module: "api-v1-tasks",
      }),
      { allowApiToken: true },
    ),
  ),
)

/**
 * DELETE /api/v1/tasks
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

  const { ids: taskIdsToDelete } = validation.data

  // Convert to TaskId array
  const taskIds: TaskId[] = taskIdsToDelete.map((id) => createTaskId(id))

  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-task-data-file-for-delete",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse(
      "Failed to read data file",
      "File reading or validation failed",
      500,
      ApiErrorCode.DATA_FILE_READ_ERROR,
    )
  }

  // Remove tasks from section.items arrays before deleting
  for (const taskId of taskIds) {
    const task = fileData.tasks.find((t) => t.id === taskId)
    if (!task) continue

    const project = fileData.projects.find((p) => p.id === task.projectId)
    if (project) {
      const section = project.sections.find((s) => s.items.includes(taskId))
      if (section) {
        project.sections = removeTaskFromSection(taskId, section.id, project.sections)
      }
    }
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
    return createErrorResponse(
      "Failed to save changes",
      "File writing failed",
      500,
      ApiErrorCode.DATA_FILE_WRITE_ERROR,
    )
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

export const DELETE = withApiVersion(
  withMutexProtection(
    withAuthentication(
      withApiLogging(deleteTasks, {
        endpoint: "/api/v1/tasks",
        module: "api-v1-tasks",
      }),
      { allowApiToken: true },
    ),
  ),
)
