import { describe, expect, it } from "vitest"
import {
  ProjectGroupSchema,
  LabelGroupSchema,
  GroupSchema,
  createTaskId,
  createProjectId,
  createLabelId,
  createGroupId,
  type ProjectGroup,
  type LabelGroup,
} from "./index"

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
 * - ✅ TypeScript will prevent: ProjectGroup.items = [taskId]
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
  const projectId1 = createProjectId("11111111-1111-4111-8111-111111111111")
  const projectId2 = createProjectId("22222222-2222-4222-8222-222222222222")
  const labelId1 = createLabelId("33333333-3333-4333-8333-333333333333")
  const labelId2 = createLabelId("44444444-4444-4444-8444-444444444444")
  const groupId1 = createGroupId("55555555-5555-4555-8555-555555555555")
  const groupId2 = createGroupId("66666666-6666-4666-8666-666666666666")

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

      it("should validate ProjectGroup with only other ProjectGroups", () => {
        const nestedProjectGroup: ProjectGroup = {
          type: "project",
          id: groupId2,
          name: "Nested Projects",
          items: [projectId2],
        }

        const projectGroup: ProjectGroup = {
          type: "project",
          id: groupId1,
          name: "Mixed Project Group",
          items: [nestedProjectGroup],
        }

        expect(() => ProjectGroupSchema.parse(projectGroup)).not.toThrow()
      })

      it("should accept ProjectGroup with mixed ProjectIds and ProjectGroups", () => {
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

        expect(() => ProjectGroupSchema.parse(projectGroup)).not.toThrow()
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
        const labelGroup: LabelGroup = {
          type: "label", // Different discriminator
          id: groupId2,
          name: "Label Group",
          items: [labelId1],
        }

        const invalidGroup = {
          type: "project",
          id: groupId1,
          name: "Invalid Group",
          items: [labelGroup], // Different group type discriminator should fail
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

      it("should validate LabelGroup with only other LabelGroups", () => {
        const nestedLabelGroup: LabelGroup = {
          type: "label",
          id: groupId2,
          name: "Nested Labels",
          items: [labelId2],
        }

        const labelGroup: LabelGroup = {
          type: "label",
          id: groupId1,
          name: "Mixed Label Group",
          items: [nestedLabelGroup],
        }

        expect(() => LabelGroupSchema.parse(labelGroup)).not.toThrow()
      })

      it("should accept LabelGroup with mixed LabelIds and LabelGroups", () => {
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

        expect(() => LabelGroupSchema.parse(labelGroup)).not.toThrow()
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
        const projectGroup: ProjectGroup = {
          type: "project", // Different discriminator
          id: groupId2,
          name: "Project Group",
          items: [projectId1],
        }

        const invalidGroup = {
          type: "label",
          id: groupId1,
          name: "Invalid Group",
          items: [projectGroup], // Different group type discriminator should fail
        }

        expect(() => LabelGroupSchema.parse(invalidGroup)).toThrow()
      })
    })
  })

  describe("Union GroupSchema", () => {
    it("should validate any valid group type", () => {
      const projectGroup: ProjectGroup = {
        type: "project",
        id: groupId2,
        name: "Project Group",
        items: [projectId1],
      }

      const labelGroup: LabelGroup = {
        type: "label",
        id: groupId1,
        name: "Label Group",
        items: [labelId1],
      }

      expect(() => GroupSchema.parse(projectGroup)).not.toThrow()
      expect(() => GroupSchema.parse(labelGroup)).not.toThrow()
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
})
