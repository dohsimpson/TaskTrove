/**
 * ⚠️ NEXTJS DEPENDENT - Navigation and routing atoms
 *
 * This file contains atoms that depend on NextJS router and web routing concepts.
 * Platform dependencies:
 * - Next.js usePathname hook (pathnameAtom needs to be set by web components)
 * - Browser URL/pathname parsing
 * - Web-specific routing patterns
 *
 * For cross-platform use, these atoms would need abstraction layers for:
 * - Route navigation (Next.js router vs React Navigation)
 * - URL/pathname handling
 * - Platform-specific routing concepts
 */

import { atom } from "jotai";
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
} from "@tasktrove/atoms/ui/dialogs";
import { ProjectIdSchema } from "@tasktrove/types/id";
import {
  GroupIdSchema,
  type ProjectId,
  type LabelId,
  type GroupId,
  type ViewId,
  createGroupId,
} from "@tasktrove/types/id";
import type { StandardViewId } from "@tasktrove/types/constants";
import { type Project, type Label } from "@tasktrove/types/core";
import { type ProjectGroup } from "@tasktrove/types/group";
import { DEFAULT_GROUP_COLOR, DEFAULT_ROUTE } from "@tasktrove/constants";
import { projectsAtom, labelsAtom } from "@tasktrove/atoms/data/base/atoms";
import { allGroupsAtom } from "@tasktrove/atoms/core/groups";
import {
  resolveProject,
  resolveLabel,
  resolveProjectGroup,
  findGroupById,
} from "@tasktrove/utils";
import { log } from "@tasktrove/atoms/utils/atom-helpers";
import {
  STANDARD_VIEW_IDS,
  STANDARD_VIEW_METADATA,
} from "@tasktrove/constants";

// Internal validation functions for navigation parsing
// Retained for potential future validation parity; currently unused
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isValidProjectId(id: string): id is ProjectId {
  try {
    ProjectIdSchema.parse(id);
    return true;
  } catch {
    return false;
  }
}

function isValidGroupId(id: string): id is GroupId {
  try {
    GroupIdSchema.parse(id);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if a string is a standard view identifier
 */
function isStandardViewId(id: string): id is StandardViewId {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return STANDARD_VIEW_IDS.includes(id as StandardViewId);
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
  set(showSearchDialogAtom, true);
});
openSearchAtom.debugLabel = "openSearchAtom";

/**
 * Closes the search dialog
 */
export const closeSearchAtom = atom(null, (get, set) => {
  set(showSearchDialogAtom, false);
});
closeSearchAtom.debugLabel = "closeSearchAtom";

/**
 * Toggles the search dialog
 */
export const toggleSearchAtom = atom(null, (get, set) => {
  const current = get(showSearchDialogAtom);
  set(showSearchDialogAtom, !current);
});
toggleSearchAtom.debugLabel = "toggleSearchAtom";

// =============================================================================
// QUICK ADD DIALOG ACTIONS
// =============================================================================

/**
 * Opens the quick add dialog
 */
export const openQuickAddAtom = atom(null, (get, set) => {
  set(showQuickAddAtom, true);
});
openQuickAddAtom.debugLabel = "openQuickAddAtom";

/**
 * Closes the quick add dialog
 */
export const closeQuickAddAtom = atom(null, (get, set) => {
  set(showQuickAddAtom, false);
});
closeQuickAddAtom.debugLabel = "closeQuickAddAtom";

/**
 * Toggles the quick add dialog
 */
export const toggleQuickAddAtom = atom(null, (get, set) => {
  const current = get(showQuickAddAtom);
  set(showQuickAddAtom, !current);
});
toggleQuickAddAtom.debugLabel = "toggleQuickAddAtom";

// =============================================================================
// PROJECT DIALOG ACTIONS
// =============================================================================

/**
 * Opens the project dialog
 */
export const openProjectDialogAtom = atom(
  null,
  (
    get,
    set,
    options?: { projectId?: ProjectId; placement?: "above" | "below" },
  ) => {
    // Set the dialog context
    if (options?.projectId && options.placement) {
      set(projectDialogContextAtom, {
        mode: "create",
        insertPosition: {
          id: options.projectId,
          placement: options.placement,
        },
      });
    } else {
      set(projectDialogContextAtom, { mode: "create" });
    }

    set(showProjectDialogAtom, true);
  },
);
openProjectDialogAtom.debugLabel = "openProjectDialogAtom";

/**
 * Closes the project dialog
 */
export const closeProjectDialogAtom = atom(null, (get, set) => {
  set(showProjectDialogAtom, false);
});
closeProjectDialogAtom.debugLabel = "closeProjectDialogAtom";

/**
 * Toggles the project dialog
 */
export const toggleProjectDialogAtom = atom(null, (get, set) => {
  const current = get(showProjectDialogAtom);
  set(showProjectDialogAtom, !current);
});
toggleProjectDialogAtom.debugLabel = "toggleProjectDialogAtom";

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
      });
    } else {
      set(labelDialogContextAtom, { mode: "create" });
    }

    set(showLabelDialogAtom, true);
  },
);
openLabelDialogAtom.debugLabel = "openLabelDialogAtom";

/**
 * Closes the label dialog
 */
export const closeLabelDialogAtom = atom(null, (get, set) => {
  set(showLabelDialogAtom, false);
});
closeLabelDialogAtom.debugLabel = "closeLabelDialogAtom";

/**
 * Toggles the label dialog
 */
export const toggleLabelDialogAtom = atom(null, (get, set) => {
  const current = get(showLabelDialogAtom);
  set(showLabelDialogAtom, !current);
});
toggleLabelDialogAtom.debugLabel = "toggleLabelDialogAtom";

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
    options?: {
      id?: GroupId;
      placement?: "above" | "below";
      projectId?: ProjectId;
    },
  ) => {
    // Set the dialog context
    if (options?.projectId) {
      // Has projectId - may or may not have position
      set(sectionDialogContextAtom, {
        mode: "create",
        insertPosition: {
          id: options.id,
          placement: options.placement,
          projectId: options.projectId,
        },
      });
    } else {
      // Fallback for legacy behavior
      set(sectionDialogContextAtom, { mode: "create" });
    }

    set(showSectionDialogAtom, true);
  },
);
openSectionDialogAtom.debugLabel = "openSectionDialogAtom";

/**
 * Closes the section dialog
 */
export const closeSectionDialogAtom = atom(null, (get, set) => {
  set(showSectionDialogAtom, false);
});
closeSectionDialogAtom.debugLabel = "closeSectionDialogAtom";

/**
 * Toggles the section dialog
 */
export const toggleSectionDialogAtom = atom(null, (get, set) => {
  const current = get(showSectionDialogAtom);
  set(showSectionDialogAtom, !current);
});
toggleSectionDialogAtom.debugLabel = "toggleSectionDialogAtom";

// =============================================================================
// PROJECT GROUP DIALOG ACTIONS
// =============================================================================

/**
 * Opens the project group dialog
 */
export const openProjectGroupDialogAtom = atom(
  null,
  (
    get,
    set,
    options?: { mode?: "create" | "edit"; groupId?: string; parentId?: string },
  ) => {
    // Set the dialog context
    if (options?.mode === "edit" && options.groupId) {
      set(projectGroupDialogContextAtom, {
        mode: "edit",
        groupId: options.groupId,
      });
    } else if (options?.parentId) {
      set(projectGroupDialogContextAtom, {
        mode: "create",
        parentId: options.parentId,
      });
    } else {
      set(projectGroupDialogContextAtom, { mode: "create" });
    }

    set(showProjectGroupDialogAtom, true);
  },
);
openProjectGroupDialogAtom.debugLabel = "openProjectGroupDialogAtom";

/**
 * Closes the project group dialog
 */
export const closeProjectGroupDialogAtom = atom(null, (get, set) => {
  set(showProjectGroupDialogAtom, false);
});
closeProjectGroupDialogAtom.debugLabel = "closeProjectGroupDialogAtom";

/**
 * Toggles the project group dialog
 */
export const toggleProjectGroupDialogAtom = atom(null, (get, set) => {
  const current = get(showProjectGroupDialogAtom);
  set(showProjectGroupDialogAtom, !current);
});
toggleProjectGroupDialogAtom.debugLabel = "toggleProjectGroupDialogAtom";

// =============================================================================
// GLOBAL DIALOG ACTIONS
// =============================================================================

/**
 * Closes all dialogs at once
 */
export const closeAllDialogsAtom = atom(null, (get, set) => {
  set(showSearchDialogAtom, false);
  set(showQuickAddAtom, false);
  set(showProjectDialogAtom, false);
  set(showLabelDialogAtom, false);
  set(showSectionDialogAtom, false);
  set(showProjectGroupDialogAtom, false);
});
closeAllDialogsAtom.debugLabel = "closeAllDialogsAtom";

// =============================================================================
// ROUTE CONTEXT ATOMS
// =============================================================================
// RouteContext is a discriminated union:
// - projectgroup routes may start as { viewId: "not-found", slug } on first render
//   when group data hasn't hydrated; a subsequent recompute will swap in the UUID.
//   Components should handle both states.

type StandardRouteContext = {
  pathname: string;
  viewId: string;
  routeType: "standard";
};

type ProjectRouteContext = {
  pathname: string;
  viewId: ProjectId | "not-found";
  routeType: "project";
  slug?: string;
};

type LabelRouteContext = {
  pathname: string;
  viewId: LabelId | "not-found";
  routeType: "label";
  slug?: string;
};

type ProjectGroupRouteContext = {
  pathname: string;
  viewId: GroupId | "not-found";
  routeType: "projectgroup";
  /** Raw slug/segment from the URL for loading states */
  slug?: string;
};

type FilterRouteContext = {
  pathname: string;
  viewId: ViewId;
  routeType: "filter";
};

/**
 * Route context type definition
 */
export type RouteContext =
  | StandardRouteContext
  | ProjectRouteContext
  | LabelRouteContext
  | ProjectGroupRouteContext
  | FilterRouteContext;

/**
 * Internal pathname atom - will be set by components using usePathname
 */
export const pathnameAtom = atom<string>(DEFAULT_ROUTE);
pathnameAtom.debugLabel = "pathnameAtom";

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
    };
  }

  // Split pathname and filter empty parts
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0) {
    return {
      pathname,
      viewId: "today",
      routeType: "standard",
    };
  }

  const [firstSegment, secondSegment] = parts;

  // Handle project routes
  if (firstSegment === "projects" && secondSegment) {
    const decodedParam = decodeURIComponent(secondSegment);

    // Try to resolve project by ID or slug
    if (projects) {
      const project = resolveProject(decodedParam, projects);
      if (project) {
        return {
          pathname,
          viewId: project.id, // ViewId is the ProjectId
          routeType: "project",
          slug: project.slug,
        };
      }
    }

    // Fallback: project not found (either slug or UUID that didn't resolve)
    return {
      pathname,
      viewId: "not-found", // Explicit not-found sentinel
      routeType: "project",
      slug: decodedParam,
    };
  }

  // Handle label routes
  if (firstSegment === "labels" && secondSegment) {
    const decodedParam = decodeURIComponent(secondSegment);

    // Try to resolve label by ID or slug
    if (labels) {
      const label = resolveLabel(decodedParam, labels);
      if (label) {
        return {
          pathname,
          viewId: label.id, // ViewId is the LabelId
          routeType: "label",
          slug: label.slug,
        };
      }

      // Legacy fallback: try to find by name for backwards compatibility
      const labelByName = labels.find((l) => l.name === decodedParam);
      if (labelByName) {
        return {
          pathname,
          viewId: labelByName.id, // ViewId is the LabelId
          routeType: "label",
          slug: labelByName.slug,
        };
      }
    }

    // Fallback if label not found or labels not available
    return {
      pathname,
      viewId: "not-found", // Explicit not-found sentinel
      routeType: "label",
      slug: decodedParam,
    };
  }

  // Handle project group routes
  if (firstSegment === "projectgroups" && secondSegment) {
    const decodedParam = decodeURIComponent(secondSegment);

    // Try to resolve project group by ID or slug
    if (groups) {
      const group = resolveProjectGroup(decodedParam, groups.projectGroups);
      if (group) {
        return {
          pathname,
          viewId: group.id, // ViewId is the GroupId
          routeType: "projectgroup",
          slug: group.slug,
        };
      }
    }

    // Log warning for non-existent groups
    if (isValidGroupId(decodedParam)) {
      log.warn(`Project group with ID '${decodedParam}' not found`);
    } else {
      log.warn(`Project group with slug '${decodedParam}' not found`);
    }

    // Fallback if project group not found or groups not available
    return {
      pathname,
      viewId: "not-found", // Show not found component
      routeType: "projectgroup",
      slug: decodedParam,
    };
  }

  // Remove filter routes - not supported yet

  // Handle standard views and unknown routes
  const viewId = firstSegment;

  // For known standard views, use proper typing. For unknown routes, cast to ViewId
  // to allow the system to handle them gracefully with fallback behavior
  const validatedViewId: ViewId =
    viewId && isStandardViewId(viewId) ? viewId : viewId || "inbox";

  return {
    pathname,
    viewId: validatedViewId,
    routeType: "standard",
  };
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
  const pathname = get(pathnameAtom);
  const labels = get(labelsAtom);
  const projects = get(projectsAtom);
  const groups = get(allGroupsAtom);
  return parseRouteContext(pathname, labels, projects, groups);
});
currentRouteContextAtom.debugLabel = "currentRouteContextAtom";

/**
 * Set pathname action atom
 */
export const setPathnameAtom = atom(null, (get, set, pathname: string) => {
  set(pathnameAtom, pathname);
});
setPathnameAtom.debugLabel = "setPathnameAtom";

// =============================================================================
// DYNAMIC PAGE INFO ATOMS
// =============================================================================

/**
 * Dynamic page information type definition
 */
export interface DynamicPageInfo {
  /** Page title */
  title: string;
  /** Page description */
  description: string;
  /** Icon type identifier */
  iconType: string;
  /** Optional color for projects and labels */
  color?: string;
}

/**
 * Type guard to check if viewId is a standard view
 */
function isStandardView(
  viewId: ViewId,
): viewId is (typeof STANDARD_VIEW_IDS)[number] {
  return viewId in STANDARD_VIEW_METADATA;
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
  const { routeType, viewId } = routeContext;

  // Handle project routes
  if (routeType === "project") {
    // viewId contains the project ID for project routes
    const project = projects.find((p) => p.id === viewId);
    if (project) {
      return {
        title: project.name,
        description: "Project tasks",
        iconType: "project",
        color: project.color,
      };
    }
    // Fallback for non-existent projects
    return {
      title: "Project",
      description: "Project tasks",
      iconType: "project",
      color: "#6b7280",
    };
  }

  // Handle label routes
  if (routeType === "label") {
    // viewId contains the label ID for label routes
    const label = labels.find((l) => l.id === viewId);
    if (label) {
      return {
        title: label.name,
        description: `Tasks with ${label.name} label`,
        iconType: "label",
        color: label.color,
      };
    }
    // Fallback for non-existent labels
    return {
      title: "Label",
      description: "Tasks with label",
      iconType: "label",
      color: "#6b7280",
    };
  }

  // Handle project group routes
  if (routeType === "projectgroup") {
    // viewId contains the group ID for projectgroup routes
    if (groups && isValidGroupId(viewId)) {
      const groupId = createGroupId(viewId);
      const group = findGroupById(groups.projectGroups, groupId);
      if (group) {
        return {
          title: group.name,
          description: `All tasks in ${group.name}`,
          iconType: "folder",
          color: group.color || DEFAULT_GROUP_COLOR,
        };
      }
    }
    // Fallback for non-existent groups
    return {
      title: "Project Group",
      description: "All tasks in project group",
      iconType: "folder",
      color: DEFAULT_GROUP_COLOR,
    };
  }

  // Handle filter routes
  if (routeType === "filter") {
    return {
      title: "Filter",
      description: "Filtered view",
      iconType: "filter",
    };
  }

  // Handle standard routes using centralized metadata
  if (isStandardView(viewId)) {
    return STANDARD_VIEW_METADATA[viewId];
  }

  // Handle non-standard routes
  switch (true) {
    default: {
      // Capitalize first letter for unknown routes
      const capitalizedTitle = viewId.charAt(0).toUpperCase() + viewId.slice(1);
      return {
        title: capitalizedTitle,
        description: "Page content",
        iconType: "default",
      };
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
  const routeContext = get(currentRouteContextAtom);
  const projects = get(projectsAtom);
  const labels = get(labelsAtom);
  const groups = get(allGroupsAtom);

  return generatePageInfo(routeContext, projects, labels, groups);
});
dynamicPageInfoAtom.debugLabel = "dynamicPageInfoAtom";

// =============================================================================
// CONTEXT MENU STATE ATOMS
// =============================================================================

/**
 * Project context menu state atoms
 * Manages editing, color picker, and menu visibility states for projects
 */

/** Currently editing project ID */
export const editingProjectIdAtom = atom<ProjectId | null>(null);
editingProjectIdAtom.debugLabel = "editingProjectIdAtom";

/** Project color picker open state with project ID */
export const projectColorPickerAtom = atom<ProjectId | null>(null);
projectColorPickerAtom.debugLabel = "projectColorPickerAtom";

/** Start editing a project by ID */
export const startEditingProjectAtom = atom(
  null,
  (get, set, projectId: ProjectId) => {
    set(editingProjectIdAtom, projectId);
  },
);
startEditingProjectAtom.debugLabel = "startEditingProjectAtom";

/** Stop editing current project */
export const stopEditingProjectAtom = atom(null, (get, set) => {
  set(editingProjectIdAtom, null);
});
stopEditingProjectAtom.debugLabel = "stopEditingProjectAtom";

/** Open color picker for a project */
export const openProjectColorPickerAtom = atom(
  null,
  (get, set, projectId: ProjectId) => {
    set(projectColorPickerAtom, projectId);
  },
);
openProjectColorPickerAtom.debugLabel = "openProjectColorPickerAtom";

/** Close project color picker */
export const closeProjectColorPickerAtom = atom(null, (get, set) => {
  set(projectColorPickerAtom, null);
});
closeProjectColorPickerAtom.debugLabel = "closeProjectColorPickerAtom";

/**
 * Label context menu state atoms
 * Manages editing, color picker, and menu visibility states for labels
 */

/** Currently editing label ID */
export const editingLabelIdAtom = atom<LabelId | null>(null);
editingLabelIdAtom.debugLabel = "editingLabelIdAtom";

/** Label color picker open state with label ID */
export const labelColorPickerAtom = atom<LabelId | null>(null);
labelColorPickerAtom.debugLabel = "labelColorPickerAtom";

/** Start editing a label by ID */
export const startEditingLabelAtom = atom(
  null,
  (get, set, labelId: LabelId) => {
    set(editingLabelIdAtom, labelId);
  },
);
startEditingLabelAtom.debugLabel = "startEditingLabelAtom";

/** Stop editing current label */
export const stopEditingLabelAtom = atom(null, (get, set) => {
  set(editingLabelIdAtom, null);
});
stopEditingLabelAtom.debugLabel = "stopEditingLabelAtom";

/** Open color picker for a label */
export const openLabelColorPickerAtom = atom(
  null,
  (get, set, labelId: LabelId) => {
    set(labelColorPickerAtom, labelId);
  },
);
openLabelColorPickerAtom.debugLabel = "openLabelColorPickerAtom";

/** Close label color picker */
export const closeLabelColorPickerAtom = atom(null, (get, set) => {
  set(labelColorPickerAtom, null);
});
closeLabelColorPickerAtom.debugLabel = "closeLabelColorPickerAtom";

/**
 * Section context menu state atoms
 * Manages editing, color picker, and menu visibility states for sections
 */

/** Currently editing section ID */
export const editingSectionIdAtom = atom<GroupId | null>(null);
editingSectionIdAtom.debugLabel = "editingSectionIdAtom";

/** Section color picker open state with section ID */
export const sectionColorPickerAtom = atom<GroupId | null>(null);
sectionColorPickerAtom.debugLabel = "sectionColorPickerAtom";

/** Start editing a section by ID */
export const startEditingSectionAtom = atom(
  null,
  (get, set, sectionId: GroupId) => {
    set(editingSectionIdAtom, sectionId);
  },
);
startEditingSectionAtom.debugLabel = "startEditingSectionAtom";

/** Stop editing current section */
export const stopEditingSectionAtom = atom(null, (get, set) => {
  set(editingSectionIdAtom, null);
});
stopEditingSectionAtom.debugLabel = "stopEditingSectionAtom";

/** Open color picker for a section */
export const openSectionColorPickerAtom = atom(
  null,
  (get, set, sectionId: GroupId) => {
    set(sectionColorPickerAtom, sectionId);
  },
);
openSectionColorPickerAtom.debugLabel = "openSectionColorPickerAtom";

/** Close section color picker */
export const closeSectionColorPickerAtom = atom(null, (get, set) => {
  set(sectionColorPickerAtom, null);
});
closeSectionColorPickerAtom.debugLabel = "closeSectionColorPickerAtom";

/**
 * Group context menu state atoms
 * Manages editing, color picker, and menu visibility states for groups
 */

/** Currently editing group ID */
export const editingGroupIdAtom = atom<GroupId | null>(null);
editingGroupIdAtom.debugLabel = "editingGroupIdAtom";

/** Group color picker open state with group ID */
export const groupColorPickerAtom = atom<GroupId | null>(null);
groupColorPickerAtom.debugLabel = "groupColorPickerAtom";

/** Start editing a group by ID */
export const startEditingGroupAtom = atom(
  null,
  (get, set, groupId: GroupId) => {
    set(editingGroupIdAtom, groupId);
  },
);
startEditingGroupAtom.debugLabel = "startEditingGroupAtom";

/** Stop editing current group */
export const stopEditingGroupAtom = atom(null, (get, set) => {
  set(editingGroupIdAtom, null);
});
stopEditingGroupAtom.debugLabel = "stopEditingGroupAtom";

/** Open color picker for a group */
export const openGroupColorPickerAtom = atom(
  null,
  (get, set, groupId: GroupId) => {
    set(groupColorPickerAtom, groupId);
  },
);
openGroupColorPickerAtom.debugLabel = "openGroupColorPickerAtom";

/** Close group color picker */
export const closeGroupColorPickerAtom = atom(null, (get, set) => {
  set(groupColorPickerAtom, null);
});
closeGroupColorPickerAtom.debugLabel = "closeGroupColorPickerAtom";

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
} as const;
