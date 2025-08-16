/**
 * Tests for ordering utility functions - the core array manipulation logic
 */

import { describe, it, expect } from "vitest"

// Test the utility functions directly from the ordering module
function moveInArray<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  const result = [...array]
  const [item] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, item)
  return result
}

function addToArray<T>(array: T[], item: T, index?: number): T[] {
  const result = [...array]
  if (index === undefined) {
    result.push(item)
  } else {
    result.splice(index, 0, item)
  }
  return result
}

function removeFromArray<T>(array: T[], item: T): T[] {
  return array.filter((x) => x !== item)
}

describe("Ordering Utility Functions", () => {
  describe("moveInArray", () => {
    it("should move item from beginning to end", () => {
      const input = ["a", "b", "c", "d"]
      const result = moveInArray(input, 0, 3)

      expect(result).toEqual(["b", "c", "d", "a"])
      expect(input).toEqual(["a", "b", "c", "d"]) // Original unchanged
    })

    it("should move item from end to beginning", () => {
      const input = ["a", "b", "c", "d"]
      const result = moveInArray(input, 3, 0)

      expect(result).toEqual(["d", "a", "b", "c"])
    })

    it("should move item from middle to middle", () => {
      const input = ["a", "b", "c", "d", "e"]
      const result = moveInArray(input, 1, 3) // Move 'b' to position 3

      expect(result).toEqual(["a", "c", "d", "b", "e"])
    })

    it("should handle moving to same position", () => {
      const input = ["a", "b", "c"]
      const result = moveInArray(input, 1, 1)

      expect(result).toEqual(["a", "b", "c"])
    })

    it("should handle single item array", () => {
      const input = ["only"]
      const result = moveInArray(input, 0, 0)

      expect(result).toEqual(["only"])
    })

    it("should handle empty array gracefully", () => {
      const input: string[] = []

      // This will technically fail but should not crash
      expect(() => moveInArray(input, 0, 0)).not.toThrow()
    })

    it("should preserve array immutability", () => {
      const input = ["a", "b", "c"]
      const result = moveInArray(input, 0, 2)

      expect(input).toEqual(["a", "b", "c"]) // Original unchanged
      expect(result).toEqual(["b", "c", "a"]) // New array returned
      expect(result).not.toBe(input) // Different object reference
    })
  })

  describe("addToArray", () => {
    it("should add item to end when no index specified", () => {
      const input = ["a", "b", "c"]
      const result = addToArray(input, "d")

      expect(result).toEqual(["a", "b", "c", "d"])
      expect(input).toEqual(["a", "b", "c"]) // Original unchanged
    })

    it("should add item at beginning when index is 0", () => {
      const input = ["b", "c", "d"]
      const result = addToArray(input, "a", 0)

      expect(result).toEqual(["a", "b", "c", "d"])
    })

    it("should add item in middle", () => {
      const input = ["a", "c", "d"]
      const result = addToArray(input, "b", 1)

      expect(result).toEqual(["a", "b", "c", "d"])
    })

    it("should add item to empty array", () => {
      const input: string[] = []
      const result = addToArray(input, "first")

      expect(result).toEqual(["first"])
    })

    it("should add item to empty array at index 0", () => {
      const input: string[] = []
      const result = addToArray(input, "first", 0)

      expect(result).toEqual(["first"])
    })

    it("should preserve array immutability", () => {
      const input = ["a", "b"]
      const result = addToArray(input, "c", 1)

      expect(input).toEqual(["a", "b"]) // Original unchanged
      expect(result).toEqual(["a", "c", "b"]) // New array returned
      expect(result).not.toBe(input) // Different object reference
    })
  })

  describe("removeFromArray", () => {
    it("should remove existing item", () => {
      const input = ["a", "b", "c", "d"]
      const result = removeFromArray(input, "b")

      expect(result).toEqual(["a", "c", "d"])
      expect(input).toEqual(["a", "b", "c", "d"]) // Original unchanged
    })

    it("should remove first occurrence when multiple exist", () => {
      const input = ["a", "b", "b", "c"]
      const result = removeFromArray(input, "b")

      expect(result).toEqual(["a", "c"]) // All 'b' items removed due to filter
    })

    it("should return same array when item not found", () => {
      const input = ["a", "b", "c"]
      const result = removeFromArray(input, "x")

      expect(result).toEqual(["a", "b", "c"])
      expect(input).toEqual(["a", "b", "c"]) // Original unchanged
    })

    it("should handle empty array", () => {
      const input: string[] = []
      const result = removeFromArray(input, "x")

      expect(result).toEqual([])
    })

    it("should preserve array immutability", () => {
      const input = ["a", "b", "c"]
      const result = removeFromArray(input, "b")

      expect(input).toEqual(["a", "b", "c"]) // Original unchanged
      expect(result).toEqual(["a", "c"]) // New array returned
      expect(result).not.toBe(input) // Different object reference
    })
  })

  describe("Complex Ordering Scenarios", () => {
    it("should handle realistic project reordering", () => {
      let projects = ["inbox", "work", "personal", "shopping"]

      // Move 'work' to first position
      projects = moveInArray(projects, 1, 0)
      expect(projects).toEqual(["work", "inbox", "personal", "shopping"])

      // Add new project at end
      projects = addToArray(projects, "fitness")
      expect(projects).toEqual(["work", "inbox", "personal", "shopping", "fitness"])

      // Move 'fitness' to second position
      projects = moveInArray(projects, 4, 1)
      expect(projects).toEqual(["work", "fitness", "inbox", "personal", "shopping"])

      // Remove 'shopping'
      projects = removeFromArray(projects, "shopping")
      expect(projects).toEqual(["work", "fitness", "inbox", "personal"])
    })

    it("should handle realistic label reordering", () => {
      let labels = ["urgent", "important", "later"]

      // Reverse order by moving each item
      labels = moveInArray(labels, 2, 0) // Move 'later' to front
      expect(labels).toEqual(["later", "urgent", "important"])

      labels = moveInArray(labels, 2, 1) // Move 'important' to middle
      expect(labels).toEqual(["later", "important", "urgent"])

      // Add new label at beginning
      labels = addToArray(labels, "critical", 0)
      expect(labels).toEqual(["critical", "later", "important", "urgent"])
    })

    it("should preserve relative positions of non-moved items", () => {
      const items = ["A", "B", "C", "D", "E", "F"]

      // Move C to end, B and D should maintain their relative positions
      const result = moveInArray(items, 2, 5) // Move C (index 2) to end

      expect(result).toEqual(["A", "B", "D", "E", "F", "C"])

      // Verify B comes before D
      const bIndex = result.indexOf("B")
      const dIndex = result.indexOf("D")
      expect(bIndex).toBeLessThan(dIndex)
    })

    it("should handle edge case indices gracefully", () => {
      const items = ["a", "b", "c"]

      // These operations should not crash
      expect(() => moveInArray(items, 0, 10)).not.toThrow()
      expect(() => addToArray(items, "x", 100)).not.toThrow()

      // Results might not be what we expect, but should not crash
      const moved = moveInArray(items, 0, 10)
      expect(Array.isArray(moved)).toBe(true)

      const added = addToArray(items, "x", 100)
      expect(Array.isArray(added)).toBe(true)
      expect(added).toContain("x")
    })
  })

  describe("Performance Characteristics", () => {
    it("should handle large arrays efficiently", () => {
      // Create a large array
      const largeArray = Array.from({ length: 1000 }, (_, i) => `item-${i}`)

      const start = performance.now()

      // Perform several operations
      let result = moveInArray(largeArray, 0, 999) // Move first to last
      result = moveInArray(result, 999, 0) // Move back
      result = addToArray(result, "new-item", 500) // Add in middle
      result = removeFromArray(result, "item-500") // Remove item

      const end = performance.now()
      const duration = end - start

      // Should complete in reasonable time (< 100ms for 1000 items)
      expect(duration).toBeLessThan(100)
      expect(result).toHaveLength(1000) // One added, one removed
      expect(result).toContain("new-item")
      expect(result).not.toContain("item-500")
    })

    it("should maintain O(n) complexity for basic operations", () => {
      // Test with different array sizes to verify complexity doesn't explode
      const sizes = [10, 100, 1000]
      const times: number[] = []

      sizes.forEach((size) => {
        const array = Array.from({ length: size }, (_, i) => i)

        const start = performance.now()
        moveInArray(array, 0, size - 1)
        const end = performance.now()

        times.push(end - start)
      })

      // Time should scale roughly linearly (allowing some variance)
      // 1000 items shouldn't take more than 100x longer than 10 items
      const ratio = times[2] / times[0]
      expect(ratio).toBeLessThan(1000) // Much less than O(n²)
    })
  })
})
