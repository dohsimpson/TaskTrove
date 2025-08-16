import { describe, it, expect } from "vitest"
import {
  createSafeProjectNameSlug,
  createSafeLabelNameSlug,
  resolveProject,
  resolveLabel,
} from "./routing"
import { Project, Label, createProjectId, createLabelId } from "@/lib/types"
import {
  TEST_PROJECT_ID_1,
  TEST_PROJECT_ID_2,
  TEST_LABEL_ID_1,
  TEST_LABEL_ID_2,
} from "./test-constants"

describe("routing utilities", () => {
  describe("createSafeProjectNameSlug", () => {
    const mockProjects: Project[] = [
      {
        id: createProjectId("550e8400-e29b-41d4-a716-446655440001"),
        name: "Existing Project",
        slug: "existing-project",
        color: "#3b82f6",
        shared: false,
        sections: [],
      },
      {
        id: createProjectId("550e8400-e29b-41d4-a716-446655440002"),
        name: "Another Project",
        slug: "another-project",
        color: "#ef4444",
        shared: false,
        sections: [],
      },
      {
        id: createProjectId("550e8400-e29b-41d4-a716-446655440003"),
        name: "Test Project",
        slug: "test-project",
        color: "#10b981",
        shared: false,
        sections: [],
      },
      {
        id: createProjectId("550e8400-e29b-41d4-a716-446655440004"),
        name: "Test Project Copy",
        slug: "test-project-1",
        color: "#f59e0b",
        shared: false,
        sections: [],
      },
    ]

    it("should generate a basic slug from project name", () => {
      const result = createSafeProjectNameSlug("My New Project", mockProjects)
      expect(result).toBe("my-new-project")
    })

    it("should handle special characters and spaces", () => {
      const result = createSafeProjectNameSlug("Project & Task Management!", mockProjects)
      expect(result).toBe("project-and-task-management")
    })

    it("should handle unicode and non-English characters", () => {
      const result = createSafeProjectNameSlug("Проект с русскими буквами", mockProjects)
      expect(result).toBe("proekt-s-russkimi-bukvami")
    })

    it("should handle empty string after slugification by using hash", () => {
      const result = createSafeProjectNameSlug("!!!", mockProjects)
      expect(result).toMatch(/^[a-z0-9]{8}$/) // Should be an 8-character hash
    })

    it("should avoid collisions by adding incremental numbers", () => {
      const result = createSafeProjectNameSlug("Test Project", mockProjects)
      expect(result).toBe("test-project-2") // -1 is already taken
    })

    it("should find the next available number when multiple collisions exist", () => {
      const projectsWithCollisions: Project[] = [
        ...mockProjects,
        {
          id: createProjectId("550e8400-e29b-41d4-a716-446655440005"),
          name: "Test Project 2",
          slug: "test-project-2",
          color: "#8b5cf6",
          shared: false,
          sections: [],
        },
      ]

      const result = createSafeProjectNameSlug("Test Project", projectsWithCollisions)
      expect(result).toBe("test-project-3")
    })

    it("should work with empty projects array", () => {
      const result = createSafeProjectNameSlug("First Project", [])
      expect(result).toBe("first-project")
    })

    it("should fall back to hash after 100 attempts", () => {
      // Create projects with slugs test-project, test-project-1, ... test-project-100
      const manyCollisions: Project[] = Array.from({ length: 101 }, (_, i) => ({
        id: createProjectId(`550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, "0")}`),
        name: `Test Project ${i}`,
        slug: i === 0 ? "test-project" : `test-project-${i}`,
        color: "#3b82f6",
        shared: false,
        sections: [],
      }))

      const result = createSafeProjectNameSlug("Test Project", manyCollisions)
      expect(result).toMatch(/^[a-z0-9]{8}$/) // Should fall back to hash
    })

    it("should handle mixed case input", () => {
      const result = createSafeProjectNameSlug("MiXeD CaSe PrOjEcT", mockProjects)
      expect(result).toBe("mixed-case-project")
    })

    it("should handle leading/trailing spaces", () => {
      const result = createSafeProjectNameSlug("  Trimmed Project  ", mockProjects)
      expect(result).toBe("trimmed-project")
    })

    it("should handle numbers in project names", () => {
      const result = createSafeProjectNameSlug("Project 2024 Version 2.0", mockProjects)
      expect(result).toBe("project-2024-version-20")
    })
  })

  describe("createSafeLabelNameSlug", () => {
    const mockLabels: Label[] = [
      {
        id: createLabelId("550e8400-e29b-41d4-a716-446655440001"),
        name: "Important",
        slug: "important",
        color: "#ef4444",
      },
      {
        id: createLabelId("550e8400-e29b-41d4-a716-446655440002"),
        name: "Work",
        slug: "work",
        color: "#3b82f6",
      },
      {
        id: createLabelId("550e8400-e29b-41d4-a716-446655440003"),
        name: "Personal",
        slug: "personal",
        color: "#10b981",
      },
      {
        id: createLabelId("550e8400-e29b-41d4-a716-446655440004"),
        name: "Personal Tasks",
        slug: "personal-1",
        color: "#f59e0b",
      },
    ]

    it("should generate a basic slug from label name", () => {
      const result = createSafeLabelNameSlug("Urgent", mockLabels)
      expect(result).toBe("urgent")
    })

    it("should handle special characters in label names", () => {
      const result = createSafeLabelNameSlug("High Priority!", mockLabels)
      expect(result).toBe("high-priority")
    })

    it("should handle emoji and unicode characters", () => {
      const result = createSafeLabelNameSlug("🚨 Critical", mockLabels)
      expect(result).toBe("critical")
    })

    it("should handle empty string after slugification by using hash", () => {
      const result = createSafeLabelNameSlug("🔥🔥🔥", mockLabels)
      expect(result).toMatch(/^[a-z0-9]{8}$/) // Should be an 8-character hash
    })

    it("should avoid collisions by adding incremental numbers", () => {
      const result = createSafeLabelNameSlug("Personal", mockLabels)
      expect(result).toBe("personal-2") // -1 is already taken
    })

    it("should work with empty labels array", () => {
      const result = createSafeLabelNameSlug("First Label", [])
      expect(result).toBe("first-label")
    })

    it("should fall back to hash after 100 attempts", () => {
      // Create labels with slugs urgent, urgent-1, ... urgent-100
      const manyCollisions: Label[] = Array.from({ length: 101 }, (_, i) => ({
        id: createLabelId(`550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, "0")}`),
        name: `Urgent ${i}`,
        slug: i === 0 ? "urgent" : `urgent-${i}`,
        color: "#ef4444",
      }))

      const result = createSafeLabelNameSlug("Urgent", manyCollisions)
      expect(result).toMatch(/^[a-z0-9]{8}$/) // Should fall back to hash
    })

    it("should handle very long label names", () => {
      const longName =
        "This is a very long label name that should be properly slugified and truncated if needed"
      const result = createSafeLabelNameSlug(longName, mockLabels)
      expect(result).toBe(
        "this-is-a-very-long-label-name-that-should-be-properly-slugified-and-truncated-if-needed",
      )
      expect(typeof result).toBe("string")
      expect(result.length).toBeGreaterThan(0)
    })

    it("should handle hyphenated names correctly", () => {
      const result = createSafeLabelNameSlug("Work-Related Tasks", mockLabels)
      expect(result).toBe("work-related-tasks")
    })

    it("should handle single character names", () => {
      const result = createSafeLabelNameSlug("A", mockLabels)
      expect(result).toBe("a")
    })
  })

  describe("edge cases and error handling", () => {
    it("should handle undefined/null gracefully", () => {
      // These tests ensure our functions don't crash with unexpected input
      expect(() => createSafeProjectNameSlug("", [])).not.toThrow()
      expect(() => createSafeLabelNameSlug("", [])).not.toThrow()
    })

    it("should generate consistent hashes for the same input", () => {
      const result1 = createSafeProjectNameSlug("!!!", [])
      const result2 = createSafeProjectNameSlug("!!!", [])
      expect(result1).toBe(result2)
    })

    it("should generate different hashes for different input", () => {
      const result1 = createSafeProjectNameSlug("!!!", [])
      const result2 = createSafeProjectNameSlug("???", [])
      expect(result1).not.toBe(result2)
    })

    it("should handle extremely long input strings", () => {
      const veryLongString = "a".repeat(1000)
      const result = createSafeProjectNameSlug(veryLongString, [])
      expect(typeof result).toBe("string")
      expect(result.length).toBeGreaterThan(0)
    })

    it("should handle mixed alphanumeric and special characters", () => {
      const result = createSafeProjectNameSlug("Project-123_ABC!@#$%", [])
      expect(result).toBe("project-123abc")
    })
  })

  describe("consistency between project and label functions", () => {
    it("should generate the same slug for the same input when no collisions", () => {
      const input = "Test Name"
      const projectSlug = createSafeProjectNameSlug(input, [])
      const labelSlug = createSafeLabelNameSlug(input, [])
      expect(projectSlug).toBe(labelSlug)
    })

    it("should handle special characters consistently", () => {
      const input = "Special & Characters!"
      const projectSlug = createSafeProjectNameSlug(input, [])
      const labelSlug = createSafeLabelNameSlug(input, [])
      expect(projectSlug).toBe(labelSlug)
    })

    it("should generate same hash for empty slug input", () => {
      const input = "###"
      const projectSlug = createSafeProjectNameSlug(input, [])
      const labelSlug = createSafeLabelNameSlug(input, [])
      expect(projectSlug).toBe(labelSlug)
      expect(projectSlug).toMatch(/^[a-z0-9]{8}$/)
    })
  })

  describe("international character handling", () => {
    it("should handle Chinese characters by falling back to hash", () => {
      const result = createSafeProjectNameSlug("中文项目", [])
      expect(typeof result).toBe("string")
      expect(result.length).toBeGreaterThan(0)
      expect(result).toMatch(/^[a-z0-9]+$/) // Should be alphanumeric hash
    })

    it("should handle Arabic characters with transliteration", () => {
      const result = createSafeProjectNameSlug("مشروع عربي", [])
      expect(typeof result).toBe("string")
      expect(result.length).toBeGreaterThan(0)
      expect(result).toBe("mshrwa-arby")
    })

    it("should handle mixed English and international characters", () => {
      const result = createSafeProjectNameSlug("Project 中文 & عربي", [])
      expect(result).toBe("project-and-arby")
    })

    it("should handle mixed international with numbers", () => {
      const result = createSafeProjectNameSlug("任务-Task-مهمة", [])
      expect(result).toBe("task-mhmh")
    })

    it("should be consistent for same international input", () => {
      const input = "项目管理系统"
      const result1 = createSafeProjectNameSlug(input, [])
      const result2 = createSafeLabelNameSlug(input, [])
      expect(result1).toBe(result2)
    })
  })

  // =============================================================================
  // ROUTE RESOLUTION UTILITIES TESTS
  // =============================================================================

  describe("resolveProject", () => {
    const testProjects: Project[] = [
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
        slug: "second-project",
        color: "#00ff00",
        shared: false,
        sections: [],
        taskOrder: [],
      },
    ]

    it("should resolve project by UUID", () => {
      const result = resolveProject(TEST_PROJECT_ID_1, testProjects)
      expect(result).toBe(testProjects[0])
      expect(result?.name).toBe("First Project")
    })

    it("should resolve project by slug", () => {
      const result = resolveProject("first-project", testProjects)
      expect(result).toBe(testProjects[0])
      expect(result?.name).toBe("First Project")
    })

    it("should prioritize UUID over slug", () => {
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

      const result = resolveProject(TEST_PROJECT_ID_1, projectsWithConflict)
      expect(result?.name).toBe("First Project") // Should match by ID, not slug
    })

    it("should return null for non-existent project", () => {
      const result = resolveProject("non-existent", testProjects)
      expect(result).toBe(null)
    })
  })

  describe("resolveLabel", () => {
    const testLabels: Label[] = [
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

    it("should resolve label by UUID", () => {
      const result = resolveLabel(TEST_LABEL_ID_1, testLabels)
      expect(result).toBe(testLabels[0])
      expect(result?.name).toBe("Important")
    })

    it("should resolve label by slug", () => {
      const result = resolveLabel("important", testLabels)
      expect(result).toBe(testLabels[0])
      expect(result?.name).toBe("Important")
    })

    it("should prioritize UUID over slug", () => {
      const labelsWithConflict: Label[] = [
        {
          id: TEST_LABEL_ID_1,
          name: "Important",
          slug: "important",
          color: "#ff0000",
        },
        {
          id: TEST_LABEL_ID_2,
          name: "UUID Label",
          slug: TEST_LABEL_ID_1, // slug same as first label's ID
          color: "#00ff00",
        },
      ]

      const result = resolveLabel(TEST_LABEL_ID_1, labelsWithConflict)
      expect(result?.name).toBe("Important") // Should match by ID, not slug
    })

    it("should return null for non-existent label", () => {
      const result = resolveLabel("non-existent", testLabels)
      expect(result).toBe(null)
    })
  })
})
