import { useState, useEffect } from "react"
import { useAtomValue } from "jotai"
import { nlpEnabledAtom } from "@/lib/atoms/ui/dialogs"
import {
  parseEnhancedNaturalLanguage,
  type ParsedTask,
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
): ParsedTask | null {
  const [parsed, setParsed] = useState<ParsedTask | null>(null)

  // Get NLP enabled state from atom
  const enabled = useAtomValue(nlpEnabledAtom)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!enabled) {
        setParsed(null)
        return
      }

      if (text.trim()) {
        setParsed(parseEnhancedNaturalLanguage(text, disabledSections))
      } else {
        setParsed(null)
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [text, delay, disabledSections, enabled])

  return parsed
}
