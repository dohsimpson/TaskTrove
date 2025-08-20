import { atom } from "jotai"
import {
  showSearchDialogAtom,
  showQuickAddAtom,
  showProjectDialogAtom,
  showLabelDialogAtom,
  showSectionDialogAtom,
  projectDialogContextAtom,
  labelDialogContextAtom,
  sectionDialogContextAtom,
} from "../ui/dialogs"
import {
  INBOX_PROJECT_ID,
  ProjectIdSchema,
  type Project,
  type Label,
  type ProjectId,
  type LabelId,
  type SectionId,
  type ViewId,
  type StandardViewId,
  createProjectId,
} from "@/lib/types"
import { DEFAULT_ROUTE } from "@/lib/constants/defaults"
import { projectsAtom } from "../core/projects"
import { labelsAtom } from "../core/labels"
import { resolveProject, resolveLabel } from "@/lib/utils/routing"

// Internal validation functions for navigation parsing
function isValidProjectId(id: string): id is ProjectId {
  try {
    ProjectIdSchema.parse(id)
    return true
  } catch {
    return false
  }
}

/**
 * Validates if a string is a standard view identifier
 */
function isStandardViewId(id: string): id is StandardViewId {
  return [
    "inbox",
    "today",
    "upcoming",
    "completed",
    "all",
    "analytics",
    "search",
    "shortcuts",
    "profile",
    "debug",
    "projects",
    "labels",
    "filters",
  ].includes(id)
}

/**
 * Navigation action atoms for centralized dialog management
 *
 * This module provides centralized navigation actions to eliminate
 * scattered handler functions across components. All dialog actions
 * are consolidated here for better maintainability.
 */

// =============================================================================
// SEARCH DIALOG ACTIONS
// =============================================================================

/**
 * Opens the search dialog
 */
export const openSearchAtom = atom(null, (get, set) => {
  set(showSearchDialogAtom, true)
})
openSearchAtom.debugLabel = "openSearchAtom"

/**
 * Closes the search dialog
 */
export const closeSearchAtom = atom(null, (get, set) => {
  set(showSearchDialogAtom, false)
})
closeSearchAtom.debugLabel = "closeSearchAtom"

/**
 * Toggles the search dialog
 */
export const toggleSearchAtom = atom(null, (get, set) => {
  const current = get(showSearchDialogAtom)
  set(showSearchDialogAtom, !current)
})
toggleSearchAtom.debugLabel = "toggleSearchAtom"

// =============================================================================
// QUICK ADD DIALOG ACTIONS
// =============================================================================

/**
 * Opens the quick add dialog
 */
export const openQuickAddAtom = atom(null, (get, set) => {
  set(showQuickAddAtom, true)
})
openQuickAddAtom.debugLabel = "openQuickAddAtom"

/**
 * Closes the quick add dialog
 */
export const closeQuickAddAtom = atom(null, (get, set) => {
  set(showQuickAddAtom, false)
})
closeQuickAddAtom.debugLabel = "closeQuickAddAtom"

/**
 * Toggles the quick add dialog
 */
export const toggleQuickAddAtom = atom(null, (get, set) => {
  const current = get(showQuickAddAtom)
  set(showQuickAddAtom, !current)
})
toggleQuickAddAtom.debugLabel = "toggleQuickAddAtom"

// =============================================================================
// PROJECT DIALOG ACTIONS
// =============================================================================

/**
 * Opens the project dialog
 */
export const openProjectDialogAtom = atom(
  null,
  (get, set, options?: { projectId?: ProjectId; placement?: "above" | "below" }) => {
    // Set the dialog context
    if (options?.projectId && options?.placement) {
      set(projectDialogContextAtom, {
        mode: "create",
        insertPosition: {
          id: options.projectId,
          placement: options.placement,
        },
      })
    } else {
      set(projectDialogContextAtom, { mode: "create" })
    }

    set(showProjectDialogAtom, true)
  },
)
openProjectDialogAtom.debugLabel = "openProjectDialogAtom"

/**
 * Closes the project dialog
 */
export const closeProjectDialogAtom = atom(null, (get, set) => {
  set(showProjectDialogAtom, false)
})
closeProjectDialogAtom.debugLabel = "closeProjectDialogAtom"

/**
 * Toggles the project dialog
 */
export const toggleProjectDialogAtom = atom(null, (get, set) => {
  const current = get(showProjectDialogAtom)
  set(showProjectDialogAtom, !current)
})
toggleProjectDialogAtom.debugLabel = "toggleProjectDialogAtom"

// =============================================================================
// LABEL DIALOG ACTIONS
// =============================================================================

/**
 * Opens the label dialog
 */
export const openLabelDialogAtom = atom(
  null,
  (get, set, options?: { id?: LabelId; placement?: "above" | "below" }) => {
    // Set the dialog context
    if (options?.id && options?.placement) {
      set(labelDialogContextAtom, {
        mode: "create",
        insertPosition: {
          id: options.id,
          placement: options.placement,
        },
      })
    } else {
      set(labelDialogContextAtom, { mode: "create" })
    }

    set(showLabelDialogAtom, true)
  },
)
openLabelDialogAtom.debugLabel = "openLabelDialogAtom"

/**
 * Closes the label dialog
 */
export const closeLabelDialogAtom = atom(null, (get, set) => {
  set(showLabelDialogAtom, false)
})
closeLabelDialogAtom.debugLabel = "closeLabelDialogAtom"

/**
 * Toggles the label dialog
 */
export const toggleLabelDialogAtom = atom(null, (get, set) => {
  const current = get(showLabelDialogAtom)
  set(showLabelDialogAtom, !current)
})
toggleLabelDialogAtom.debugLabel = "toggleLabelDialogAtom"

// =============================================================================
// SECTION DIALOG ACTIONS
// =============================================================================

/**
 * Opens the section dialog
 */
export const openSectionDialogAtom = atom(
  null,
  (
    get,
    set,
    options?: { id?: SectionId; placement?: "above" | "below"; projectId?: ProjectId },
  ) => {
    // Set the dialog context
    if (options?.id && options?.placement) {
      set(sectionDialogContextAtom, {
        mode: "create",
        insertPosition: {
          id: options.id,
          placement: options.placement,
          projectId: options.projectId,
        },
      })
    } else {
      set(sectionDialogContextAtom, { mode: "create" })
    }

    set(showSectionDialogAtom, true)
  },
)
openSectionDialogAtom.debugLabel = "openSectionDialogAtom"

/**
 * Closes the section dialog
 */
export const closeSectionDialogAtom = atom(null, (get, set) => {
  set(showSectionDialogAtom, false)
})
closeSectionDialogAtom.debugLabel = "closeSectionDialogAtom"

/**
 * Toggles the section dialog
 */
export const toggleSectionDialogAtom = atom(null, (get, set) => {
  const current = get(showSectionDialogAtom)
  set(showSectionDialogAtom, !current)
})
toggleSectionDialogAtom.debugLabel = "toggleSectionDialogAtom"

// =============================================================================
// GLOBAL DIALOG ACTIONS
// =============================================================================

/**
 * Closes all dialogs at once
 */
export const closeAllDialogsAtom = atom(null, (get, set) => {
  set(showSearchDialogAtom, false)
  set(showQuickAddAtom, false)
  set(showProjectDialogAtom, false)
  set(showLabelDialogAtom, false)
  set(showSectionDialogAtom, false)
})
closeAllDialogsAtom.debugLabel = "closeAllDialogsAtom"

// =============================================================================
// ROUTE CONTEXT ATOMS
// =============================================================================

/**
 * Route context type definition
 */
export interface RouteContext {
  /** Current pathname */
  pathname: string
  /** Computed view ID for state management */
  viewId: ViewId
  /** Type of route being accessed */
  routeType: "standard" | "project" | "label" | "filter"
}

/**
 * Internal pathname atom - will be set by components using usePathname
 */
export const pathnameAtom = atom<string>(DEFAULT_ROUTE)
pathnameAtom.debugLabel = "pathnameAtom"

/**
 * Parse route context from pathname
 */
function parseRouteContext(pathname: string, labels?: Label[], projects?: Project[]): RouteContext {
  // Handle root path as today
  if (pathname === "/" || pathname === "") {
    return {
      pathname: pathname || "/",
      viewId: "today",
      routeType: "standard",
    }
  }

  // Split pathname and filter empty parts
  const parts = pathname.split("/").filter(Boolean)

  if (parts.length === 0) {
    return {
      pathname,
      viewId: "today",
      routeType: "standard",
    }
  }

  const [firstSegment, secondSegment] = parts

  // Handle project routes
  if (firstSegment === "projects" && secondSegment) {
    // Try to resolve project by ID or slug
    if (projects) {
      const project = resolveProject(secondSegment, projects)
      if (project) {
        return {
          pathname,
          viewId: project.id, // ViewId is the ProjectId
          routeType: "project",
        }
      }
    }

    // Fallback: check if it's a valid ID format for backwards compatibility
    if (isValidProjectId(secondSegment)) {
      return {
        pathname,
        viewId: createProjectId(secondSegment), // Use the ID directly
        routeType: "project",
      }
    }

    // Invalid project ID/slug, treat as project route for fallback handling
    return {
      pathname,
      viewId: INBOX_PROJECT_ID, // Use inbox project ID as viewId for invalid projects
      routeType: "project",
    }
  }

  // Handle label routes
  if (firstSegment === "labels" && secondSegment) {
    const decodedParam = decodeURIComponent(secondSegment)

    // Try to resolve label by ID or slug
    if (labels) {
      const label = resolveLabel(decodedParam, labels)
      if (label) {
        return {
          pathname,
          viewId: label.id, // ViewId is the LabelId
          routeType: "label",
        }
      }

      // Legacy fallback: try to find by name for backwards compatibility
      const labelByName = labels.find((l) => l.name === decodedParam)
      if (labelByName) {
        return {
          pathname,
          viewId: labelByName.id, // ViewId is the LabelId
          routeType: "label",
        }
      }
    }

    // Fallback if label not found or labels not available
    return {
      pathname,
      viewId: "all", // Fallback to showing all tasks
      routeType: "label",
    }
  }

  // Remove filter routes - not supported yet

  // Handle standard views and unknown routes
  const viewId = firstSegment

  // For known standard views, use proper typing. For unknown routes, cast to ViewId
  // to allow the system to handle them gracefully with fallback behavior
  const validatedViewId: ViewId = isStandardViewId(viewId)
    ? viewId
    : // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      ((viewId || "inbox") as ViewId)

  return {
    pathname,
    viewId: validatedViewId,
    routeType: "standard",
  }
}

/**
 * Current route context atom
 *
 * Parses the current pathname and provides structured route information
 * that eliminates the need for manual route parsing functions in components.
 *
 * This atom replaces the getCurrentView() and getCurrentProjectId() functions
 * from MainLayoutWrapper with a centralized, reactive solution.
 */
export const currentRouteContextAtom = atom<RouteContext>((get) => {
  const pathname = get(pathnameAtom)
  const labels = get(labelsAtom)
  const projects = get(projectsAtom)
  return parseRouteContext(pathname, labels, projects)
})
currentRouteContextAtom.debugLabel = "currentRouteContextAtom"

/**
 * Set pathname action atom
 */
export const setPathnameAtom = atom(null, (get, set, pathname: string) => {
  set(pathnameAtom, pathname)
})
setPathnameAtom.debugLabel = "setPathnameAtom"

// =============================================================================
// DYNAMIC PAGE INFO ATOMS
// =============================================================================

/**
 * Dynamic page information type definition
 */
export interface DynamicPageInfo {
  /** Page title */
  title: string
  /** Page description */
  description: string
  /** Icon type identifier */
  iconType: string
  /** Optional color for projects and labels */
  color?: string
}

/**
 * Generate page information from route context
 */
function generatePageInfo(
  routeContext: RouteContext,
  projects: Project[],
  labels: Label[],
): DynamicPageInfo {
  const { routeType, viewId } = routeContext

  // Handle project routes
  if (routeType === "project") {
    // viewId contains the project ID for project routes
    const project = projects.find((p) => p.id === viewId)
    if (project) {
      return {
        title: project.name,
        description: "Project tasks",
        iconType: "project",
        color: project.color,
      }
    }
    // Fallback for non-existent projects
    return {
      title: "Project",
      description: "Project tasks",
      iconType: "project",
      color: "#6b7280",
    }
  }

  // Handle label routes
  if (routeType === "label") {
    // viewId contains the label ID for label routes
    const label = labels.find((l) => l.id === viewId)
    if (label) {
      return {
        title: label.name,
        description: `Tasks with ${label.name} label`,
        iconType: "label",
        color: label.color,
      }
    }
    // Fallback for non-existent labels
    return {
      title: "Label",
      description: "Tasks with label",
      iconType: "label",
      color: "#6b7280",
    }
  }

  // Handle filter routes
  if (routeType === "filter") {
    return {
      title: "Filter",
      description: "Filtered view",
      iconType: "filter",
    }
  }

  // Handle standard routes
  switch (viewId) {
    case "today":
      return {
        title: "Today",
        description: "Tasks due today",
        iconType: "today",
      }
    case "inbox":
      return {
        title: "Inbox",
        description: "Uncategorized tasks",
        iconType: "inbox",
      }
    case "upcoming":
      return {
        title: "Upcoming",
        description: "Tasks scheduled for later",
        iconType: "upcoming",
      }
    case "analytics":
      return {
        title: "Analytics",
        description: "Task completion insights and statistics",
        iconType: "analytics",
      }
    case "all":
      return {
        title: "All Tasks",
        description: "All tasks across all projects",
        iconType: "all",
      }
    case "completed":
      return {
        title: "Completed",
        description: "Completed tasks",
        iconType: "completed",
      }
    case "search":
      return {
        title: "Search",
        description: "Search through all tasks",
        iconType: "search",
      }
    case "shortcuts":
      return {
        title: "Shortcuts",
        description: "Keyboard shortcuts and commands",
        iconType: "shortcuts",
      }
    case "profile":
      return {
        title: "Profile",
        description: "User profile and preferences",
        iconType: "profile",
      }
    case "debug":
      return {
        title: "Debug",
        description: "Debug information and tools",
        iconType: "debug",
      }
    case "projects":
      return {
        title: "Projects",
        description: "Manage your projects",
        iconType: "projects",
      }
    case "labels":
      return {
        title: "Labels",
        description: "Manage your labels",
        iconType: "labels",
      }
    case "filters":
      return {
        title: "Filters",
        description: "Custom task filters",
        iconType: "filters",
      }
    default:
      // Capitalize first letter for unknown routes
      const capitalizedTitle = viewId.charAt(0).toUpperCase() + viewId.slice(1)
      return {
        title: capitalizedTitle,
        description: "Page content",
        iconType: "default",
      }
  }
}

/**
 * Dynamic page info atom
 *
 * Provides dynamic page information (title, description, icon type)
 * based on the current route context and available data.
 *
 * This atom replaces the getPageTitle() function from MainLayoutWrapper
 * with a centralized, reactive solution that automatically updates
 * when route context or data changes.
 */
export const dynamicPageInfoAtom = atom<DynamicPageInfo>((get) => {
  const routeContext = get(currentRouteContextAtom)
  const projects = get(projectsAtom)
  const labels = get(labelsAtom)

  return generatePageInfo(routeContext, projects, labels)
})
dynamicPageInfoAtom.debugLabel = "dynamicPageInfoAtom"

// =============================================================================
// CONTEXT MENU STATE ATOMS
// =============================================================================

/**
 * Project context menu state atoms
 * Manages editing, color picker, and menu visibility states for projects
 */

/** Currently editing project ID */
export const editingProjectIdAtom = atom<ProjectId | null>(null)
editingProjectIdAtom.debugLabel = "editingProjectIdAtom"

/** Project color picker open state with project ID */
export const projectColorPickerAtom = atom<ProjectId | null>(null)
projectColorPickerAtom.debugLabel = "projectColorPickerAtom"

/** Start editing a project by ID */
export const startEditingProjectAtom = atom(null, (get, set, projectId: ProjectId) => {
  set(editingProjectIdAtom, projectId)
})
startEditingProjectAtom.debugLabel = "startEditingProjectAtom"

/** Stop editing current project */
export const stopEditingProjectAtom = atom(null, (get, set) => {
  set(editingProjectIdAtom, null)
})
stopEditingProjectAtom.debugLabel = "stopEditingProjectAtom"

/** Open color picker for a project */
export const openProjectColorPickerAtom = atom(null, (get, set, projectId: ProjectId) => {
  set(projectColorPickerAtom, projectId)
})
openProjectColorPickerAtom.debugLabel = "openProjectColorPickerAtom"

/** Close project color picker */
export const closeProjectColorPickerAtom = atom(null, (get, set) => {
  set(projectColorPickerAtom, null)
})
closeProjectColorPickerAtom.debugLabel = "closeProjectColorPickerAtom"

/**
 * Label context menu state atoms
 * Manages editing, color picker, and menu visibility states for labels
 */

/** Currently editing label ID */
export const editingLabelIdAtom = atom<LabelId | null>(null)
editingLabelIdAtom.debugLabel = "editingLabelIdAtom"

/** Label color picker open state with label ID */
export const labelColorPickerAtom = atom<LabelId | null>(null)
labelColorPickerAtom.debugLabel = "labelColorPickerAtom"

/** Start editing a label by ID */
export const startEditingLabelAtom = atom(null, (get, set, labelId: LabelId) => {
  set(editingLabelIdAtom, labelId)
})
startEditingLabelAtom.debugLabel = "startEditingLabelAtom"

/** Stop editing current label */
export const stopEditingLabelAtom = atom(null, (get, set) => {
  set(editingLabelIdAtom, null)
})
stopEditingLabelAtom.debugLabel = "stopEditingLabelAtom"

/** Open color picker for a label */
export const openLabelColorPickerAtom = atom(null, (get, set, labelId: LabelId) => {
  set(labelColorPickerAtom, labelId)
})
openLabelColorPickerAtom.debugLabel = "openLabelColorPickerAtom"

/** Close label color picker */
export const closeLabelColorPickerAtom = atom(null, (get, set) => {
  set(labelColorPickerAtom, null)
})
closeLabelColorPickerAtom.debugLabel = "closeLabelColorPickerAtom"

/**
 * Section context menu state atoms
 * Manages editing, color picker, and menu visibility states for sections
 */

/** Currently editing section ID */
export const editingSectionIdAtom = atom<SectionId | null>(null)
editingSectionIdAtom.debugLabel = "editingSectionIdAtom"

/** Section color picker open state with section ID */
export const sectionColorPickerAtom = atom<SectionId | null>(null)
sectionColorPickerAtom.debugLabel = "sectionColorPickerAtom"

/** Start editing a section by ID */
export const startEditingSectionAtom = atom(null, (get, set, sectionId: SectionId) => {
  set(editingSectionIdAtom, sectionId)
})
startEditingSectionAtom.debugLabel = "startEditingSectionAtom"

/** Stop editing current section */
export const stopEditingSectionAtom = atom(null, (get, set) => {
  set(editingSectionIdAtom, null)
})
stopEditingSectionAtom.debugLabel = "stopEditingSectionAtom"

/** Open color picker for a section */
export const openSectionColorPickerAtom = atom(null, (get, set, sectionId: SectionId) => {
  set(sectionColorPickerAtom, sectionId)
})
openSectionColorPickerAtom.debugLabel = "openSectionColorPickerAtom"

/** Close section color picker */
export const closeSectionColorPickerAtom = atom(null, (get, set) => {
  set(sectionColorPickerAtom, null)
})
closeSectionColorPickerAtom.debugLabel = "closeSectionColorPickerAtom"

// =============================================================================
// EXPORT COLLECTIONS
// =============================================================================

/**
 * All navigation action atoms organized by category
 */
export const navigationAtoms = {
  // Search actions
  search: {
    open: openSearchAtom,
    close: closeSearchAtom,
    toggle: toggleSearchAtom,
  },

  // Quick add actions
  quickAdd: {
    open: openQuickAddAtom,
    close: closeQuickAddAtom,
    toggle: toggleQuickAddAtom,
  },

  // Project dialog actions
  project: {
    open: openProjectDialogAtom,
    close: closeProjectDialogAtom,
    toggle: toggleProjectDialogAtom,
  },

  // Label dialog actions
  label: {
    open: openLabelDialogAtom,
    close: closeLabelDialogAtom,
    toggle: toggleLabelDialogAtom,
  },

  // Global actions
  closeAll: closeAllDialogsAtom,

  // Context menu states
  contextMenu: {
    project: {
      editing: editingProjectIdAtom,
      colorPicker: projectColorPickerAtom,
      startEditing: startEditingProjectAtom,
      stopEditing: stopEditingProjectAtom,
      openColorPicker: openProjectColorPickerAtom,
      closeColorPicker: closeProjectColorPickerAtom,
    },
    label: {
      editing: editingLabelIdAtom,
      colorPicker: labelColorPickerAtom,
      startEditing: startEditingLabelAtom,
      stopEditing: stopEditingLabelAtom,
      openColorPicker: openLabelColorPickerAtom,
      closeColorPicker: closeLabelColorPickerAtom,
    },
    section: {
      editing: editingSectionIdAtom,
      colorPicker: sectionColorPickerAtom,
      startEditing: startEditingSectionAtom,
      stopEditing: stopEditingSectionAtom,
      openColorPicker: openSectionColorPickerAtom,
      closeColorPicker: closeSectionColorPickerAtom,
    },
  },
} as const
