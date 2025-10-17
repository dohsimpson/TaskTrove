/**
 * Unit tests for label drag-and-drop pure functions.
 * These tests are simple because the functions are pure - no mocking needed!
 */

import { describe, it, expect } from "vitest"
import { createLabelId } from "@/lib/types"
import type { Label } from "@/lib/types"
import type { Instruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item"
import {
  findContainingLabel,
  resolveLabelTargetLocation,
  calculateLabelMove,
  validateLabelDrop,
} from "./label-drag-drop-logic"

// Helper to create minimal tree-item Instruction objects for tests
// Labels use tree-item mode (like projects), not list-item mode
function createInstruction(type: "reorder-above" | "reorder-below"): Instruction {
  return {
    type,
    currentLevel: 0,
    indentPerLevel: 0,
  }
}

// =============================================================================
// TEST DATA
// =============================================================================

const LABEL_1 = createLabelId("11111111-1111-4111-8111-111111111111")
const LABEL_2 = createLabelId("22222222-2222-4222-8222-222222222222")
const LABEL_3 = createLabelId("33333333-3333-4333-8333-333333333333")
const LABEL_4 = createLabelId("44444444-4444-4444-8444-444444444444")

/**
 * Test labels array
 */
const TEST_LABELS: Label[] = [
  {
    id: LABEL_1,
    name: "Work",
    color: "#ff0000",
    slug: "work",
  },
  {
    id: LABEL_2,
    name: "Personal",
    color: "#00ff00",
    slug: "personal",
  },
  {
    id: LABEL_3,
    name: "Urgent",
    color: "#0000ff",
    slug: "urgent",
  },
]

// =============================================================================
// TESTS: findContainingLabel
// =============================================================================

describe("findContainingLabel", () => {
  it("finds label at correct index", () => {
    const result = findContainingLabel(LABEL_2, TEST_LABELS)

    expect(result).toBe(1)
  })

  it("finds first label", () => {
    const result = findContainingLabel(LABEL_1, TEST_LABELS)

    expect(result).toBe(0)
  })

  it("finds last label", () => {
    const result = findContainingLabel(LABEL_3, TEST_LABELS)

    expect(result).toBe(2)
  })

  it("returns null for non-existent label", () => {
    const nonExistentId = createLabelId("99999999-9999-4999-8999-999999999999")
    const result = findContainingLabel(nonExistentId, TEST_LABELS)

    expect(result).toBeNull()
  })

  it("returns null for empty labels array", () => {
    const result = findContainingLabel(LABEL_1, [])

    expect(result).toBeNull()
  })
})

// =============================================================================
// TESTS: resolveLabelTargetLocation
// =============================================================================

describe("resolveLabelTargetLocation", () => {
  describe("sidebar-label-drop-target", () => {
    it("resolves target for reorder-above", () => {
      const targetData = {
        type: "sidebar-label-drop-target",
        index: 1,
        labelId: LABEL_2,
      }
      const instruction = createInstruction("reorder-above")

      const result = resolveLabelTargetLocation(targetData, instruction, TEST_LABELS)

      expect(result).toBe(1) // reorder-above = targetIndex
    })

    it("resolves target for reorder-below", () => {
      const targetData = {
        type: "sidebar-label-drop-target",
        index: 1,
        labelId: LABEL_2,
      }
      const instruction = createInstruction("reorder-below")

      const result = resolveLabelTargetLocation(targetData, instruction, TEST_LABELS)

      expect(result).toBe(2) // reorder-below = targetIndex + 1
    })

    it("resolves target for reorder-below last item", () => {
      const targetData = {
        type: "sidebar-label-drop-target",
        index: 2, // Last item index
        labelId: LABEL_3,
      }
      const instruction = createInstruction("reorder-below")

      const result = resolveLabelTargetLocation(targetData, instruction, TEST_LABELS)

      expect(result).toBe(3) // After last item
    })

    it("returns null for invalid target index", () => {
      const targetData = {
        type: "sidebar-label-drop-target",
        index: 10, // Out of bounds
        labelId: LABEL_2,
      }
      const instruction = createInstruction("reorder-above")

      const result = resolveLabelTargetLocation(targetData, instruction, TEST_LABELS)

      expect(result).toBeNull()
    })
  })

  describe("sidebar-labels-root-drop-target", () => {
    it("resolves to end of array", () => {
      const targetData = {
        type: "sidebar-labels-root-drop-target",
      }
      const instruction = createInstruction("reorder-above") // Doesn't matter

      const result = resolveLabelTargetLocation(targetData, instruction, TEST_LABELS)

      expect(result).toBe(3) // Length of array
    })

    it("resolves to end of empty array", () => {
      const targetData = {
        type: "sidebar-labels-root-drop-target",
      }
      const instruction = createInstruction("reorder-above")

      const result = resolveLabelTargetLocation(targetData, instruction, [])

      expect(result).toBe(0) // Empty array
    })
  })

  describe("invalid target types", () => {
    it("returns null for unknown target type", () => {
      const targetData = {
        type: "unknown-target-type",
      }
      const instruction = createInstruction("reorder-above")

      const result = resolveLabelTargetLocation(targetData, instruction, TEST_LABELS)

      expect(result).toBeNull()
    })
  })
})

// =============================================================================
// TESTS: calculateLabelMove
// =============================================================================

describe("calculateLabelMove", () => {
  describe("same array reordering", () => {
    it("reorders label forward", () => {
      // Moving LABEL_1 (at index 0) to after LABEL_2 (insert at index 2)
      const result = calculateLabelMove(LABEL_1, 0, 2, TEST_LABELS)

      expect(result.newLabels).toHaveLength(3)
      expect(result.newLabels[0]?.id).toBe(LABEL_2)
      expect(result.newLabels[1]?.id).toBe(LABEL_3)
      expect(result.newLabels[2]?.id).toBe(LABEL_1)
    })

    it("reorders label backward", () => {
      // Moving LABEL_3 (at index 2) to before LABEL_1 (insert at index 0)
      const result = calculateLabelMove(LABEL_3, 2, 0, TEST_LABELS)

      expect(result.newLabels).toHaveLength(3)
      expect(result.newLabels[0]?.id).toBe(LABEL_3)
      expect(result.newLabels[1]?.id).toBe(LABEL_1)
      expect(result.newLabels[2]?.id).toBe(LABEL_2)
    })

    it("handles moving to same position (no-op)", () => {
      const result = calculateLabelMove(LABEL_2, 1, 1, TEST_LABELS)

      expect(result.newLabels).toEqual(TEST_LABELS)
    })

    it("handles moving one position forward", () => {
      const result = calculateLabelMove(LABEL_1, 0, 1, TEST_LABELS)

      expect(result.newLabels).toHaveLength(3)
      expect(result.newLabels[0]?.id).toBe(LABEL_2)
      expect(result.newLabels[1]?.id).toBe(LABEL_1)
      expect(result.newLabels[2]?.id).toBe(LABEL_3)
    })

    it("handles moving one position backward", () => {
      const result = calculateLabelMove(LABEL_2, 1, 0, TEST_LABELS)

      expect(result.newLabels).toHaveLength(3)
      expect(result.newLabels[0]?.id).toBe(LABEL_2)
      expect(result.newLabels[1]?.id).toBe(LABEL_1)
      expect(result.newLabels[2]?.id).toBe(LABEL_3)
    })
  })

  describe("error handling", () => {
    it("throws error for invalid source index", () => {
      expect(() => {
        calculateLabelMove(LABEL_1, -1, 1, TEST_LABELS)
      }).toThrow("Invalid source index")

      expect(() => {
        calculateLabelMove(LABEL_1, 10, 1, TEST_LABELS)
      }).toThrow("Invalid source index")
    })

    it("throws error for invalid target index", () => {
      expect(() => {
        calculateLabelMove(LABEL_1, 0, -1, TEST_LABELS)
      }).toThrow("Invalid target index")

      expect(() => {
        calculateLabelMove(LABEL_1, 0, 10, TEST_LABELS)
      }).toThrow("Invalid target index")
    })

    it("throws error for mismatched label ID", () => {
      expect(() => {
        calculateLabelMove(LABEL_4, 0, 2, TEST_LABELS) // LABEL_4 not in array
      }).toThrow("not found at source index")
    })
  })

  describe("edge cases", () => {
    it("handles single item array", () => {
      const singleLabelArray: Label[] = [
        {
          id: LABEL_1,
          name: "Work",
          color: "#ff0000",
          slug: "work",
        },
      ]
      const result = calculateLabelMove(LABEL_1, 0, 0, singleLabelArray)

      expect(result.newLabels).toEqual(singleLabelArray)
    })

    it("handles moving to end of array", () => {
      // To move to the end, we use index length-1 (last position)
      const result = calculateLabelMove(LABEL_1, 0, 2, TEST_LABELS)

      expect(result.newLabels).toHaveLength(3)
      expect(result.newLabels[0]?.id).toBe(LABEL_2) // Original index 1 moves to 0
      expect(result.newLabels[1]?.id).toBe(LABEL_3) // Original index 2 moves to 1
      expect(result.newLabels[2]?.id).toBe(LABEL_1) // Original index 0 moves to 2
    })
  })
})

// =============================================================================
// TESTS: validateLabelDrop
// =============================================================================

describe("validateLabelDrop", () => {
  it("allows valid label-to-label drop", () => {
    const sourceData = { type: "sidebar-label", labelId: LABEL_1 }
    const targetData = { type: "sidebar-label-drop-target", labelId: LABEL_2 }

    const result = validateLabelDrop(sourceData, targetData)

    expect(result).toBeNull()
  })

  it("allows valid label-to-root drop", () => {
    const sourceData = { type: "sidebar-label", labelId: LABEL_1 }
    const targetData = { type: "sidebar-labels-root-drop-target" }

    const result = validateLabelDrop(sourceData, targetData)

    expect(result).toBeNull()
  })

  it("prevents non-label source", () => {
    const sourceData = { type: "sidebar-project", projectId: "project-1" }
    const targetData = { type: "sidebar-label-drop-target", labelId: LABEL_2 }

    const result = validateLabelDrop(sourceData, targetData)

    expect(result).toContain("Only labels can be dragged")
  })

  it("prevents invalid target type", () => {
    const sourceData = { type: "sidebar-label", labelId: LABEL_1 }
    const targetData = { type: "invalid-target-type" }

    const result = validateLabelDrop(sourceData, targetData)

    expect(result).toContain("Labels can only be dropped")
  })

  it("prevents dropping label on itself", () => {
    const sourceData = { type: "sidebar-label", labelId: LABEL_1 }
    const targetData = { type: "sidebar-label-drop-target", labelId: LABEL_1 }

    const result = validateLabelDrop(sourceData, targetData)

    expect(result).toContain("Cannot drop a label on itself")
  })

  it("prevents label on different label", () => {
    const sourceData = { type: "sidebar-label", labelId: LABEL_1 }
    const targetData = { type: "sidebar-label-drop-target", labelId: LABEL_2 }

    const result = validateLabelDrop(sourceData, targetData)

    expect(result).toBeNull() // This is allowed
  })
})
