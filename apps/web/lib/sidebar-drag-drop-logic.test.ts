import { describe, it, expect } from "vitest"
import { isValidSidebarOperation, type DragInstruction } from "./sidebar-drag-drop-logic"
import { ROOT_PROJECT_GROUP_ID } from "@/lib/types"

describe("isValidSidebarOperation", () => {
  describe("Project operations", () => {
    it("should allow reordering projects (reorder-above)", () => {
      const sourceData = { type: "sidebar-project", projectId: "project-1" }
      const targetData = { type: "sidebar-project-drop-target", projectId: "project-2" }
      const instruction: DragInstruction = {
        type: "reorder-above",
        currentLevel: 0,
        indentPerLevel: 24,
      }

      expect(isValidSidebarOperation(sourceData, targetData, instruction)).toBe(true)
    })

    it("should allow reordering projects (reorder-below)", () => {
      const sourceData = { type: "sidebar-project", projectId: "project-1" }
      const targetData = { type: "sidebar-project-drop-target", projectId: "project-2" }
      const instruction: DragInstruction = {
        type: "reorder-below",
        currentLevel: 0,
        indentPerLevel: 24,
      }

      expect(isValidSidebarOperation(sourceData, targetData, instruction)).toBe(true)
    })

    it("should block nesting projects under other projects (make-child)", () => {
      const sourceData = { type: "sidebar-project", projectId: "project-1" }
      const targetData = { type: "sidebar-project-drop-target", projectId: "project-2" }
      const instruction: DragInstruction = {
        type: "make-child",
        currentLevel: 0,
        indentPerLevel: 24,
      }

      expect(isValidSidebarOperation(sourceData, targetData, instruction)).toBe(false)
    })

    it("should allow moving projects to groups", () => {
      const sourceData = { type: "sidebar-project", projectId: "project-1" }
      const targetData = { type: "sidebar-group-drop-target", groupId: "group-1" }
      const instruction: DragInstruction = {
        type: "make-child",
        currentLevel: 0,
        indentPerLevel: 24,
      }

      expect(isValidSidebarOperation(sourceData, targetData, instruction)).toBe(true)
    })
  })

  describe("Group operations", () => {
    it("should allow reordering groups (reorder-above)", () => {
      const sourceData = { type: "sidebar-group", groupId: "group-1" }
      const targetData = { type: "sidebar-group-drop-target", groupId: "group-2" }
      const instruction: DragInstruction = {
        type: "reorder-above",
        currentLevel: 0,
        indentPerLevel: 24,
      }

      expect(isValidSidebarOperation(sourceData, targetData, instruction)).toBe(true)
    })

    it("should allow reordering groups (reorder-below)", () => {
      const sourceData = { type: "sidebar-group", groupId: "group-1" }
      const targetData = { type: "sidebar-group-drop-target", groupId: "group-2" }
      const instruction: DragInstruction = {
        type: "reorder-below",
        currentLevel: 0,
        indentPerLevel: 24,
      }

      expect(isValidSidebarOperation(sourceData, targetData, instruction)).toBe(true)
    })

    it("should block nesting groups under other groups (make-child)", () => {
      const sourceData = { type: "sidebar-group", groupId: "group-1" }
      const targetData = { type: "sidebar-group-drop-target", groupId: "group-2" }
      const instruction: DragInstruction = {
        type: "make-child",
        currentLevel: 0,
        indentPerLevel: 24,
      }

      expect(isValidSidebarOperation(sourceData, targetData, instruction)).toBe(false)
    })

    it("should allow dropping groups near ROOT-level projects", () => {
      const sourceData = { type: "sidebar-group", groupId: "group-1" }
      const targetData = {
        type: "sidebar-project-drop-target",
        projectId: "project-1",
        groupId: undefined, // Root-level project
      }
      const instruction: DragInstruction = {
        type: "reorder-above",
        currentLevel: 0,
        indentPerLevel: 24,
      }

      expect(isValidSidebarOperation(sourceData, targetData, instruction)).toBe(true)
    })

    it("should block dropping groups near nested projects (non-ROOT)", () => {
      const sourceData = { type: "sidebar-group", groupId: "group-1" }
      const targetData = {
        type: "sidebar-project-drop-target",
        projectId: "project-1",
        groupId: "group-2", // Project inside a group
      }
      const instruction: DragInstruction = {
        type: "reorder-above",
        currentLevel: 0,
        indentPerLevel: 24,
      }

      expect(isValidSidebarOperation(sourceData, targetData, instruction)).toBe(false)
    })

    it("should allow dropping groups near projects in ROOT group explicitly", () => {
      const sourceData = { type: "sidebar-group", groupId: "group-1" }
      const targetData = {
        type: "sidebar-project-drop-target",
        projectId: "project-1",
        groupId: ROOT_PROJECT_GROUP_ID,
      }
      const instruction: DragInstruction = {
        type: "reorder-above",
        currentLevel: 0,
        indentPerLevel: 24,
      }

      expect(isValidSidebarOperation(sourceData, targetData, instruction)).toBe(true)
    })
  })

  describe("Edge cases", () => {
    it("should handle null instruction gracefully", () => {
      const sourceData = { type: "sidebar-project", projectId: "project-1" }
      const targetData = { type: "sidebar-project-drop-target", projectId: "project-2" }

      expect(isValidSidebarOperation(sourceData, targetData, null)).toBe(true)
    })

    it("should allow unknown operation types", () => {
      const sourceData = { type: "sidebar-project", projectId: "project-1" }
      const targetData = { type: "sidebar-project-drop-target", projectId: "project-2" }
      const instruction: DragInstruction = {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test case intentionally creates invalid instruction type
        type: "unknown-operation" as "make-child",
        currentLevel: 0,
        indentPerLevel: 24,
      }

      expect(isValidSidebarOperation(sourceData, targetData, instruction)).toBe(true)
    })

    it("should allow task drops (different source type)", () => {
      const sourceData = { type: "list-item", ids: ["task-1"] }
      const targetData = { type: "sidebar-project-drop-target", projectId: "project-1" }
      const instruction: DragInstruction = {
        type: "make-child",
        currentLevel: 0,
        indentPerLevel: 24,
      }

      // Task drops should be allowed (not sidebar operations)
      expect(isValidSidebarOperation(sourceData, targetData, instruction)).toBe(true)
    })
  })

  describe("Comprehensive validation matrix", () => {
    const testCases = [
      // [sourceType, targetType, instruction, expected, description]
      [
        "sidebar-project",
        "sidebar-project-drop-target",
        { type: "make-child", currentLevel: 0, indentPerLevel: 24 },
        false,
        "Project → Project (make-child) ❌",
      ],
      [
        "sidebar-project",
        "sidebar-project-drop-target",
        { type: "reorder-above", currentLevel: 0, indentPerLevel: 24 },
        true,
        "Project → Project (reorder-above) ✅",
      ],
      [
        "sidebar-group",
        "sidebar-group-drop-target",
        { type: "make-child", currentLevel: 0, indentPerLevel: 24 },
        false,
        "Group → Group (make-child) ❌",
      ],
      [
        "sidebar-group",
        "sidebar-group-drop-target",
        { type: "reorder-above", currentLevel: 0, indentPerLevel: 24 },
        true,
        "Group → Group (reorder-above) ✅",
      ],
      [
        "sidebar-project",
        "sidebar-group-drop-target",
        { type: "make-child", currentLevel: 0, indentPerLevel: 24 },
        true,
        "Project → Group (make-child) ✅",
      ],
      [
        "sidebar-group",
        "sidebar-project-drop-target",
        { type: "reorder-above", currentLevel: 0, indentPerLevel: 24 },
        true,
        "Group → ROOT Project (reorder-above) ✅",
      ],
    ] as const

    testCases.forEach(([sourceType, targetType, instruction, expected, description]) => {
      it(description, () => {
        const sourceData = { type: sourceType }
        const targetData = {
          type: targetType,
          groupId: sourceType === "sidebar-group" ? undefined : undefined,
        }

        const inst: DragInstruction = instruction
        expect(isValidSidebarOperation(sourceData, targetData, inst)).toBe(expected)
      })
    })
  })
})
