import { NextResponse } from "next/server"
import {
  Project,
  DeleteProjectRequestSchema,
  CreateProjectRequestSchema,
  CreateProjectResponse,
  UpdateProjectResponse,
  DeleteProjectResponse,
  ProjectUpdateUnionSchema,
  UpdateProjectRequest,
  DataFileSerializationSchema,
  DataFileSerialization,
  ErrorResponse,
  ApiErrorCode,
  GetProjectsResponse,
} from "@/lib/types"
import { validateRequestBody, createErrorResponse } from "@/lib/utils/validation"
import { v4 as uuidv4 } from "uuid"
import { createProjectId, createGroupId } from "@/lib/types"
import {
  DEFAULT_PROJECT_SHARED,
  DEFAULT_SECTION_NAME,
  DEFAULT_SECTION_COLOR,
  DEFAULT_PROJECT_COLORS,
  DEFAULT_UUID,
} from "@tasktrove/constants"
import { createSafeProjectNameSlug } from "@/lib/utils/routing"
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
  // Validate request body using partial schema to allow defaults
  const validation = await validateRequestBody(request, CreateProjectRequestSchema)
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

  // Apply defaults for fields that weren't provided and generate required fields
  const newProject: Project = {
    ...validation.data,
    id: createProjectId(uuidv4()),
    name: validation.data.name, // Required field
    slug:
      validation.data.slug ?? createSafeProjectNameSlug(validation.data.name, fileData.projects),
    color: validation.data.color ?? DEFAULT_PROJECT_COLORS[0], // Default color if not provided
    shared: validation.data.shared ?? DEFAULT_PROJECT_SHARED,
    sections: validation.data.sections ?? [
      {
        id: createGroupId(DEFAULT_UUID),
        name: DEFAULT_SECTION_NAME,
        slug: "",
        color: DEFAULT_SECTION_COLOR,
        type: "section" as const,
        items: [],
      },
    ],
  }

  // Add the new project to the projects array
  fileData.projects.push(newProject)

  // Ensure the project is added to the root project group so it appears in the sidebar
  fileData.projectGroups.items.push(newProject.id)

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

    // If name is being updated but slug is not explicitly provided, regenerate slug
    const updatedProject = { ...project, ...update }
    if (update.name && update.name !== project.name && !update.slug) {
      // Filter out current project from slug generation to avoid self-collision
      const otherProjects = fileData.projects.filter((p) => p.id !== project.id)
      updatedProject.slug = createSafeProjectNameSlug(update.name, otherProjects)
    }

    return updatedProject
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
    ),
  ),
)
