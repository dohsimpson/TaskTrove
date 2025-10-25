import { EnglishLocaleConfig } from "./locales/en/config";
import { ChineseLocaleConfig } from "./locales/zh/config";
import type {
  LocaleConfig,
  LocaleConfigOptions,
} from "./locales/base/LocaleConfig";
import type { Extractor } from "@tasktrove/parser/extractors/base";
import type { Processor } from "./processors/base/Processor";
import type {
  ParsedTask,
  ParserContext,
  ExtractionResult,
} from "@tasktrove/parser/types";

export interface ParserFactoryOptions {
  locale?: string;
  referenceDate?: Date;
  projects?: Array<{ name: string }>;
  labels?: Array<{ name: string }>;
  disabledExtractors?: string[];
  customExtractors?: Array<string | Extractor>;
  extractorOrder?: string[];
  processorOrder?: string[];
}

// Registry for custom extractors
const customExtractorRegistry = new Map<string, new () => Extractor>();

/**
 * Register a custom extractor class for use in parsers
 */
export function registerCustomExtractor(
  name: string,
  extractorClass: new () => Extractor,
): void {
  customExtractorRegistry.set(name, extractorClass);
}

/**
 * Create a parser with specified configuration
 */
export function createParser(options: ParserFactoryOptions = {}): {
  parse(text: string, contextOverrides?: Partial<ParserContext>): ParsedTask;
} {
  const {
    locale = "en",
    referenceDate = new Date(),
    projects,
    labels,
    disabledExtractors,
    customExtractors: customExtractorNamesOrInstances = [],
    extractorOrder,
    processorOrder,
  } = options;

  // Ensure disabledExtractors is always an array
  const safeDisabledExtractors = disabledExtractors || [];

  // Build locale configuration options
  const localeOptions: LocaleConfigOptions = {
    disabledExtractors: safeDisabledExtractors,
    extractorOrder,
    processorOrder,
  };

  // Get locale configuration with options
  let localeConfig: LocaleConfig;
  switch (locale) {
    case "zh":
      localeConfig = new ChineseLocaleConfig(localeOptions);
      break;
    case "en":
    default:
      localeConfig = new EnglishLocaleConfig(localeOptions);
      break;
  }

  // Get default extractors from locale
  const defaultExtractors = localeConfig.getExtractors();
  // Get default processors from locale, excluding TextCleaner (we handle text cleaning in buildParsedTask)
  const allProcessors = localeConfig.getProcessors();
  const defaultProcessors = allProcessors.filter(
    (p) => p.name !== "text-cleaner",
  );

  // Process custom extractors
  const customExtractors: Extractor[] = [];
  for (const custom of customExtractorNamesOrInstances) {
    if (typeof custom === "string") {
      // Look up in registry
      const ExtractorClass = customExtractorRegistry.get(custom);
      if (!ExtractorClass) {
        throw new Error(
          `Custom extractor '${custom}' not found. Did you forget to register it?`,
        );
      }
      customExtractors.push(new ExtractorClass());
    } else {
      // Direct instance
      customExtractors.push(custom);
    }
  }

  // Combine extractors: custom first, then defaults
  const allExtractors = [...customExtractors, ...defaultExtractors];

  // Create parse function
  return {
    parse(text: string, contextOverrides?: Partial<ParserContext>): ParsedTask {
      const context: ParserContext = {
        locale,
        referenceDate,
        projects: projects || [],
        labels: labels || [],
        disabledSections: new Set(),
        ...contextOverrides,
      };

      // Phase 1: Extract patterns
      let results: ExtractionResult[] = [];
      for (const extractor of allExtractors) {
        try {
          const extracted = extractor.extract(text, context);
          results.push(...extracted);
        } catch (error) {
          // Log error but continue with other extractors
          console.warn(`Extractor '${extractor.name}' failed:`, error);
        }
      }

      // Sort results by position
      results.sort((a, b) => a.startIndex - b.startIndex);

      // Phase 2: Process results (in order)
      let processedResults = results;
      for (const processor of defaultProcessors) {
        try {
          processedResults = processor.process(processedResults, context);
        } catch (error) {
          // Log error but continue with other processors
          console.warn(`Processor '${processor.name}' failed:`, error);
        }
      }

      // Build final parsed task
      return buildParsedTask(text, processedResults);
    },
  };
}

/**
 * Build ParsedTask from extraction results
 */
function buildParsedTask(
  originalText: string,
  results: ExtractionResult[],
): ParsedTask {
  const parsed: ParsedTask = {
    title: "",
    labels: [],
    originalText,
  };

  let cleanText = originalText;

  // Sort results by start position (in reverse order to avoid index shifting)
  const sortedResults = [...results].sort(
    (a, b) => b.startIndex - a.startIndex,
  );

  // Extract values and remove matched text from title
  for (const result of sortedResults) {
    switch (result.type) {
      case "priority":
        parsed.priority = result.value as number;
        break;
      case "project":
        parsed.project = result.value as string;
        break;
      case "label":
        parsed.labels.push(result.value as string);
        break;
      case "date":
        parsed.dueDate = result.value as Date;
        break;
      case "time":
        parsed.time = result.value as string;
        break;
      case "recurring":
        parsed.recurring = result.value as string;
        break;
      case "estimation":
        parsed.estimation = result.value as number;
        break;
      case "duration":
        parsed.duration = result.value as string;
        break;
    }

    // Get visual character length for proper Unicode handling
    const visualLength = Array.from(result.match).length;

    // Remove matched text from title using visual character count
    cleanText =
      cleanText.substring(0, result.startIndex) +
      " ".repeat(visualLength) +
      cleanText.substring(result.endIndex);
  }

  // Clean up title
  parsed.title = cleanText.replace(/\s+/g, " ").trim();

  return parsed;
}
