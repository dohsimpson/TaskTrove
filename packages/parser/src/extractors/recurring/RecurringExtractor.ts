import type { Extractor } from "../base/Extractor";
import type { ExtractionResult, ParserContext } from "../../types";

const WORD_BOUNDARY_START = "(?:^|\\s)";
const WORD_BOUNDARY_END = "(?=\\s|$)";

interface RecurringPattern {
  pattern: RegExp;
  getValue: (match: RegExpMatchArray) => string;
}

// Convert simple recurring values to RRULE format
function convertToRRule(value: string): string {
  // Handle simple frequencies
  if (value === "daily") return "RRULE:FREQ=DAILY";
  if (value === "weekly") return "RRULE:FREQ=WEEKLY";
  if (value === "monthly") return "RRULE:FREQ=MONTHLY";
  if (value === "yearly") return "RRULE:FREQ=YEARLY";

  // Handle weekly with specific day
  if (value.startsWith("weekly ")) {
    const weekday = value.substring(7); // Remove "weekly " prefix (7 chars)
    const weekdayMap: { [key: string]: string } = {
      monday: "MO",
      tuesday: "TU",
      wednesday: "WE",
      thursday: "TH",
      friday: "FR",
      saturday: "SA",
      sunday: "SU",
    };
    const rruleDay = weekdayMap[weekday];
    if (rruleDay) return `RRULE:FREQ=WEEKLY;BYDAY=${rruleDay}`;
  }

  // Handle "every X days/weeks/months/years"
  const intervalMatch = value.match(
    /^every (\d+) (days?|weeks?|months?|years?)$/i,
  );
  if (intervalMatch && intervalMatch[2]) {
    const interval = intervalMatch[1];
    const unit = intervalMatch[2].toLowerCase();

    if (unit.startsWith("day")) return `RRULE:FREQ=DAILY;INTERVAL=${interval}`;
    if (unit.startsWith("week"))
      return `RRULE:FREQ=WEEKLY;INTERVAL=${interval}`;
    if (unit.startsWith("month"))
      return `RRULE:FREQ=MONTHLY;INTERVAL=${interval}`;
    if (unit.startsWith("year"))
      return `RRULE:FREQ=YEARLY;INTERVAL=${interval}`;
  }

  // Handle special cases
  if (
    value.toLowerCase() === "every workday" ||
    value.toLowerCase() === "every weekday"
  ) {
    return "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR";
  }

  // Fallback to original value if no conversion found
  return value;
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

// Special patterns for workday handling
const SPECIAL_PATTERNS: RecurringPattern[] = [
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every workday|every weekday)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => "every workday",
  },
];

const WEEKDAY_PATTERNS: RecurringPattern[] = [
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every (monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun))${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const weekdayStr = match[2];
      if (!weekdayStr) return "weekly";

      const weekday = weekdayStr.toLowerCase();
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

    // Extract special patterns (workday/weekday)
    for (const { pattern, getValue } of SPECIAL_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[1];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;

        const rawValue = getValue(match);
        results.push({
          type: "recurring",
          value: convertToRRule(rawValue),
          match: captured,
          startIndex,
          endIndex: startIndex + (match[0]?.length || captured.length),
        });
      }
    }

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

        const rawValue = getValue(match);
        results.push({
          type: "recurring",
          value: convertToRRule(rawValue),
          match: captured,
          startIndex,
          endIndex: startIndex + (match[0]?.length || captured.length),
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

        const rawValue = getValue(match);
        results.push({
          type: "recurring",
          value: convertToRRule(rawValue),
          match: captured,
          startIndex,
          endIndex: startIndex + (match[0]?.length || captured.length),
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

        const rawValue = getValue(match);
        results.push({
          type: "recurring",
          value: convertToRRule(rawValue),
          match: captured,
          startIndex,
          endIndex: startIndex + (match[0]?.length || captured.length),
        });
      }
    }

    return results;
  }
}
