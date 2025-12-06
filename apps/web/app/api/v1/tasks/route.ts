import { NextResponse } from "next/server"
import type { Task } from "@tasktrove/types/core"
import type { GroupId } from "@tasktrove/types/id"
import { createTaskId, TaskId } from "@tasktrove/types/id"
import { INBOX_PROJECT_ID } from "@tasktrove/types/constants"
import {
  CreateTaskRequestSchema,
  DeleteTaskRequestSchema,
  UpdateTaskRequest,
} from "@tasktrove/types/api-requests"
import {
  UpdateTaskResponse,
  DeleteTaskResponse,
  CreateTaskResponse,
  GetTasksResponse,
} from "@tasktrove/types/api-responses"
import { DataFileSerializationSchema } from "@tasktrove/types/data-file"
import { TaskUpdateUnionSchema } from "@tasktrove/types/api-requests"
import { ApiErrorCode } from "@tasktrove/types/api-errors"
import { ErrorResponse } from "@tasktrove/types/api-responses"
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
import { getDefaultSectionId } from "@tasktrove/types/defaults"
import { processRecurringTaskCompletion } from "@tasktrove/utils"
import { addTaskToSection, removeTaskFromSection } from "@tasktrove/atoms/data/tasks/ordering"
import { clearNullValues } from "@tasktrove/utils"
import { log } from "@/lib/utils/logger"

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
  const newTaskId = createTaskId(uuidv4())
  const newTask: Task = {
    ...validation.data,
    id: newTaskId,
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

  // Find the project and add task to section
  const projectId = newTask.projectId
  const project = fileData.projects.find((p) => p.id === projectId)
  if (project) {
    // Determine target section (default section if not specified)
    const defaultSectionId = getDefaultSectionId(project)
    const targetSectionId: GroupId | null = validation.data.sectionId ?? defaultSectionId

    if (targetSectionId) {
      project.sections = addTaskToSection(
        newTask.id,
        targetSectionId,
        undefined, // append to end
        project.sections,
      )
    }
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

    // Convert null values to undefined for optional fields
    const cleanedUpdate = clearNullValues({ ...update, completedAt })

    updateMap.set(update.id, cleanedUpdate)
  }

  // Handle project and section changes - update section.items arrays
  for (const update of updates) {
    const originalTask = taskMap.get(update.id)
    if (!originalTask) continue

    // Check if projectId is actually changing (not just provided with same value)
    const isProjectChanging =
      update.projectId !== undefined && update.projectId !== originalTask.projectId

    // Skip if neither project nor section is changing
    // Also skip if projectId is provided but unchanged AND sectionId is not provided
    if (update.projectId === undefined && update.sectionId === undefined) continue
    if (!isProjectChanging && update.sectionId === undefined) continue

    const taskId = createTaskId(update.id)
    const oldProjectId = originalTask.projectId
    const newProjectId = update.projectId !== undefined ? update.projectId : oldProjectId

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
      // Determine target section
      // If sectionId is specified, use it; otherwise use default section (for project changes)
      const defaultSectionId = getDefaultSectionId(newProject)
      const targetSectionId: GroupId | null = update.sectionId ?? defaultSectionId

      if (targetSectionId) {
        newProject.sections = addTaskToSection(
          taskId,
          targetSectionId,
          undefined,
          newProject.sections,
        )
      }
    }
  }

  // Update the tasks in the file data
  const updatedTasks: Task[] = fileData.tasks.map((task: Task) => {
    const update = updateMap.get(task.id)
    if (!update) return task

    const updatedTask = { ...task, ...update }

    return clearNullValues(updatedTask)
  })
  const updatedTaskMap = new Map(updatedTasks.map((task) => [task.id, task]))

  // Process recurring tasks - generate history copies and advance anchors
  const recurringHistoryTasks: Task[] = []
  log.debug({ module: "TasksAPI", count: updates.length }, "Processing updates")
  for (const update of updates) {
    const originalTask = taskMap.get(update.id)
    if (!originalTask) continue
    log.debug(
      {
        module: "TasksAPI",
        update,
        originalTaskTitle: originalTask.title,
      },
      "Processing task update",
    )

    // Check if this update completes a recurring task
    if (update.completed === true && originalTask.completed === false) {
      log.debug(
        {
          module: "TasksAPI",
          taskId: originalTask.id,
          title: originalTask.title,
          recurring: originalTask.recurring,
          dueDate: originalTask.dueDate,
          hasRecurring: !!originalTask.recurring,
          hasDueDate: !!originalTask.dueDate,
        },
        "Processing recurring task completion",
      )

      // Create completed task with current timestamp for recurring processing
      try {
        const completionTimestamp = new Date()
        const targetTask = updatedTaskMap.get(originalTask.id)
        if (!targetTask) continue

        // set trackingId if not already set, this ensures recurring tasks that do not have trackingId are backfilled
        if (!targetTask.trackingId && targetTask.recurring) {
          targetTask.trackingId = targetTask.id
        }

        const completedSnapshot = cloneTaskSnapshot(targetTask)
        completedSnapshot.completed = true
        completedSnapshot.completedAt = completionTimestamp

        // update due date if provided (used for recalculating auto-rollover recurrence)
        const updatedDueDate = updateMap.get(update.id)?.dueDate
        if (updatedDueDate) {
          completedSnapshot.dueDate =
            updatedDueDate instanceof Date ? updatedDueDate : new Date(updatedDueDate)
        }

        const nextInstance = processRecurringTaskCompletion(completedSnapshot)

        log.debug(
          nextInstance
            ? {
                module: "TasksAPI",
                nextInstanceId: nextInstance.id,
                nextInstanceTitle: nextInstance.title,
                nextInstanceDueDate: nextInstance.dueDate,
                nextInstanceRecurring: nextInstance.recurring,
              }
            : { module: "TasksAPI", result: "No next instance" },
          "Next instance result",
        )

        if (!nextInstance) {
          // Final occurrence - keep the task completed and drop recurrence
          targetTask.completed = true
          targetTask.completedAt = completionTimestamp
          targetTask.recurring = undefined
          continue
        }

        const historyTask = createHistoryTaskFromSnapshot(completedSnapshot)
        recurringHistoryTasks.push(historyTask)

        // Advance anchor task to next occurrence while preserving its original ID
        applyNextInstanceToAnchor(targetTask, nextInstance)

        const completedTaskId = createTaskId(update.id)
        const projectIdForHistory =
          update.projectId ?? historyTask.projectId ?? originalTask.projectId

        if (projectIdForHistory) {
          const targetProject = fileData.projects.find((p) => p.id === projectIdForHistory)
          if (targetProject) {
            const sectionContainingAnchor = targetProject.sections.find((section) =>
              section.items.includes(completedTaskId),
            )
            const defaultSectionId = getDefaultSectionId(targetProject)
            const targetSectionId: GroupId | null =
              update.sectionId ?? sectionContainingAnchor?.id ?? defaultSectionId

            if (targetSectionId) {
              targetProject.sections = addTaskToSection(
                historyTask.id,
                targetSectionId,
                undefined,
                targetProject.sections,
              )
            }
          }
        }

        logBusinessEvent(
          "recurring_task_history_created",
          {
            parentTaskId: originalTask.id,
            historyTaskId: historyTask.id,
            recurringPattern: originalTask.recurring,
            completedAt: completionTimestamp,
            nextDueDate: nextInstance.dueDate,
          },
          request.context,
        )
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
  const allTasks = [...updatedTasks, ...recurringHistoryTasks]

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
      recurringHistoryCreated: recurringHistoryTasks.length,
      taskIds: updates.map((u) => u.id),
      totalTasks: updatedFileData.tasks.length,
    },
    request.context,
  )

  const responseMessage =
    recurringHistoryTasks.length > 0
      ? `${updates.length} task(s) updated successfully, ${recurringHistoryTasks.length} recurring history record(s) added`
      : `${updates.length} task(s) updated successfully`

  const response: UpdateTaskResponse = {
    success: true,
    message: responseMessage,
    taskIds: updates.map((u) => u.id),
  }

  return NextResponse.json<UpdateTaskResponse>(response)
}

function cloneTaskSnapshot(task: Task): Task {
  return {
    ...task,
    labels: [...task.labels],
    comments: [...task.comments],
    subtasks: task.subtasks.map((subtask) => ({ ...subtask })),
  }
}

function createHistoryTaskFromSnapshot(completedSnapshot: Task): Task {
  return clearNullValues({
    ...cloneTaskSnapshot(completedSnapshot),
    id: createTaskId(uuidv4()),
    completed: true,
    recurring: undefined,
  })
}

function applyNextInstanceToAnchor(anchorTask: Task, nextInstance: Task): void {
  anchorTask.completed = false
  anchorTask.completedAt = undefined
  anchorTask.subtasks = nextInstance.subtasks.map((subtask) => ({ ...subtask }))
  anchorTask.dueDate = nextInstance.dueDate
  anchorTask.recurring = nextInstance.recurring
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
