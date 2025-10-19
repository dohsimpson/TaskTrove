import type { Extractor } from "../base/Extractor";
import type { ExtractionResult, ParserContext } from "../../types";
import { startOfHour, addHours } from "date-fns";

const WORD_BOUNDARY_START = "(?:^|\\s)";
const WORD_BOUNDARY_END = "(?=\\s|$)";

interface RecurringPattern {
  pattern: RegExp;
  getValue: (match: RegExpMatchArray) => string;
}

// Shared weekday mapping for RRULE format
const WEEKDAY_TO_RRULE: { [key: string]: string } = {
  mon: "MO",
  monday: "MO",
  tue: "TU",
  tuesday: "TU",
  wed: "WE",
  wednesday: "WE",
  thu: "TH",
  thursday: "TH",
  fri: "FR",
  friday: "FR",
  sat: "SA",
  saturday: "SA",
  sun: "SU",
  sunday: "SU",
};

// Shared ordinal mapping
const ORDINAL_TO_NUMBER: { [key: string]: string } = {
  "1st": "1",
  "2nd": "2",
  "3rd": "3",
  "4th": "4",
  "5th": "5",
};

// Convert simple recurring values to RRULE format
function convertToRRule(value: string): string {
  // Handle simple frequencies
  if (value === "daily") return "RRULE:FREQ=DAILY";
  if (value === "weekly") return "RRULE:FREQ=WEEKLY";
  if (value === "monthly") return "RRULE:FREQ=MONTHLY";
  if (value === "yearly") return "RRULE:FREQ=YEARLY";
  if (value === "hourly") return "RRULE:FREQ=HOURLY";
  if (value === "quarterly") return "RRULE:FREQ=MONTHLY;INTERVAL=3";

  // Handle weekly with specific day
  if (value.startsWith("weekly ")) {
    const weekday = value.substring(7); // Remove "weekly " prefix (7 chars)
    const rruleDay = WEEKDAY_TO_RRULE[weekday];
    if (rruleDay) return `RRULE:FREQ=WEEKLY;BYDAY=${rruleDay}`;
  }

  // Handle multi-day patterns
  if (value.startsWith("weekly multi")) {
    const daysStr = value.substring(12); // Remove "weekly multi" prefix (12 chars)
    return `RRULE:FREQ=WEEKLY;BYDAY=${daysStr}`;
  }

  // Handle "every X days/weeks/months/years/hours"
  const intervalMatch = value.match(
    /^every (\d+) (days?|weeks?|months?|years?|hours?)$/i,
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
    if (unit.startsWith("hour"))
      return `RRULE:FREQ=HOURLY;INTERVAL=${interval}`;
  }

  // Handle time-of-day patterns
  if (value.includes(" at ")) {
    const frequency = value.split(" at ")[0];
    if (frequency === "daily") return "RRULE:FREQ=DAILY";
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
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(hourly|every hour)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => "hourly",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(quarterly|every quarter)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => "quarterly",
  },
];

// Time-of-day patterns with default times
const TIME_OF_DAY_PATTERNS: RecurringPattern[] = [
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every morning)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => "daily at 9am",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every afternoon)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => "daily at 12pm",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every evening)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => "daily at 7pm",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every night)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => "daily at 10pm",
  },
];

// Multi-day list patterns (every monday, friday)
const MULTI_DAY_PATTERNS: RecurringPattern[] = [
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every|ev) ([a-zA-Z]+(?:,\\s*[a-zA-Z]+)+)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const prefix = match[1]; // "every" or "ev"
      const dayList = match[2]; // "monday, friday" or "mon, fri"

      if (!dayList) return "weekly";

      // Split by comma and clean up
      const days = dayList.split(",").map((day) => day.trim().toLowerCase());

      // Convert directly to RRULE format using shared mapping
      const rruleDays: string[] = [];
      for (const day of days) {
        const rruleDay = WEEKDAY_TO_RRULE[day];
        if (rruleDay) {
          rruleDays.push(rruleDay);
        }
      }

      return rruleDays.length > 0
        ? `weekly multi${rruleDays.join(",")}`
        : "weekly";
    },
  },
];

/**
 * Generate time-based extraction results for recurring patterns
 */
function generateTimeResults(
  value: string,
  match: string,
  startIndex: number,
  context: ParserContext,
): ExtractionResult[] {
  const results: ExtractionResult[] = [];

  // Handle hourly patterns - calculate next hour start
  if (
    value === "hourly" ||
    (value.startsWith("every ") && value.includes(" hours"))
  ) {
    const nextHour = addHours(startOfHour(context.referenceDate), 1);

    // Position date and time results right after the recurring pattern to avoid overlap
    // Use different end positions to ensure no overlap
    results.push({
      type: "date",
      value: nextHour,
      match: match, // Use the original match for consistency
      startIndex: startIndex,
      endIndex: startIndex + match.length - 1, // Slightly shorter to avoid overlap
    });

    results.push({
      type: "time",
      value: nextHour.toTimeString().substring(0, 5), // HH:MM format
      match: match,
      startIndex: startIndex + match.length, // Position right after the recurring pattern
      endIndex: startIndex + match.length + 1,
    });
  }

  // Handle time-of-day patterns - generate time results with default times
  if (value.includes(" at ")) {
    const timeStr = value.split(" at ")[1];
    let hour24: number;

    switch (timeStr) {
      case "9am":
        hour24 = 9;
        break;
      case "12pm":
        hour24 = 12;
        break;
      case "7pm":
        hour24 = 19;
        break;
      case "10pm":
        hour24 = 22;
        break;
      default:
        return results; // Unknown time format, don't generate time result
    }

    results.push({
      type: "time",
      value: `${hour24.toString().padStart(2, "0")}:00`,
      match: match,
      startIndex: startIndex,
      endIndex: startIndex + match.length,
    });
  }

  return results;
}

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
      // Normalize to full day name for convertToRRule
      const normalizedDay =
        weekday.length === 3
          ? Object.keys(WEEKDAY_TO_RRULE).find(
              (key) =>
                key.startsWith(weekday) &&
                WEEKDAY_TO_RRULE[key] === WEEKDAY_TO_RRULE[weekday],
            ) || weekday
          : weekday;

      return `weekly ${normalizedDay}`;
    },
  },
];

// Ordinal weekday patterns (every 2nd Monday, every 3rd Friday, etc.)
const ORDINAL_WEEKDAY_PATTERNS: RecurringPattern[] = [
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every (1st|2nd|3rd|4th|5th) (monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun))${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const ordinal = match[2]; // "1st", "2nd", "3rd", "4th"
      const weekdayStr = match[3]; // "monday", "mon", etc.

      if (!ordinal || !weekdayStr) return "weekly";

      const ordinalNum = ORDINAL_TO_NUMBER[ordinal.toLowerCase()];
      const rruleDay = WEEKDAY_TO_RRULE[weekdayStr.toLowerCase()];

      if (!rruleDay || !ordinalNum) return "weekly";

      // RRULE format: FREQ=MONTHLY;BYDAY=2MO (2nd Monday of month)
      return `RRULE:FREQ=MONTHLY;BYDAY=${ordinalNum}${rruleDay}`;
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
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every (\\d+) hours?)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const hours = match[2];
      return `every ${hours} hours`;
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
        const rruleValue = convertToRRule(rawValue);

        // Add the recurring result
        results.push({
          type: "recurring",
          value: rruleValue,
          match: captured,
          startIndex,
          endIndex: startIndex + (match[0]?.length || captured.length),
        });

        // For time-based recurring patterns, also generate time/date results
        const timeResults = generateTimeResults(
          rawValue,
          captured,
          startIndex,
          context,
        );
        results.push(...timeResults);
      }
    }

    // Extract time-of-day patterns
    for (const { pattern, getValue } of TIME_OF_DAY_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[1];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;

        const rawValue = getValue(match);
        const rruleValue = convertToRRule(rawValue);

        // Add the recurring result
        results.push({
          type: "recurring",
          value: rruleValue,
          match: captured,
          startIndex,
          endIndex: startIndex + (match[0]?.length || captured.length),
        });

        // For time-of-day patterns, also generate time results
        const timeResults = generateTimeResults(
          rawValue,
          captured,
          startIndex,
          context,
        );
        results.push(...timeResults);
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

    // Extract multi-day patterns
    for (const { pattern, getValue } of MULTI_DAY_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[0]; // Use full match
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;

        const rawValue = getValue(match);
        results.push({
          type: "recurring",
          value: convertToRRule(rawValue),
          match: captured.trim(),
          startIndex,
          endIndex: startIndex + (match[0]?.length || captured.length),
        });
      }
    }

    // Extract ordinal weekday patterns (every 2nd Monday, etc.)
    for (const { pattern, getValue } of ORDINAL_WEEKDAY_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[1];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;

        const rruleValue = getValue(match);

        results.push({
          type: "recurring",
          value: rruleValue,
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
        const rruleValue = convertToRRule(rawValue);

        // Add the recurring result
        results.push({
          type: "recurring",
          value: rruleValue,
          match: captured,
          startIndex,
          endIndex: startIndex + (match[0]?.length || captured.length),
        });

        // For time-based recurring patterns, also generate time/date results
        const timeResults = generateTimeResults(
          rawValue,
          captured,
          startIndex,
          context,
        );
        results.push(...timeResults);
      }
    }

    return results;
  }
}

// Export the multi-day patterns for testing
export { MULTI_DAY_PATTERNS };
