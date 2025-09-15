import { describe, it, expect } from "vitest"
import {
  findGroupById,
  collectProjectIdsFromGroup,
  getAllGroupsFlat,
  resolveGroup,
} from "./group-utils"
import type { ProjectGroup } from "@/lib/types"
import { createGroupId, createProjectId } from "@/lib/types"

// Test data setup
const TEST_GROUP_ID_1 = createGroupId("550e8400-e29b-41d4-a716-446655440001")
const TEST_GROUP_ID_2 = createGroupId("550e8400-e29b-41d4-a716-446655440002")
const TEST_GROUP_ID_3 = createGroupId("550e8400-e29b-41d4-a716-446655440003")
const TEST_PROJECT_ID_1 = createProjectId("650e8400-e29b-41d4-a716-446655440001")
const TEST_PROJECT_ID_2 = createProjectId("650e8400-e29b-41d4-a716-446655440002")
const TEST_PROJECT_ID_3 = createProjectId("650e8400-e29b-41d4-a716-446655440003")

describe("group-utils", () => {
  describe("findGroupById", () => {
    const flatGroup: ProjectGroup = {
      id: TEST_GROUP_ID_1,
      name: "Root Group",
      slug: "root-group",
      color: "#ff0000",
      type: "project",
      items: [TEST_PROJECT_ID_1, TEST_PROJECT_ID_2],
    }

    const nestedGroups: ProjectGroup = {
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
              items: [TEST_PROJECT_ID_3],
            },
          ],
        },
      ],
    }

    it("should find group by ID in flat structure", () => {
      const result = findGroupById(flatGroup, TEST_GROUP_ID_1)
      expect(result).toBe(flatGroup)
      expect(result?.name).toBe("Root Group")
    })

    it("should find group by ID in nested structure", () => {
      const result = findGroupById(nestedGroups, TEST_GROUP_ID_2)
      expect(result).not.toBe(null)
      expect(result?.name).toBe("Nested Group")
      expect(result?.id).toBe(TEST_GROUP_ID_2)
    })

    it("should find deeply nested group by ID", () => {
      const result = findGroupById(nestedGroups, TEST_GROUP_ID_3)
      expect(result).not.toBe(null)
      expect(result?.name).toBe("Deep Nested Group")
      expect(result?.id).toBe(TEST_GROUP_ID_3)
    })

    it("should return null for non-existent ID", () => {
      const nonExistentId = createGroupId("999e8400-e29b-41d4-a716-446655440999")
      const result = findGroupById(flatGroup, nonExistentId)
      expect(result).toBe(null)
    })

    it("should find root group when searching for root ID", () => {
      const result = findGroupById(nestedGroups, TEST_GROUP_ID_1)
      expect(result).toBe(nestedGroups)
      expect(result?.name).toBe("Root Group")
    })

    it("should handle empty group structure", () => {
      const emptyGroup: ProjectGroup = {
        id: TEST_GROUP_ID_1,
        name: "Empty Group",
        slug: "empty-group",
        color: "#ffffff",
        type: "project",
        items: [],
      }

      const result = findGroupById(emptyGroup, TEST_GROUP_ID_2)
      expect(result).toBe(null)
    })
  })

  describe("collectProjectIdsFromGroup", () => {
    const groupsData = {
      projectGroups: {
        id: TEST_GROUP_ID_1,
        name: "Root Group",
        slug: "root-group",
        color: "#ff0000",
        type: "project" as const,
        items: [
          TEST_PROJECT_ID_1,
          {
            id: TEST_GROUP_ID_2,
            name: "Nested Group",
            slug: "nested-group",
            color: "#00ff00",
            type: "project" as const,
            items: [
              TEST_PROJECT_ID_2,
              {
                id: TEST_GROUP_ID_3,
                name: "Deep Nested Group",
                slug: "deep-nested-group",
                color: "#0000ff",
                type: "project" as const,
                items: [TEST_PROJECT_ID_3],
              },
            ],
          },
        ],
      },
      labelGroups: {},
    }

    it("should collect all project IDs from root group", () => {
      const result = collectProjectIdsFromGroup(groupsData, TEST_GROUP_ID_1)
      expect(result).toEqual([TEST_PROJECT_ID_1, TEST_PROJECT_ID_2, TEST_PROJECT_ID_3])
    })

    it("should collect project IDs from nested group only", () => {
      const result = collectProjectIdsFromGroup(groupsData, TEST_GROUP_ID_2)
      expect(result).toEqual([TEST_PROJECT_ID_2, TEST_PROJECT_ID_3])
    })

    it("should collect project IDs from deeply nested group", () => {
      const result = collectProjectIdsFromGroup(groupsData, TEST_GROUP_ID_3)
      expect(result).toEqual([TEST_PROJECT_ID_3])
    })

    it("should return empty array for non-existent group", () => {
      const nonExistentId = createGroupId("999e8400-e29b-41d4-a716-446655440999")
      const result = collectProjectIdsFromGroup(groupsData, nonExistentId)
      expect(result).toEqual([])
    })

    it("should handle group with no projects", () => {
      const emptyGroupsData = {
        projectGroups: {
          id: TEST_GROUP_ID_1,
          name: "Empty Group",
          slug: "empty-group",
          color: "#ffffff",
          type: "project" as const,
          items: [],
        },
        labelGroups: {},
      }

      const result = collectProjectIdsFromGroup(emptyGroupsData, TEST_GROUP_ID_1)
      expect(result).toEqual([])
    })

    it("should maintain correct order of project IDs", () => {
      const orderedGroupsData = {
        projectGroups: {
          id: TEST_GROUP_ID_1,
          name: "Ordered Group",
          slug: "ordered-group",
          color: "#ff0000",
          type: "project" as const,
          items: [TEST_PROJECT_ID_3, TEST_PROJECT_ID_1, TEST_PROJECT_ID_2],
        },
        labelGroups: {},
      }

      const result = collectProjectIdsFromGroup(orderedGroupsData, TEST_GROUP_ID_1)
      expect(result).toEqual([TEST_PROJECT_ID_3, TEST_PROJECT_ID_1, TEST_PROJECT_ID_2])
    })
  })

  describe("getAllGroupsFlat", () => {
    const nestedGroups: ProjectGroup = {
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
              items: [TEST_PROJECT_ID_3],
            },
          ],
        },
      ],
    }

    it("should flatten nested group structure", () => {
      const result = getAllGroupsFlat(nestedGroups)
      expect(result).toHaveLength(3)
      expect(result.map((g) => g.id)).toEqual([TEST_GROUP_ID_1, TEST_GROUP_ID_2, TEST_GROUP_ID_3])
    })

    it("should include root group in flattened result", () => {
      const result = getAllGroupsFlat(nestedGroups)
      expect(result[0]).toBe(nestedGroups)
    })

    it("should maintain group hierarchy information", () => {
      const result = getAllGroupsFlat(nestedGroups)
      const rootGroup = result.find((g) => g.id === TEST_GROUP_ID_1)
      const nestedGroup = result.find((g) => g.id === TEST_GROUP_ID_2)

      expect(rootGroup?.name).toBe("Root Group")
      expect(nestedGroup?.name).toBe("Nested Group")
    })

    it("should handle single group with no nesting", () => {
      const singleGroup: ProjectGroup = {
        id: TEST_GROUP_ID_1,
        name: "Single Group",
        slug: "single-group",
        color: "#ff0000",
        type: "project",
        items: [TEST_PROJECT_ID_1],
      }

      const result = getAllGroupsFlat(singleGroup)
      expect(result).toHaveLength(1)
      expect(result[0]).toBe(singleGroup)
    })

    it("should handle empty group structure", () => {
      const emptyGroup: ProjectGroup = {
        id: TEST_GROUP_ID_1,
        name: "Empty Group",
        slug: "empty-group",
        color: "#ffffff",
        type: "project",
        items: [],
      }

      const result = getAllGroupsFlat(emptyGroup)
      expect(result).toHaveLength(1)
      expect(result[0]).toBe(emptyGroup)
    })
  })

  describe("resolveGroup", () => {
    const groupsData = {
      projectGroups: {
        id: TEST_GROUP_ID_1,
        name: "Root Group",
        slug: "root-group",
        color: "#ff0000",
        type: "project" as const,
        items: [
          TEST_PROJECT_ID_1,
          {
            id: TEST_GROUP_ID_2,
            name: "Nested Group",
            slug: "nested-group",
            color: "#00ff00",
            type: "project" as const,
            items: [TEST_PROJECT_ID_2],
          },
        ],
      },
      labelGroups: {},
    }

    it("should resolve group by valid UUID", () => {
      const result = resolveGroup(TEST_GROUP_ID_1, groupsData)
      expect(result).not.toBe(null)
      expect(result?.name).toBe("Root Group")
      expect(result?.id).toBe(TEST_GROUP_ID_1)
    })

    it("should resolve group by slug when UUID is invalid", () => {
      const result = resolveGroup("nested-group", groupsData)
      expect(result).not.toBe(null)
      expect(result?.name).toBe("Nested Group")
      expect(result?.slug).toBe("nested-group")
    })

    it("should prioritize UUID over slug when both could match", () => {
      // Create a scenario where slug matches another group's ID
      const conflictGroupsData = {
        projectGroups: {
          id: TEST_GROUP_ID_1,
          name: "Root Group",
          slug: "root-group",
          color: "#ff0000",
          type: "project" as const,
          items: [
            {
              id: TEST_GROUP_ID_2,
              name: "UUID Group",
              slug: TEST_GROUP_ID_1, // slug same as root group's ID
              color: "#00ff00",
              type: "project" as const,
              items: [],
            },
          ],
        },
        labelGroups: {},
      }

      const result = resolveGroup(TEST_GROUP_ID_1, conflictGroupsData)
      expect(result?.name).toBe("Root Group") // Should match by ID, not slug
    })

    it("should return null for non-existent group", () => {
      const result = resolveGroup("non-existent-group", groupsData)
      expect(result).toBe(null)
    })

    it("should return null for invalid UUID that doesn't exist", () => {
      const nonExistentId = "999e8400-e29b-41d4-a716-446655440999"
      const result = resolveGroup(nonExistentId, groupsData)
      expect(result).toBe(null)
    })

    it("should handle malformed UUID gracefully", () => {
      const result = resolveGroup("not-a-uuid", groupsData)
      expect(result).toBe(null)
    })

    it("should handle empty groups data", () => {
      const emptyGroupsData = {
        projectGroups: {
          id: TEST_GROUP_ID_1,
          name: "Empty Root",
          slug: "empty-root",
          color: "#ffffff",
          type: "project" as const,
          items: [],
        },
        labelGroups: {},
      }

      const result = resolveGroup("non-existent", emptyGroupsData)
      expect(result).toBe(null)
    })

    it("should handle nested group resolution by ID", () => {
      const result = resolveGroup(TEST_GROUP_ID_2, groupsData)
      expect(result).not.toBe(null)
      expect(result?.name).toBe("Nested Group")
      expect(result?.id).toBe(TEST_GROUP_ID_2)
    })

    it("should handle case-sensitive slug matching", () => {
      const result = resolveGroup("NESTED-GROUP", groupsData) // uppercase
      expect(result).toBe(null) // should not match case-insensitive
    })

    it("should handle URL-encoded slug inputs", () => {
      const groupsWithSpecialSlug = {
        projectGroups: {
          id: TEST_GROUP_ID_1,
          name: "Special Group",
          slug: "special group", // slug with space
          color: "#ff0000",
          type: "project" as const,
          items: [],
        },
        labelGroups: {},
      }

      const result = resolveGroup("special group", groupsWithSpecialSlug)
      expect(result).not.toBe(null)
      expect(result?.name).toBe("Special Group")
    })
  })

  describe("edge cases and error handling", () => {
    // Note: Circular references are prevented by TypeScript types,
    // so we don't need to test for them in practice

    it("should handle very deep nesting", () => {
      // Create a deeply nested structure (10 levels)
      const deepGroup: ProjectGroup = {
        id: TEST_GROUP_ID_1,
        name: "Level 1",
        slug: "level-1",
        color: "#ff0000",
        type: "project",
        items: [],
      }

      let currentGroup = deepGroup
      for (let i = 2; i <= 10; i++) {
        const newGroup: ProjectGroup = {
          id: createGroupId(`550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, "0")}`),
          name: `Level ${i}`,
          slug: `level-${i}`,
          color: "#ff0000",
          type: "project",
          items: [],
        }
        currentGroup.items = [newGroup]
        currentGroup = newGroup
      }

      const result = getAllGroupsFlat(deepGroup)
      expect(result).toHaveLength(10)
      expect(result[0].name).toBe("Level 1")
      expect(result[9].name).toBe("Level 10")
    })

    it("should handle mixed content types in items", () => {
      const mixedGroup: ProjectGroup = {
        id: TEST_GROUP_ID_1,
        name: "Mixed Group",
        slug: "mixed-group",
        color: "#ff0000",
        type: "project",
        items: [
          TEST_PROJECT_ID_1, // project ID
          {
            id: TEST_GROUP_ID_2,
            name: "Nested Group",
            slug: "nested-group",
            color: "#00ff00",
            type: "project",
            items: [TEST_PROJECT_ID_2], // another project ID
          },
          TEST_PROJECT_ID_3, // another project ID
        ],
      }

      const groupsData = { projectGroups: mixedGroup, labelGroups: {} }
      const projectIds = collectProjectIdsFromGroup(groupsData, TEST_GROUP_ID_1)

      expect(projectIds).toEqual([TEST_PROJECT_ID_1, TEST_PROJECT_ID_2, TEST_PROJECT_ID_3])
    })
  })
})
