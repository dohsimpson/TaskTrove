import { describe, it, expect } from "vitest"
import {
  generateDateSuggestions,
  generatePrioritySuggestions,
  generateTimeSuggestions,
  generateRecurringSuggestions,
  generateDurationSuggestions,
  generateHighlightingPatterns,
  matchesParserPattern,
} from "./shared-patterns"

describe("Shared Patterns", () => {
  describe("generateDateSuggestions", () => {
    it("should generate basic date suggestions from parser patterns", () => {
      const suggestions = generateDateSuggestions()

      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.every((s) => s.type === "date")).toBe(true)
      expect(suggestions.some((s) => s.display === "Today")).toBe(true)
      expect(suggestions.some((s) => s.display === "Tomorrow")).toBe(true)
    })

    it("should include proper descriptions", () => {
      const suggestions = generateDateSuggestions()

      suggestions.forEach((suggestion) => {
        expect(suggestion.description).toContain("Due")
        expect(suggestion.value).toBe(suggestion.display.toLowerCase())
      })
    })
  })

  describe("generatePrioritySuggestions", () => {
    it("should generate priority suggestions from parser patterns", () => {
      const suggestions = generatePrioritySuggestions()

      expect(suggestions.length).toBe(7) // P1, P2, P3, P4, !, !!, !!!
      expect(suggestions.every((s) => s.type === "priority")).toBe(true)
      expect(suggestions.some((s) => s.display === "P1")).toBe(true)
      expect(suggestions.some((s) => s.display === "P4")).toBe(true)
      expect(suggestions.some((s) => s.display === "!")).toBe(true)
      expect(suggestions.some((s) => s.display === "!!!")).toBe(true)
    })
  })

  describe("generateHighlightingPatterns", () => {
    it("should generate highlighting patterns from parser patterns", () => {
      const patterns = generateHighlightingPatterns()

      expect(patterns.length).toBeGreaterThan(0)

      // Should have basic patterns
      expect(patterns.some((p) => p.type === "project")).toBe(true)
      expect(patterns.some((p) => p.type === "label")).toBe(true)
      expect(patterns.some((p) => p.type === "priority")).toBe(true)
      expect(patterns.some((p) => p.type === "date")).toBe(true)
      expect(patterns.some((p) => p.type === "time")).toBe(true)
    })

    it("should use safe word boundaries in patterns", () => {
      const patterns = generateHighlightingPatterns()
      const priorityPattern = patterns.find((p) => p.type === "priority")

      expect(priorityPattern?.regex.source).toContain("(?:^|\\s)")
      expect(priorityPattern?.regex.source).toContain("(?=\\s|$)")
    })
  })

  describe("matchesParserPattern", () => {
    it("should correctly identify date patterns", () => {
      expect(matchesParserPattern("today", "date")).toBe(true)
      expect(matchesParserPattern("tomorrow", "date")).toBe(true)
      expect(matchesParserPattern("next week", "date")).toBe(true)
      expect(matchesParserPattern("random text", "date")).toBe(false)
    })

    it("should correctly highlight 'tod' shorthand as date pattern", () => {
      const patterns = generateHighlightingPatterns()
      const datePattern = patterns.find((p) => p.type === "date")

      const testText = "task tod"
      const matches = testText.match(datePattern?.regex || /./)
      expect(matches).toBeTruthy()

      const matchedWord = matches?.[0]?.trim() || ""
      expect(matchedWord).toBe("tod")
    })

    it("should correctly highlight 'tmr' shorthand as date pattern", () => {
      const patterns = generateHighlightingPatterns()
      const datePattern = patterns.find((p) => p.type === "date")

      const testText = "task tmr"
      const matches = testText.match(datePattern?.regex || /./)
      expect(matches).toBeTruthy()

      const matchedWord = matches?.[0]?.trim() || ""
      expect(matchedWord).toBe("tmr")
    })

    it("should correctly identify shorthand weekday patterns for highlighting", () => {
      const patterns = generateHighlightingPatterns()
      const datePattern = patterns.find((p) => p.type === "date")

      // Test that shorthand weekdays are properly highlighted
      const shorthands = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
      shorthands.forEach((shorthand) => {
        const testText = `task ${shorthand}`
        const matches = testText.match(datePattern?.regex || /./)
        expect(matches).toBeTruthy()
        // Extract the matched word from the full match (removing spaces)
        const matchedWord = matches?.[0]?.trim() || ""
        expect(matchedWord).toBe(shorthand)
      })
    })

    it("should prioritize longer patterns over shorter ones in highlighting", () => {
      const patterns = generateHighlightingPatterns()
      const datePattern = patterns.find((p) => p.type === "date")

      // Test that "this saturday" is highlighted as the full phrase, not just "sat"
      const testText1 = "task this saturday"
      const matches1 = testText1.match(datePattern?.regex || /./)
      expect(matches1).toBeTruthy()
      const matchedWord1 = matches1?.[0]?.trim() || ""
      expect(matchedWord1).toBe("this saturday") // Should match full phrase, not just "sat"

      // Test "this sat" - this should now work correctly
      const testText2 = "task this sat"
      const matches2 = testText2.match(datePattern?.regex || /./)
      expect(matches2).toBeTruthy()
      const matchedWord2 = matches2?.[0]?.trim() || ""
      expect(matchedWord2).toBe("this sat") // Should now match the full phrase
    })

    it("should correctly highlight all 'this [shorthand]' weekday patterns", () => {
      const patterns = generateHighlightingPatterns()
      const datePattern = patterns.find((p) => p.type === "date")

      const thisShorthands = [
        { pattern: "this mon", day: "Monday" },
        { pattern: "this tue", day: "Tuesday" },
        { pattern: "this wed", day: "Wednesday" },
        { pattern: "this thu", day: "Thursday" },
        { pattern: "this fri", day: "Friday" },
        { pattern: "this sat", day: "Saturday" },
        { pattern: "this sun", day: "Sunday" },
      ]

      thisShorthands.forEach(({ pattern }) => {
        const testText = `task ${pattern}`
        const matches = testText.match(datePattern?.regex || /./)

        expect(matches).toBeTruthy()
        const matchedWord = matches?.[0]?.trim() || ""
        expect(matchedWord).toBe(pattern)

        // Also verify it doesn't just match the shorthand part
        expect(matchedWord).not.toBe(pattern.split(" ")[1]) // Should not be just "mon", "tue", etc.
      })
    })

    it("should correctly highlight 'every [shorthand]' recurring patterns", () => {
      const patterns = generateHighlightingPatterns()
      const recurringPattern = patterns.find((p) => p.type === "recurring")

      const everyShorthands = [
        { pattern: "every mon", full: "Every Monday" },
        { pattern: "every tue", full: "Every Tuesday" },
        { pattern: "every wed", full: "Every Wednesday" },
        { pattern: "every thu", full: "Every Thursday" },
        { pattern: "every fri", full: "Every Friday" },
        { pattern: "every sat", full: "Every Saturday" },
        { pattern: "every sun", full: "Every Sunday" },
      ]

      everyShorthands.forEach(({ pattern }) => {
        const testText = `task ${pattern}`
        const matches = testText.match(recurringPattern?.regex || /./)

        expect(matches).toBeTruthy()
        const matchedWord = matches?.[0]?.trim() || ""
        expect(matchedWord).toBe(pattern)

        // Also verify it doesn't just match the shorthand part
        expect(matchedWord).not.toBe(pattern.split(" ")[1]) // Should not be just "mon", "tue", etc.
      })
    })

    it("should prioritize longer recurring patterns over shorter ones", () => {
      const patterns = generateHighlightingPatterns()
      const recurringPattern = patterns.find((p) => p.type === "recurring")

      // Test that "every saturday" is highlighted as the full phrase, not just "sat"
      const testText1 = "task every saturday"
      const matches1 = testText1.match(recurringPattern?.regex || /./)
      expect(matches1).toBeTruthy()
      const matchedWord1 = matches1?.[0]?.trim() || ""
      expect(matchedWord1).toBe("every saturday")

      // Test "every sat" - this should now work correctly
      const testText2 = "task every sat"
      const matches2 = testText2.match(recurringPattern?.regex || /./)
      expect(matches2).toBeTruthy()
      const matchedWord2 = matches2?.[0]?.trim() || ""
      expect(matchedWord2).toBe("every sat")
    })

    it("should correctly highlight 'every week' and 'every month' patterns", () => {
      const patterns = generateHighlightingPatterns()
      const recurringPattern = patterns.find((p) => p.type === "recurring")

      // Test the specific patterns that were missing before the fix
      const testCases = [
        { input: "task every week", expected: "every week" },
        { input: "task every month", expected: "every month" },
        { input: "buy groceries every week and clean", expected: "every week" },
        { input: "review budget every month", expected: "every month" },
      ]

      testCases.forEach(({ input, expected }) => {
        const matches = input.match(recurringPattern?.regex || /./)
        expect(matches).toBeTruthy()

        const matchedWord = matches?.[0]?.trim() || ""
        expect(matchedWord).toBe(expected)
      })
    })

    it("should correctly identify priority patterns", () => {
      expect(matchesParserPattern("p1", "priority")).toBe(true)
      expect(matchesParserPattern("!!!", "priority")).toBe(true)
      expect(matchesParserPattern("p5", "priority")).toBe(false)
    })

    it('should check "next year" pattern support across systems', () => {
      // Parser support
      const parserSupports = matchesParserPattern("next year", "date")

      // Autocomplete support
      const dateSuggestions = generateDateSuggestions()
      const autocompleteSupports = dateSuggestions.some((s) => s.value === "next year")

      // Highlighting support
      const highlightingPatterns = generateHighlightingPatterns()
      const datePattern = highlightingPatterns.find((p) => p.type === "date")
      const highlightingSupports = datePattern ? datePattern.regex.test("next year") : false

      console.log('Pattern support for "next year":')
      console.log("- Parser:", parserSupports)
      console.log("- Autocomplete:", autocompleteSupports)
      console.log("- Highlighting:", highlightingSupports)

      // All systems should now support "next year"
      expect(parserSupports).toBe(true)
      expect(autocompleteSupports).toBe(true)
      expect(highlightingSupports).toBe(true)
    })

    it("should have zero pattern mismatches across all systems (TDD)", () => {
      console.log("\n=== COMPREHENSIVE PATTERN ANALYSIS ===\n")

      // Map category names to function parameter types
      const typeMap: Record<string, "date" | "time" | "priority" | "recurring" | "duration"> = {
        dates: "date",
        times: "time",
        priorities: "priority",
        recurring: "recurring",
        durations: "duration",
      }

      // Test various pattern types that might have inconsistencies
      const testPatterns = {
        dates: [
          "today",
          "tomorrow",
          "yesterday",
          "next week",
          "next month",
          "next year",
          "this monday",
          "jan 15",
          "1/15",
          "in 3 days",
          "in 2 weeks",
          "next friday",
        ],
        times: ["9AM", "2PM", "10:30AM", "at 5PM", "15:00"],
        priorities: ["p1", "p2", "p3", "p4", "!", "!!", "!!!", "priority 1"],
        recurring: [
          "daily",
          "weekly",
          "monthly",
          "every day",
          "every week",
          "every month",
          "every monday",
          "every 2 days",
          "biweekly",
        ],
        durations: ["1h", "30m", "2 hours", "for 1 hour", "45 minutes"],
      }

      const results: Record<
        string,
        Record<
          string,
          { parser: boolean; autocomplete: boolean; highlighting: boolean; mismatch: boolean }
        >
      > = {}
      const mismatches: string[] = []

      Object.entries(testPatterns).forEach(([category, patterns]) => {
        console.log(`\n--- ${category.toUpperCase()} ---`)
        results[category] = {}

        patterns.forEach((pattern) => {
          const categoryType = typeMap[category]
          if (!categoryType) {
            throw new Error(`Unknown category type: ${category}`)
          }
          const parserSupports = matchesParserPattern(pattern, categoryType)

          // Check autocomplete
          let autocompleteSupports = false
          if (category === "dates") {
            const dateSuggestions = generateDateSuggestions()
            autocompleteSupports = dateSuggestions.some((s) => s.value === pattern.toLowerCase())
          } else if (category === "times") {
            const timeSuggestions = generateTimeSuggestions()
            autocompleteSupports = timeSuggestions.some((s) => s.value === pattern)
          } else if (category === "priorities") {
            const prioritySuggestions = generatePrioritySuggestions()
            autocompleteSupports = prioritySuggestions.some(
              (s) =>
                s.value === pattern ||
                s.value === pattern.replace(/[!]/g, "") ||
                s.display.toLowerCase() === pattern.toLowerCase() ||
                `p${s.value}` === pattern.toLowerCase(),
            )
          } else if (category === "recurring") {
            const recurringSuggestions = generateRecurringSuggestions()
            autocompleteSupports = recurringSuggestions.some(
              (s) => s.value === pattern.toLowerCase(),
            )
          } else if (category === "durations") {
            const durationSuggestions = generateDurationSuggestions()
            autocompleteSupports = durationSuggestions.some(
              (s) => s.value === pattern.toLowerCase(),
            )
          }

          // Check highlighting
          const highlightingPatterns = generateHighlightingPatterns()
          const relevantPattern = highlightingPatterns.find(
            (p) =>
              (category === "dates" && p.type === "date") ||
              (category === "times" && p.type === "time") ||
              (category === "priorities" && p.type === "priority") ||
              (category === "recurring" && p.type === "recurring") ||
              (category === "durations" && p.type === "duration"),
          )
          const highlightingSupports = relevantPattern ? relevantPattern.regex.test(pattern) : false

          const mismatch =
            parserSupports !== autocompleteSupports || parserSupports !== highlightingSupports

          console.log(
            `  ${pattern.padEnd(12)} | Parser: ${parserSupports ? "✅" : "❌"} | Autocomplete: ${autocompleteSupports ? "✅" : "❌"} | Highlighting: ${highlightingSupports ? "✅" : "❌"}${mismatch ? " ⚠️  MISMATCH" : ""}`,
          )

          if (mismatch) {
            mismatches.push(
              `${category}:"${pattern}" - Parser:${parserSupports} Autocomplete:${autocompleteSupports} Highlighting:${highlightingSupports}`,
            )
          }

          const categoryResults = results[category]
          if (!categoryResults) {
            throw new Error(`Category results not initialized: ${category}`)
          }
          categoryResults[pattern] = {
            parser: parserSupports,
            autocomplete: autocompleteSupports,
            highlighting: highlightingSupports,
            mismatch,
          }
        })
      })

      console.log(`\n=== SUMMARY ===`)
      console.log(`Total pattern mismatches found: ${mismatches.length}`)

      if (mismatches.length > 0) {
        console.log("\nMismatches:")
        mismatches.forEach((mismatch) => console.log(`  - ${mismatch}`))
      }

      // TDD: This test should FAIL until all patterns are unified
      expect(mismatches.length).toBe(0)
    })
  })
})
