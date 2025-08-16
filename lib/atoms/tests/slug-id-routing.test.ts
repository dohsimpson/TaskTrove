import { describe, it, expect, beforeEach } from "vitest"
// import { createStore } from 'jotai' // unused
import type { Project, Label } from "@/lib/types"
import { INBOX_PROJECT_ID, ALL_PROJECT_ID, TODAY_PROJECT_ID } from "@/lib/types"
import {
  TEST_PROJECT_ID_1,
  TEST_PROJECT_ID_2,
  TEST_LABEL_ID_1,
  TEST_LABEL_ID_2,
} from "@/lib/utils/test-constants"
import { resolveProject, resolveLabel } from "@/lib/utils/routing"
// import { pathnameAtom } from '../ui/navigation'

// Mock implementation of the route parsing logic for testing
function parseRouteContextForTest(
  pathname: string,
  labels: Label[] = [],
  projects: Project[] = [],
) {
  const parts = pathname.split("/").filter(Boolean)
  const [firstSegment, secondSegment] = parts

  // Using imported helper functions

  // Handle project routes
  if (firstSegment === "projects" && secondSegment) {
    const project = resolveProject(secondSegment, projects)
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
      }
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
    }
  }

  // Handle label routes
  if (firstSegment === "labels" && secondSegment) {
    const decodedParam = decodeURIComponent(secondSegment)
    const label = resolveLabel(decodedParam, labels)
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
      }
    }

    // Fallback for invalid label
    return {
      pathname,
      viewId: ALL_PROJECT_ID,
      projectId: ALL_PROJECT_ID,
      routeType: "label" as const,
      routeParams: {
        labelName: decodedParam,
      },
    }
  }

  // Default fallback
  return {
    pathname,
    viewId: TODAY_PROJECT_ID,
    projectId: TODAY_PROJECT_ID,
    routeType: "standard" as const,
    routeParams: {},
  }
}

describe("Slug/ID Routing", () => {
  let testProjects: Project[]
  let testLabels: Label[]
  // let _store: ReturnType<typeof createStore> // unused

  beforeEach(() => {
    testProjects = [
      {
        id: TEST_PROJECT_ID_1,
        name: "Test Project",
        slug: "test-project",
        color: "#ff0000",
        shared: false,
        sections: [],
        taskOrder: [],
      },
      {
        id: TEST_PROJECT_ID_2,
        name: "Another Project",
        slug: "another-project",
        color: "#00ff00",
        shared: true,
        sections: [],
        taskOrder: [],
      },
    ]

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
    ]

    // _store = createStore() // unused
  })

  describe("Project routing", () => {
    it("should resolve projects by UUID", () => {
      const result = parseRouteContextForTest(
        `/projects/${TEST_PROJECT_ID_1}`,
        testLabels,
        testProjects,
      )

      expect(result.routeType).toBe("project")
      expect(result.viewId).toBe(TEST_PROJECT_ID_1)
      expect(result.routeParams.projectId).toBe(TEST_PROJECT_ID_1)
      expect(result.routeParams.projectSlug).toBe("test-project")
    })

    it("should resolve projects by slug", () => {
      const result = parseRouteContextForTest("/projects/test-project", testLabels, testProjects)

      expect(result.routeType).toBe("project")
      expect(result.viewId).toBe(TEST_PROJECT_ID_1)
      expect(result.routeParams.projectId).toBe(TEST_PROJECT_ID_1)
      expect(result.routeParams.projectSlug).toBe("test-project")
    })

    it("should handle multiple projects with different slugs", () => {
      const result1 = parseRouteContextForTest("/projects/test-project", testLabels, testProjects)
      const result2 = parseRouteContextForTest(
        "/projects/another-project",
        testLabels,
        testProjects,
      )

      expect(result1.viewId).toBe(TEST_PROJECT_ID_1)
      expect(result2.viewId).toBe(TEST_PROJECT_ID_2)
      expect(result1.routeParams.projectSlug).toBe("test-project")
      expect(result2.routeParams.projectSlug).toBe("another-project")
    })

    it("should fallback gracefully for nonexistent projects", () => {
      const result = parseRouteContextForTest(
        "/projects/nonexistent-project",
        testLabels,
        testProjects,
      )

      expect(result.routeType).toBe("project")
      expect(result.viewId).toBe(INBOX_PROJECT_ID) // Fallback
      expect(result.routeParams.projectId).toBe("nonexistent-project") // Preserves original param
    })
  })

  describe("Label routing", () => {
    it("should resolve labels by UUID", () => {
      const result = parseRouteContextForTest(
        `/labels/${TEST_LABEL_ID_1}`,
        testLabels,
        testProjects,
      )

      expect(result.routeType).toBe("label")
      expect(result.viewId).toBe(TEST_LABEL_ID_1)
      expect(result.routeParams.labelId).toBe(TEST_LABEL_ID_1)
      expect(result.routeParams.labelSlug).toBe("important")
      expect(result.routeParams.labelName).toBe("Important")
    })

    it("should resolve labels by slug", () => {
      const result = parseRouteContextForTest("/labels/important", testLabels, testProjects)

      expect(result.routeType).toBe("label")
      expect(result.viewId).toBe(TEST_LABEL_ID_1)
      expect(result.routeParams.labelId).toBe(TEST_LABEL_ID_1)
      expect(result.routeParams.labelSlug).toBe("important")
      expect(result.routeParams.labelName).toBe("Important")
    })

    it("should handle multiple labels with different slugs", () => {
      const result1 = parseRouteContextForTest("/labels/important", testLabels, testProjects)
      const result2 = parseRouteContextForTest("/labels/urgent", testLabels, testProjects)

      expect(result1.viewId).toBe(TEST_LABEL_ID_1)
      expect(result2.viewId).toBe(TEST_LABEL_ID_2)
      expect(result1.routeParams.labelSlug).toBe("important")
      expect(result2.routeParams.labelSlug).toBe("urgent")
    })

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
      )

      expect(result.routeType).toBe("label")
      expect(result.viewId).toBe(TEST_LABEL_ID_1)
      expect(result.routeParams.labelSlug).toBe("important label")
    })

    it("should fallback gracefully for nonexistent labels", () => {
      const result = parseRouteContextForTest("/labels/nonexistent-label", testLabels, testProjects)

      expect(result.routeType).toBe("label")
      expect(result.viewId).toBe(ALL_PROJECT_ID) // Fallback
      expect(result.routeParams.labelName).toBe("nonexistent-label") // Preserves original param
    })
  })

  describe("Priority and precedence", () => {
    it("should prioritize UUID over slug when both could match", () => {
      // Create a project with slug that looks like another project's ID
      const projectsWithConflict: Project[] = [
        {
          id: TEST_PROJECT_ID_1,
          name: "First Project",
          slug: "first-project",
          color: "#ff0000",
          shared: false,
          sections: [],
          taskOrder: [],
        },
        {
          id: TEST_PROJECT_ID_2,
          name: "Second Project",
          slug: TEST_PROJECT_ID_1, // slug same as first project's ID
          color: "#00ff00",
          shared: false,
          sections: [],
          taskOrder: [],
        },
      ]

      const result = parseRouteContextForTest(
        `/projects/${TEST_PROJECT_ID_1}`,
        testLabels,
        projectsWithConflict,
      )

      // Should resolve to first project (by ID), not second project (by slug)
      expect(result.viewId).toBe(TEST_PROJECT_ID_1)
      expect(result.routeParams.projectSlug).toBe("first-project")
    })
  })

  describe("Edge cases", () => {
    it("should handle empty arrays gracefully", () => {
      const result = parseRouteContextForTest("/projects/test-project", [], [])
      expect(result.routeType).toBe("project")
      expect(result.viewId).toBe(INBOX_PROJECT_ID) // Fallback
    })

    it("should handle root path", () => {
      const result = parseRouteContextForTest("/", testLabels, testProjects)
      expect(result.routeType).toBe("standard")
      expect(result.viewId).toBe(TODAY_PROJECT_ID)
    })

    it("should handle standard routes unchanged", () => {
      const result = parseRouteContextForTest("/inbox", testLabels, testProjects)
      expect(result.routeType).toBe("standard")
      expect(result.viewId).toBe(TODAY_PROJECT_ID) // Default fallback in mock
    })
  })
})
