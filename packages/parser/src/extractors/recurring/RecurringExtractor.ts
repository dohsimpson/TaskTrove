import type { Extractor } from "../base/Extractor";
import type { ExtractionResult, ParserContext } from "../../types";

const WORD_BOUNDARY_START = "(?:^|\\s)";
const WORD_BOUNDARY_END = "(?=\\s|$)";

interface RecurringPattern {
  pattern: RegExp;
  getValue: (match: RegExpMatchArray) => string;
}

const SIMPLE_PATTERNS: RecurringPattern[] = [
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(daily|every day)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => "daily",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(weekly|every week)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => "weekly",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(monthly|every month)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => "monthly",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(yearly|every year)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => "yearly",
  },
];

const WEEKDAY_PATTERNS: RecurringPattern[] = [
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every (monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun))${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const weekday = match[2].toLowerCase();
      const weekdayMap: { [key: string]: string } = {
        mon: "monday",
        monday: "monday",
        tue: "tuesday",
        tuesday: "tuesday",
        wed: "wednesday",
        wednesday: "wednesday",
        thu: "thursday",
        thursday: "thursday",
        fri: "friday",
        friday: "friday",
        sat: "saturday",
        saturday: "saturday",
        sun: "sunday",
        sunday: "sunday",
      };
      return `weekly ${weekdayMap[weekday]}`;
    },
  },
];

const INTERVAL_PATTERNS: RecurringPattern[] = [
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every (\\d+) days?)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const days = match[2];
      return `every ${days} days`;
    },
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every (\\d+) weeks?)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const weeks = match[2];
      return `every ${weeks} weeks`;
    },
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every (\\d+) months?)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const months = match[2];
      return `every ${months} months`;
    },
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every (\\d+) years?)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const years = match[2];
      return `every ${years} years`;
    },
  },
];

export class RecurringExtractor implements Extractor {
  readonly name = "recurring-extractor";
  readonly type = "recurring";

  extract(text: string, context: ParserContext): ExtractionResult[] {
    const results: ExtractionResult[] = [];

    // Extract simple patterns
    for (const { pattern, getValue } of SIMPLE_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[1];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;

        results.push({
          type: "recurring",
          value: getValue(match),
          match: captured,
          startIndex,
          endIndex: startIndex + captured.length,
        });
      }
    }

    // Extract weekday patterns
    for (const { pattern, getValue } of WEEKDAY_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[1];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;

        results.push({
          type: "recurring",
          value: getValue(match),
          match: captured,
          startIndex,
          endIndex: startIndex + captured.length,
        });
      }
    }

    // Extract interval patterns
    for (const { pattern, getValue } of INTERVAL_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[1];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;

        results.push({
          type: "recurring",
          value: getValue(match),
          match: captured,
          startIndex,
          endIndex: startIndex + captured.length,
        });
      }
    }

    return results;
  }
}
