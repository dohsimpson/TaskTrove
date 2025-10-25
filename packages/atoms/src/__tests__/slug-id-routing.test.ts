import { DEFAULT_PROJECT_SECTION } from "@tasktrove/types/defaults";
/**
 * ⚠️  WEB API DEPENDENT - Slug/ID Routing Test Suite
 *
 * Platform dependencies:
 * - Web URL parsing and pathname handling
 * - Browser routing and navigation state
 * - URL encoding/decoding for route parameters
 * - Web-specific route resolution logic
 *
 * Slug/ID Routing Test Suite
 *
 * Tests for resolving projects, labels, and project groups
 * by both UUID and slug parameters in URLs.
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { ProjectGroup } from "@tasktrove/types/group";
import type { Project, Label } from "@tasktrove/types/core";
import {
  INBOX_PROJECT_ID,
  TODAY_PROJECT_ID,
  ALL_PROJECT_ID,
} from "@tasktrove/types/constants";
import {
  createGroupId,
  createProjectId,
  createLabelId,
} from "@tasktrove/types/id";
import {
  resolveProject,
  resolveLabel,
  resolveProjectGroup,
} from "@tasktrove/utils/routing";

// Test constants - defined locally since they're test-only
const TEST_PROJECT_ID_1 = createProjectId(
  "87654321-4321-4321-8321-210987654321",
);
const TEST_PROJECT_ID_2 = createProjectId(
  "87654321-4321-4321-8321-210987654322",
);
const TEST_LABEL_ID_1 = createLabelId("abcdef01-abcd-4bcd-8bcd-abcdefabcdef");
const TEST_LABEL_ID_2 = createLabelId("abcdef01-abcd-4bcd-8bcd-abcdefabcde0");

// Test constants for project groups
const TEST_GROUP_ID_1 = createGroupId("550e8400-e29b-41d4-a716-446655440001");
const TEST_GROUP_ID_2 = createGroupId("550e8400-e29b-41d4-a716-446655440002");

// Mock implementation of the route parsing logic for testing
function parseRouteContextForTest(
  pathname: string,
  labels: Label[] = [],
  projects: Project[] = [],
  projectGroups?: ProjectGroup,
) {
  const parts = pathname.split("/").filter(Boolean);
  const [firstSegment, secondSegment] = parts;

  // Using imported helper functions

  // Handle project routes
  if (firstSegment === "projects" && secondSegment) {
    const project = resolveProject(secondSegment, projects);
    if (project) {
      return {
        pathname,
        viewId: project.id,
        projectId: project.id,
        routeType: "project" as const,
        routeParams: {
          projectId: project.id,
          projectSlug: project.slug,
        },
      };
    }

    // Fallback for invalid project
    return {
      pathname,
      viewId: INBOX_PROJECT_ID,
      projectId: INBOX_PROJECT_ID,
      routeType: "project" as const,
      routeParams: {
        projectId: secondSegment,
      },
    };
  }

  // Handle label routes
  if (firstSegment === "labels" && secondSegment) {
    const decodedParam = decodeURIComponent(secondSegment);
    const label = resolveLabel(decodedParam, labels);
    if (label) {
      return {
        pathname,
        viewId: label.id,
        projectId: ALL_PROJECT_ID,
        routeType: "label" as const,
        routeParams: {
          labelId: label.id,
          labelSlug: label.slug,
          labelName: label.name,
        },
      };
    }

    // Fallback for invalid label
    return {
      pathname,
      viewId: "not-found",
      projectId: ALL_PROJECT_ID,
      routeType: "label" as const,
      routeParams: {
        labelName: decodedParam,
      },
    };
  }

  // Handle project group routes
  if (firstSegment === "projectgroups" && secondSegment) {
    const group = projectGroups
      ? resolveProjectGroup(secondSegment, projectGroups)
      : null;
    if (group) {
      return {
        pathname,
        viewId: group.id,
        projectId: ALL_PROJECT_ID, // Project groups show all projects within them
        routeType: "projectgroup" as const,
        routeParams: {
          groupId: group.id,
          groupSlug: group.slug,
          groupName: group.name,
        },
      };
    }

    // Fallback for invalid/non-existent project group
    return {
      pathname,
      viewId: "not-found", // Show not found component (matching real implementation)
      projectId: ALL_PROJECT_ID,
      routeType: "projectgroup" as const,
      routeParams: {
        groupIdentifier: secondSegment,
      },
    };
  }

  // Default fallback
  return {
    pathname,
    viewId: TODAY_PROJECT_ID,
    projectId: TODAY_PROJECT_ID,
    routeType: "standard" as const,
    routeParams: {},
  };
}

describe("Slug/ID Routing", () => {
  let testProjects: Project[];
  let testLabels: Label[];
  let testProjectGroups: ProjectGroup;

  beforeEach(() => {
    testProjects = [
      {
        id: TEST_PROJECT_ID_1,
        name: "Test Project",
        slug: "test-project",
        color: "#ff0000",
        sections: [DEFAULT_PROJECT_SECTION],
      },
      {
        id: TEST_PROJECT_ID_2,
        name: "Another Project",
        slug: "another-project",
        color: "#00ff00",
        sections: [DEFAULT_PROJECT_SECTION],
      },
    ];

    testLabels = [
      {
        id: TEST_LABEL_ID_1,
        name: "Important",
        slug: "important",
        color: "#ff0000",
      },
      {
        id: TEST_LABEL_ID_2,
        name: "Urgent",
        slug: "urgent",
        color: "#ff8800",
      },
    ];

    testProjectGroups = {
      id: TEST_GROUP_ID_1,
      name: "Work Projects",
      slug: "work-projects",
      color: "#3b82f6",
      type: "project",
      items: [
        TEST_PROJECT_ID_1,
        {
          id: TEST_GROUP_ID_2,
          name: "Personal Projects",
          slug: "personal-projects",
          color: "#10b981",
          type: "project",
          items: [TEST_PROJECT_ID_2],
        },
      ],
    };
  });

  describe("Project routing", () => {
    it("should resolve projects by UUID", () => {
      const result = parseRouteContextForTest(
        `/projects/${TEST_PROJECT_ID_1}`,
        testLabels,
        testProjects,
      );

      expect(result.routeType).toBe("project");
      expect(result.viewId).toBe(TEST_PROJECT_ID_1);
      expect(result.routeParams.projectId).toBe(TEST_PROJECT_ID_1);
      expect(result.routeParams.projectSlug).toBe("test-project");
    });

    it("should resolve projects by slug", () => {
      const result = parseRouteContextForTest(
        "/projects/test-project",
        testLabels,
        testProjects,
      );

      expect(result.routeType).toBe("project");
      expect(result.viewId).toBe(TEST_PROJECT_ID_1);
      expect(result.routeParams.projectId).toBe(TEST_PROJECT_ID_1);
      expect(result.routeParams.projectSlug).toBe("test-project");
    });

    it("should handle multiple projects with different slugs", () => {
      const result1 = parseRouteContextForTest(
        "/projects/test-project",
        testLabels,
        testProjects,
      );
      const result2 = parseRouteContextForTest(
        "/projects/another-project",
        testLabels,
        testProjects,
      );

      expect(result1.viewId).toBe(TEST_PROJECT_ID_1);
      expect(result2.viewId).toBe(TEST_PROJECT_ID_2);
      expect(result1.routeParams.projectSlug).toBe("test-project");
      expect(result2.routeParams.projectSlug).toBe("another-project");
    });

    it("should fallback gracefully for nonexistent projects", () => {
      const result = parseRouteContextForTest(
        "/projects/nonexistent-project",
        testLabels,
        testProjects,
      );

      expect(result.routeType).toBe("project");
      expect(result.viewId).toBe(INBOX_PROJECT_ID); // Fallback
      expect(result.routeParams.projectId).toBe("nonexistent-project"); // Preserves original param
    });
  });

  describe("Label routing", () => {
    it("should resolve labels by UUID", () => {
      const result = parseRouteContextForTest(
        `/labels/${TEST_LABEL_ID_1}`,
        testLabels,
        testProjects,
      );

      expect(result.routeType).toBe("label");
      expect(result.viewId).toBe(TEST_LABEL_ID_1);
      expect(result.routeParams.labelId).toBe(TEST_LABEL_ID_1);
      expect(result.routeParams.labelSlug).toBe("important");
      expect(result.routeParams.labelName).toBe("Important");
    });

    it("should resolve labels by slug", () => {
      const result = parseRouteContextForTest(
        "/labels/important",
        testLabels,
        testProjects,
      );

      expect(result.routeType).toBe("label");
      expect(result.viewId).toBe(TEST_LABEL_ID_1);
      expect(result.routeParams.labelId).toBe(TEST_LABEL_ID_1);
      expect(result.routeParams.labelSlug).toBe("important");
      expect(result.routeParams.labelName).toBe("Important");
    });

    it("should handle multiple labels with different slugs", () => {
      const result1 = parseRouteContextForTest(
        "/labels/important",
        testLabels,
        testProjects,
      );
      const result2 = parseRouteContextForTest(
        "/labels/urgent",
        testLabels,
        testProjects,
      );

      expect(result1.viewId).toBe(TEST_LABEL_ID_1);
      expect(result2.viewId).toBe(TEST_LABEL_ID_2);
      expect(result1.routeParams.labelSlug).toBe("important");
      expect(result2.routeParams.labelSlug).toBe("urgent");
    });

    it("should handle URL encoded label parameters", () => {
      const result = parseRouteContextForTest(
        "/labels/important%20label", // URL encoded space
        [
          {
            id: TEST_LABEL_ID_1,
            name: "Important Label",
            slug: "important label", // slug with space
            color: "#ff0000",
          },
        ],
        testProjects,
      );

      expect(result.routeType).toBe("label");
      expect(result.viewId).toBe(TEST_LABEL_ID_1);
      expect(result.routeParams.labelSlug).toBe("important label");
    });

    it("should fallback gracefully for nonexistent labels", () => {
      const result = parseRouteContextForTest(
        "/labels/nonexistent-label",
        testLabels,
        testProjects,
      );

      expect(result.routeType).toBe("label");
      expect(result.viewId).toBe("not-found"); // Fallback
      expect(result.routeParams.labelName).toBe("nonexistent-label"); // Preserves original param
    });
  });

  describe("Priority and precedence", () => {
    it("should prioritize UUID over slug when both could match", () => {
      // Create a project with slug that looks like another project's ID
      const projectsWithConflict: Project[] = [
        {
          id: TEST_PROJECT_ID_1,
          name: "First Project",
          slug: "first-project",
          color: "#ff0000",
          sections: [DEFAULT_PROJECT_SECTION],
        },
        {
          id: TEST_PROJECT_ID_2,
          name: "Second Project",
          slug: TEST_PROJECT_ID_1, // slug same as first project's ID
          color: "#00ff00",
          sections: [DEFAULT_PROJECT_SECTION],
        },
      ];

      const result = parseRouteContextForTest(
        `/projects/${TEST_PROJECT_ID_1}`,
        testLabels,
        projectsWithConflict,
      );

      // Should resolve to first project (by ID), not second project (by slug)
      expect(result.viewId).toBe(TEST_PROJECT_ID_1);
      expect(result.routeParams.projectSlug).toBe("first-project");
    });
  });

  describe("Project group routing", () => {
    it("should resolve project groups by UUID", () => {
      const result = parseRouteContextForTest(
        `/projectgroups/${TEST_GROUP_ID_1}`,
        testLabels,
        testProjects,
        testProjectGroups,
      );

      expect(result.routeType).toBe("projectgroup");
      expect(result.viewId).toBe(TEST_GROUP_ID_1);
      expect(result.routeParams.groupId).toBe(TEST_GROUP_ID_1);
      expect(result.routeParams.groupSlug).toBe("work-projects");
      expect(result.routeParams.groupName).toBe("Work Projects");
    });

    it("should resolve project groups by slug", () => {
      const result = parseRouteContextForTest(
        "/projectgroups/work-projects",
        testLabels,
        testProjects,
        testProjectGroups,
      );

      expect(result.routeType).toBe("projectgroup");
      expect(result.viewId).toBe(TEST_GROUP_ID_1);
      expect(result.routeParams.groupId).toBe(TEST_GROUP_ID_1);
      expect(result.routeParams.groupSlug).toBe("work-projects");
      expect(result.routeParams.groupName).toBe("Work Projects");
    });

    it("should resolve nested project groups by UUID", () => {
      const result = parseRouteContextForTest(
        `/projectgroups/${TEST_GROUP_ID_2}`,
        testLabels,
        testProjects,
        testProjectGroups,
      );

      expect(result.routeType).toBe("projectgroup");
      expect(result.viewId).toBe(TEST_GROUP_ID_2);
      expect(result.routeParams.groupId).toBe(TEST_GROUP_ID_2);
      expect(result.routeParams.groupSlug).toBe("personal-projects");
      expect(result.routeParams.groupName).toBe("Personal Projects");
    });

    it("should resolve nested project groups by slug", () => {
      const result = parseRouteContextForTest(
        "/projectgroups/personal-projects",
        testLabels,
        testProjects,
        testProjectGroups,
      );

      expect(result.routeType).toBe("projectgroup");
      expect(result.viewId).toBe(TEST_GROUP_ID_2);
      expect(result.routeParams.groupId).toBe(TEST_GROUP_ID_2);
      expect(result.routeParams.groupSlug).toBe("personal-projects");
      expect(result.routeParams.groupName).toBe("Personal Projects");
    });

    it("should handle multiple project groups with different slugs", () => {
      const result1 = parseRouteContextForTest(
        "/projectgroups/work-projects",
        testLabels,
        testProjects,
        testProjectGroups,
      );
      const result2 = parseRouteContextForTest(
        "/projectgroups/personal-projects",
        testLabels,
        testProjects,
        testProjectGroups,
      );

      expect(result1.viewId).toBe(TEST_GROUP_ID_1);
      expect(result2.viewId).toBe(TEST_GROUP_ID_2);
      expect(result1.routeParams.groupSlug).toBe("work-projects");
      expect(result2.routeParams.groupSlug).toBe("personal-projects");
    });

    it("should prioritize UUID over slug when both could match", () => {
      // Create a project group structure where slug matches another group's ID
      const projectGroupsWithConflict: ProjectGroup = {
        id: TEST_GROUP_ID_1,
        name: "Root Group",
        slug: "root-group",
        color: "#ff0000",
        type: "project",
        items: [
          {
            id: TEST_GROUP_ID_2,
            name: "UUID Group",
            slug: TEST_GROUP_ID_1, // slug same as root group's ID
            color: "#00ff00",
            type: "project",
            items: [],
          },
        ],
      };

      const result = parseRouteContextForTest(
        `/projectgroups/${TEST_GROUP_ID_1}`,
        testLabels,
        testProjects,
        projectGroupsWithConflict,
      );

      // Should resolve to root group (by ID), not nested group (by slug)
      expect(result.viewId).toBe(TEST_GROUP_ID_1);
      expect(result.routeParams.groupName).toBe("Root Group");
    });

    it("should fallback gracefully for nonexistent project groups", () => {
      const result = parseRouteContextForTest(
        "/projectgroups/nonexistent-group",
        testLabels,
        testProjects,
        testProjectGroups,
      );

      expect(result.routeType).toBe("projectgroup");
      expect(result.viewId).toBe("not-found"); // Fallback to not found view
      expect(result.routeParams.groupIdentifier).toBe("nonexistent-group");
    });

    it("should handle project groups when groups data is not available", () => {
      const result = parseRouteContextForTest(
        "/projectgroups/work-projects",
        testLabels,
        testProjects,
        undefined, // No project groups data
      );

      expect(result.routeType).toBe("projectgroup");
      expect(result.viewId).toBe("not-found"); // Fallback to not found view
      expect(result.routeParams.groupIdentifier).toBe("work-projects");
    });

    it("should handle URL encoded project group parameters", () => {
      const result = parseRouteContextForTest(
        "/projectgroups/work%20%26%20projects", // URL encoded "work & projects"
        testLabels,
        testProjects,
        testProjectGroups,
      );

      expect(result.routeType).toBe("projectgroup");
      expect(result.viewId).toBe("not-found"); // Fallback to not found view
      expect(result.routeParams.groupIdentifier).toBe("work%20%26%20projects");
    });

    it("should set correct projectId for project group routes", () => {
      const result = parseRouteContextForTest(
        "/projectgroups/work-projects",
        testLabels,
        testProjects,
        testProjectGroups,
      );

      // Project groups should show all projects, so projectId should be ALL_PROJECT_ID
      expect(result.projectId).toBe(ALL_PROJECT_ID);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty arrays gracefully", () => {
      const result = parseRouteContextForTest("/projects/test-project", [], []);
      expect(result.routeType).toBe("project");
      expect(result.viewId).toBe(INBOX_PROJECT_ID); // Fallback
    });

    it("should handle root path", () => {
      const result = parseRouteContextForTest("/", testLabels, testProjects);
      expect(result.routeType).toBe("standard");
      expect(result.viewId).toBe(TODAY_PROJECT_ID);
    });

    it("should handle standard routes unchanged", () => {
      const result = parseRouteContextForTest(
        "/inbox",
        testLabels,
        testProjects,
      );
      expect(result.routeType).toBe("standard");
      expect(result.viewId).toBe(TODAY_PROJECT_ID); // Default fallback in mock
    });
  });
});
