import type { Extractor } from "../base/Extractor";
import type { ExtractionResult, ParserContext } from "../../types";
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  startOfDay,
  endOfDay,
} from "date-fns";

interface DatePattern {
  pattern: RegExp;
  handler: (match: RegExpMatchArray, referenceDate: Date) => Date;
}

export class DateExtractor implements Extractor {
  readonly name = "date-extractor";
  readonly type = "date";

  private patterns: DatePattern[] = [
    // Relative dates
    {
      pattern: /\b(today)\b/gi,
      handler: (match, referenceDate) => startOfDay(referenceDate),
    },
    {
      pattern: /\b(tomorrow)\b/gi,
      handler: (match, referenceDate) => startOfDay(addDays(referenceDate, 1)),
    },
    {
      pattern: /\b(yesterday)\b/gi,
      handler: (match, referenceDate) => startOfDay(subDays(referenceDate, 1)),
    },
    {
      pattern: /\b(next week)\b/gi,
      handler: (match, referenceDate) => startOfDay(addWeeks(referenceDate, 1)),
    },
    {
      pattern: /\b(last week)\b/gi,
      handler: (match, referenceDate) => startOfDay(subWeeks(referenceDate, 1)),
    },
    {
      pattern: /\b(next month)\b/gi,
      handler: (match, referenceDate) =>
        startOfDay(addMonths(referenceDate, 1)),
    },
    {
      pattern: /\b(last month)\b/gi,
      handler: (match, referenceDate) =>
        startOfDay(subMonths(referenceDate, 1)),
    },
    {
      pattern: /\b(next year)\b/gi,
      handler: (match, referenceDate) => startOfDay(addYears(referenceDate, 1)),
    },
    {
      pattern: /\b(last year)\b/gi,
      handler: (match, referenceDate) => startOfDay(subYears(referenceDate, 1)),
    },
    // Numeric date patterns
    {
      pattern: /\b(\d{1,2})\/(\d{1,2})\b/g,
      handler: (match, referenceDate) => {
        const monthStr = match[1];
        const dayStr = match[2];
        if (!monthStr || !dayStr) return referenceDate;

        const month = parseInt(monthStr);
        const day = parseInt(dayStr);
        const year = referenceDate.getFullYear();
        return new Date(year, month - 1, day);
      },
    },
    {
      pattern: /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g,
      handler: (match, referenceDate) => {
        const monthStr = match[1];
        const dayStr = match[2];
        const yearStr = match[3];
        if (!monthStr || !dayStr || !yearStr) return referenceDate;

        const month = parseInt(monthStr);
        const day = parseInt(dayStr);
        const year = parseInt(yearStr);
        const fullYear = year < 100 ? 2000 + year : year;
        return new Date(fullYear, month - 1, day);
      },
    },
    // Month name patterns
    {
      pattern:
        /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:\s+(\d{4}))?\b/gi,
      handler: (match, referenceDate) => {
        const monthNameStr = match[1];
        const dayStr = match[2];
        const yearStr = match[3];
        if (!monthNameStr || !dayStr) return referenceDate;

        const monthName = monthNameStr.toLowerCase();
        const day = parseInt(dayStr);

        const monthMap: { [key: string]: number } = {
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

        const month = monthMap[monthName];
        if (month === undefined) return referenceDate;

        const year = yearStr ? parseInt(yearStr) : referenceDate.getFullYear();

        return new Date(year, month, day);
      },
    },
  ];

  extract(text: string, context: ParserContext): ExtractionResult[] {
    const results: ExtractionResult[] = [];

    for (const { pattern, handler } of this.patterns) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const fullMatch = match[0];
        if (!fullMatch) continue;

        // Check if disabled
        if (context.disabledSections?.has(fullMatch.toLowerCase())) {
          continue;
        }

        try {
          const date = handler(match, context.referenceDate);
          const startIndex = match.index || 0;

          results.push({
            type: "date",
            value: date,
            match: fullMatch,
            startIndex,
            endIndex: startIndex + fullMatch.length,
          });
        } catch (error) {
          // Skip invalid dates
          continue;
        }
      }
    }

    return results;
  }
}
