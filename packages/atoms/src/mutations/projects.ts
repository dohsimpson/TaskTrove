/**
 * Project mutation atoms
 *
 * Contains mutation atoms for project operations:
 * - Creating projects
 * - Updating projects
 * - Deleting projects
 */

import { v4 as uuidv4 } from "uuid";
import {
  type Project,
  type CreateProjectRequest,
  type CreateProjectResponse,
  CreateProjectResponseSchema,
  ProjectCreateSerializationSchema,
  type UpdateProjectResponse,
  type ProjectUpdateUnion,
  UpdateProjectResponseSchema,
  ProjectUpdateArraySerializationSchema,
  type DeleteProjectRequest,
  type DeleteProjectResponse,
  DeleteProjectResponseSchema,
  ProjectDeleteSerializationSchema,
  createProjectId,
  createSectionId,
} from "@tasktrove/types";
import { DEFAULT_PROJECT_COLORS, DEFAULT_UUID } from "@tasktrove/constants";
import { createSafeProjectNameSlug } from "@tasktrove/utils/routing";
import { createEntityMutation } from "./entity-factory";

// =============================================================================
// PROJECT MUTATION ATOMS
// =============================================================================

/**
 * Mutation atom for creating projects
 *
 * Creates a new project with a default section and optimistically adds it to the project list.
 * The temporary ID will be replaced with the server-generated ID on success.
 */
export const createProjectMutationAtom = createEntityMutation<
  Project,
  CreateProjectRequest,
  CreateProjectResponse
>({
  entity: "project",
  operation: "create",
  schemas: {
    request: ProjectCreateSerializationSchema,
    response: CreateProjectResponseSchema,
  },
  // Custom optimistic data factory for project-specific defaults (section, slug, color)
  optimisticDataFactory: (
    projectData: CreateProjectRequest,
    oldProjects: Project[],
  ) => {
    return {
      id: createProjectId(uuidv4()), // Temporary ID that will be replaced by server response
      name: projectData.name,
      slug:
        projectData.slug ??
        createSafeProjectNameSlug(projectData.name, oldProjects),
      color: projectData.color ?? DEFAULT_PROJECT_COLORS[0],
      shared: projectData.shared ?? false,
      sections: [
        {
          id: createSectionId(DEFAULT_UUID),
          name: "Default",
          color: "#6b7280",
        },
      ],
    };
  },
  // Auto-generates test response and optimistic update!
});
createProjectMutationAtom.debugLabel = "createProjectMutationAtom";

/**
 * Mutation atom for updating projects with optimistic updates
 *
 * Updates one or more projects and optimistically applies changes.
 * Supports both single project and bulk updates.
 */
export const updateProjectsMutationAtom = createEntityMutation<
  Project[],
  ProjectUpdateUnion,
  UpdateProjectResponse
>({
  entity: "project",
  operation: "update",
  schemas: {
    request: ProjectUpdateArraySerializationSchema,
    response: UpdateProjectResponseSchema,
  },
  // Use default test response and optimistic update
  // (default handles both single and array updates correctly)
});
updateProjectsMutationAtom.debugLabel = "updateProjectsMutationAtom";

/**
 * Mutation atom for deleting projects
 *
 * Deletes one or more projects and optimistically removes them from the project list.
 * Supports bulk deletion.
 */
export const deleteProjectMutationAtom = createEntityMutation<
  Project[],
  DeleteProjectRequest,
  DeleteProjectResponse
>({
  entity: "project",
  operation: "delete",
  schemas: {
    request: ProjectDeleteSerializationSchema,
    response: DeleteProjectResponseSchema,
  },
  // Auto-generates test response and optimistic update!
});
deleteProjectMutationAtom.debugLabel = "deleteProjectMutationAtom";
