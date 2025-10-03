import { describe, it, expect } from "vitest";
import {
  createSafeProjectNameSlug,
  createSafeLabelNameSlug,
  resolveProject,
  resolveLabel,
  resolveProjectGroup,
} from "./routing";
import {
  Project,
  Label,
  ProjectGroup,
  createProjectId,
  createLabelId,
  createGroupId,
} from "@tasktrove/types";

// Test constants
const TEST_PROJECT_ID_1 = createProjectId(
  "650e8400-e29b-41d4-a716-446655440001",
);
const TEST_PROJECT_ID_2 = createProjectId(
  "650e8400-e29b-41d4-a716-446655440002",
);
const TEST_LABEL_ID_1 = createLabelId("750e8400-e29b-41d4-a716-446655440001");
const TEST_LABEL_ID_2 = createLabelId("750e8400-e29b-41d4-a716-446655440002");
const TEST_GROUP_ID_1 = createGroupId("550e8400-e29b-41d4-a716-446655440001");
const TEST_GROUP_ID_2 = createGroupId("550e8400-e29b-41d4-a716-446655440002");
const TEST_GROUP_ID_3 = createGroupId("550e8400-e29b-41d4-a716-446655440003");

describe("routing utilities", () => {
  describe("createSafeProjectNameSlug", () => {
    const mockProjects: Project[] = [
      {
        id: createProjectId("550e8400-e29b-41d4-a716-446655440001"),
        name: "Existing Project",
        slug: "existing-project",
        color: "#3b82f6",
        sections: [],
      },
      {
        id: createProjectId("550e8400-e29b-41d4-a716-446655440002"),
        name: "Another Project",
        slug: "another-project",
        color: "#ef4444",
        sections: [],
      },
      {
        id: createProjectId("550e8400-e29b-41d4-a716-446655440003"),
        name: "Test Project",
        slug: "test-project",
        color: "#10b981",
        sections: [],
      },
      {
        id: createProjectId("550e8400-e29b-41d4-a716-446655440004"),
        name: "Test Project Copy",
        slug: "test-project-1",
        color: "#f59e0b",
        sections: [],
      },
    ];

    it("should generate a basic slug from project name", () => {
      const result = createSafeProjectNameSlug("My New Project", mockProjects);
      expect(result).toBe("my-new-project");
    });

    it("should handle special characters and spaces", () => {
      const result = createSafeProjectNameSlug(
        "Project & Task Management!",
        mockProjects,
      );
      expect(result).toBe("project-and-task-management");
    });

    it("should handle unicode and non-English characters", () => {
      const result = createSafeProjectNameSlug(
        "Проект с русскими буквами",
        mockProjects,
      );
      expect(result).toBe("proekt-s-russkimi-bukvami");
    });

    it("should handle empty string after slugification by using hash", () => {
      const result = createSafeProjectNameSlug("!!!", mockProjects);
      expect(result).toMatch(/^[a-z0-9]{8}$/); // Should be an 8-character hash
    });

    it("should avoid collisions by adding incremental numbers", () => {
      const result = createSafeProjectNameSlug("Test Project", mockProjects);
      expect(result).toBe("test-project-2"); // -1 is already taken
    });

    it("should find the next available number when multiple collisions exist", () => {
      const projectsWithCollisions: Project[] = [
        ...mockProjects,
        {
          id: createProjectId("550e8400-e29b-41d4-a716-446655440005"),
          name: "Test Project 2",
          slug: "test-project-2",
          color: "#8b5cf6",
          sections: [],
        },
      ];

      const result = createSafeProjectNameSlug(
        "Test Project",
        projectsWithCollisions,
      );
      expect(result).toBe("test-project-3");
    });

    it("should work with empty projects array", () => {
      const result = createSafeProjectNameSlug("First Project", []);
      expect(result).toBe("first-project");
    });

    it("should fall back to hash after 100 attempts", () => {
      // Create projects with slugs test-project, test-project-1, ... test-project-100
      const manyCollisions: Project[] = Array.from({ length: 101 }, (_, i) => ({
        id: createProjectId(
          `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, "0")}`,
        ),
        name: `Test Project ${i}`,
        slug: i === 0 ? "test-project" : `test-project-${i}`,
        color: "#3b82f6",
        sections: [],
      }));

      const result = createSafeProjectNameSlug("Test Project", manyCollisions);
      expect(result).toMatch(/^[a-z0-9]{8}$/); // Should fall back to hash
    });

    it("should handle mixed case input", () => {
      const result = createSafeProjectNameSlug(
        "MiXeD CaSe PrOjEcT",
        mockProjects,
      );
      expect(result).toBe("mixed-case-project");
    });

    it("should handle leading/trailing spaces", () => {
      const result = createSafeProjectNameSlug(
        "  Trimmed Project  ",
        mockProjects,
      );
      expect(result).toBe("trimmed-project");
    });

    it("should handle numbers in project names", () => {
      const result = createSafeProjectNameSlug(
        "Project 2024 Version 2.0",
        mockProjects,
      );
      expect(result).toBe("project-2024-version-20");
    });
  });

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
    ];

    it("should generate a basic slug from label name", () => {
      const result = createSafeLabelNameSlug("Urgent", mockLabels);
      expect(result).toBe("urgent");
    });

    it("should handle special characters in label names", () => {
      const result = createSafeLabelNameSlug("High Priority!", mockLabels);
      expect(result).toBe("high-priority");
    });

    it("should handle emoji and unicode characters", () => {
      const result = createSafeLabelNameSlug("🚨 Critical", mockLabels);
      expect(result).toBe("critical");
    });

    it("should handle empty string after slugification by using hash", () => {
      const result = createSafeLabelNameSlug("🔥🔥🔥", mockLabels);
      expect(result).toMatch(/^[a-z0-9]{8}$/); // Should be an 8-character hash
    });

    it("should avoid collisions by adding incremental numbers", () => {
      const result = createSafeLabelNameSlug("Personal", mockLabels);
      expect(result).toBe("personal-2"); // -1 is already taken
    });

    it("should work with empty labels array", () => {
      const result = createSafeLabelNameSlug("First Label", []);
      expect(result).toBe("first-label");
    });

    it("should fall back to hash after 100 attempts", () => {
      // Create labels with slugs urgent, urgent-1, ... urgent-100
      const manyCollisions: Label[] = Array.from({ length: 101 }, (_, i) => ({
        id: createLabelId(
          `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, "0")}`,
        ),
        name: `Urgent ${i}`,
        slug: i === 0 ? "urgent" : `urgent-${i}`,
        color: "#ef4444",
      }));

      const result = createSafeLabelNameSlug("Urgent", manyCollisions);
      expect(result).toMatch(/^[a-z0-9]{8}$/); // Should fall back to hash
    });

    it("should handle very long label names", () => {
      const longName =
        "This is a very long label name that should be properly slugified and truncated if needed";
      const result = createSafeLabelNameSlug(longName, mockLabels);
      expect(result).toBe(
        "this-is-a-very-long-label-name-that-should-be-properly-slugified-and-truncated-if-needed",
      );
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle hyphenated names correctly", () => {
      const result = createSafeLabelNameSlug("Work-Related Tasks", mockLabels);
      expect(result).toBe("work-related-tasks");
    });

    it("should handle single character names", () => {
      const result = createSafeLabelNameSlug("A", mockLabels);
      expect(result).toBe("a");
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle undefined/null gracefully", () => {
      // These tests ensure our functions don't crash with unexpected input
      expect(() => createSafeProjectNameSlug("", [])).not.toThrow();
      expect(() => createSafeLabelNameSlug("", [])).not.toThrow();
    });

    it("should generate consistent hashes for the same input", () => {
      const result1 = createSafeProjectNameSlug("!!!", []);
      const result2 = createSafeProjectNameSlug("!!!", []);
      expect(result1).toBe(result2);
    });

    it("should generate different hashes for different input", () => {
      const result1 = createSafeProjectNameSlug("!!!", []);
      const result2 = createSafeProjectNameSlug("???", []);
      expect(result1).not.toBe(result2);
    });

    it("should handle extremely long input strings", () => {
      const veryLongString = "a".repeat(1000);
      const result = createSafeProjectNameSlug(veryLongString, []);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle mixed alphanumeric and special characters", () => {
      const result = createSafeProjectNameSlug("Project-123_ABC!@#$%", []);
      expect(result).toBe("project-123abc");
    });
  });

  describe("consistency between project and label functions", () => {
    it("should generate the same slug for the same input when no collisions", () => {
      const input = "Test Name";
      const projectSlug = createSafeProjectNameSlug(input, []);
      const labelSlug = createSafeLabelNameSlug(input, []);
      expect(projectSlug).toBe(labelSlug);
    });

    it("should handle special characters consistently", () => {
      const input = "Special & Characters!";
      const projectSlug = createSafeProjectNameSlug(input, []);
      const labelSlug = createSafeLabelNameSlug(input, []);
      expect(projectSlug).toBe(labelSlug);
    });

    it("should generate same hash for empty slug input", () => {
      const input = "###";
      const projectSlug = createSafeProjectNameSlug(input, []);
      const labelSlug = createSafeLabelNameSlug(input, []);
      expect(projectSlug).toBe(labelSlug);
      expect(projectSlug).toMatch(/^[a-z0-9]{8}$/);
    });
  });

  describe("international character handling", () => {
    it("should handle Chinese characters by falling back to hash", () => {
      const result = createSafeProjectNameSlug("中文项目", []);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      expect(result).toMatch(/^[a-z0-9]+$/); // Should be alphanumeric hash
    });

    it("should handle Arabic characters with transliteration", () => {
      const result = createSafeProjectNameSlug("مشروع عربي", []);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      expect(result).toBe("mshrwa-arby");
    });

    it("should handle mixed English and international characters", () => {
      const result = createSafeProjectNameSlug("Project 中文 & عربي", []);
      expect(result).toBe("project-and-arby");
    });

    it("should handle mixed international with numbers", () => {
      const result = createSafeProjectNameSlug("任务-Task-مهمة", []);
      expect(result).toBe("task-mhmh");
    });

    it("should be consistent for same international input", () => {
      const input = "项目管理系统";
      const result1 = createSafeProjectNameSlug(input, []);
      const result2 = createSafeLabelNameSlug(input, []);
      expect(result1).toBe(result2);
    });
  });

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
        sections: [],
      },
      {
        id: TEST_PROJECT_ID_2,
        name: "Second Project",
        slug: "second-project",
        color: "#00ff00",
        sections: [],
      },
    ];

    it("should resolve project by UUID", () => {
      const result = resolveProject(TEST_PROJECT_ID_1, testProjects);
      expect(result).toBe(testProjects[0]);
      expect(result?.name).toBe("First Project");
    });

    it("should resolve project by slug", () => {
      const result = resolveProject("first-project", testProjects);
      expect(result).toBe(testProjects[0]);
      expect(result?.name).toBe("First Project");
    });

    it("should prioritize UUID over slug", () => {
      const projectsWithConflict: Project[] = [
        {
          id: TEST_PROJECT_ID_1,
          name: "First Project",
          slug: "first-project",
          color: "#ff0000",
          sections: [],
        },
        {
          id: TEST_PROJECT_ID_2,
          name: "Second Project",
          slug: TEST_PROJECT_ID_1, // slug same as first project's ID
          color: "#00ff00",
          sections: [],
        },
      ];

      const result = resolveProject(TEST_PROJECT_ID_1, projectsWithConflict);
      expect(result?.name).toBe("First Project"); // Should match by ID, not slug
    });

    it("should return null for non-existent project", () => {
      const result = resolveProject("non-existent", testProjects);
      expect(result).toBe(null);
    });
  });

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
    ];

    it("should resolve label by UUID", () => {
      const result = resolveLabel(TEST_LABEL_ID_1, testLabels);
      expect(result).toBe(testLabels[0]);
      expect(result?.name).toBe("Important");
    });

    it("should resolve label by slug", () => {
      const result = resolveLabel("important", testLabels);
      expect(result).toBe(testLabels[0]);
      expect(result?.name).toBe("Important");
    });

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
      ];

      const result = resolveLabel(TEST_LABEL_ID_1, labelsWithConflict);
      expect(result?.name).toBe("Important"); // Should match by ID, not slug
    });

    it("should return null for non-existent label", () => {
      const result = resolveLabel("non-existent", testLabels);
      expect(result).toBe(null);
    });
  });

  describe("resolveProjectGroup", () => {
    const testProjectGroups: ProjectGroup = {
      id: TEST_GROUP_ID_1,
      name: "Root Group",
      slug: "root-group",
      color: "#ff0000",
      type: "project",
      items: [
        TEST_PROJECT_ID_1,
        {
          id: TEST_GROUP_ID_2,
          name: "Nested Group",
          slug: "nested-group",
          color: "#00ff00",
          type: "project",
          items: [
            TEST_PROJECT_ID_2,
            {
              id: TEST_GROUP_ID_3,
              name: "Deep Nested Group",
              slug: "deep-nested-group",
              color: "#0000ff",
              type: "project",
              items: [TEST_PROJECT_ID_1],
            },
          ],
        },
      ],
    };

    it("should resolve project group by UUID", () => {
      const result = resolveProjectGroup(TEST_GROUP_ID_1, testProjectGroups);
      expect(result).toBe(testProjectGroups);
      expect(result?.name).toBe("Root Group");
    });

    it("should resolve project group by slug", () => {
      const result = resolveProjectGroup("nested-group", testProjectGroups);
      expect(result).not.toBe(null);
      expect(result?.name).toBe("Nested Group");
      expect(result?.slug).toBe("nested-group");
    });

    it("should resolve deeply nested project group by UUID", () => {
      const result = resolveProjectGroup(TEST_GROUP_ID_3, testProjectGroups);
      expect(result).not.toBe(null);
      expect(result?.name).toBe("Deep Nested Group");
      expect(result?.id).toBe(TEST_GROUP_ID_3);
    });

    it("should resolve deeply nested project group by slug", () => {
      const result = resolveProjectGroup(
        "deep-nested-group",
        testProjectGroups,
      );
      expect(result).not.toBe(null);
      expect(result?.name).toBe("Deep Nested Group");
      expect(result?.slug).toBe("deep-nested-group");
    });

    it("should prioritize UUID over slug when both could match", () => {
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

      const result = resolveProjectGroup(
        TEST_GROUP_ID_1,
        projectGroupsWithConflict,
      );
      expect(result?.name).toBe("Root Group"); // Should match by ID, not slug
    });

    it("should return null for non-existent project group", () => {
      const result = resolveProjectGroup(
        "non-existent-group",
        testProjectGroups,
      );
      expect(result).toBe(null);
    });

    it("should return null when projectGroups is undefined", () => {
      const result = resolveProjectGroup("any-group", undefined);
      expect(result).toBe(null);
    });

    it("should handle invalid UUID format gracefully", () => {
      const result = resolveProjectGroup("not-a-uuid", testProjectGroups);
      expect(result).toBe(null);
    });

    it("should handle empty project groups structure", () => {
      const emptyProjectGroups: ProjectGroup = {
        id: TEST_GROUP_ID_1,
        name: "Empty Root",
        slug: "empty-root",
        color: "#ffffff",
        type: "project",
        items: [],
      };

      const result = resolveProjectGroup("non-existent", emptyProjectGroups);
      expect(result).toBe(null);
    });

    it("should find root group when searching by root slug", () => {
      const result = resolveProjectGroup("root-group", testProjectGroups);
      expect(result).toBe(testProjectGroups);
      expect(result?.name).toBe("Root Group");
    });

    it("should handle case-sensitive slug matching", () => {
      const result = resolveProjectGroup("ROOT-GROUP", testProjectGroups); // uppercase
      expect(result).toBe(null); // should not match case-insensitive
    });

    it("should return correct group when multiple groups have similar names", () => {
      const groupsWithSimilarNames: ProjectGroup = {
        id: TEST_GROUP_ID_1,
        name: "Project Group",
        slug: "project-group",
        color: "#ff0000",
        type: "project",
        items: [
          {
            id: TEST_GROUP_ID_2,
            name: "Project Group Two",
            slug: "project-group-two",
            color: "#00ff00",
            type: "project",
            items: [],
          },
        ],
      };

      const result1 = resolveProjectGroup(
        "project-group",
        groupsWithSimilarNames,
      );
      const result2 = resolveProjectGroup(
        "project-group-two",
        groupsWithSimilarNames,
      );

      expect(result1?.name).toBe("Project Group");
      expect(result2?.name).toBe("Project Group Two");
    });
  });
});
