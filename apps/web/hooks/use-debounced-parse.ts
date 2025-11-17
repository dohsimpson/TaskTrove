import { useState, useEffect } from "react"
import { useAtomValue } from "jotai"
import { nlpEnabledAtom } from "@tasktrove/atoms/ui/dialogs"
import { labelsAtom, usersAtom } from "@tasktrove/atoms/data/base/atoms"
import { visibleProjectsAtom } from "@tasktrove/atoms/core/projects"
import {
  parseEnhancedNaturalLanguage,
  type ParsedTaskWithMatches,
} from "@/lib/utils/enhanced-natural-language-parser"

/**
 * Custom hook for debounced natural language parsing with NLP toggle support
 *
 * @param text - Text to parse
 * @param disabledSections - Set of sections to disable during parsing
 * @param delay - Debounce delay in milliseconds (default: 0)
 * @returns Parsed task result or null
 *
 * Note: Setting delay to 0 causes parsing to be scheduled as soon as possible,
 * which prevents parsing interruption if form is submitted before timeout.
 */
export function useDebouncedParse(
  text: string,
  disabledSections: Set<string> = new Set(),
  delay: number = 0,
): ParsedTaskWithMatches | null {
  const [parsed, setParsed] = useState<ParsedTaskWithMatches | null>(null)

  // Get data from atoms
  const enabled = useAtomValue(nlpEnabledAtom)
  const labels = useAtomValue(labelsAtom) || []
  const projects = useAtomValue(visibleProjectsAtom) || []
  const users = useAtomValue(usersAtom) || []

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!enabled) {
        setParsed(null)
        return
      }

      if (text.trim()) {
        setParsed(
          parseEnhancedNaturalLanguage(text, disabledSections, {
            projects: projects.map((p) => ({ name: p.name })),
            labels: labels.map((l) => ({ name: l.name })),
            users: users.map((u) => ({ username: u.username })),
          }),
        )
      } else {
        setParsed(null)
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [text, delay, disabledSections, enabled, labels, projects, users])

  return parsed
}
