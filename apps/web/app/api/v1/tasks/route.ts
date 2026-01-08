import { NextResponse } from "next/server"
import type { Task } from "@tasktrove/types/core"
import { TaskSchema } from "@tasktrove/types/core"
import { createTaskId, GroupIdSchema, TaskId } from "@tasktrove/types/id"
import { DeleteTaskRequestSchema, UpdateTaskRequest } from "@tasktrove/types/api-requests"
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
import { clearNullValues } from "@tasktrove/utils"

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
  // Validate request body - now expects full Task payload (with optional sectionId for placement)
  const TaskPayloadSchema = TaskSchema.extend({
    sectionId: GroupIdSchema.optional(),
  })

  const validation = await validateRequestBody(request, TaskPayloadSchema)
  if (!validation.success) {
    return validation.error
  }

  const { sectionId, ...taskPayload } = validation.data
  void sectionId // section placement handled client-side
  const newTask: Task = clearNullValues(taskPayload)

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

  // Update tasks with minimal processing - server trusts provided payload
  const taskMap: Map<string, Task> = new Map(fileData.tasks.map((task) => [task.id, task]))

  for (const update of updates) {
    const existingTask = taskMap.get(update.id)
    if (!existingTask) continue

    const { sectionId, ...taskUpdate } = update
    void sectionId // section placement handled client-side

    const updatedTask = clearNullValues({ ...existingTask, ...taskUpdate })
    taskMap.set(update.id, updatedTask)
  }

  const updatedFileData = {
    ...fileData,
    tasks: Array.from(taskMap.values()),
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
      taskIds: updates.map((u) => u.id),
      totalTasks: updatedFileData.tasks.length,
    },
    request.context,
  )

  const response: UpdateTaskResponse = {
    success: true,
    message: `${updates.length} task(s) updated successfully`,
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
