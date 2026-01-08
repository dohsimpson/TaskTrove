import { NextResponse } from "next/server"
import { validateRequestBody, createErrorResponse } from "@/lib/utils/validation"
import type { Project } from "@tasktrove/types/core"
import { ProjectSchema } from "@tasktrove/types/core"
import {
  DeleteProjectRequestSchema,
  ProjectUpdateUnionSchema,
  UpdateProjectRequest,
} from "@tasktrove/types/api-requests"
import {
  CreateProjectResponse,
  UpdateProjectResponse,
  DeleteProjectResponse,
  GetProjectsResponse,
} from "@tasktrove/types/api-responses"
import { ApiErrorCode } from "@tasktrove/types/api-errors"
import { ErrorResponse } from "@tasktrove/types/api-responses"
import { DataFileSerializationSchema } from "@tasktrove/types/data-file"
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
import { safeReadDataFile, safeWriteDataFile } from "@/lib/utils/safe-file-operations"
import { clearNullValues } from "@tasktrove/utils"

/**
 * GET /api/v1/projects
 *
 * Fetches only projects data with metadata.
 * Returns projects array with count, timestamp, and version information.
 */
async function getProjects(
  request: EnhancedRequest,
): Promise<NextResponse<GetProjectsResponse | ErrorResponse>> {
  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-projects-data-file",
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
    "projects_fetched",
    {
      projectsCount: serializedData.projects.length,
    },
    request.context,
  )

  // Build response with only projects and metadata
  const response: GetProjectsResponse = {
    projects: serializedData.projects,
    meta: {
      count: serializedData.projects.length,
      timestamp: new Date().toISOString(),
      version: serializedData.version || "v0.7.0",
    },
  }

  return NextResponse.json<GetProjectsResponse>(response, {
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
      withApiLogging(getProjects, {
        endpoint: "/api/v1/projects",
        module: "api-v1-projects",
      }),
      { allowApiToken: true },
    ),
  ),
)

/**
 * POST /api/v1/projects
 *
 * Creates a new project with the provided data.
 */
async function createProject(
  request: EnhancedRequest,
): Promise<NextResponse<CreateProjectResponse | ErrorResponse>> {
  // Validate request body - now expects a fully constructed Project payload
  const validation = await validateRequestBody(request, ProjectSchema)
  if (!validation.success) {
    return validation.error
  }

  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-projects-data-file",
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

  const newProject: Project = clearNullValues(validation.data)

  // Add the new project to the projects array
  fileData.projects.push(newProject)

  const writeSuccess = await withPerformanceLogging(
    () => safeWriteDataFile({ data: fileData }),
    "write-projects-data-file",
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
    "project_created",
    {
      projectId: newProject.id,
      name: newProject.name,
      color: newProject.color,
      totalProjects: fileData.projects.length,
    },
    request.context,
  )

  const response: CreateProjectResponse = {
    success: true,
    projectIds: [newProject.id],
    message: "Project created successfully",
  }

  return NextResponse.json<CreateProjectResponse>(response)
}

export const POST = withApiVersion(
  withMutexProtection(
    withAuthentication(
      withApiLogging(createProject, {
        endpoint: "/api/v1/projects",
        module: "api-v1-projects",
      }),
      { allowApiToken: true },
    ),
  ),
)

/**
 * PATCH /api/v1/projects
 *
 * Updates projects. Accepts an array of project updates or single update.
 */
async function updateProjects(
  request: EnhancedRequest,
): Promise<NextResponse<UpdateProjectResponse | ErrorResponse>> {
  // Validate request body using the union schema
  const validation = await validateRequestBody(request, ProjectUpdateUnionSchema)
  if (!validation.success) {
    return validation.error
  }

  // Normalize to array format
  const updates: UpdateProjectRequest[] = Array.isArray(validation.data)
    ? validation.data
    : [validation.data]

  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-projects-data-file",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse(
      "Failed to update projects",
      "File reading or validation failed",
      500,
    )
  }

  // Create maps for efficient O(1) lookups
  const updateMap: Map<string, (typeof updates)[0]> = new Map(
    updates.map((update) => [update.id, update]),
  )

  // Update projects using merge logic (similar to tasks PATCH endpoint)
  const finalProjects = fileData.projects.map((project: Project) => {
    const update = updateMap.get(project.id)
    if (!update) return project

    // Merge update into project (all derived values should already be included)
    return clearNullValues({ ...project, ...update })
  })

  // Update the file data with new projects
  const updatedFileData = {
    ...fileData,
    projects: finalProjects,
  }

  const writeSuccess = await withPerformanceLogging(
    () => safeWriteDataFile({ data: updatedFileData }),
    "write-projects-data-file",
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
    "projects_updated",
    {
      projectsCount: updates.length,
      updatedProjects: updates.map((u) => ({ id: u.id })),
      totalProjects: finalProjects.length,
    },
    request.context,
  )

  // Get the actual updated projects from finalProjects
  const updatedProjects = finalProjects.filter((project: Project) =>
    updates.some((update) => update.id === project.id),
  )

  const response: UpdateProjectResponse = {
    success: true,
    projects: updatedProjects,
    count: updates.length,
    message: `${updates.length} project(s) updated successfully`,
  }

  return NextResponse.json<UpdateProjectResponse>(response)
}

export const PATCH = withApiVersion(
  withMutexProtection(
    withAuthentication(
      withApiLogging(updateProjects, {
        endpoint: "/api/v1/projects",
        module: "api-v1-projects",
      }),
      { allowApiToken: true },
    ),
  ),
)

/**
 * DELETE /api/v1/projects
 *
 * Deletes a project by ID. Accepts a single project ID.
 * This endpoint removes the project from the data file.
 */
async function deleteProject(
  request: EnhancedRequest,
): Promise<NextResponse<DeleteProjectResponse | ErrorResponse>> {
  // Validate request body using Zod schema
  const validation = await validateRequestBody(request, DeleteProjectRequestSchema)
  if (!validation.success) {
    return validation.error
  }

  const { ids: projectIdsToDelete } = validation.data

  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-projects-data-file",
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

  // Identify which requested IDs actually exist before filtering
  const existingProjectIds = projectIdsToDelete.filter((id) =>
    fileData.projects.some((project) => project.id === id),
  )

  // Filter out the projects to be deleted
  const originalProjectCount = fileData.projects.length
  fileData.projects = fileData.projects.filter(
    (project: Project) => !projectIdsToDelete.includes(project.id),
  )
  const deletedCount = originalProjectCount - fileData.projects.length

  // Write the updated data back to the file
  const writeSuccess = await withPerformanceLogging(
    () => safeWriteDataFile({ data: fileData }),
    "write-projects-data-file",
    request.context,
    500, // 500ms threshold for slow file writes
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
    "project_deleted",
    {
      projectIds: projectIdsToDelete,
      deletedCount,
      remainingProjects: fileData.projects.length,
    },
    request.context,
  )

  const response: DeleteProjectResponse = {
    success: true,
    projectIds: existingProjectIds, // Return IDs that actually existed and were deleted
    message: `${deletedCount} project(s) deleted successfully`,
  }

  return NextResponse.json<DeleteProjectResponse>(response)
}

export const DELETE = withApiVersion(
  withMutexProtection(
    withAuthentication(
      withApiLogging(deleteProject, {
        endpoint: "/api/v1/projects",
        module: "api-v1-projects",
      }),
      { allowApiToken: true },
    ),
  ),
)
