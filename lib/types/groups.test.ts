import { describe, expect, it } from "vitest"
import {
  TaskGroupSchema,
  ProjectGroupSchema,
  LabelGroupSchema,
  GroupSchema,
  createTaskId,
  createProjectId,
  createLabelId,
  createGroupId,
  type TaskGroup,
  type ProjectGroup,
  type LabelGroup,
} from "./index"
import { MOCK_UUID } from "../constants/defaults"

/**
 * Group Schema Tests
 *
 * IMPORTANT: Understanding Branded Types and Runtime vs Compile-time Validation
 *
 * The Group schemas use Zod's branded types (TaskId, ProjectId, LabelId, GroupId) which provide:
 * 1. COMPILE-TIME type safety: TypeScript prevents mixing incompatible types
 * 2. RUNTIME validation: All branded UUIDs are just UUIDs and will cross-validate
 *
 * This means:
 * - ✅ TypeScript will prevent: TaskGroup.items = [projectId]
 * - ✅ Runtime will accept: Any valid UUID in any branded ID position
 * - ✅ Type discrimination happens via the 'type' field in discriminated unions
 *
 * These tests focus on:
 * - Valid schema structures that should pass
 * - Invalid structures (wrong types, missing fields, invalid UUIDs)
 * - Recursive nesting validation
 * - Group type discrimination via 'type' field
 */

describe("Group Schemas", () => {
  // Test data using existing patterns
  const taskId1 = createTaskId("12345678-1234-4234-8234-123456789ab1")
  const taskId2 = createTaskId("12345678-1234-4234-8234-123456789ab2")
  const projectId1 = createProjectId("11111111-1111-4111-8111-111111111111")
  const projectId2 = createProjectId("22222222-2222-4222-8222-222222222222")
  const labelId1 = createLabelId("33333333-3333-4333-8333-333333333333")
  const labelId2 = createLabelId("44444444-4444-4444-8444-444444444444")
  const groupId1 = createGroupId("55555555-5555-4555-8555-555555555555")
  const groupId2 = createGroupId("66666666-6666-4666-8666-666666666666")

  describe("TaskGroup Schema", () => {
    describe("Valid cases", () => {
      it("should validate TaskGroup with only TaskIds", () => {
        const taskGroup: TaskGroup = {
          type: "task",
          id: groupId1,
          name: "Task Group",
          items: [taskId1, taskId2],
        }

        expect(() => TaskGroupSchema.parse(taskGroup)).not.toThrow()
      })

      it("should validate TaskGroup with only other TaskGroups", () => {
        const nestedTaskGroup: TaskGroup = {
          type: "task",
          id: groupId2,
          name: "Nested Tasks",
          items: [taskId1],
        }

        const taskGroup: TaskGroup = {
          type: "task",
          id: groupId1,
          name: "Parent Task Group",
          items: [nestedTaskGroup],
        }

        expect(() => TaskGroupSchema.parse(taskGroup)).not.toThrow()
      })

      it("should reject TaskGroup with mixed TaskIds and TaskGroups", () => {
        const nestedTaskGroup: TaskGroup = {
          type: "task",
          id: groupId2,
          name: "Subtasks",
          items: [taskId2],
        }

        const taskGroup = {
          type: "task",
          id: groupId1,
          name: "Mixed Task Group",
          items: [taskId1, nestedTaskGroup],
        }

        expect(() => TaskGroupSchema.parse(taskGroup)).toThrow(
          /Items must be either all IDs or all groups, not mixed/,
        )
      })

      it("should validate TaskGroup with empty items", () => {
        const taskGroup: TaskGroup = {
          type: "task",
          id: groupId1,
          name: "Empty Task Group",
          items: [],
        }

        expect(() => TaskGroupSchema.parse(taskGroup)).not.toThrow()
      })

      it("should validate deeply nested TaskGroups", () => {
        const level3: TaskGroup = {
          type: "task",
          id: createGroupId("77777777-7777-4777-8777-777777777777"),
          name: "Level 3",
          items: [taskId1],
        }

        const level2: TaskGroup = {
          type: "task",
          id: groupId2,
          name: "Level 2",
          items: [level3],
        }

        const level1: TaskGroup = {
          type: "task",
          id: groupId1,
          name: "Level 1",
          items: [level2],
        }

        expect(() => TaskGroupSchema.parse(level1)).not.toThrow()
      })

      it("should validate with optional fields", () => {
        const taskGroup: TaskGroup = {
          type: "task",
          id: groupId1,
          name: "Task Group",
          description: "A group of tasks",
          color: "#ff0000",
          items: [taskId1],
        }

        expect(() => TaskGroupSchema.parse(taskGroup)).not.toThrow()
      })
    })

    describe("Runtime validation (Note: Branded types provide compile-time safety only)", () => {
      it("should accept any valid UUID in items at runtime (branded types cross-validate)", () => {
        // At runtime, all branded UUIDs are just UUIDs - type safety is compile-time only
        const groupWithProjectId = {
          type: "task",
          id: groupId1,
          name: "Runtime Group",
          items: [projectId1], // This passes at runtime but would fail at compile time
        }

        expect(() => TaskGroupSchema.parse(groupWithProjectId)).not.toThrow()
      })

      it("should reject TaskGroup with non-TaskGroup nested groups", () => {
        const projectGroup: ProjectGroup = {
          type: "project", // Different type discriminator
          id: groupId2,
          name: "Project Group",
          items: [projectId1],
        }

        const invalidGroup = {
          type: "task",
          id: groupId1,
          name: "Invalid Group",
          items: [projectGroup], // Different group type discriminator should fail
        }

        expect(() => TaskGroupSchema.parse(invalidGroup)).toThrow()
      })

      it("should reject non-UUID strings in items", () => {
        const invalidGroup = {
          type: "task",
          id: groupId1,
          name: "Invalid Group",
          items: ["not-a-uuid"], // Invalid UUID format
        }

        expect(() => TaskGroupSchema.parse(invalidGroup)).toThrow()
      })

      it("should reject non-string items", () => {
        const invalidGroup = {
          type: "task",
          id: groupId1,
          name: "Invalid Group",
          items: [123], // Wrong type entirely
        }

        expect(() => TaskGroupSchema.parse(invalidGroup)).toThrow()
      })
    })
  })

  describe("ProjectGroup Schema", () => {
    describe("Valid cases", () => {
      it("should validate ProjectGroup with only ProjectIds", () => {
        const projectGroup: ProjectGroup = {
          type: "project",
          id: groupId1,
          name: "Project Group",
          items: [projectId1, projectId2],
        }

        expect(() => ProjectGroupSchema.parse(projectGroup)).not.toThrow()
      })

      it("should reject ProjectGroup with mixed ProjectIds and ProjectGroups", () => {
        const nestedProjectGroup: ProjectGroup = {
          type: "project",
          id: groupId2,
          name: "Nested Projects",
          items: [projectId2],
        }

        const projectGroup = {
          type: "project",
          id: groupId1,
          name: "Mixed Project Group",
          items: [projectId1, nestedProjectGroup],
        }

        expect(() => ProjectGroupSchema.parse(projectGroup)).toThrow(
          /Items must be either all IDs or all groups, not mixed/,
        )
      })
    })

    describe("Runtime validation", () => {
      it("should accept any valid UUID in items at runtime", () => {
        const groupWithTaskId = {
          type: "project",
          id: groupId1,
          name: "Runtime Project Group",
          items: [taskId1], // Passes at runtime, fails at compile time
        }

        expect(() => ProjectGroupSchema.parse(groupWithTaskId)).not.toThrow()
      })

      it("should reject ProjectGroup with non-ProjectGroup nested groups", () => {
        const taskGroup: TaskGroup = {
          type: "task", // Different discriminator
          id: groupId2,
          name: "Task Group",
          items: [taskId1],
        }

        const invalidGroup = {
          type: "project",
          id: groupId1,
          name: "Invalid Group",
          items: [taskGroup], // Different group type discriminator should fail
        }

        expect(() => ProjectGroupSchema.parse(invalidGroup)).toThrow()
      })
    })
  })

  describe("LabelGroup Schema", () => {
    describe("Valid cases", () => {
      it("should validate LabelGroup with only LabelIds", () => {
        const labelGroup: LabelGroup = {
          type: "label",
          id: groupId1,
          name: "Label Group",
          items: [labelId1, labelId2],
        }

        expect(() => LabelGroupSchema.parse(labelGroup)).not.toThrow()
      })

      it("should reject LabelGroup with mixed LabelIds and LabelGroups", () => {
        const nestedLabelGroup: LabelGroup = {
          type: "label",
          id: groupId2,
          name: "Nested Labels",
          items: [labelId2],
        }

        const labelGroup = {
          type: "label",
          id: groupId1,
          name: "Mixed Label Group",
          items: [labelId1, nestedLabelGroup],
        }

        expect(() => LabelGroupSchema.parse(labelGroup)).toThrow(
          /Items must be either all IDs or all groups, not mixed/,
        )
      })
    })

    describe("Runtime validation", () => {
      it("should accept any valid UUID in items at runtime", () => {
        const groupWithTaskId = {
          type: "label",
          id: groupId1,
          name: "Runtime Label Group",
          items: [taskId1], // Passes at runtime, fails at compile time
        }

        expect(() => LabelGroupSchema.parse(groupWithTaskId)).not.toThrow()
      })

      it("should reject LabelGroup with non-LabelGroup nested groups", () => {
        const taskGroup: TaskGroup = {
          type: "task", // Different discriminator
          id: groupId2,
          name: "Task Group",
          items: [taskId1],
        }

        const invalidGroup = {
          type: "label",
          id: groupId1,
          name: "Invalid Group",
          items: [taskGroup], // Different group type discriminator should fail
        }

        expect(() => LabelGroupSchema.parse(invalidGroup)).toThrow()
      })
    })
  })

  describe("Union GroupSchema", () => {
    it("should validate any valid group type", () => {
      const taskGroup: TaskGroup = {
        type: "task",
        id: groupId1,
        name: "Task Group",
        items: [taskId1],
      }

      const projectGroup: ProjectGroup = {
        type: "project",
        id: groupId2,
        name: "Project Group",
        items: [projectId1],
      }

      expect(() => GroupSchema.parse(taskGroup)).not.toThrow()
      expect(() => GroupSchema.parse(projectGroup)).not.toThrow()
    })

    it("should reject invalid group structures", () => {
      const invalidGroup = {
        type: "invalid",
        id: groupId1,
        name: "Invalid Group",
        items: [],
      }

      expect(() => GroupSchema.parse(invalidGroup)).toThrow()
    })
  })

  describe("Homogeneous Items Validation", () => {
    describe("TaskGroup homogeneous validation", () => {
      it("should allow empty items array", () => {
        const taskGroup = {
          type: "task",
          id: groupId1,
          name: "Empty Group",
          items: [],
        }

        expect(() => TaskGroupSchema.parse(taskGroup)).not.toThrow()
      })

      it("should allow only TaskIds", () => {
        const taskGroup = {
          type: "task",
          id: groupId1,
          name: "IDs Only Group",
          items: [taskId1, taskId2],
        }

        expect(() => TaskGroupSchema.parse(taskGroup)).not.toThrow()
      })

      it("should allow only TaskGroups", () => {
        const nestedGroup1: TaskGroup = {
          type: "task",
          id: groupId2,
          name: "Nested 1",
          items: [taskId1],
        }

        const nestedGroup2: TaskGroup = {
          type: "task",
          id: createGroupId("77777777-7777-4777-8777-777777777777"),
          name: "Nested 2",
          items: [taskId2],
        }

        const taskGroup = {
          type: "task",
          id: groupId1,
          name: "Groups Only",
          items: [nestedGroup1, nestedGroup2],
        }

        expect(() => TaskGroupSchema.parse(taskGroup)).not.toThrow()
      })

      it("should reject mixed TaskIds and TaskGroups", () => {
        const nestedGroup: TaskGroup = {
          type: "task",
          id: groupId2,
          name: "Nested Group",
          items: [taskId2],
        }

        const mixedGroup = {
          type: "task",
          id: groupId1,
          name: "Mixed Group",
          items: [taskId1, nestedGroup], // Mixed: ID + Group
        }

        expect(() => TaskGroupSchema.parse(mixedGroup)).toThrow(
          /Items must be either all IDs or all groups, not mixed/,
        )
      })

      it("should reject mixed in reverse order", () => {
        const nestedGroup: TaskGroup = {
          type: "task",
          id: groupId2,
          name: "Nested Group",
          items: [taskId2],
        }

        const mixedGroup = {
          type: "task",
          id: groupId1,
          name: "Mixed Group",
          items: [nestedGroup, taskId1], // Mixed: Group + ID
        }

        expect(() => TaskGroupSchema.parse(mixedGroup)).toThrow(
          /Items must be either all IDs or all groups, not mixed/,
        )
      })
    })

    describe("ProjectGroup homogeneous validation", () => {
      it("should allow only ProjectIds", () => {
        const projectGroup = {
          type: "project",
          id: groupId1,
          name: "IDs Only Group",
          items: [projectId1, projectId2],
        }

        expect(() => ProjectGroupSchema.parse(projectGroup)).not.toThrow()
      })

      it("should allow only ProjectGroups", () => {
        const nestedGroup1: ProjectGroup = {
          type: "project",
          id: groupId2,
          name: "Nested 1",
          items: [projectId1],
        }

        const nestedGroup2: ProjectGroup = {
          type: "project",
          id: createGroupId("88888888-8888-4888-8888-888888888888"),
          name: "Nested 2",
          items: [projectId2],
        }

        const projectGroup = {
          type: "project",
          id: groupId1,
          name: "Groups Only",
          items: [nestedGroup1, nestedGroup2],
        }

        expect(() => ProjectGroupSchema.parse(projectGroup)).not.toThrow()
      })

      it("should reject mixed ProjectIds and ProjectGroups", () => {
        const nestedGroup: ProjectGroup = {
          type: "project",
          id: groupId2,
          name: "Nested Group",
          items: [projectId2],
        }

        const mixedGroup = {
          type: "project",
          id: groupId1,
          name: "Mixed Group",
          items: [projectId1, nestedGroup], // Mixed: ID + Group
        }

        expect(() => ProjectGroupSchema.parse(mixedGroup)).toThrow(
          /Items must be either all IDs or all groups, not mixed/,
        )
      })
    })

    describe("LabelGroup homogeneous validation", () => {
      it("should allow only LabelIds", () => {
        const labelGroup = {
          type: "label",
          id: groupId1,
          name: "IDs Only Group",
          items: [labelId1, labelId2],
        }

        expect(() => LabelGroupSchema.parse(labelGroup)).not.toThrow()
      })

      it("should allow only LabelGroups", () => {
        const nestedGroup1: LabelGroup = {
          type: "label",
          id: groupId2,
          name: "Nested 1",
          items: [labelId1],
        }

        const nestedGroup2: LabelGroup = {
          type: "label",
          id: createGroupId("99999999-9999-4999-8999-999999999999"),
          name: "Nested 2",
          items: [labelId2],
        }

        const labelGroup = {
          type: "label",
          id: groupId1,
          name: "Groups Only",
          items: [nestedGroup1, nestedGroup2],
        }

        expect(() => LabelGroupSchema.parse(labelGroup)).not.toThrow()
      })

      it("should reject mixed LabelIds and LabelGroups", () => {
        const nestedGroup: LabelGroup = {
          type: "label",
          id: groupId2,
          name: "Nested Group",
          items: [labelId2],
        }

        const mixedGroup = {
          type: "label",
          id: groupId1,
          name: "Mixed Group",
          items: [labelId1, nestedGroup], // Mixed: ID + Group
        }

        expect(() => LabelGroupSchema.parse(mixedGroup)).toThrow(
          /Items must be either all IDs or all groups, not mixed/,
        )
      })
    })

    describe("Complex homogeneous validation scenarios", () => {
      it("should handle deeply nested homogeneous groups", () => {
        const level3: TaskGroup = {
          type: "task",
          id: createGroupId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
          name: "Level 3",
          items: [taskId1, taskId2], // All IDs
        }

        const level2: TaskGroup = {
          type: "task",
          id: createGroupId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
          name: "Level 2",
          items: [level3], // All Groups (only one, but still homogeneous)
        }

        const level1: TaskGroup = {
          type: "task",
          id: groupId1,
          name: "Level 1",
          items: [level2], // All Groups
        }

        expect(() => TaskGroupSchema.parse(level1)).not.toThrow()
      })

      it("should reject mixed items in nested structure", () => {
        const validNestedGroup: TaskGroup = {
          type: "task",
          id: groupId2,
          name: "Valid Nested",
          items: [taskId2], // All IDs - valid
        }

        const invalidParentGroup = {
          type: "task",
          id: groupId1,
          name: "Invalid Parent",
          items: [taskId1, validNestedGroup], // Mixed: ID + Group - invalid
        }

        expect(() => TaskGroupSchema.parse(invalidParentGroup)).toThrow(
          /Items must be either all IDs or all groups, not mixed/,
        )
      })

      it("should validate single item groups as homogeneous", () => {
        const singleIdGroup = {
          type: "task",
          id: groupId1,
          name: "Single ID",
          items: [taskId1], // Single ID is homogeneous
        }

        const singleGroupGroup = {
          type: "task",
          id: groupId2,
          name: "Single Group",
          items: [
            {
              type: "task" as const,
              id: createGroupId("cccccccc-cccc-4ccc-8ccc-cccccccccccc"),
              name: "Nested",
              items: [taskId2],
            },
          ], // Single group is homogeneous
        }

        expect(() => TaskGroupSchema.parse(singleIdGroup)).not.toThrow()
        expect(() => TaskGroupSchema.parse(singleGroupGroup)).not.toThrow()
      })
    })
  })

  describe("Edge cases", () => {
    it("should handle complex nested structures", () => {
      // Create a complex nested task structure
      const deepTaskGroup: TaskGroup = {
        type: "task",
        id: createGroupId("88888888-8888-4888-8888-888888888888"),
        name: "Deep Tasks",
        items: [
          {
            type: "task",
            id: createGroupId("99999999-9999-4999-8999-999999999999"),
            name: "Even Deeper",
            items: [taskId1, taskId2],
          },
        ],
      }

      const rootGroup: TaskGroup = {
        type: "task",
        id: groupId1,
        name: "Root Group",
        items: [deepTaskGroup],
      }

      expect(() => TaskGroupSchema.parse(rootGroup)).not.toThrow()
    })

    it("should reject cross-type contamination in nested groups", () => {
      // Try to sneak a project group into a task group's nested structure
      const projectGroup: ProjectGroup = {
        type: "project",
        id: groupId2,
        name: "Sneaky Project Group",
        items: [projectId1],
      }

      const invalidTaskGroup = {
        type: "task",
        id: groupId1,
        name: "Invalid Task Group",
        items: [taskId1, projectGroup], // This should fail!
      }

      expect(() => TaskGroupSchema.parse(invalidTaskGroup)).toThrow()
    })

    it("should validate required fields", () => {
      const incompleteGroup = {
        type: "task",
        // Missing required id and name
        items: [taskId1],
      }

      expect(() => TaskGroupSchema.parse(incompleteGroup)).toThrow()
    })

    it("should validate ID format", () => {
      const invalidIdGroup = {
        type: "task",
        id: "not-a-uuid-format",
        name: "Invalid ID Group",
        items: [taskId1],
      }

      expect(() => TaskGroupSchema.parse(invalidIdGroup)).toThrow()
    })

    it("should accept MOCK_UUID for testing", () => {
      const mockGroup: TaskGroup = {
        type: "task",
        id: createGroupId(MOCK_UUID),
        name: "Mock Group",
        items: [taskId1],
      }

      expect(() => TaskGroupSchema.parse(mockGroup)).not.toThrow()
    })

    it("should handle circular references in type definitions", () => {
      // Test that our recursive schema can handle self-references
      const selfReferencingGroup: TaskGroup = {
        type: "task",
        id: groupId1,
        name: "Parent",
        items: [
          {
            type: "task",
            id: groupId2,
            name: "Child",
            items: [taskId1, taskId2], // No circular reference in data, just testing schema structure
          },
        ],
      }

      expect(() => TaskGroupSchema.parse(selfReferencingGroup)).not.toThrow()
    })

    it("should validate large nested structures", () => {
      // Build a deeply nested structure
      let currentGroup: TaskGroup = {
        type: "task",
        id: createGroupId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
        name: "Deep Level",
        items: [taskId1],
      }

      // Create 5 levels of nesting
      for (let i = 0; i < 5; i++) {
        currentGroup = {
          type: "task",
          id: createGroupId(`bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb${i.toString().padStart(2, "0")}`),
          name: `Level ${i}`,
          items: [currentGroup],
        }
      }

      expect(() => TaskGroupSchema.parse(currentGroup)).not.toThrow()
    })

    it("should handle empty string names", () => {
      const emptyNameGroup = {
        type: "task",
        id: groupId1,
        name: "",
        items: [taskId1],
      }

      expect(() => TaskGroupSchema.parse(emptyNameGroup)).not.toThrow()
    })

    it("should reject null values in required fields", () => {
      const nullNameGroup = {
        type: "task",
        id: groupId1,
        name: null,
        items: [taskId1],
      }

      expect(() => TaskGroupSchema.parse(nullNameGroup)).toThrow()
    })

    it("should handle mixed case in type field", () => {
      const mixedCaseGroup = {
        type: "Task", // Wrong case
        id: groupId1,
        name: "Mixed Case Group",
        items: [taskId1],
      }

      expect(() => TaskGroupSchema.parse(mixedCaseGroup)).toThrow()
    })

    it("should reject circular self-references", () => {
      const circularGroup = {
        type: "task",
        id: groupId1,
        name: "Circular Group",
        items: [
          taskId1,
          {
            type: "task",
            id: groupId1, // Same ID as parent - creates circular reference
            name: "Self Reference",
            items: [taskId2],
          },
        ],
      }

      expect(() => TaskGroupSchema.parse(circularGroup)).toThrow()
      expect(() => TaskGroupSchema.parse(circularGroup)).toThrow(/circular reference/)
    })
  })
})
