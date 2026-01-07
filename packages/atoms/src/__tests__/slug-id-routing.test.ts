import { DEFAULT_PROJECT_SECTION } from "@tasktrove/types/defaults";
/**
 * ⚠️  WEB API DEPENDENT - Slug/ID Routing Test Suite
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
  createLabelSlug,
  createProjectGroupSlug,
  createProjectSlug,
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

const isProjectGroup = (
  item: ProjectGroup["items"][number],
): item is ProjectGroup =>
  typeof item === "object" && "id" in item && "type" in item;

const requireProject = (projects: Project[], index: number): Project => {
  const project = projects[index];
  if (!project) {
    throw new Error(`Expected project at index ${index}`);
  }
  return project;
};

const requireLabel = (labels: Label[], index: number): Label => {
  const label = labels[index];
  if (!label) {
    throw new Error(`Expected label at index ${index}`);
  }
  return label;
};

// Mock implementation of the route parsing logic for testing
function parseRouteContextForTest(
  pathname: string,
  labels: Label[] = [],
  projects: Project[] = [],
  projectGroups?: ProjectGroup,
) {
  const parts = pathname.split("/").filter(Boolean);
  const [firstSegment, secondSegment] = parts;

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
          projectSlug: createProjectSlug(project),
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
          labelSlug: createLabelSlug(label),
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
        projectId: ALL_PROJECT_ID,
        routeType: "projectgroup" as const,
        routeParams: {
          groupId: group.id,
          groupSlug: createProjectGroupSlug(group),
          groupName: group.name,
        },
      };
    }

    // Fallback for invalid/non-existent project group
    return {
      pathname,
      viewId: "not-found",
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
        color: "#ff0000",
        sections: [DEFAULT_PROJECT_SECTION],
      },
      {
        id: TEST_PROJECT_ID_2,
        name: "Another Project",
        color: "#00ff00",
        sections: [DEFAULT_PROJECT_SECTION],
      },
    ];

    testLabels = [
      {
        id: TEST_LABEL_ID_1,
        name: "Important",
        color: "#ff0000",
      },
      {
        id: TEST_LABEL_ID_2,
        name: "Urgent",
        color: "#ff8800",
      },
    ];

    testProjectGroups = {
      id: TEST_GROUP_ID_1,
      name: "Work Projects",
      color: "#3b82f6",
      type: "project",
      items: [
        TEST_PROJECT_ID_1,
        {
          id: TEST_GROUP_ID_2,
          name: "Personal Projects",
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
      expect(result.routeParams.projectSlug).toBe(
        createProjectSlug(requireProject(testProjects, 0)),
      );
    });

    it("should resolve projects by slug", () => {
      const slug = createProjectSlug(requireProject(testProjects, 0));
      const result = parseRouteContextForTest(
        `/projects/${slug}`,
        testLabels,
        testProjects,
      );

      expect(result.routeType).toBe("project");
      expect(result.viewId).toBe(TEST_PROJECT_ID_1);
      expect(result.routeParams.projectId).toBe(TEST_PROJECT_ID_1);
      expect(result.routeParams.projectSlug).toBe(slug);
    });

    it("should handle multiple projects with different slugs", () => {
      const slug1 = createProjectSlug(requireProject(testProjects, 0));
      const slug2 = createProjectSlug(requireProject(testProjects, 1));
      const result1 = parseRouteContextForTest(
        `/projects/${slug1}`,
        testLabels,
        testProjects,
      );
      const result2 = parseRouteContextForTest(
        `/projects/${slug2}`,
        testLabels,
        testProjects,
      );

      expect(result1.viewId).toBe(TEST_PROJECT_ID_1);
      expect(result2.viewId).toBe(TEST_PROJECT_ID_2);
      expect(result1.routeParams.projectSlug).toBe(slug1);
      expect(result2.routeParams.projectSlug).toBe(slug2);
    });

    it("should fallback gracefully for nonexistent projects", () => {
      const result = parseRouteContextForTest(
        "/projects/nonexistent-project",
        testLabels,
        testProjects,
      );

      expect(result.routeType).toBe("project");
      expect(result.viewId).toBe(INBOX_PROJECT_ID); // Fallback
      expect(result.routeParams.projectId).toBe("nonexistent-project");
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
      expect(result.routeParams.labelSlug).toBe(
        createLabelSlug(requireLabel(testLabels, 0)),
      );
      expect(result.routeParams.labelName).toBe("Important");
    });

    it("should resolve labels by slug", () => {
      const slug = createLabelSlug(requireLabel(testLabels, 0));
      const result = parseRouteContextForTest(
        `/labels/${slug}`,
        testLabels,
        testProjects,
      );

      expect(result.routeType).toBe("label");
      expect(result.viewId).toBe(TEST_LABEL_ID_1);
      expect(result.routeParams.labelId).toBe(TEST_LABEL_ID_1);
      expect(result.routeParams.labelSlug).toBe(slug);
      expect(result.routeParams.labelName).toBe("Important");
    });

    it("should handle multiple labels with different slugs", () => {
      const slug1 = createLabelSlug(requireLabel(testLabels, 0));
      const slug2 = createLabelSlug(requireLabel(testLabels, 1));
      const result1 = parseRouteContextForTest(
        `/labels/${slug1}`,
        testLabels,
        testProjects,
      );
      const result2 = parseRouteContextForTest(
        `/labels/${slug2}`,
        testLabels,
        testProjects,
      );

      expect(result1.viewId).toBe(TEST_LABEL_ID_1);
      expect(result2.viewId).toBe(TEST_LABEL_ID_2);
      expect(result1.routeParams.labelSlug).toBe(slug1);
      expect(result2.routeParams.labelSlug).toBe(slug2);
    });

    it("should handle URL encoded label parameters", () => {
      const slug = createLabelSlug(requireLabel(testLabels, 0));
      const encodedSlug = encodeURIComponent(slug);
      const result = parseRouteContextForTest(
        `/labels/${encodedSlug}`,
        testLabels,
        testProjects,
      );

      expect(result.routeType).toBe("label");
      expect(result.viewId).toBe(TEST_LABEL_ID_1);
      expect(result.routeParams.labelSlug).toBe(slug);
    });

    it("should fallback gracefully for nonexistent labels", () => {
      const result = parseRouteContextForTest(
        "/labels/nonexistent-label",
        testLabels,
        testProjects,
      );

      expect(result.routeType).toBe("label");
      expect(result.viewId).toBe("not-found"); // Fallback
      expect(result.routeParams.labelName).toBe("nonexistent-label");
    });
  });

  describe("Priority and precedence", () => {
    it("should prioritize UUID over slug content when path is a UUID", () => {
      const projectsWithConflict: Project[] = [
        {
          id: TEST_PROJECT_ID_1,
          name: "First Project",
          color: "#ff0000",
          sections: [DEFAULT_PROJECT_SECTION],
        },
        {
          id: TEST_PROJECT_ID_2,
          name: `${TEST_PROJECT_ID_1} Project`,
          color: "#00ff00",
          sections: [DEFAULT_PROJECT_SECTION],
        },
      ];

      const result = parseRouteContextForTest(
        `/projects/${TEST_PROJECT_ID_1}`,
        testLabels,
        projectsWithConflict,
      );

      expect(result.viewId).toBe(TEST_PROJECT_ID_1);
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
      expect(result.routeParams.groupSlug).toBe(
        createProjectGroupSlug(testProjectGroups),
      );
      expect(result.routeParams.groupName).toBe("Work Projects");
    });

    it("should resolve project groups by slug", () => {
      const slug = createProjectGroupSlug(testProjectGroups);
      const result = parseRouteContextForTest(
        `/projectgroups/${slug}`,
        testLabels,
        testProjects,
        testProjectGroups,
      );

      expect(result.routeType).toBe("projectgroup");
      expect(result.viewId).toBe(TEST_GROUP_ID_1);
      expect(result.routeParams.groupId).toBe(TEST_GROUP_ID_1);
      expect(result.routeParams.groupSlug).toBe(slug);
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
      expect(result.routeParams.groupName).toBe("Personal Projects");
    });

    it("should resolve nested project groups by slug", () => {
      const nestedGroup = testProjectGroups.items[1];
      if (!nestedGroup || !isProjectGroup(nestedGroup)) {
        throw new Error("Expected nested project group at index 1");
      }
      const slug = createProjectGroupSlug(nestedGroup);
      const result = parseRouteContextForTest(
        `/projectgroups/${slug}`,
        testLabels,
        testProjects,
        testProjectGroups,
      );

      expect(result.routeType).toBe("projectgroup");
      expect(result.viewId).toBe(TEST_GROUP_ID_2);
      expect(result.routeParams.groupId).toBe(TEST_GROUP_ID_2);
      expect(result.routeParams.groupSlug).toBe(slug);
      expect(result.routeParams.groupName).toBe("Personal Projects");
    });

    it("should handle multiple project groups with different slugs", () => {
      const rootSlug = createProjectGroupSlug(testProjectGroups);
      const nestedGroup = testProjectGroups.items[1];
      if (!nestedGroup || !isProjectGroup(nestedGroup)) {
        throw new Error("Expected nested project group at index 1");
      }
      const nestedSlug = createProjectGroupSlug(nestedGroup);
      const result1 = parseRouteContextForTest(
        `/projectgroups/${rootSlug}`,
        testLabels,
        testProjects,
        testProjectGroups,
      );
      const result2 = parseRouteContextForTest(
        `/projectgroups/${nestedSlug}`,
        testLabels,
        testProjects,
        testProjectGroups,
      );

      expect(result1.viewId).toBe(TEST_GROUP_ID_1);
      expect(result2.viewId).toBe(TEST_GROUP_ID_2);
      expect(result1.routeParams.groupSlug).toBe(rootSlug);
      expect(result2.routeParams.groupSlug).toBe(nestedSlug);
    });

    it("should fallback gracefully for nonexistent project groups", () => {
      const result = parseRouteContextForTest(
        "/projectgroups/nonexistent-group",
        testLabels,
        testProjects,
        testProjectGroups,
      );

      expect(result.routeType).toBe("projectgroup");
      expect(result.viewId).toBe("not-found");
      expect(result.routeParams.groupIdentifier).toBe("nonexistent-group");
    });

    it("should handle project groups when groups data is not available", () => {
      const result = parseRouteContextForTest(
        "/projectgroups/work-projects",
        testLabels,
        testProjects,
        undefined,
      );

      expect(result.routeType).toBe("projectgroup");
      expect(result.viewId).toBe("not-found");
    });
  });
});
