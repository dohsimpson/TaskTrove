import { TaskParser } from "@tasktrove/parser";
import type { ParsedTask, ParserContext } from "@tasktrove/parser";

interface DynamicPatternsConfig {
  projects?: Array<{ name: string }>;
  labels?: Array<{ name: string }>;
}

// Create default parser instance
const defaultParser = new TaskParser();

/**
 * Backwards-compatible adapter for the old parseEnhancedNaturalLanguage API
 */
export function parseEnhancedNaturalLanguage(
  text: string,
  disabledSections: Set<string> = new Set(),
  config?: DynamicPatternsConfig,
): ParsedTask {
  const context: ParserContext = {
    locale: "en",
    referenceDate: new Date(),
    disabledSections,
    projects: config?.projects,
    labels: config?.labels,
  };

  const result = defaultParser.parse(text, context);
  return result.parsed;
}
