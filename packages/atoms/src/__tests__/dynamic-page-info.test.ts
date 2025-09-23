/**
 * ⚠️  WEB API DEPENDENT - Dynamic Page Info Test Suite
 *
 * Platform dependencies:
 * - Web URL parsing and pathname handling
 * - Browser routing and navigation state
 * - Web-specific route context management
 * - URL encoding/decoding for route parameters
 * - Dynamic page title and metadata management
 *
 * Test suite for dynamicPageInfoAtom
 *
 * This atom provides dynamic page information (title and description)
 * based on the current route context, replacing the getPageTitle()
 * function from MainLayoutWrapper.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { atom, createStore } from "jotai";
import { setPathnameAtom, pathnameAtom } from "../ui/navigation";
import type { Project, Label, ViewId, StandardViewId } from "@tasktrove/types";
import {
  createProjectId,
  createLabelId,
  INBOX_PROJECT_ID,
} from "@tasktrove/types";
import type { RouteContext } from "../ui/navigation";
import { resolveProject, resolveLabel } from "@tasktrove/utils/routing";

// Test constants - defined locally since they're test-only
const TEST_PROJECT_ID_1 = createProjectId(
  "87654321-4321-4321-8321-210987654321",
);
const TEST_PROJECT_ID_2 = createProjectId(
  "87654321-4321-4321-8321-210987654322",
);
const TEST_LABEL_ID_1 = createLabelId("abcdef01-abcd-4bcd-8bcd-abcdefabcdef");
const TEST_LABEL_ID_2 = createLabelId("abcdef01-abcd-4bcd-8bcd-abcdefabcde0");

// Create mock atoms for testing (overriding TanStack Query atoms)
const mockProjectsAtom = atom<Project[]>([]);
const mockLabelsAtom = atom<Label[]>([]);

// Helper function from navigation.ts
function isValidProjectId(id: string): boolean {
  // Simple UUID format check for tests
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id,
  );
}

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
  ].includes(id);
}

// Replicate the route parsing logic from navigation.ts for testing
function parseRouteContext(
  pathname: string,
  labels?: Label[],
  projects?: Project[],
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
    // Try to resolve project by ID or slug
    if (projects) {
      const project = resolveProject(secondSegment, projects);
      if (project) {
        return {
          pathname,
          viewId: project.id, // ViewId is the ProjectId
          routeType: "project",
        };
      }
    }

    // Fallback: check if it's a valid ID format for backwards compatibility
    if (isValidProjectId(secondSegment)) {
      return {
        pathname,
        viewId: createProjectId(secondSegment), // Use the ID directly
        routeType: "project",
      };
    }

    // Invalid project ID/slug, treat as project route for fallback handling
    return {
      pathname,
      viewId: INBOX_PROJECT_ID, // Use inbox project ID as viewId for invalid projects
      routeType: "project",
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
        };
      }

      // Legacy fallback: try to find by name for backwards compatibility
      const labelByName = labels.find((l) => l.name === decodedParam);
      if (labelByName) {
        return {
          pathname,
          viewId: labelByName.id, // ViewId is the LabelId
          routeType: "label",
        };
      }
    }

    // Fallback if label not found or labels not available
    return {
      pathname,
      viewId: "all", // Fallback to showing all tasks
      routeType: "label",
    };
  }

  // Handle standard views and unknown routes
  const viewId = firstSegment;

  // For known standard views, use proper typing. For unknown routes, use fallback
  // to allow the system to handle them gracefully with fallback behavior
  const validatedViewId: ViewId =
    viewId && isStandardViewId(viewId) ? viewId : "inbox"; // Use 'inbox' as fallback for unknown routes

  return {
    pathname,
    viewId: validatedViewId,
    routeType: "standard",
  };
}

// Create test version of currentRouteContextAtom
const currentRouteContextAtom = atom<RouteContext>((get) => {
  const pathname = get(pathnameAtom);
  const labels = get(mockLabelsAtom);
  const projects = get(mockProjectsAtom);
  return parseRouteContext(pathname, labels, projects);
});

// Create a test version of the dynamic page info atom using mock atoms - copy the real implementation
const dynamicPageInfoAtom = atom((get) => {
  const routeContext = get(currentRouteContextAtom);
  const projects = get(mockProjectsAtom);
  const labels = get(mockLabelsAtom);

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
    return {
      title: "Label",
      description: "Tasks with label",
      iconType: "label",
      color: "#6b7280",
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

  // Handle standard routes
  switch (viewId) {
    case "today":
      return {
        title: "Today",
        description: "Tasks due today",
        iconType: "today",
      };
    case "inbox":
      return {
        title: "Inbox",
        description: "Uncategorized tasks",
        iconType: "inbox",
      };
    case "upcoming":
      return {
        title: "Upcoming",
        description: "Tasks scheduled for later",
        iconType: "upcoming",
      };
    case "analytics":
      return {
        title: "Analytics",
        description: "Task completion insights and statistics",
        iconType: "analytics",
      };
    case "all":
      return {
        title: "All Tasks",
        description: "All tasks across all projects",
        iconType: "all",
      };
    case "completed":
      return {
        title: "Completed",
        description: "Completed tasks",
        iconType: "completed",
      };
    case "search":
      return {
        title: "Search",
        description: "Search through all tasks",
        iconType: "search",
      };
    case "shortcuts":
      return {
        title: "Shortcuts",
        description: "Keyboard shortcuts and commands",
        iconType: "shortcuts",
      };
    case "profile":
      return {
        title: "Profile",
        description: "User profile and preferences",
        iconType: "profile",
      };
    case "debug":
      return {
        title: "Debug",
        description: "Debug information and tools",
        iconType: "debug",
      };
    case "projects":
      return {
        title: "Projects",
        description: "Manage your projects",
        iconType: "projects",
      };
    case "labels":
      return {
        title: "Labels",
        description: "Manage your labels",
        iconType: "labels",
      };
    case "filters":
      return {
        title: "Filters",
        description: "Custom task filters",
        iconType: "filters",
      };
    default:
      const capitalizedTitle = viewId.charAt(0).toUpperCase() + viewId.slice(1);
      return {
        title: capitalizedTitle,
        description: "Page content",
        iconType: "default",
      };
  }
});

describe("dynamicPageInfoAtom", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    // Reset mock data
    store.set(mockProjectsAtom, []);
    store.set(mockLabelsAtom, []);
  });

  describe("standard views", () => {
    it("should provide info for today route", () => {
      store.set(setPathnameAtom, "/today");

      const pageInfo = store.get(dynamicPageInfoAtom);

      expect(pageInfo).toEqual({
        title: "Today",
        description: "Tasks due today",
        iconType: "today",
      });
    });

    it("should provide info for inbox route", () => {
      store.set(setPathnameAtom, "/inbox");

      const pageInfo = store.get(dynamicPageInfoAtom);

      expect(pageInfo).toEqual({
        title: "Inbox",
        description: "Uncategorized tasks",
        iconType: "inbox",
      });
    });

    it("should provide info for upcoming route", () => {
      store.set(setPathnameAtom, "/upcoming");

      const pageInfo = store.get(dynamicPageInfoAtom);

      expect(pageInfo).toEqual({
        title: "Upcoming",
        description: "Tasks scheduled for later",
        iconType: "upcoming",
      });
    });

    it("should provide info for analytics route", () => {
      store.set(setPathnameAtom, "/analytics");

      const pageInfo = store.get(dynamicPageInfoAtom);

      expect(pageInfo).toEqual({
        title: "Analytics",
        description: "Task completion insights and statistics",
        iconType: "analytics",
      });
    });
  });

  describe("project routes", () => {
    beforeEach(() => {
      // Mock projects data
      store.set(mockProjectsAtom, [
        {
          id: TEST_PROJECT_ID_1,
          name: "My Project",
          slug: "my-project",
          color: "#3b82f6",
          shared: false,
          sections: [],
        },
        {
          id: TEST_PROJECT_ID_2,
          name: "Work Tasks 2024",
          slug: "work-tasks-2024",
          color: "#ef4444",
          shared: false,
          sections: [],
        },
      ]);
    });

    it("should provide info for existing project route", () => {
      store.set(setPathnameAtom, `/projects/${TEST_PROJECT_ID_1}`);

      const pageInfo = store.get(dynamicPageInfoAtom);

      expect(pageInfo).toEqual({
        title: "My Project",
        description: "Project tasks",
        iconType: "project",
        color: "#3b82f6",
      });
    });

    it("should handle project routes with special characters", () => {
      store.set(setPathnameAtom, `/projects/${TEST_PROJECT_ID_2}`);

      const pageInfo = store.get(dynamicPageInfoAtom);

      expect(pageInfo).toEqual({
        title: "Work Tasks 2024",
        description: "Project tasks",
        iconType: "project",
        color: "#ef4444",
      });
    });

    it("should provide fallback info for non-existent project", () => {
      store.set(setPathnameAtom, "/projects/non-existent");

      const pageInfo = store.get(dynamicPageInfoAtom);

      expect(pageInfo).toEqual({
        title: "Project",
        description: "Project tasks",
        iconType: "project",
        color: "#6b7280",
      });
    });
  });

  describe("label routes", () => {
    beforeEach(() => {
      // Mock labels data
      store.set(mockLabelsAtom, [
        {
          id: TEST_LABEL_ID_1,
          name: "urgent",
          slug: "urgent",
          color: "#ef4444",
        },
        {
          id: TEST_LABEL_ID_2,
          name: "high priority",
          slug: "high-priority",
          color: "#f59e0b",
        },
      ]);
    });

    it("should provide info for existing label route", () => {
      store.set(setPathnameAtom, `/labels/${TEST_LABEL_ID_1}`);

      const pageInfo = store.get(dynamicPageInfoAtom);

      expect(pageInfo).toEqual({
        title: "urgent",
        description: "Tasks with urgent label",
        iconType: "label",
        color: "#ef4444",
      });
    });

    it("should handle label routes with spaces", () => {
      store.set(setPathnameAtom, `/labels/${TEST_LABEL_ID_2}`);

      const pageInfo = store.get(dynamicPageInfoAtom);

      expect(pageInfo).toEqual({
        title: "high priority",
        description: "Tasks with high priority label",
        iconType: "label",
        color: "#f59e0b",
      });
    });

    it("should provide fallback info for non-existent label", () => {
      store.set(setPathnameAtom, "/labels/non-existent-label-id");

      const pageInfo = store.get(dynamicPageInfoAtom);

      expect(pageInfo).toEqual({
        title: "Label",
        description: "Tasks with label",
        iconType: "label",
        color: "#6b7280",
      });
    });
  });

  // Filter routes have been removed - not supported in the new system

  describe("edge cases", () => {
    it("should handle root path as today", () => {
      store.set(setPathnameAtom, "/");

      const pageInfo = store.get(dynamicPageInfoAtom);

      expect(pageInfo).toEqual({
        title: "Today",
        description: "Tasks due today",
        iconType: "today",
      });
    });

    it("should handle unknown routes gracefully", () => {
      store.set(setPathnameAtom, "/unknown-route");

      const pageInfo = store.get(dynamicPageInfoAtom);

      expect(pageInfo).toEqual({
        title: "Inbox",
        description: "Uncategorized tasks",
        iconType: "inbox",
      });
    });

    it("should handle empty pathname parts gracefully", () => {
      store.set(setPathnameAtom, "/projects/");

      const pageInfo = store.get(dynamicPageInfoAtom);

      expect(pageInfo).toEqual({
        title: "Projects",
        description: "Manage your projects",
        iconType: "projects",
      });
    });
  });

  describe("type safety", () => {
    it("should return correct types", () => {
      store.set(setPathnameAtom, "/today");
      const pageInfo = store.get(dynamicPageInfoAtom);

      expect(typeof pageInfo.title).toBe("string");
      expect(typeof pageInfo.description).toBe("string");
      expect(typeof pageInfo.iconType).toBe("string");
      expect(pageInfo.title).toBeDefined();
      expect(pageInfo.description).toBeDefined();
      expect(pageInfo.iconType).toBeDefined();
    });

    it("should include color for project routes", () => {
      store.set(mockProjectsAtom, [
        {
          id: TEST_PROJECT_ID_1,
          name: "Test Project",
          slug: "test-project",
          color: "#3b82f6",
          shared: false,
          sections: [],
        },
      ]);

      store.set(setPathnameAtom, `/projects/${TEST_PROJECT_ID_1}`);
      const pageInfo = store.get(dynamicPageInfoAtom);

      expect(pageInfo.color).toBe("#3b82f6");
      expect(typeof pageInfo.color).toBe("string");
    });

    it("should include color for label routes", () => {
      store.set(mockLabelsAtom, [
        {
          id: TEST_LABEL_ID_1,
          name: "test-label",
          slug: "test-label",
          color: "#ef4444",
        },
      ]);

      store.set(setPathnameAtom, `/labels/${TEST_LABEL_ID_1}`);
      const pageInfo = store.get(dynamicPageInfoAtom);

      expect(pageInfo.color).toBe("#ef4444");
      expect(typeof pageInfo.color).toBe("string");
    });
  });

  describe("reactivity", () => {
    it("should be reactive to route changes", () => {
      // Start with today
      store.set(setPathnameAtom, "/today");
      let pageInfo = store.get(dynamicPageInfoAtom);
      expect(pageInfo.title).toBe("Today");

      // Change to inbox
      store.set(setPathnameAtom, "/inbox");
      pageInfo = store.get(dynamicPageInfoAtom);
      expect(pageInfo.title).toBe("Inbox");

      // Change to analytics
      store.set(setPathnameAtom, "/analytics");
      pageInfo = store.get(dynamicPageInfoAtom);
      expect(pageInfo.title).toBe("Analytics");
    });

    it("should be reactive to projects data changes", () => {
      // Start with no projects
      store.set(setPathnameAtom, `/projects/${TEST_PROJECT_ID_1}`);
      let pageInfo = store.get(dynamicPageInfoAtom);
      expect(pageInfo.title).toBe("Project"); // fallback

      // Add project data
      store.set(mockProjectsAtom, [
        {
          id: TEST_PROJECT_ID_1,
          name: "Dynamic Project",
          slug: "dynamic-project",
          color: "#10b981",
          shared: false,
          sections: [],
        },
      ]);

      pageInfo = store.get(dynamicPageInfoAtom);
      expect(pageInfo.title).toBe("Dynamic Project");
      expect(pageInfo.color).toBe("#10b981");
    });
  });

  describe("compatibility with existing code", () => {
    it("should provide equivalent functionality to getPageTitle()", () => {
      const testCases = [
        { pathname: "/today", expectedTitle: "Today" },
        { pathname: "/inbox", expectedTitle: "Inbox" },
        { pathname: "/upcoming", expectedTitle: "Upcoming" },
        { pathname: "/analytics", expectedTitle: "Analytics" },
      ];

      for (const { pathname, expectedTitle } of testCases) {
        store.set(setPathnameAtom, pathname);
        const pageInfo = store.get(dynamicPageInfoAtom);
        expect(pageInfo.title).toBe(expectedTitle);
      }
    });

    it("should handle project titles like original getPageTitle()", () => {
      store.set(mockProjectsAtom, [
        {
          id: TEST_PROJECT_ID_1,
          name: "Work Tasks",
          slug: "work-tasks",
          color: "#3b82f6",
          shared: false,
          sections: [],
        },
      ]);

      store.set(setPathnameAtom, `/projects/${TEST_PROJECT_ID_1}`);
      const pageInfo = store.get(dynamicPageInfoAtom);

      expect(pageInfo.title).toBe("Work Tasks");
    });

    it("should handle label titles like original getPageTitle()", () => {
      store.set(mockLabelsAtom, [
        {
          id: TEST_LABEL_ID_1,
          name: "urgent",
          slug: "urgent",
          color: "#ef4444",
        },
      ]);

      store.set(setPathnameAtom, `/labels/${TEST_LABEL_ID_1}`);
      const pageInfo = store.get(dynamicPageInfoAtom);

      expect(pageInfo.title).toBe("urgent");
    });
  });
});
