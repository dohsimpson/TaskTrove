/**
 * Project management atoms for TaskTrove
 *
 * Data persistence strategy:
 * - Project data operations (add, update, delete, sections) use server mutations
 * - View state changes remain localStorage-only for performance
 * - Current project selection remains localStorage-only as UI state
 */

import { atom } from "jotai"
import { v4 as uuidv4 } from "uuid"
import { handleAtomError, createAtomWithStorage } from "../utils/index"
import type {
  Project,
  ProjectId,
  GroupId,
  SectionId,
  ProjectSection,
  Task,
  ViewStates,
} from "../../types/index"
import {
  DEFAULT_INBOX_NAME,
  DEFAULT_INBOX_COLOR,
  DEFAULT_PROJECT_SHARED,
  DEFAULT_UUID,
  DEFAULT_SECTION_NAME,
  DEFAULT_SECTION_COLOR,
} from "../../constants/defaults"
import { INBOX_PROJECT_ID, createSectionId, ProjectIdSchema } from "../../types/index"
import { activeTasksAtom } from "./tasks"
import {
  projectsAtom,
  updateProjectsMutationAtom,
  createProjectMutationAtom,
  deleteProjectMutationAtom,
} from "./base"
import { viewStatesAtom } from "../ui/views"
import { recordOperationAtom } from "./history"
import { log } from "../../utils/logger"

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
  shared: DEFAULT_PROJECT_SHARED,
  sections: [
    {
      id: createSectionId(DEFAULT_UUID),
      name: DEFAULT_SECTION_NAME,
      color: DEFAULT_SECTION_COLOR,
    },
  ],
})

// projectsAtom now imported from './base' to avoid circular dependencies

/**
 * Currently selected project ID
 */
export const currentProjectIdAtom = createAtomWithStorage<string | null>("current-project-id", null)
currentProjectIdAtom.debugLabel = "currentProjectIdAtom"

/**
 * Special inbox project that acts as the default project for uncategorized tasks
 * This is a derived atom that gets the inbox project from projectsAtom
 * The inbox project is guaranteed to exist in projectsAtom
 */
export const inboxProjectAtom = atom<Project>((get) => {
  try {
    const projects = get(projectsAtom)
    const inboxProject = projects.find((p: Project) => p.id === INBOX_PROJECT_ID)

    if (inboxProject) {
      return inboxProject
    }

    // This should never happen since projectsAtom guarantees inbox exists
    // But we provide a fallback just in case
    log.warn({ module: "projects" }, "Inbox project not found in projectsAtom, returning default")
    return createDefaultInboxProject()
  } catch (error) {
    handleAtomError(error, "inboxProjectAtom")
    return createDefaultInboxProject()
  }
})
inboxProjectAtom.debugLabel = "inboxProjectAtom"

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
      name: string
      color: string
      groupId?: GroupId // Projects will be added to groups instead of global ordering
    },
  ) => {
    try {
      // Create project using the CREATE endpoint
      const createProjectMutation = get(createProjectMutationAtom)
      const result = await createProjectMutation.mutateAsync({
        name: projectData.name,
        color: projectData.color,
        shared: DEFAULT_PROJECT_SHARED,
      })

      // Get the first (and only) project ID from the response
      const newProjectId = result.projectIds[0]

      // Record the operation for undo/redo feedback
      set(recordOperationAtom, `Added project: "${projectData.name}"`)

      return newProjectId
    } catch (error) {
      handleAtomError(error, "addProject")
      throw error
    }
  },
)
addProjectAtom.debugLabel = "addProjectAtom"

/**
 * Updates project properties (name, color, favorite, etc.)
 * Does not affect ordering
 * Uses server mutation for persistence
 */
export const updateProjectAtom = atom(
  null,
  async (get, set, update: { projectId: ProjectId; updates: Partial<Omit<Project, "id">> }) => {
    try {
      const projects = get(projectsAtom)
      const updatedProjects = projects.map((project: Project) =>
        project.id === update.projectId ? { ...project, ...update.updates } : project,
      )

      // Use server mutation for persistence
      const updateProjectsMutation = get(updateProjectsMutationAtom)
      await updateProjectsMutation.mutateAsync(updatedProjects)
    } catch (error) {
      handleAtomError(error, "updateProject")
      throw error
    }
  },
)
updateProjectAtom.debugLabel = "updateProjectAtom"

/**
 * Removes a project
 * Uses server mutation for persistence
 */
export const deleteProjectAtom = atom(null, async (get, set, projectId: ProjectId) => {
  try {
    const projects = get(projectsAtom)
    const projectToDelete = projects.find((p: Project) => p.id === projectId)

    if (!projectToDelete) return

    // Delete project using the DELETE endpoint
    const deleteProjectMutation = get(deleteProjectMutationAtom)
    await deleteProjectMutation.mutateAsync({ id: projectId })

    // Clear current project if it was deleted
    const currentProjectId = get(currentProjectIdAtom)
    if (currentProjectId === projectId) {
      set(currentProjectIdAtom, null)
    }

    // Record the operation for undo/redo feedback
    set(recordOperationAtom, `Deleted project: "${projectToDelete.name}"`)
  } catch (error) {
    handleAtomError(error, "deleteProject")
    throw error
  }
})
deleteProjectAtom.debugLabel = "deleteProjectAtom"

// =============================================================================
// DERIVED READ ATOMS
// =============================================================================

/**
 * Projects excluding the special inbox project (for display in project lists)
 * The inbox project exists but should not appear in user-facing project lists
 */
export const visibleProjectsAtom = atom((get) => {
  try {
    const projects = get(projectsAtom)
    return projects.filter((project) => project.id !== INBOX_PROJECT_ID)
  } catch (error) {
    handleAtomError(error, "visibleProjects")
    return []
  }
})
visibleProjectsAtom.debugLabel = "visibleProjectsAtom"

/**
 * All projects including the special inbox project (for internal logic)
 * Use this when you need access to all projects including inbox
 */
export const allProjectsAtom = atom((get) => {
  try {
    const projects = get(projectsAtom)
    // projectsAtom now guarantees that inbox exists, so we can just return projects
    return projects
  } catch (error) {
    handleAtomError(error, "allProjects")
    return []
  }
})
allProjectsAtom.debugLabel = "allProjectsAtom"

/**
 * Returns a function to get a project by ID (including inbox project)
 * Usage: const getProject = useAtomValue(projectByIdAtom); const project = getProject('123')
 */
export const projectByIdAtom = atom((get) => {
  try {
    const allProjects = get(allProjectsAtom)
    return (projectId: ProjectId): Project | undefined => {
      return allProjects.find((project: Project) => project.id === projectId)
    }
  } catch (error) {
    handleAtomError(error, "projectById")
    return () => undefined
  }
})
projectByIdAtom.debugLabel = "projectByIdAtom"

/**
 * Task counts per project calculated from active tasks
 * Returns filtered counts that respect view-specific showCompleted settings
 * Unified interface with taskCountsAtom - returns simple numbers
 */
export const projectTaskCountsAtom = atom<Record<ProjectId, number>>((get) => {
  try {
    const projects = get(projectsAtom)
    const activeTasks = get(activeTasksAtom)
    const rawViewStates = get(viewStatesAtom)
    const viewStates: ViewStates =
      rawViewStates && typeof rawViewStates === "object" && !Array.isArray(rawViewStates)
        ? rawViewStates
        : {}

    // Filter tasks based on project view's showCompleted setting
    const filterByViewCompleted = (tasks: Task[], projectId: ProjectId) => {
      const showCompleted = viewStates[projectId]?.showCompleted ?? false
      return showCompleted ? tasks : tasks.filter((task: Task) => !task.completed)
    }

    const counts: Record<ProjectId, number> = {}

    for (const project of projects) {
      const projectTasks = activeTasks.filter((task: Task) => task.projectId === project.id)
      const filteredTasks = filterByViewCompleted(projectTasks, project.id)
      counts[project.id] = filteredTasks.length
    }

    return counts
  } catch (error) {
    handleAtomError(error, "projectTaskCounts")
    return {}
  }
})
projectTaskCountsAtom.debugLabel = "projectTaskCountsAtom"

/**
 * Currently selected project object
 */
export const currentProjectAtom = atom((get) => {
  try {
    const currentProjectId = get(currentProjectIdAtom)
    if (!currentProjectId) return null

    // Validate that currentProjectId is a valid ProjectId
    try {
      const validProjectId = ProjectIdSchema.parse(currentProjectId)
      const getProjectById = get(projectByIdAtom)
      return getProjectById(validProjectId) || null
    } catch {
      // Invalid ProjectId stored in localStorage, clear it
      console.warn("Invalid project ID in storage, clearing:", currentProjectId)
      return null
    }
  } catch (error) {
    handleAtomError(error, "currentProject")
    return null
  }
})
currentProjectAtom.debugLabel = "currentProjectAtom"

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
    data: { projectId: ProjectId; sectionName: string; color?: string; position?: number },
  ) => {
    try {
      const projects = get(projectsAtom)

      const targetProject = projects.find((p: Project) => p.id === data.projectId)
      if (!targetProject) {
        log.error(
          {
            projectId: data.projectId,
            availableProjects: projects.map((p: Project) => p.id),
            module: "projects",
          },
          "Project not found",
        )
        throw new Error(`Project with ID "${data.projectId}" not found`)
      }

      const updatedProjects = projects.map((project: Project) => {
        if (project.id === data.projectId) {
          // Check if section already exists
          if (project.sections.some((s: ProjectSection) => s.name === data.sectionName)) {
            throw new Error(`Section "${data.sectionName}" already exists`)
          }

          // Generate random color if not provided
          const colors = [
            "#ef4444",
            "#f59e0b",
            "#3b82f6",
            "#8b5cf6",
            "#10b981",
            "#f97316",
            "#06b6d4",
            "#84cc16",
            "#ec4899",
            "#6366f1",
          ]
          const sectionColor = data.color || colors[Math.floor(Math.random() * colors.length)]

          const newSection: ProjectSection = {
            id: createSectionId(uuidv4()),
            name: data.sectionName,
            color: sectionColor,
          }

          const newSections = [...project.sections]

          // If position is specified, insert at that position
          if (
            data.position !== undefined &&
            data.position >= 0 &&
            data.position <= newSections.length
          ) {
            newSections.splice(data.position, 0, newSection)
          } else {
            // Default behavior: add to the end
            newSections.push(newSection)
          }

          return {
            ...project,
            sections: newSections,
          }
        }
        return project
      })

      // Use server mutation for persistence
      const updateProjectsMutation = get(updateProjectsMutationAtom)
      await updateProjectsMutation.mutateAsync(updatedProjects)
    } catch (error) {
      log.error({ error, module: "projects" }, "Error in addProjectSectionAtom")
      handleAtomError(error, "addProjectSection")
      throw error
    }
  },
)
addProjectSectionAtom.debugLabel = "addProjectSectionAtom"

/**
 * Removes a section from a project
 * Also clears the projectSection field from any tasks in that section
 * Uses server mutation for persistence
 */
export const removeProjectSectionAtom = atom(
  null,
  async (get, set, data: { projectId: ProjectId; sectionId: SectionId }) => {
    try {
      const projects = get(projectsAtom)
      const updatedProjects = projects.map((project: Project) => {
        if (project.id === data.projectId) {
          // Don't allow removing the default section
          if (data.sectionId === DEFAULT_UUID) {
            throw new Error("Cannot remove the default section")
          }

          return {
            ...project,
            sections: project.sections.filter(
              (section: ProjectSection) => section.id !== data.sectionId,
            ),
          }
        }
        return project
      })

      // Use server mutation for persistence
      const updateProjectsMutation = get(updateProjectsMutationAtom)
      await updateProjectsMutation.mutateAsync(updatedProjects)

      // Tasks in the removed section will need to be moved to default section (id: 0)
      // This will be handled by a separate migration function
    } catch (error) {
      handleAtomError(error, "removeProjectSection")
      throw error
    }
  },
)
removeProjectSectionAtom.debugLabel = "removeProjectSectionAtom"

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
      projectId: ProjectId
      sectionId: SectionId
      newSectionName?: string
      newSectionColor?: string
    },
  ) => {
    try {
      const projects = get(projectsAtom)

      // Check if new section name already exists (only if name is being changed)
      if (data.newSectionName) {
        const project = projects.find((p: Project) => p.id === data.projectId)
        if (
          project?.sections.some(
            (s: ProjectSection) => s.name === data.newSectionName && s.id !== data.sectionId,
          )
        ) {
          throw new Error(`Section "${data.newSectionName}" already exists`)
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
                    ...(data.newSectionColor && { color: data.newSectionColor }),
                  }
                : section,
            ),
          }
        }
        return project
      })

      // Use server mutation for persistence
      const updateProjectsMutation = get(updateProjectsMutationAtom)
      await updateProjectsMutation.mutateAsync(updatedProjects)
    } catch (error) {
      handleAtomError(error, "renameProjectSection")
      throw error
    }
  },
)
renameProjectSectionAtom.debugLabel = "renameProjectSectionAtom"

/**
 * Reorders sections within a project
 * Uses server mutation for persistence
 */
export const reorderProjectSectionsAtom = atom(
  null,
  async (get, set, data: { projectId: ProjectId; sections: ProjectSection[] }) => {
    try {
      const projects = get(projectsAtom)
      const updatedProjects = projects.map((project: Project) => {
        if (project.id === data.projectId) {
          return {
            ...project,
            sections: data.sections,
          }
        }
        return project
      })

      // Use server mutation for persistence
      const updateProjectsMutation = get(updateProjectsMutationAtom)
      await updateProjectsMutation.mutateAsync(updatedProjects)
    } catch (error) {
      handleAtomError(error, "reorderProjectSections")
      throw error
    }
  },
)
reorderProjectSectionsAtom.debugLabel = "reorderProjectSectionsAtom"

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
    data: { projectId: ProjectId; sectionId: SectionId; direction: "up" | "down" },
  ) => {
    try {
      const projects = get(projectsAtom)
      const project = projects.find((p) => p.id === data.projectId)

      if (!project) throw new Error("Project not found")

      const currentIndex = project.sections.findIndex((s) => s.id === data.sectionId)

      // Check boundary conditions based on direction
      if (data.direction === "up" && currentIndex <= 0) return // Already at top or not found
      if (
        data.direction === "down" &&
        (currentIndex < 0 || currentIndex >= project.sections.length - 1)
      )
        return // Already at bottom or not found

      const newSections = [...project.sections]
      const [movedSection] = newSections.splice(currentIndex, 1)

      // Insert at new position based on direction
      const newIndex = data.direction === "up" ? currentIndex - 1 : currentIndex + 1
      newSections.splice(newIndex, 0, movedSection)

      await set(reorderProjectSectionsAtom, {
        projectId: data.projectId,
        sections: newSections,
      })
    } catch (error) {
      handleAtomError(error, `moveProjectSection${data.direction === "up" ? "Up" : "Down"}`)
      throw error
    }
  },
)
moveProjectSectionAtom.debugLabel = "moveProjectSectionAtom"

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
      projectId: ProjectId
      sectionName: string
      color?: string
      insertPosition?: { id: SectionId; placement: "above" | "below" }
    },
  ) => {
    try {
      const { insertPosition, ...sectionData } = data

      // Calculate insertion position based on position
      let position: number | undefined
      if (insertPosition) {
        const projects = get(projectsAtom)
        const project = projects.find((p) => p.id === data.projectId)

        if (!project) throw new Error("Project not found")

        const currentIndex = project.sections.findIndex((s) => s.id === insertPosition.id)
        if (currentIndex < 0) throw new Error("Section not found")

        position = insertPosition.placement === "above" ? currentIndex : currentIndex + 1
      }

      await set(addProjectSectionAtom, {
        ...sectionData,
        position,
      })
    } catch (error) {
      handleAtomError(error, "addProjectSectionAtPosition")
      throw error
    }
  },
)
addProjectSectionAtPositionAtom.debugLabel = "addProjectSectionAtPosition"

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
    deleteProject: deleteProjectAtom,
    addSection: addProjectSectionAtom,
    removeSection: removeProjectSectionAtom,
    renameSection: renameProjectSectionAtom,
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
    projectTaskCounts: projectTaskCountsAtom,
    currentProject: currentProjectAtom,
  },
} as const

// Individual exports for backward compatibility
export { projectsAtom } from "./base"
