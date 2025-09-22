import { atom } from "jotai"
import {
  showSearchDialogAtom,
  showQuickAddAtom,
  showProjectDialogAtom,
  showLabelDialogAtom,
  showSectionDialogAtom,
  showProjectGroupDialogAtom,
  projectDialogContextAtom,
  labelDialogContextAtom,
  sectionDialogContextAtom,
  projectGroupDialogContextAtom,
} from "../ui/dialogs"
import {
  INBOX_PROJECT_ID,
  ProjectIdSchema,
  GroupIdSchema,
  type Project,
  type Label,
  type ProjectGroup,
  type ProjectId,
  type LabelId,
  type SectionId,
  type GroupId,
  type ViewId,
  type StandardViewId,
  createProjectId,
  createGroupId,
} from "@/lib/types"
import { DEFAULT_GROUP_COLOR, DEFAULT_ROUTE } from "@/lib/constants/defaults"
import { projectsAtom } from "../core/projects"
import { labelsAtom } from "../core/labels"
import { allGroupsAtom } from "../core/groups"
import { resolveProject, resolveLabel, resolveProjectGroup } from "@/lib/utils/routing"
import { findGroupById } from "@/lib/utils/group-utils"
import { log } from "@/lib/utils/logger"
import { STANDARD_VIEW_IDS, STANDARD_VIEW_METADATA } from "@/lib/constants/defaults"

// Internal validation functions for navigation parsing
function isValidProjectId(id: string): id is ProjectId {
  try {
    ProjectIdSchema.parse(id)
    return true
  } catch {
    return false
  }
}

function isValidGroupId(id: string): id is GroupId {
  try {
    GroupIdSchema.parse(id)
    return true
  } catch {
    return false
  }
}

/**
 * Validates if a string is a standard view identifier
 */
function isStandardViewId(id: string): id is StandardViewId {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return STANDARD_VIEW_IDS.includes(id as StandardViewId)
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
    if (options?.projectId && options.placement) {
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
    if (options?.id && options.placement) {
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
    if (options?.id && options.placement) {
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
// PROJECT GROUP DIALOG ACTIONS
// =============================================================================

/**
 * Opens the project group dialog
 */
export const openProjectGroupDialogAtom = atom(
  null,
  (get, set, options?: { mode?: "create" | "edit"; groupId?: string; parentId?: string }) => {
    // Set the dialog context
    if (options?.mode === "edit" && options.groupId) {
      set(projectGroupDialogContextAtom, {
        mode: "edit",
        groupId: options.groupId,
      })
    } else if (options?.parentId) {
      set(projectGroupDialogContextAtom, {
        mode: "create",
        parentId: options.parentId,
      })
    } else {
      set(projectGroupDialogContextAtom, { mode: "create" })
    }

    set(showProjectGroupDialogAtom, true)
  },
)
openProjectGroupDialogAtom.debugLabel = "openProjectGroupDialogAtom"

/**
 * Closes the project group dialog
 */
export const closeProjectGroupDialogAtom = atom(null, (get, set) => {
  set(showProjectGroupDialogAtom, false)
})
closeProjectGroupDialogAtom.debugLabel = "closeProjectGroupDialogAtom"

/**
 * Toggles the project group dialog
 */
export const toggleProjectGroupDialogAtom = atom(null, (get, set) => {
  const current = get(showProjectGroupDialogAtom)
  set(showProjectGroupDialogAtom, !current)
})
toggleProjectGroupDialogAtom.debugLabel = "toggleProjectGroupDialogAtom"

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
  set(showProjectGroupDialogAtom, false)
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
  routeType: "standard" | "project" | "label" | "filter" | "projectgroup"
}

/**
 * Internal pathname atom - will be set by components using usePathname
 */
export const pathnameAtom = atom<string>(DEFAULT_ROUTE)
pathnameAtom.debugLabel = "pathnameAtom"

/**
 * Parse route context from pathname
 */
function parseRouteContext(
  pathname: string,
  labels?: Label[],
  projects?: Project[],
  groups?: { projectGroups: ProjectGroup; labelGroups: unknown },
): RouteContext {
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

  // Handle project group routes
  if (firstSegment === "projectgroups" && secondSegment) {
    // Try to resolve project group by ID or slug
    if (groups) {
      const group = resolveProjectGroup(secondSegment, groups.projectGroups)
      if (group) {
        return {
          pathname,
          viewId: group.id, // ViewId is the GroupId
          routeType: "projectgroup",
        }
      }
    }

    // Log warning for non-existent groups
    if (isValidGroupId(secondSegment)) {
      log.warn(`Project group with ID '${secondSegment}' not found`)
    } else {
      log.warn(`Project group with slug '${secondSegment}' not found`)
    }

    // Fallback if project group not found or groups not available
    return {
      pathname,
      viewId: "not-found", // Show not found component
      routeType: "projectgroup",
    }
  }

  // Remove filter routes - not supported yet

  // Handle standard views and unknown routes
  const viewId = firstSegment

  // For known standard views, use proper typing. For unknown routes, cast to ViewId
  // to allow the system to handle them gracefully with fallback behavior
  const validatedViewId: ViewId =
    viewId && isStandardViewId(viewId)
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
  const groups = get(allGroupsAtom)
  return parseRouteContext(pathname, labels, projects, groups)
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
  groups?: { projectGroups: ProjectGroup; labelGroups: unknown },
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

  // Handle project group routes
  if (routeType === "projectgroup") {
    // viewId contains the group ID for projectgroup routes
    if (groups && isValidGroupId(viewId)) {
      const groupId = createGroupId(viewId)
      const group = findGroupById(groups.projectGroups, groupId)
      if (group) {
        return {
          title: group.name,
          description: `All tasks in ${group.name}`,
          iconType: "folder",
          color: group.color || DEFAULT_GROUP_COLOR,
        }
      }
    }
    // Fallback for non-existent groups
    return {
      title: "Project Group",
      description: "All tasks in project group",
      iconType: "folder",
      color: DEFAULT_GROUP_COLOR,
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

  // Handle standard routes using centralized metadata
  if (viewId in STANDARD_VIEW_METADATA) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return STANDARD_VIEW_METADATA[viewId as keyof typeof STANDARD_VIEW_METADATA]
  }

  // Handle non-standard routes
  switch (true) {
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
  const groups = get(allGroupsAtom)

  return generatePageInfo(routeContext, projects, labels, groups)
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

/**
 * Group context menu state atoms
 * Manages editing, color picker, and menu visibility states for groups
 */

/** Currently editing group ID */
export const editingGroupIdAtom = atom<GroupId | null>(null)
editingGroupIdAtom.debugLabel = "editingGroupIdAtom"

/** Group color picker open state with group ID */
export const groupColorPickerAtom = atom<GroupId | null>(null)
groupColorPickerAtom.debugLabel = "groupColorPickerAtom"

/** Start editing a group by ID */
export const startEditingGroupAtom = atom(null, (get, set, groupId: GroupId) => {
  set(editingGroupIdAtom, groupId)
})
startEditingGroupAtom.debugLabel = "startEditingGroupAtom"

/** Stop editing current group */
export const stopEditingGroupAtom = atom(null, (get, set) => {
  set(editingGroupIdAtom, null)
})
stopEditingGroupAtom.debugLabel = "stopEditingGroupAtom"

/** Open color picker for a group */
export const openGroupColorPickerAtom = atom(null, (get, set, groupId: GroupId) => {
  set(groupColorPickerAtom, groupId)
})
openGroupColorPickerAtom.debugLabel = "openGroupColorPickerAtom"

/** Close group color picker */
export const closeGroupColorPickerAtom = atom(null, (get, set) => {
  set(groupColorPickerAtom, null)
})
closeGroupColorPickerAtom.debugLabel = "closeGroupColorPickerAtom"

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
    group: {
      editing: editingGroupIdAtom,
      colorPicker: groupColorPickerAtom,
      startEditing: startEditingGroupAtom,
      stopEditing: stopEditingGroupAtom,
      openColorPicker: openGroupColorPickerAtom,
      closeColorPicker: closeGroupColorPickerAtom,
    },
  },
} as const
