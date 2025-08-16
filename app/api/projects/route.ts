import { NextResponse } from "next/server"
import {
  Project,
  ProjectId,
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
} from "@/lib/types"
import { validateRequestBody, createErrorResponse } from "@/lib/utils/validation"
import { v4 as uuidv4 } from "uuid"
import { createProjectId, createSectionId } from "@/lib/types"
import {
  DEFAULT_PROJECT_SHARED,
  DEFAULT_SECTION_NAME,
  DEFAULT_SECTION_COLOR,
  DEFAULT_PROJECT_COLORS,
  DEFAULT_SECTION_ID,
} from "@/lib/constants/defaults"
import { createSafeProjectNameSlug } from "@/lib/utils/routing"
import {
  withApiLogging,
  logBusinessEvent,
  withFileOperationLogging,
  withPerformanceLogging,
  type EnhancedRequest,
} from "@/lib/middleware/api-logger"
import { withMutexProtection } from "@/lib/utils/api-mutex"
import { safeReadDataFile, safeWriteDataFile } from "@/lib/utils/safe-file-operations"

/**
 * GET /api/projects
 *
 * Fetches all projects data including tasks, projects, and labels.
 * This API route provides the complete data structure that matches
 * the Jotai atoms used for state management.
 */
async function getProjects(
  request: EnhancedRequest,
): Promise<NextResponse<DataFileSerialization | ErrorResponse>> {
  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-projects-data-file",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse("Failed to read data file", "File reading or validation failed", 500)
  }

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
  withApiLogging(getProjects, {
    endpoint: "/api/projects",
    module: "api-projects",
  }),
)

/**
 * POST /api/projects
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
    return createErrorResponse("Failed to read data file", "File reading or validation failed", 500)
  }

  // Apply defaults for fields that weren't provided and generate required fields
  const newProject: Project = {
    ...validation.data,
    id: createProjectId(uuidv4()),
    name: validation.data.name, // Required field
    slug:
      validation.data.slug ??
      createSafeProjectNameSlug(validation.data.name, fileData.projects || []),
    color: validation.data.color ?? DEFAULT_PROJECT_COLORS[0], // Default color if not provided
    shared: validation.data.shared ?? DEFAULT_PROJECT_SHARED,
    sections: validation.data.sections ?? [
      {
        id: createSectionId(DEFAULT_SECTION_ID),
        name: DEFAULT_SECTION_NAME,
        color: DEFAULT_SECTION_COLOR,
      },
    ],
  }

  // Add the new project to the projects array
  fileData.projects.push(newProject)

  const writeSuccess = await withPerformanceLogging(
    () => safeWriteDataFile({ data: fileData }),
    "write-projects-data-file",
    request.context,
    500, // 500ms threshold for slow file writes
  )

  if (!writeSuccess) {
    return createErrorResponse("Failed to save data", "File writing failed", 500)
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

export const POST = withMutexProtection(
  withApiLogging(createProject, {
    endpoint: "/api/projects",
    module: "api-projects",
  }),
)

/**
 * PATCH /api/projects
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
    return createErrorResponse("Failed to save data", "File writing failed", 500)
  }

  logBusinessEvent(
    "projects_updated",
    {
      projectsCount: updates.length,
      updatedProjects: updates.map((u) => ({ id: u.id, taskOrder: u.taskOrder?.length })),
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

export const PATCH = withMutexProtection(
  withApiLogging(updateProjects, {
    endpoint: "/api/projects",
    module: "api-projects",
  }),
)

/**
 * DELETE /api/projects
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

  const { id: projectId } = validation.data

  const fileData = await withFileOperationLogging(
    () => safeReadDataFile(),
    "read-projects-data-file",
    request.context,
  )

  if (!fileData) {
    return createErrorResponse("Failed to read data file", "File reading or validation failed", 500)
  }

  // Filter out the project to be deleted
  const originalProjectCount = fileData.projects.length
  fileData.projects = fileData.projects.filter((project: Project) => project.id !== projectId)
  const deletedCount = originalProjectCount - fileData.projects.length

  // Write the updated data back to the file
  const writeSuccess = await withPerformanceLogging(
    () => safeWriteDataFile({ data: fileData }),
    "write-projects-data-file",
    request.context,
    500, // 500ms threshold for slow file writes
  )

  if (!writeSuccess) {
    return createErrorResponse("Failed to save changes", "File writing failed", 500)
  }

  logBusinessEvent(
    "project_deleted",
    {
      projectId,
      deletedCount,
      remainingProjects: fileData.projects.length,
    },
    request.context,
  )

  const projectIds: ProjectId[] = deletedCount > 0 ? [projectId] : []
  const response: DeleteProjectResponse = {
    success: true,
    projectIds,
    message: `${deletedCount} project(s) deleted successfully`,
  }

  return NextResponse.json<DeleteProjectResponse>(response)
}

export const DELETE = withMutexProtection(
  withApiLogging(deleteProject, {
    endpoint: "/api/projects",
    module: "api-projects",
  }),
)
