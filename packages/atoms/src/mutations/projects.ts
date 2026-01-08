/**
 * Project mutation atoms
 *
 * Contains mutation atoms for project operations:
 * - Creating projects
 * - Updating projects
 * - Deleting projects
 */

import { atom } from "jotai";
import { v4 as uuidv4 } from "uuid";
import { type Project } from "@tasktrove/types/core";
import { ProjectSerializationSchema } from "@tasktrove/types/serialization";
import {
  type CreateProjectRequest,
  type DeleteProjectRequest,
  type ProjectUpdateUnion,
  type UpdateProjectRequest,
  ProjectUpdateArraySerializationSchema,
  ProjectDeleteSerializationSchema,
} from "@tasktrove/types/api-requests";
import {
  type CreateProjectResponse,
  CreateProjectResponseSchema,
  type UpdateProjectResponse,
  UpdateProjectResponseSchema,
  type DeleteProjectResponse,
  DeleteProjectResponseSchema,
} from "@tasktrove/types/api-responses";
import { createProjectId, createGroupId } from "@tasktrove/types/id";
import {
  DEFAULT_PROJECT_COLORS,
  DEFAULT_SECTION_COLORS,
  DEFAULT_SECTION_NAME,
  DEFAULT_UUID,
  PROJECTS_QUERY_KEY,
  getRandomPaletteColor,
} from "@tasktrove/constants";
import { clearNullValues } from "@tasktrove/utils";
import { queryClientAtom } from "@tasktrove/atoms/data/base/query";
import { createEntityMutation } from "./entity-factory";

// =============================================================================
// TYPES & HELPERS
// =============================================================================

export type ProjectCreatePayload = Project;

export const ProjectCreatePayloadSchema = ProjectSerializationSchema;

export const buildProjectCreatePayload = (
  projectData: CreateProjectRequest,
): ProjectCreatePayload => {
  const projectId = createProjectId(uuidv4());
  const projectColor =
    projectData.color ?? getRandomPaletteColor(DEFAULT_PROJECT_COLORS);

  const sections = projectData.sections ?? [
    {
      id: createGroupId(DEFAULT_UUID),
      name: DEFAULT_SECTION_NAME,
      color: getRandomPaletteColor(DEFAULT_SECTION_COLORS),
      type: "section" as const,
      items: [],
      isDefault: true,
    },
  ];

  return clearNullValues({
    ...projectData,
    id: projectId,
    color: projectColor,
    sections,
  });
};

export const buildProjectUpdatePayloads = (
  updates: ProjectUpdateUnion,
  projects: Project[],
): UpdateProjectRequest[] => {
  const updateArray = Array.isArray(updates) ? updates : [updates];

  return updateArray.map((update) => {
    const existing = projects.find((project) => project.id === update.id);
    if (!existing) {
      return clearNullValues(update);
    }

    const mergedProject = {
      ...existing,
      ...update,
    };

    return clearNullValues(mergedProject);
  });
};

// =============================================================================
// PROJECT MUTATION ATOMS
// =============================================================================

const createProjectMutationAtomBase = createEntityMutation<
  Project,
  ProjectCreatePayload,
  CreateProjectResponse
>({
  entity: "project",
  operation: "create",
  schemas: {
    request: ProjectCreatePayloadSchema,
    response: CreateProjectResponseSchema,
  },
  // We already provide a fully built project payload; reuse it for optimistic data
  optimisticDataFactory: (projectPayload) => projectPayload,
});

export const createProjectMutationAtom = atom((get) => {
  const baseMutation = get(createProjectMutationAtomBase);

  const buildPayload = (
    projectData: CreateProjectRequest,
  ): ProjectCreatePayload => buildProjectCreatePayload(projectData);

  return {
    ...baseMutation,
    mutateAsync: async (
      projectData: CreateProjectRequest,
      options?: Parameters<typeof baseMutation.mutateAsync>[1],
    ) => baseMutation.mutateAsync(buildPayload(projectData), options),
    mutate: (
      projectData: CreateProjectRequest,
      options?: Parameters<typeof baseMutation.mutate>[1],
    ) => baseMutation.mutate(buildPayload(projectData), options),
  };
});
createProjectMutationAtom.debugLabel = "createProjectMutationAtom";

const updateProjectsMutationAtomBase = createEntityMutation<
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
});

export const updateProjectsMutationAtom = atom((get) => {
  const baseMutation = get(updateProjectsMutationAtomBase);
  const queryClient = get(queryClientAtom);

  const prepareUpdates = (
    updates: ProjectUpdateUnion,
  ): UpdateProjectRequest[] => {
    const cachedProjects =
      queryClient.getQueryData<Project[]>(PROJECTS_QUERY_KEY) ?? [];
    return buildProjectUpdatePayloads(updates, cachedProjects);
  };

  return {
    ...baseMutation,
    mutateAsync: async (
      updates: ProjectUpdateUnion,
      options?: Parameters<typeof baseMutation.mutateAsync>[1],
    ) => baseMutation.mutateAsync(prepareUpdates(updates), options),
    mutate: (
      updates: ProjectUpdateUnion,
      options?: Parameters<typeof baseMutation.mutate>[1],
    ) => baseMutation.mutate(prepareUpdates(updates), options),
  };
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
