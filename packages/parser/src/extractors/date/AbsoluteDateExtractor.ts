import { startOfDay } from "date-fns";
import type { Extractor } from "../base/Extractor";
import type { ExtractionResult, ParserContext } from "../../types";

const WORD_BOUNDARY_START = "(?:^|\\s)";
const WORD_BOUNDARY_END = "(?=\\s|$|[.,])";

interface DatePattern {
  pattern: RegExp;
  getValue: (match: RegExpMatchArray, referenceDate: Date) => Date | null;
}

// Month name to number mapping
const MONTH_MAP: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

// Parse ordinal numbers (1st, 2nd, 3rd, 4th, etc.)
const parseOrdinal = (ordinal: string): number => {
  const match = ordinal.match(/^(\d+)(st|nd|rd|th)$/);
  return match && match[1] ? parseInt(match[1]) : parseInt(ordinal);
};

const DATE_PATTERNS: DatePattern[] = [
  // Month Day format: "Jan 15", "January 15", "Jan 15,"
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}([a-z]+)\\s+(\\d+)(?:st|nd|rd|th)?,?${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match, ref) => {
      const monthName = match[1];
      const dayStr = match[2];
      if (!monthName || !dayStr) return null;

      const day = parseOrdinal(dayStr);
      const month = MONTH_MAP[monthName.toLowerCase()];

      if (month === undefined || isNaN(day) || day < 1 || day > 31) return null;

      const date = new Date(ref.getFullYear(), month, day);
      return startOfDay(date);
    },
  },

  // Day Month format: "15 Jan", "15 January"
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(\\d+)(?:st|nd|rd|th)?\\s+([a-z]+)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match, ref) => {
      const dayStr = match[1];
      const monthName = match[2];
      if (!dayStr || !monthName) return null;

      const day = parseOrdinal(dayStr);
      const month = MONTH_MAP[monthName.toLowerCase()];

      if (month === undefined || isNaN(day) || day < 1 || day > 31) return null;

      const date = new Date(ref.getFullYear(), month, day);
      return startOfDay(date);
    },
  },

  // Month Day Year format: "Jan 15 2025", "January 15, 2025"
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}([a-z]+)\\s+(\\d+)(?:st|nd|rd|th)?,?\\s+(\\d{4})${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const monthName = match[1];
      const dayStr = match[2];
      const yearStr = match[3];
      if (!monthName || !dayStr || !yearStr) return null;

      const day = parseOrdinal(dayStr);
      const year = parseInt(yearStr);
      const month = MONTH_MAP[monthName.toLowerCase()];

      if (
        month === undefined ||
        isNaN(day) ||
        day < 1 ||
        day > 31 ||
        isNaN(year)
      )
        return null;

      const date = new Date(year, month, day);
      return startOfDay(date);
    },
  },

  // Day Month Year format: "15 Jan 2025", "15 January 2025"
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(\\d+)(?:st|nd|rd|th)?\\s+([a-z]+)\\s+(\\d{4})${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const dayStr = match[1];
      const monthName = match[2];
      const yearStr = match[3];
      if (!dayStr || !monthName || !yearStr) return null;

      const day = parseOrdinal(dayStr);
      const year = parseInt(yearStr);
      const month = MONTH_MAP[monthName.toLowerCase()];

      if (
        month === undefined ||
        isNaN(day) ||
        day < 1 ||
        day > 31 ||
        isNaN(year)
      )
        return null;

      const date = new Date(year, month, day);
      return startOfDay(date);
    },
  },

  // US format M/D: "1/15", "1/15/"
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(\\d{1,2})/(\\d{1,2})/?${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match, ref) => {
      const monthStr = match[1];
      const dayStr = match[2];
      if (!monthStr || !dayStr) return null;

      const month = parseInt(monthStr);
      const day = parseInt(dayStr);

      if (
        isNaN(month) ||
        isNaN(day) ||
        month < 1 ||
        month > 12 ||
        day < 1 ||
        day > 31
      )
        return null;

      const date = new Date(ref.getFullYear(), month - 1, day);
      return startOfDay(date);
    },
  },

  // EU format D/M: "15/1", "15/1/"
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(\\d{1,2})/(\\d{1,2})/?${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match, ref) => {
      const dayStr = match[1];
      const monthStr = match[2];
      if (!dayStr || !monthStr) return null;

      const day = parseInt(dayStr);
      const month = parseInt(monthStr);

      if (
        isNaN(day) ||
        isNaN(month) ||
        day < 1 ||
        day > 31 ||
        month < 1 ||
        month > 12
      )
        return null;

      // If both day and month are <= 12, assume US format for consistency
      const isUSFormat = day <= 12 && month <= 12;
      const actualMonth = isUSFormat ? day - 1 : month - 1;
      const actualDay = isUSFormat ? month : day;

      const date = new Date(ref.getFullYear(), actualMonth, actualDay);
      return startOfDay(date);
    },
  },

  // Date format with year M/D/YYYY or D/M/YYYY: "1/15/2025" or "15/1/2025"
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(\\d{1,2})/(\\d{1,2})/(\\d{4})${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const firstStr = match[1];
      const secondStr = match[2];
      const yearStr = match[3];
      if (!firstStr || !secondStr || !yearStr) return null;

      const first = parseInt(firstStr);
      const second = parseInt(secondStr);
      const year = parseInt(yearStr);

      if (isNaN(first) || isNaN(second) || isNaN(year)) return null;

      // If first > 12, it must be day (EU format)
      // If second > 12, it must be day (US format)
      // If both <= 12, assume US format for consistency
      let day: number, month: number;

      if (first > 12) {
        // EU format: D/M/YYYY
        day = first;
        month = second;
      } else if (second > 12) {
        // US format: M/D/YYYY
        month = first;
        day = second;
      } else {
        // Both could be valid, assume US format
        month = first;
        day = second;
      }

      if (month < 1 || month > 12 || day < 1 || day > 31) return null;

      const date = new Date(year, month - 1, day);
      return startOfDay(date);
    },
  },
];

export class AbsoluteDateExtractor implements Extractor {
  readonly name = "absolute-date-extractor";
  readonly type = "date";

  extract(text: string, context: ParserContext): ExtractionResult[] {
    const results: ExtractionResult[] = [];
    const usedRanges: Array<{ start: number; end: number }> = [];

    // Sort patterns by specificity (longer patterns first)
    const sortedPatterns = [...DATE_PATTERNS].sort((a, b) => {
      // 3-year patterns first, then 2-year patterns, then single patterns
      const aYearCount = (a.pattern.source.match(/\\d\{4\}/g) || []).length;
      const bYearCount = (b.pattern.source.match(/\\d\{4\}/g) || []).length;
      return bYearCount - aYearCount;
    });

    for (const { pattern, getValue } of sortedPatterns) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const fullMatch = match[0];
        if (!fullMatch) continue;

        if (context.disabledSections?.has(fullMatch.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;
        const endIndex = startIndex + fullMatch.length;

        // Check if this range overlaps with any previously used range
        const hasOverlap = usedRanges.some(
          (range) => startIndex < range.end && endIndex > range.start,
        );

        if (!hasOverlap) {
          const dateValue = getValue(match, context.referenceDate);

          if (!dateValue || isNaN(dateValue.getTime())) continue;

          // Trim whitespace from match
          const trimmedMatch = fullMatch.trim();
          const trimmedStartIndex =
            startIndex + fullMatch.indexOf(trimmedMatch);

          results.push({
            type: "date",
            value: dateValue,
            match: trimmedMatch,
            startIndex: trimmedStartIndex,
            endIndex: trimmedStartIndex + trimmedMatch.length,
          });

          usedRanges.push({ start: startIndex, end: endIndex });
        }
      }
    }

    return results;
  }
}
