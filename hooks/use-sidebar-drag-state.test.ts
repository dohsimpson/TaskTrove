import { describe, it, expect, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { extractSidebarInstruction, useSidebarDragState } from "./use-sidebar-drag-state"
import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"

describe("extractSidebarInstruction", () => {
  describe("Project dragging scenarios", () => {
    it("returns reorder-project instruction when dragging project within same context", () => {
      const sourceData = {
        type: "sidebar-project",
        projectId: "project-1",
        index: 0,
      }

      const instructionSymbol = Symbol("tree-item-instruction")
      const targetData = {
        type: "sidebar-project-drop-target",
        index: 1,
        [instructionSymbol]: { type: "reorder-below", indentPerLevel: 0, currentLevel: 0 },
      }

      const instruction = extractSidebarInstruction(sourceData, targetData)

      expect(instruction).toEqual({
        type: "reorder-project",
        projectId: "project-1",
        fromIndex: 0,
        toIndex: 1, // bottom edge after accounting for source removal
        withinGroupId: undefined,
      })
    })

    it("returns move-project-to-group when dragging project onto group", () => {
      const sourceData = {
        type: "sidebar-project",
        projectId: "project-1",
        index: 0,
      }

      const targetData = {
        type: "sidebar-group-drop-target",
        groupId: "group-1",
      }

      const instruction = extractSidebarInstruction(sourceData, targetData)

      expect(instruction).toEqual({
        type: "move-project-to-group",
        projectId: "project-1",
        fromGroupId: undefined,
        toGroupId: "group-1",
        insertIndex: 0,
      })
    })

    it("handles edge detection for insertion index", () => {
      const sourceData = {
        type: "sidebar-project",
        projectId: "project-1",
        index: 0,
      }

      // Test top edge with instruction symbol
      const instructionSymbolTop = Symbol("tree-item-instruction")
      const targetDataTop = {
        type: "sidebar-project-drop-target",
        index: 2,
        [instructionSymbolTop]: { type: "reorder-above", indentPerLevel: 0, currentLevel: 0 },
      }

      const topInstruction = extractSidebarInstruction(sourceData, targetDataTop)
      expect(topInstruction?.type).toBe("reorder-project")
      if (topInstruction?.type === "reorder-project") {
        expect(topInstruction.toIndex).toBe(1) // Insert before target, accounting for source removal
      }

      // Test bottom edge with instruction symbol
      const instructionSymbolBottom = Symbol("tree-item-instruction")
      const targetDataBottom = {
        type: "sidebar-project-drop-target",
        index: 2,
        [instructionSymbolBottom]: { type: "reorder-below", indentPerLevel: 0, currentLevel: 0 },
      }

      const bottomInstruction = extractSidebarInstruction(sourceData, targetDataBottom)
      expect(bottomInstruction?.type).toBe("reorder-project")
      if (bottomInstruction?.type === "reorder-project") {
        expect(bottomInstruction.toIndex).toBe(2) // Insert after target, accounting for source removal
      }
    })

    it("returns remove-project-from-group when dragging from group to ungrouped", () => {
      const sourceData = {
        type: "sidebar-project",
        projectId: "project-1",
        index: 0,
        groupId: "group-1",
      }

      const instructionSymbol = Symbol("tree-item-instruction")
      const targetData = {
        type: "sidebar-project-drop-target",
        index: 1,
        [instructionSymbol]: { type: "reorder-above", indentPerLevel: 0, currentLevel: 0 },
      }

      const instruction = extractSidebarInstruction(sourceData, targetData)

      expect(instruction).toEqual({
        type: "remove-project-from-group",
        projectId: "project-1",
        fromGroupId: "group-1",
        insertIndex: 1,
      })
    })
  })

  describe("Group dragging scenarios", () => {
    it("returns reorder-group instruction when dragging group", () => {
      const sourceData = {
        type: "sidebar-group",
        groupId: "group-1",
        index: 0,
      }

      const instructionSymbol = Symbol("tree-item-instruction")
      const targetData = {
        type: "sidebar-group-drop-target",
        index: 1,
        [instructionSymbol]: { type: "reorder-above", indentPerLevel: 0, currentLevel: 0 },
      }

      const instruction = extractSidebarInstruction(sourceData, targetData)

      expect(instruction).toEqual({
        type: "reorder-group",
        groupId: "group-1",
        fromIndex: 0,
        toIndex: 0, // top edge after accounting for source removal
      })
    })

    it("calculates correct insertion index based on edge", () => {
      const sourceData = {
        type: "sidebar-group",
        groupId: "group-1",
        index: 0,
      }

      // Test top edge with instruction symbol
      const instructionSymbolTop = Symbol("tree-item-instruction")
      const targetDataTop = {
        type: "sidebar-group-drop-target",
        index: 2,
        [instructionSymbolTop]: { type: "reorder-above", indentPerLevel: 0, currentLevel: 0 },
      }

      const topInstruction = extractSidebarInstruction(sourceData, targetDataTop)
      expect(topInstruction?.type).toBe("reorder-group")
      if (topInstruction?.type === "reorder-group") {
        expect(topInstruction.toIndex).toBe(1) // top edge after accounting for source removal
      }

      // Test bottom edge with instruction symbol
      const instructionSymbolBottom = Symbol("tree-item-instruction")
      const targetDataBottom = {
        type: "sidebar-group-drop-target",
        index: 2,
        [instructionSymbolBottom]: { type: "reorder-below", indentPerLevel: 0, currentLevel: 0 },
      }

      const bottomInstruction = extractSidebarInstruction(sourceData, targetDataBottom)
      expect(bottomInstruction?.type).toBe("reorder-group")
      if (bottomInstruction?.type === "reorder-group") {
        expect(bottomInstruction.toIndex).toBe(2) // bottom edge after accounting for source removal
      }
    })
  })

  describe("Edge cases", () => {
    it("returns null for unsupported drag combinations", () => {
      const sourceData = {
        type: "unknown-type",
      }

      const targetData = {
        type: "sidebar-project-drop-target",
      }

      const instruction = extractSidebarInstruction(sourceData, targetData)
      expect(instruction).toBeNull()
    })

    it("handles missing edge information gracefully", () => {
      const sourceData = {
        type: "sidebar-project",
        projectId: "project-1",
        index: 0,
      }

      const targetData = {
        type: "sidebar-project-drop-target",
        index: 1,
      }

      // When no instruction symbol is present, should default to bottom behavior
      const instruction = extractSidebarInstruction(sourceData, targetData)
      expect(instruction?.type).toBe("reorder-project")
      if (instruction?.type === "reorder-project") {
        expect(instruction.toIndex).toBe(1) // Defaults to after target, accounting for source removal
      }
    })

    it("falls back to instruction symbol when extractClosestEdge returns null", () => {
      // This test prevents regression of the bug where extractClosestEdge returns null
      // but Atlassian's instruction system provides the correct edge information

      const sourceData = {
        type: "sidebar-group",
        groupId: "group-1",
        index: 1,
      }

      // Create instruction symbol (matches what Atlassian's attachInstruction provides)
      const instructionSymbol = Symbol("tree-item-instruction")
      const targetData = {
        type: "sidebar-group-drop-target",
        index: 0,
        [instructionSymbol]: { type: "reorder-above", indentPerLevel: 0, currentLevel: 0 },
      }

      // Simulate extractClosestEdge returning null (the original bug)
      const instruction = extractSidebarInstruction(sourceData, targetData)

      expect(instruction?.type).toBe("reorder-group")
      if (instruction?.type === "reorder-group") {
        expect(instruction.groupId).toBe("group-1")
        expect(instruction.fromIndex).toBe(1)
        expect(instruction.toIndex).toBe(0) // Should correctly extract "top" edge from instruction symbol
      }
    })

    it("falls back to instruction symbol for reorder-below", () => {
      const sourceData = {
        type: "sidebar-project",
        projectId: "project-1",
        index: 0,
      }

      const instructionSymbol = Symbol("tree-item-instruction")
      const targetData = {
        type: "sidebar-project-drop-target",
        index: 1,
        [instructionSymbol]: { type: "reorder-below", indentPerLevel: 0, currentLevel: 0 },
      }

      const instruction = extractSidebarInstruction(sourceData, targetData)

      expect(instruction?.type).toBe("reorder-project")
      if (instruction?.type === "reorder-project") {
        expect(instruction.toIndex).toBe(1) // reorder-below -> bottom -> target + 1, then adjusted for source removal: 2 - 1 = 1
      }
    })
  })
})

describe("useSidebarDragState", () => {
  it("manages drag states for multiple targets", () => {
    const { result } = renderHook(() => useSidebarDragState())

    // Update state for first target
    act(() => {
      result.current.updateDragState("target-1", {
        isDraggingOver: true,
        draggedItemType: "project",
      })
    })

    expect(result.current.getDragState("target-1")).toEqual({
      isDraggingOver: true,
      draggedItemType: "project",
    })

    // Update state for second target
    act(() => {
      result.current.updateDragState("target-2", {
        isDraggingOver: true,
        draggedItemType: "group",
      })
    })

    expect(result.current.getDragState("target-2")).toEqual({
      isDraggingOver: true,
      draggedItemType: "group",
    })

    // Ensure states are independent
    expect(result.current.getDragState("target-1")?.draggedItemType).toBe("project")
    expect(result.current.getDragState("target-2")?.draggedItemType).toBe("group")
  })

  it("clears individual drag states", () => {
    const { result } = renderHook(() => useSidebarDragState())

    // Set state
    act(() => {
      result.current.updateDragState("target-1", {
        isDraggingOver: true,
      })
    })

    expect(result.current.getDragState("target-1")).toBeDefined()

    // Clear state
    act(() => {
      result.current.clearDragState("target-1")
    })

    expect(result.current.getDragState("target-1")).toBeUndefined()
  })

  it("clears all drag states", () => {
    const { result } = renderHook(() => useSidebarDragState())

    // Set multiple states
    act(() => {
      result.current.updateDragState("target-1", { isDraggingOver: true })
      result.current.updateDragState("target-2", { isDraggingOver: true })
      result.current.updateDragState("target-3", { isDraggingOver: true })
    })

    expect(result.current.getDragState("target-1")).toBeDefined()
    expect(result.current.getDragState("target-2")).toBeDefined()
    expect(result.current.getDragState("target-3")).toBeDefined()

    // Clear all states
    act(() => {
      result.current.clearAllDragStates()
    })

    expect(result.current.getDragState("target-1")).toBeUndefined()
    expect(result.current.getDragState("target-2")).toBeUndefined()
    expect(result.current.getDragState("target-3")).toBeUndefined()
  })

  it("merges partial updates correctly", () => {
    const { result } = renderHook(() => useSidebarDragState())

    // Initial state
    act(() => {
      result.current.updateDragState("target-1", {
        isDraggingOver: true,
        draggedItemType: "project",
      })
    })

    // Partial update
    act(() => {
      result.current.updateDragState("target-1", {
        insertionIndex: 2,
      })
    })

    // Should merge with existing state
    expect(result.current.getDragState("target-1")).toEqual({
      isDraggingOver: true,
      draggedItemType: "project",
      insertionIndex: 2,
    })
  })
})
