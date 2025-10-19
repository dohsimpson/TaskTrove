import { addDays, startOfDay } from "date-fns";
import type { Extractor } from "../base/Extractor";
import type { ExtractionResult, ParserContext } from "../../types";

const WORD_BOUNDARY_START = "(?:^|\\s)";
const WORD_BOUNDARY_END = "(?=\\s|$)";

interface WeekdayPattern {
  pattern: RegExp;
  getWeekday: (referenceDate: Date) => Date;
}

// Helper to get next occurrence of a specific weekday
const getNextWeekday = (referenceDate: Date, targetDay: number): Date => {
  const currentDay = referenceDate.getDay();
  const daysUntilTarget = (targetDay - currentDay + 7) % 7;
  const daysToAdd = daysUntilTarget === 0 ? 7 : daysUntilTarget; // If today, use next week
  return startOfDay(addDays(referenceDate, daysToAdd));
};

const WEEKDAY_PATTERNS: WeekdayPattern[] = [
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(sunday|sun)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getWeekday: (ref) => getNextWeekday(ref, 0),
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(monday|mon)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getWeekday: (ref) => getNextWeekday(ref, 1),
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(tuesday|tue|tues)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getWeekday: (ref) => getNextWeekday(ref, 2),
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(wednesday|wed)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getWeekday: (ref) => getNextWeekday(ref, 3),
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(thursday|thu|thurs)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getWeekday: (ref) => getNextWeekday(ref, 4),
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(friday|fri)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getWeekday: (ref) => getNextWeekday(ref, 5),
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(saturday|sat)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getWeekday: (ref) => getNextWeekday(ref, 6),
  },
];

// Handle "this" and "next" prefixes
const MODIFIED_WEEKDAY_PATTERNS: WeekdayPattern[] = [
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(this (sunday|sun|monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thurs|friday|fri|saturday|sat))${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getWeekday: (ref, match) => {
      const weekdayName = match[2];
      const weekdayMap: Record<string, number> = {
        sunday: 0,
        sun: 0,
        monday: 1,
        mon: 1,
        tuesday: 2,
        tue: 2,
        tues: 2,
        wednesday: 3,
        wed: 3,
        thursday: 4,
        thu: 4,
        thurs: 4,
        friday: 5,
        fri: 5,
        saturday: 6,
        sat: 6,
      };

      const targetDay = weekdayMap[weekdayName.toLowerCase()];
      if (targetDay === undefined) return ref;

      return getNextWeekday(ref, targetDay);
    },
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(next (sunday|sun|monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thurs|friday|fri|saturday|sat))${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getWeekday: (ref, match) => {
      const weekdayName = match[2];
      const weekdayMap: Record<string, number> = {
        sunday: 0,
        sun: 0,
        monday: 1,
        mon: 1,
        tuesday: 2,
        tue: 2,
        tues: 2,
        wednesday: 3,
        wed: 3,
        thursday: 4,
        thu: 4,
        thurs: 4,
        friday: 5,
        fri: 5,
        saturday: 6,
        sat: 6,
      };

      const targetDay = weekdayMap[weekdayName.toLowerCase()];
      if (targetDay === undefined) return ref;

      return getNextWeekday(ref, targetDay);
    },
  },
];

export class WeekdayExtractor implements Extractor {
  readonly name = "weekday-extractor";
  readonly type = "date";

  extract(text: string, context: ParserContext): ExtractionResult[] {
    const results: ExtractionResult[] = [];
    const usedRanges: Array<{ start: number; end: number }> = [];

    // Extract modified weekday patterns (this/next) first to match longer patterns
    for (const { pattern, getWeekday } of MODIFIED_WEEKDAY_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[1];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;
        const endIndex = startIndex + captured.length;

        // Check if this range overlaps with any previously used range
        const hasOverlap = usedRanges.some(
          (range) => startIndex < range.end && endIndex > range.start,
        );

        if (!hasOverlap) {
          const dateValue = getWeekday(context.referenceDate, match);

          results.push({
            type: "date",
            value: dateValue,
            match: captured,
            startIndex,
            endIndex,
          });

          usedRanges.push({ start: startIndex, end: endIndex });
        }
      }
    }

    // Extract standard weekday patterns
    for (const { pattern, getWeekday } of WEEKDAY_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[1];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;
        const endIndex = startIndex + captured.length;

        // Check if this range overlaps with any previously used range
        const hasOverlap = usedRanges.some(
          (range) => startIndex < range.end && endIndex > range.start,
        );

        if (!hasOverlap) {
          const dateValue = getWeekday(context.referenceDate);

          results.push({
            type: "date",
            value: dateValue,
            match: captured,
            startIndex,
            endIndex,
          });

          usedRanges.push({ start: startIndex, end: endIndex });
        }
      }
    }

    return results;
  }
}
