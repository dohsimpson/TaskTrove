import { describe, it, expect, vi } from "vitest"
import { convertToRRule, parseEnhancedNaturalLanguage } from "./enhanced-natural-language-parser"

describe("convertToRRule function", () => {
  describe("Basic patterns", () => {
    it("should convert daily", () => {
      expect(convertToRRule("daily")).toBe("RRULE:FREQ=DAILY")
    })

    it("should convert weekly", () => {
      expect(convertToRRule("weekly")).toBe("RRULE:FREQ=WEEKLY")
    })

    it("should convert monthly", () => {
      expect(convertToRRule("monthly")).toBe("RRULE:FREQ=MONTHLY")
    })

    it("should convert yearly", () => {
      expect(convertToRRule("yearly")).toBe("RRULE:FREQ=YEARLY")
    })

    it("should convert quarterly", () => {
      expect(convertToRRule("quarterly")).toBe("RRULE:FREQ=MONTHLY;INTERVAL=3")
    })

    it("should convert biweekly", () => {
      expect(convertToRRule("biweekly")).toBe("RRULE:FREQ=WEEKLY;INTERVAL=2")
    })
  })

  describe("Weekday patterns", () => {
    it("should convert every-workday", () => {
      expect(convertToRRule("every-workday")).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR")
    })

    it("should convert every-weekday", () => {
      expect(convertToRRule("every-weekday")).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR")
    })

    it("should convert every-weekend", () => {
      expect(convertToRRule("every-weekend")).toBe("RRULE:FREQ=WEEKLY;BYDAY=SA,SU")
    })

    it("should convert specific weekdays", () => {
      expect(convertToRRule("every-monday")).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO")
      expect(convertToRRule("every-tuesday")).toBe("RRULE:FREQ=WEEKLY;BYDAY=TU")
      expect(convertToRRule("every-wednesday")).toBe("RRULE:FREQ=WEEKLY;BYDAY=WE")
      expect(convertToRRule("every-thursday")).toBe("RRULE:FREQ=WEEKLY;BYDAY=TH")
      expect(convertToRRule("every-friday")).toBe("RRULE:FREQ=WEEKLY;BYDAY=FR")
      expect(convertToRRule("every-saturday")).toBe("RRULE:FREQ=WEEKLY;BYDAY=SA")
      expect(convertToRRule("every-sunday")).toBe("RRULE:FREQ=WEEKLY;BYDAY=SU")
    })
  })

  describe("Interval patterns", () => {
    it("should convert every-other-day", () => {
      expect(convertToRRule("every-other-day")).toBe("RRULE:FREQ=DAILY;INTERVAL=2")
    })

    it("should convert every-other-week", () => {
      expect(convertToRRule("every-other-week")).toBe("RRULE:FREQ=WEEKLY;INTERVAL=2")
    })
  })

  describe("Dynamic patterns", () => {
    it("should convert every-N-days patterns", () => {
      expect(convertToRRule("every-3-days")).toBe("RRULE:FREQ=DAILY;INTERVAL=3")
      expect(convertToRRule("every-5-days")).toBe("RRULE:FREQ=DAILY;INTERVAL=5")
      expect(convertToRRule("every-1-day")).toBe("RRULE:FREQ=DAILY") // INTERVAL=1 is omitted
    })

    it("should convert every-N-weeks patterns", () => {
      expect(convertToRRule("every-2-weeks")).toBe("RRULE:FREQ=WEEKLY;INTERVAL=2")
      expect(convertToRRule("every-4-weeks")).toBe("RRULE:FREQ=WEEKLY;INTERVAL=4")
      expect(convertToRRule("every-1-week")).toBe("RRULE:FREQ=WEEKLY") // INTERVAL=1 is omitted
    })

    it("should convert every-N-months patterns", () => {
      expect(convertToRRule("every-2-months")).toBe("RRULE:FREQ=MONTHLY;INTERVAL=2")
      expect(convertToRRule("every-6-months")).toBe("RRULE:FREQ=MONTHLY;INTERVAL=6")
      expect(convertToRRule("every-1-month")).toBe("RRULE:FREQ=MONTHLY") // INTERVAL=1 is omitted
    })
  })

  describe("Edge cases", () => {
    it("should return RRULE patterns unchanged", () => {
      const rrule = "RRULE:FREQ=DAILY;COUNT=5"
      expect(convertToRRule(rrule)).toBe(rrule)
    })

    it("should handle unknown patterns with fallback", () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      expect(convertToRRule("unknown-pattern")).toBe("RRULE:FREQ=DAILY")
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Unknown recurring pattern: unknown-pattern, defaulting to daily",
      )
      consoleWarnSpy.mockRestore()
    })
  })
})

describe("Enhanced Natural Language Parser with RRULE conversion", () => {
  describe("Basic recurring patterns", () => {
    it("should convert daily to RRULE", () => {
      const result = parseEnhancedNaturalLanguage("task daily")
      expect(result.recurring).toBe("RRULE:FREQ=DAILY")
      expect(result.title).toBe("task")
      expect(result.dueDate).toBeUndefined() // No due date when recurring
    })

    it("should convert weekly to RRULE", () => {
      const result = parseEnhancedNaturalLanguage("task weekly")
      expect(result.recurring).toBe("RRULE:FREQ=WEEKLY")
      expect(result.title).toBe("task")
    })

    it("should convert every day to RRULE", () => {
      const result = parseEnhancedNaturalLanguage("task every day")
      expect(result.recurring).toBe("RRULE:FREQ=DAILY")
      expect(result.title).toBe("task")
    })

    it("should convert every monday to RRULE", () => {
      const result = parseEnhancedNaturalLanguage("task every monday")
      expect(result.recurring).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO")
      expect(result.title).toBe("task")
    })

    it("should convert every workday to RRULE", () => {
      const result = parseEnhancedNaturalLanguage("standup every workday")
      expect(result.recurring).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR")
      expect(result.title).toBe("standup")
    })
  })

  describe("Dynamic recurring patterns", () => {
    it("should convert every 3 days to RRULE", () => {
      const result = parseEnhancedNaturalLanguage("task every 3 days")
      expect(result.recurring).toBe("RRULE:FREQ=DAILY;INTERVAL=3")
      expect(result.title).toBe("task")
    })

    it("should convert every 2 weeks to RRULE", () => {
      const result = parseEnhancedNaturalLanguage("task every 2 weeks")
      expect(result.recurring).toBe("RRULE:FREQ=WEEKLY;INTERVAL=2")
      expect(result.title).toBe("task")
    })

    it("should convert every 6 months to RRULE", () => {
      const result = parseEnhancedNaturalLanguage("task every 6 months")
      expect(result.recurring).toBe("RRULE:FREQ=MONTHLY;INTERVAL=6")
      expect(result.title).toBe("task")
    })
  })

  describe("Complex scenarios with RRULE conversion", () => {
    it("should convert recurring pattern in complex sentence", () => {
      const result = parseEnhancedNaturalLanguage(
        "important meeting #work @urgent p1 every monday 9AM",
      )

      expect(result.title).toBe("important meeting")
      expect(result.project).toBe("work")
      expect(result.labels).toEqual(["urgent"])
      expect(result.priority).toBe(1)
      expect(result.time).toBe("9AM")
      expect(result.recurring).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO")
      expect(result.dueDate).toBeUndefined() // No due date when recurring
    })

    it("should take last recurring pattern and convert to RRULE", () => {
      const result = parseEnhancedNaturalLanguage("task daily weekly every friday")
      expect(result.recurring).toBe("RRULE:FREQ=WEEKLY;BYDAY=FR")
      expect(result.title).toBe("task")
    })

    it("should handle disabled recurring sections", () => {
      const disabledSections = new Set(["weekly"]) // This disables the "weekly" part of the captured pattern
      const result = parseEnhancedNaturalLanguage("task daily weekly monthly", disabledSections)
      expect(result.recurring).toBe("RRULE:FREQ=MONTHLY")
      expect(result.title).toBe("task weekly") // "weekly" stays in title since it's disabled, not parsed as recurring
    })
  })

  describe("Integration with existing functionality", () => {
    it("should work with all other parsing features", () => {
      const result = parseEnhancedNaturalLanguage(
        "urgent task #personal @urgent @work p1 every workday at 9AM for 1h",
      )

      expect(result.title).toBe("urgent task for")
      expect(result.project).toBe("personal")
      expect(result.labels).toEqual(["urgent", "work"])
      expect(result.priority).toBe(1)
      expect(result.time).toBe("9AM")
      expect(result.duration).toBe("1h")
      expect(result.recurring).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR")
      expect(result.dueDate).toBeUndefined() // No due date when recurring
    })

    it("should preserve existing behavior for non-recurring tasks", () => {
      const result = parseEnhancedNaturalLanguage("task #work @urgent p1 tomorrow 2PM")

      expect(result.title).toBe("task")
      expect(result.project).toBe("work")
      expect(result.labels).toEqual(["urgent"])
      expect(result.priority).toBe(1)
      expect(result.time).toBe("2PM")
      expect(result.recurring).toBeUndefined()
      expect(result.dueDate).toBeDefined() // Due date when no recurring
    })
  })
})
