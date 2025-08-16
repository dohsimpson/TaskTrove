import { describe, expect, it } from "vitest"
import {
  getPriorityColor,
  getPriorityTextColor,
  getPriorityLabel,
  getDueDateTextColor,
} from "./color-utils"

describe("color-utils", () => {
  describe("getPriorityColor", () => {
    it("should return correct border colors for default variant", () => {
      expect(getPriorityColor(1, "default")).toBe("border-l-red-500")
      expect(getPriorityColor(2, "default")).toBe("border-l-orange-500")
      expect(getPriorityColor(3, "default")).toBe("border-l-blue-500")
      expect(getPriorityColor(4, "default")).toBe("border-l-muted-foreground")
    })

    it("should return correct border colors for compact variant", () => {
      expect(getPriorityColor(1, "compact")).toBe("border-l-red-500")
      expect(getPriorityColor(2, "compact")).toBe("border-l-orange-500")
      expect(getPriorityColor(3, "compact")).toBe("border-l-blue-500")
      expect(getPriorityColor(4, "compact")).toBe("border-l-muted-foreground")
    })

    it("should return correct border colors for kanban variant", () => {
      expect(getPriorityColor(1, "kanban")).toBe("border-l-red-500")
      expect(getPriorityColor(2, "kanban")).toBe("border-l-orange-500")
      expect(getPriorityColor(3, "kanban")).toBe("border-l-blue-500")
      expect(getPriorityColor(4, "kanban")).toBe("border-l-muted-foreground")
    })

    it("should return text colors when no variant specified (backward compatibility)", () => {
      expect(getPriorityColor(1)).toBe("text-red-500")
      expect(getPriorityColor(2)).toBe("text-orange-500")
      expect(getPriorityColor(3)).toBe("text-blue-500")
      expect(getPriorityColor(4)).toBe("text-muted-foreground")
    })

    it("should handle edge cases", () => {
      expect(getPriorityColor(0)).toBe("text-muted-foreground")
      expect(getPriorityColor(5)).toBe("text-muted-foreground")
      expect(getPriorityColor(-1)).toBe("text-muted-foreground")

      // Edge cases with variants
      expect(getPriorityColor(0, "compact")).toBe("border-l-muted-foreground")
      expect(getPriorityColor(5, "kanban")).toBe("border-l-muted-foreground")
      expect(getPriorityColor(-1, "default")).toBe("border-l-muted-foreground")
    })
  })

  describe("getPriorityTextColor", () => {
    it("should return correct text colors for all priorities", () => {
      expect(getPriorityTextColor(1)).toBe("text-red-500")
      expect(getPriorityTextColor(2)).toBe("text-orange-500")
      expect(getPriorityTextColor(3)).toBe("text-blue-500")
      expect(getPriorityTextColor(4)).toBe("text-muted-foreground")
    })

    it("should handle edge cases", () => {
      expect(getPriorityTextColor(0)).toBe("text-muted-foreground")
      expect(getPriorityTextColor(5)).toBe("text-muted-foreground")
      expect(getPriorityTextColor(-1)).toBe("text-muted-foreground")
    })
  })

  describe("getPriorityLabel", () => {
    it("should return correct labels for all priorities", () => {
      expect(getPriorityLabel(1)).toBe("Priority 1")
      expect(getPriorityLabel(2)).toBe("Priority 2")
      expect(getPriorityLabel(3)).toBe("Priority 3")
      expect(getPriorityLabel(4)).toBe("No priority")
    })

    it("should handle edge cases", () => {
      expect(getPriorityLabel(0)).toBe("Priority 0")
      expect(getPriorityLabel(5)).toBe("Priority 5")
      expect(getPriorityLabel(-1)).toBe("Priority -1")
    })
  })

  describe("getDueDateTextColor", () => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const futureDate = new Date(today)
    futureDate.setDate(today.getDate() + 7)

    it("should return correct colors for default variant", () => {
      expect(getDueDateTextColor(today, false)).toBe("text-orange-600 dark:text-orange-400")
      expect(getDueDateTextColor(tomorrow, false)).toBe("text-muted-foreground")
      expect(getDueDateTextColor(futureDate, false)).toBe("text-muted-foreground")
    })

    it("should return correct colors for compact variant", () => {
      expect(getDueDateTextColor(today, false, "compact")).toBe(
        "text-orange-600 dark:text-orange-400",
      )
      expect(getDueDateTextColor(tomorrow, false, "compact")).toBe(
        "text-blue-600 dark:text-blue-400",
      )
      expect(getDueDateTextColor(yesterday, false, "compact")).toBe(
        "text-red-600 dark:text-red-400",
      )
      expect(getDueDateTextColor(futureDate, false, "compact")).toBe("text-muted-foreground")
    })

    it("should handle past dates correctly", () => {
      // For both variants, past dates (except today) should be red (overdue)
      expect(getDueDateTextColor(yesterday, false)).toBe("text-red-600 dark:text-red-400")
      expect(getDueDateTextColor(yesterday, false, "compact")).toBe(
        "text-red-600 dark:text-red-400",
      )
    })

    it("should handle today correctly in both variants", () => {
      // Today should be orange in both variants
      expect(getDueDateTextColor(today, false)).toBe("text-orange-600 dark:text-orange-400")
      expect(getDueDateTextColor(today, false, "compact")).toBe(
        "text-orange-600 dark:text-orange-400",
      )
    })

    it("should return muted color for completed tasks regardless of due date", () => {
      // Completed tasks should always show muted color, even if overdue
      expect(getDueDateTextColor(yesterday, true)).toBe("text-muted-foreground")
      expect(getDueDateTextColor(today, true)).toBe("text-muted-foreground")
      expect(getDueDateTextColor(tomorrow, true)).toBe("text-muted-foreground")
      expect(getDueDateTextColor(futureDate, true)).toBe("text-muted-foreground")

      // Same for compact variant
      expect(getDueDateTextColor(yesterday, true, "compact")).toBe("text-muted-foreground")
      expect(getDueDateTextColor(today, true, "compact")).toBe("text-muted-foreground")
      expect(getDueDateTextColor(tomorrow, true, "compact")).toBe("text-muted-foreground")
      expect(getDueDateTextColor(futureDate, true, "compact")).toBe("text-muted-foreground")
    })
  })
})
