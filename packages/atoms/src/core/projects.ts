/**
 * Project management atoms for TaskTrove
 *
 * Data persistence strategy:
 * - Project data operations (add, update, delete, sections) use server mutations
 * - View state changes remain localStorage-only for performance
 * - Current project selection remains localStorage-only as UI state
 */

import { atom } from "jotai";
import { v4 as uuidv4 } from "uuid";
import {
  handleAtomError,
  createAtomWithStorage,
  namedAtom,
  withErrorHandling,
} from "@tasktrove/atoms/utils/atom-helpers";
import type { Project, ProjectSection } from "@tasktrove/types/core";
import type { ProjectId, GroupId, TaskId } from "@tasktrove/types/id";
import type { UpdateProjectRequest } from "@tasktrove/types/api-requests";
import {
  DEFAULT_INBOX_NAME,
  DEFAULT_INBOX_COLOR,
  DEFAULT_UUID,
  DEFAULT_SECTION_NAME,
  DEFAULT_SECTION_COLOR,
} from "@tasktrove/constants";
import { INBOX_PROJECT_ID } from "@tasktrove/types/constants";
import { createGroupId } from "@tasktrove/types/id";
import { ProjectIdSchema } from "@tasktrove/types/id";
import { getDefaultSectionId } from "@tasktrove/types/defaults";
import { projectsAtom } from "@tasktrove/atoms/data/base/atoms";
import {
  updateProjectsMutationAtom,
  createProjectMutationAtom,
  deleteProjectMutationAtom,
} from "@tasktrove/atoms/mutations/projects";
import { deleteTasksAtom } from "@tasktrove/atoms/core/tasks";
import { recordOperationAtom } from "@tasktrove/atoms/core/history";
import { log } from "@tasktrove/atoms/utils/atom-helpers";
import { clearNullValues } from "@tasktrove/utils";

// =============================================================================
// BASE ATOMS
// =============================================================================

/**
 * Default inbox project definition
 */
const createDefaultInboxProject = (): Project => ({
  id: INBOX_PROJECT_ID,
  name: DEFAULT_INBOX_NAME,
  slug: "inbox",
  color: DEFAULT_INBOX_COLOR,
  sections: [
    {
      id: createGroupId(DEFAULT_UUID),
      name: DEFAULT_SECTION_NAME,
      slug: "",
      color: DEFAULT_SECTION_COLOR,
      type: "section" as const,
      items: [],
      isDefault: true,
    },
  ],
});

// projectsAtom now imported from './base' to avoid circular dependencies

/**
 * Currently selected project ID
 */
export const currentProjectIdAtom = createAtomWithStorage<string | null>(
  "current-project-id",
  null,
);
currentProjectIdAtom.debugLabel = "currentProjectIdAtom";

/**
 * Special inbox project that acts as the default project for uncategorized tasks
 * This is a derived atom that gets the inbox project from projectsAtom
 * The inbox project is guaranteed to exist in projectsAtom
 */
export const inboxProjectAtom = namedAtom(
  "inboxProjectAtom",
  atom<Project>((get) =>
    withErrorHandling(
      () => {
        const projects = get(projectsAtom);
        const inboxProject = projects.find(
          (p: Project) => p.id === INBOX_PROJECT_ID,
        );

        if (inboxProject) {
          return inboxProject;
        }

        // This should never happen since projectsAtom guarantees inbox exists
        // But we provide a fallback just in case
        log.warn(
          { module: "projects" },
          "Inbox project not found in projectsAtom, returning default",
        );
        return createDefaultInboxProject();
      },
      "inboxProjectAtom",
      createDefaultInboxProject(),
    ),
  ),
);

// =============================================================================
// WRITE-ONLY ACTION ATOMS
// =============================================================================

/**
 * Adds a new project
 */
export const addProjectAtom = atom(
  null,
  async (
    get,
    set,
    projectData: {
      name: string;
      color: string;
      groupId?: GroupId; // Projects will be added to groups instead of global ordering
    },
  ) => {
    try {
      // Create project using the CREATE endpoint
      const createProjectMutation = get(createProjectMutationAtom);
      const result = await createProjectMutation.mutateAsync({
        name: projectData.name,
        color: projectData.color,
      });

      // Get the first (and only) project ID from the response
      const newProjectId = result.projectIds[0];

      // Record the operation for undo/redo feedback
      set(recordOperationAtom, `Added project: "${projectData.name}"`);

      return newProjectId;
    } catch (error) {
      handleAtomError(error, "addProject");
      throw error;
    }
  },
);
addProjectAtom.debugLabel = "addProjectAtom";

/**
 * Updates project properties (name, color, favorite, etc.)
 * Does not affect ordering
 * Uses server mutation for persistence
 */
export const updateProjectAtom = atom(
  null,
  async (
    get,
    set,
    update: { projectId: ProjectId; updates: Partial<Omit<Project, "id">> },
  ) => {
    try {
      const projects = get(projectsAtom);
      const updatedProjects = projects.map((project: Project) =>
        project.id === update.projectId
          ? { ...project, ...update.updates }
          : project,
      );

      // Use server mutation for persistence
      const updateProjectsMutation = get(updateProjectsMutationAtom);
      await updateProjectsMutation.mutateAsync(updatedProjects);
    } catch (error) {
      handleAtomError(error, "updateProject");
      throw error;
    }
  },
);
updateProjectAtom.debugLabel = "updateProjectAtom";

/**
 * Batch updates multiple projects at once
 * Takes an array of UpdateProjectRequest (partial project with required id)
 * Uses server mutation for persistence
 */
export const updateProjectsAtom = namedAtom(
  "updateProjectsAtom",
  atom(null, async (get, set, updateRequests: UpdateProjectRequest[]) => {
    try {
      if (updateRequests.length === 0) return;

      const projects = get(projectsAtom);

      // Create a map of projectId to updates for efficient lookup
      const updatesMap = new Map(updateRequests.map((req) => [req.id, req]));

      // Apply all updates to the projects array
      const updatedProjects: Project[] = projects.map((project: Project) => {
        const updates = updatesMap.get(project.id);
        if (!updates) return project;

        // Merge and clean null values to match Project schema
        return clearNullValues({ ...project, ...updates });
      });

      // Use server mutation for persistence
      const updateProjectsMutation = get(updateProjectsMutationAtom);
      await updateProjectsMutation.mutateAsync(updatedProjects);
    } catch (error) {
      handleAtomError(error, "updateProjectsAtom");
      throw error;
    }
  }),
);

/**
 * Removes a project
 * Uses server mutation for persistence
 */
export const deleteProjectAtom = atom(
  null,
  async (get, set, projectId: ProjectId) => {
    try {
      const projects = get(projectsAtom);
      const projectToDelete = projects.find((p: Project) => p.id === projectId);

      if (!projectToDelete) return;

      // Delete project using the DELETE endpoint
      const deleteProjectMutation = get(deleteProjectMutationAtom);
      await deleteProjectMutation.mutateAsync({ ids: [projectId] });

      // Clear current project if it was deleted
      const currentProjectId = get(currentProjectIdAtom);
      if (currentProjectId === projectId) {
        set(currentProjectIdAtom, null);
      }

      // Record the operation for undo/redo feedback
      set(recordOperationAtom, `Deleted project: "${projectToDelete.name}"`);
    } catch (error) {
      handleAtomError(error, "deleteProject");
      throw error;
    }
  },
);
deleteProjectAtom.debugLabel = "deleteProjectAtom";

/**
 * Atom for deleting multiple projects at once
 * Used for bulk deletion operations like "delete contained resources" in groups
 */
export const deleteProjectsAtom = atom(
  null,
  async (get, set, projectIds: ProjectId[]) => {
    try {
      if (projectIds.length === 0) return;

      // Delete projects using the DELETE endpoint
      const deleteProjectMutation = get(deleteProjectMutationAtom);
      await deleteProjectMutation.mutateAsync({ ids: projectIds });

      // Clear current project if it was deleted
      const currentProjectId = get(currentProjectIdAtom);
      if (
        currentProjectId &&
        projectIds.some((id) => id === currentProjectId)
      ) {
        set(currentProjectIdAtom, null);
      }

      // Record the operation for undo/redo feedback
      set(recordOperationAtom, `Deleted ${projectIds.length} project(s)`);
    } catch (error) {
      handleAtomError(error, "deleteProjects");
      throw error;
    }
  },
);
deleteProjectsAtom.debugLabel = "deleteProjectsAtom";

// =============================================================================
// DERIVED READ ATOMS
// =============================================================================

/**
 * Projects excluding the special inbox project (for display in project lists)
 * The inbox project exists but should not appear in user-facing project lists
 */
export const visibleProjectsAtom = namedAtom(
  "visibleProjectsAtom",
  atom((get) =>
    withErrorHandling(
      () => {
        const projects = get(projectsAtom);
        return projects.filter((project) => project.id !== INBOX_PROJECT_ID);
      },
      "visibleProjectsAtom",
      [],
    ),
  ),
);

/**
 * All projects including the special inbox project (for internal logic)
 * Use this when you need access to all projects including inbox
 */
export const allProjectsAtom = namedAtom(
  "allProjectsAtom",
  atom((get) =>
    withErrorHandling(
      () => {
        const projects = get(projectsAtom);
        // projectsAtom now guarantees that inbox exists, so we can just return projects
        return projects;
      },
      "allProjectsAtom",
      [],
    ),
  ),
);

/**
 * Set of all valid project IDs
 * Used for efficient lookup when checking for orphaned tasks
 */
export const projectIdsAtom = namedAtom(
  "projectIdsAtom",
  atom((get) =>
    withErrorHandling(
      () => {
        const projects = get(projectsAtom);
        return new Set(projects.map((p: Project) => p.id));
      },
      "projectIdsAtom",
      new Set<ProjectId>(),
    ),
  ),
);

/**
 * Returns a function to get a project by ID (including inbox project)
 * Usage: const getProject = useAtomValue(projectByIdAtom); const project = getProject('123')
 */
export const projectByIdAtom = namedAtom(
  "projectByIdAtom",
  atom((get) =>
    withErrorHandling(
      () => {
        const allProjects = get(allProjectsAtom);
        return (projectId: ProjectId): Project | undefined => {
          return allProjects.find(
            (project: Project) => project.id === projectId,
          );
        };
      },
      "projectByIdAtom",
      () => undefined,
    ),
  ),
);

/**
 * Currently selected project object
 */
export const currentProjectAtom = namedAtom(
  "currentProjectAtom",
  atom((get) =>
    withErrorHandling(
      () => {
        const currentProjectId = get(currentProjectIdAtom);
        if (!currentProjectId) return null;

        // Validate that currentProjectId is a valid ProjectId
        try {
          const validProjectId = ProjectIdSchema.parse(currentProjectId);
          const getProjectById = get(projectByIdAtom);
          return getProjectById(validProjectId) || null;
        } catch {
          // Invalid ProjectId stored in localStorage, clear it
          console.warn(
            "Invalid project ID in storage, clearing:",
            currentProjectId,
          );
          return null;
        }
      },
      "currentProjectAtom",
      null,
    ),
  ),
);

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// No utility functions needed for position-based ordering - it's just array.sort()!

// =============================================================================
// PROJECT SECTIONS MANAGEMENT ATOMS
// =============================================================================

/**
 * Adds a new section to a project at a specific position
 * Uses server mutation for persistence
 */
export const addProjectSectionAtom = atom(
  null,
  async (
    get,
    set,
    data: {
      projectId: ProjectId;
      sectionName: string;
      color?: string;
      position?: number;
    },
  ) => {
    try {
      const projects = get(projectsAtom);

      const targetProject = projects.find(
        (p: Project) => p.id === data.projectId,
      );
      if (!targetProject) {
        log.error(
          {
            projectId: data.projectId,
            availableProjects: projects.map((p: Project) => p.id),
            module: "projects",
          },
          "Project not found",
        );
        throw new Error(`Project with ID "${data.projectId}" not found`);
      }

      const updatedProjects = projects.map((project: Project) => {
        if (project.id === data.projectId) {
          // Check if section already exists
          if (
            project.sections.some(
              (s: ProjectSection) => s.name === data.sectionName,
            )
          ) {
            throw new Error(`Section "${data.sectionName}" already exists`);
          }

          // Use provided color or default
          const sectionColor = data.color || DEFAULT_SECTION_COLOR;

          const newSection: ProjectSection = {
            id: createGroupId(uuidv4()),
            name: data.sectionName,
            slug: "",
            color: sectionColor,
            type: "section" as const,
            items: [],
          };

          const newSections = [...project.sections];

          // If position is specified, insert at that position
          if (
            data.position !== undefined &&
            data.position >= 0 &&
            data.position <= newSections.length
          ) {
            newSections.splice(data.position, 0, newSection);
          } else {
            // Default behavior: add to the end
            newSections.push(newSection);
          }

          return {
            ...project,
            sections: newSections,
          };
        }
        return project;
      });

      // Use server mutation for persistence
      const updateProjectsMutation = get(updateProjectsMutationAtom);
      await updateProjectsMutation.mutateAsync(updatedProjects);
    } catch (error) {
      log.error(
        { error, module: "projects" },
        "Error in addProjectSectionAtom",
      );
      handleAtomError(error, "addProjectSection");
      throw error;
    }
  },
);
addProjectSectionAtom.debugLabel = "addProjectSectionAtom";

/**
 * Removes a section from a project
 * Validates that section has no tasks before removing
 * Uses server mutation for persistence
 */
export const removeProjectSectionAtom = atom(
  null,
  async (
    get,
    set,
    data: { projectId: ProjectId; sectionId: GroupId; deleteTasks?: boolean },
  ) => {
    try {
      const projects = get(projectsAtom);
      const project = projects.find((p: Project) => p.id === data.projectId);
      const section = project?.sections.find((s) => s.id === data.sectionId);

      if (!project || !section) {
        throw new Error("Section not found");
      }

      const sectionTaskIds = section.items.filter((id): id is TaskId =>
        Boolean(id),
      );
      const shouldDeleteTasks = data.deleteTasks === true;

      if (sectionTaskIds.length > 0 && shouldDeleteTasks) {
        await set(deleteTasksAtom, sectionTaskIds);
      }

      const updatedProjects = projects.map((project: Project) => {
        if (project.id === data.projectId) {
          // Don't allow removing the last section (projects must have at least 1 section)
          if (project.sections.length === 1) {
            throw new Error(
              "Cannot remove the last section. Projects must have at least one section.",
            );
          }

          // Don't allow removing the default section
          const sectionToRemove = project.sections.find(
            (s) => s.id === data.sectionId,
          );
          if (!sectionToRemove) {
            throw new Error("Section not found");
          }
          if (sectionToRemove.isDefault) {
            throw new Error("Cannot remove the default section");
          }

          let sections = project.sections;

          if (sectionToRemove.items.length > 0 && !shouldDeleteTasks) {
            const defaultSectionId = getDefaultSectionId(project);

            if (!defaultSectionId) {
              throw new Error("Unable to resolve default section for project");
            }

            if (defaultSectionId === data.sectionId) {
              throw new Error("Cannot remove the default section");
            }

            const tasksToMove = sectionToRemove.items.filter(
              (taskId): taskId is TaskId => Boolean(taskId),
            );

            sections = sections.map((section) => {
              if (section.id === data.sectionId) {
                return { ...section, items: [] };
              }

              if (section.id === defaultSectionId) {
                const dedupedItems = section.items.filter(
                  (taskId) => !tasksToMove.includes(taskId),
                );

                return {
                  ...section,
                  items: [...dedupedItems, ...tasksToMove],
                };
              }

              return section;
            });
          }

          return {
            ...project,
            sections: sections.filter(
              (section: ProjectSection) => section.id !== data.sectionId,
            ),
          };
        }
        return project;
      });

      // Use server mutation for persistence
      const updateProjectsMutation = get(updateProjectsMutationAtom);
      await updateProjectsMutation.mutateAsync(updatedProjects);
    } catch (error) {
      handleAtomError(error, "removeProjectSection");
      throw error;
    }
  },
);
removeProjectSectionAtom.debugLabel = "removeProjectSectionAtom";

/**
 * Updates a section in a project (name and/or color)
 * Uses server mutation for persistence
 */
export const renameProjectSectionAtom = atom(
  null,
  async (
    get,
    set,
    data: {
      projectId: ProjectId;
      sectionId: GroupId;
      newSectionName?: string;
      newSectionColor?: string;
    },
  ) => {
    try {
      const projects = get(projectsAtom);

      // Check if new section name already exists (only if name is being changed)
      if (data.newSectionName) {
        const project = projects.find((p: Project) => p.id === data.projectId);
        if (
          project?.sections.some(
            (s: ProjectSection) =>
              s.name === data.newSectionName && s.id !== data.sectionId,
          )
        ) {
          throw new Error(`Section "${data.newSectionName}" already exists`);
        }
      }

      const updatedProjects = projects.map((project: Project) => {
        if (project.id === data.projectId) {
          return {
            ...project,
            sections: project.sections.map((section: ProjectSection) =>
              section.id === data.sectionId
                ? {
                    ...section,
                    ...(data.newSectionName && { name: data.newSectionName }),
                    ...(data.newSectionColor && {
                      color: data.newSectionColor,
                    }),
                  }
                : section,
            ),
          };
        }
        return project;
      });

      // Use server mutation for persistence
      const updateProjectsMutation = get(updateProjectsMutationAtom);
      await updateProjectsMutation.mutateAsync(updatedProjects);
    } catch (error) {
      handleAtomError(error, "renameProjectSection");
      throw error;
    }
  },
);
renameProjectSectionAtom.debugLabel = "renameProjectSectionAtom";

/**
 * Sets a section as the default section for a project
 * Clears isDefault flag from all other sections
 * Uses server mutation for persistence
 */
export const setDefaultProjectSectionAtom = atom(
  null,
  async (get, set, data: { projectId: ProjectId; sectionId: GroupId }) => {
    try {
      const projects = get(projectsAtom);

      const updatedProjects = projects.map((project: Project) => {
        if (project.id === data.projectId) {
          return {
            ...project,
            sections: project.sections.map((section: ProjectSection) => ({
              ...section,
              isDefault: section.id === data.sectionId,
            })),
          };
        }
        return project;
      });

      // Use server mutation for persistence
      const updateProjectsMutation = get(updateProjectsMutationAtom);
      await updateProjectsMutation.mutateAsync(updatedProjects);
    } catch (error) {
      handleAtomError(error, "setDefaultProjectSection");
      throw error;
    }
  },
);
setDefaultProjectSectionAtom.debugLabel = "setDefaultProjectSectionAtom";

/**
 * Reorders sections within a project
 * Uses server mutation for persistence
 */
export const reorderProjectSectionsAtom = atom(
  null,
  async (
    get,
    set,
    data: { projectId: ProjectId; sections: ProjectSection[] },
  ) => {
    try {
      const projects = get(projectsAtom);
      const updatedProjects = projects.map((project: Project) => {
        if (project.id === data.projectId) {
          return {
            ...project,
            sections: data.sections,
          };
        }
        return project;
      });

      // Use server mutation for persistence
      const updateProjectsMutation = get(updateProjectsMutationAtom);
      await updateProjectsMutation.mutateAsync(updatedProjects);
    } catch (error) {
      handleAtomError(error, "reorderProjectSections");
      throw error;
    }
  },
);
reorderProjectSectionsAtom.debugLabel = "reorderProjectSectionsAtom";

// =============================================================================
// SECTION POSITIONING UTILITY ATOMS
// =============================================================================

/**
 * Move a section by one position within its project (up or down)
 * Uses reorderProjectSectionsAtom internally
 */
export const moveProjectSectionAtom = atom(
  null,
  async (
    get,
    set,
    data: {
      projectId: ProjectId;
      sectionId: GroupId;
      direction: "up" | "down";
    },
  ) => {
    try {
      const projects = get(projectsAtom);
      const project = projects.find((p) => p.id === data.projectId);

      if (!project) throw new Error("Project not found");

      const currentIndex = project.sections.findIndex(
        (s) => s.id === data.sectionId,
      );

      // Check boundary conditions based on direction
      if (data.direction === "up" && currentIndex <= 0) return; // Already at top or not found
      if (
        data.direction === "down" &&
        (currentIndex < 0 || currentIndex >= project.sections.length - 1)
      )
        return; // Already at bottom or not found

      const newSections = [...project.sections];
      const removedSections = newSections.splice(currentIndex, 1);
      const movedSection = removedSections[0];

      if (!movedSection) {
        throw new Error("Failed to find section to move");
      }

      // Insert at new position based on direction
      const newIndex =
        data.direction === "up" ? currentIndex - 1 : currentIndex + 1;
      newSections.splice(newIndex, 0, movedSection);

      await set(reorderProjectSectionsAtom, {
        projectId: data.projectId,
        sections: newSections,
      });
    } catch (error) {
      handleAtomError(
        error,
        `moveProjectSection${data.direction === "up" ? "Up" : "Down"}`,
      );
      throw error;
    }
  },
);
moveProjectSectionAtom.debugLabel = "moveProjectSectionAtom";

/**
 * Add a new section at a specific position relative to an existing section
 * Uses addProjectSectionAtom internally
 */
export const addProjectSectionAtPositionAtom = atom(
  null,
  async (
    get,
    set,
    data: {
      projectId: ProjectId;
      sectionName: string;
      color?: string;
      insertPosition?: { id: GroupId; placement: "above" | "below" };
    },
  ) => {
    try {
      const { insertPosition, ...sectionData } = data;

      // Calculate insertion position based on position
      let position: number | undefined;
      if (insertPosition) {
        const projects = get(projectsAtom);
        const project = projects.find((p) => p.id === data.projectId);

        if (!project) throw new Error("Project not found");

        const currentIndex = project.sections.findIndex(
          (s) => s.id === insertPosition.id,
        );
        if (currentIndex < 0) throw new Error("Section not found");

        position =
          insertPosition.placement === "above"
            ? currentIndex
            : currentIndex + 1;
      }

      await set(addProjectSectionAtom, {
        ...sectionData,
        position,
      });
    } catch (error) {
      handleAtomError(error, "addProjectSectionAtPosition");
      throw error;
    }
  },
);
addProjectSectionAtPositionAtom.debugLabel = "addProjectSectionAtPosition";

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Main export object containing all project-related atoms
 * Organized by category for easy imports and better developer experience
 */
export const projectAtoms = {
  // Base state atoms
  projects: projectsAtom,
  currentProjectId: currentProjectIdAtom,

  // Action atoms (write-only)
  actions: {
    addProject: addProjectAtom,
    updateProject: updateProjectAtom,
    updateProjects: updateProjectsAtom,
    deleteProject: deleteProjectAtom,
    deleteProjects: deleteProjectsAtom,
    addSection: addProjectSectionAtom,
    removeSection: removeProjectSectionAtom,
    renameSection: renameProjectSectionAtom,
    setDefaultSection: setDefaultProjectSectionAtom,
    reorderSections: reorderProjectSectionsAtom,
    moveSection: moveProjectSectionAtom,
    addSectionAtPosition: addProjectSectionAtPositionAtom,
  },

  // Derived read atoms
  derived: {
    visibleProjects: visibleProjectsAtom,
    allProjects: allProjectsAtom,
    inboxProject: inboxProjectAtom,
    projectById: projectByIdAtom,
    projectIds: projectIdsAtom,
    currentProject: currentProjectAtom,
    // Note: projectTaskCountsAtom moved to ui/task-counts.ts (UI-dependent)
  },
} as const;

// Note: projectsAtom is imported from "../data/base/atoms"
