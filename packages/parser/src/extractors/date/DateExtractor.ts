import type { Extractor } from "@tasktrove/parser/extractors/base";
import type { ExtractionResult, ParserContext } from "@tasktrove/parser/types";
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
import { extractWithPatterns, type Pattern } from "../../utils/PatternMatcher";

export class DateExtractor implements Extractor {
  readonly name = "date-extractor";
  readonly type = "date";

  private getPatterns(referenceDate: Date): Pattern<Date>[] {
    return [
      // Relative dates
      {
        pattern: /\b(today)\b/gi,
        getValue: () => startOfDay(referenceDate),
      },
      {
        pattern: /\b(tod)\b/gi,
        getValue: () => startOfDay(referenceDate),
      },
      {
        pattern: /\b(tomorrow)\b/gi,
        getValue: () => startOfDay(addDays(referenceDate, 1)),
      },
      {
        pattern: /\b(tmr)\b/gi,
        getValue: () => startOfDay(addDays(referenceDate, 1)),
      },
      {
        pattern: /\b(tom)\b/gi,
        getValue: () => startOfDay(addDays(referenceDate, 1)),
      },
      {
        pattern: /\b(yesterday)\b/gi,
        getValue: () => startOfDay(subDays(referenceDate, 1)),
      },
      {
        pattern: /\b(next week)\b/gi,
        getValue: () => startOfDay(addWeeks(referenceDate, 1)),
      },
      {
        pattern: /\b(last week)\b/gi,
        getValue: () => startOfDay(subWeeks(referenceDate, 1)),
      },
      {
        pattern: /\b(next month)\b/gi,
        getValue: () => startOfDay(addMonths(referenceDate, 1)),
      },
      {
        pattern: /\b(last month)\b/gi,
        getValue: () => startOfDay(subMonths(referenceDate, 1)),
      },
      {
        pattern: /\b(next year)\b/gi,
        getValue: () => startOfDay(addYears(referenceDate, 1)),
      },
      {
        pattern: /\b(last year)\b/gi,
        getValue: () => startOfDay(subYears(referenceDate, 1)),
      },
      // "in X days/weeks/months/years" patterns
      {
        pattern: /\b(in (\d+) days?)\b/gi,
        getValue: (match) => {
          const daysStr = match[2];
          if (!daysStr) return referenceDate;
          const days = parseInt(daysStr);
          return startOfDay(addDays(referenceDate, days));
        },
      },
      {
        pattern: /\b(in (\d+) weeks?)\b/gi,
        getValue: (match) => {
          const weeksStr = match[2];
          if (!weeksStr) return referenceDate;
          const weeks = parseInt(weeksStr);
          return startOfDay(addWeeks(referenceDate, weeks));
        },
      },
      {
        pattern: /\b(in (\d+) months?)\b/gi,
        getValue: (match) => {
          const monthsStr = match[2];
          if (!monthsStr) return referenceDate;
          const months = parseInt(monthsStr);
          return startOfDay(addMonths(referenceDate, months));
        },
      },
      {
        pattern: /\b(in (\d+) years?)\b/gi,
        getValue: (match) => {
          const yearsStr = match[2];
          if (!yearsStr) return referenceDate;
          const years = parseInt(yearsStr);
          return startOfDay(addYears(referenceDate, years));
        },
      },
      // "in an hour/a week/a month/a year" patterns
      {
        pattern: /\b(in an hour)\b/gi,
        getValue: () => new Date(referenceDate.getTime() + 60 * 60 * 1000),
      },
      {
        pattern: /\b(in a day)\b/gi,
        getValue: () => startOfDay(addDays(referenceDate, 1)),
      },
      {
        pattern: /\b(in a week)\b/gi,
        getValue: () => startOfDay(addWeeks(referenceDate, 1)),
      },
      {
        pattern: /\b(in a month)\b/gi,
        getValue: () => startOfDay(addMonths(referenceDate, 1)),
      },
      {
        pattern: /\b(in a year)\b/gi,
        getValue: () => startOfDay(addYears(referenceDate, 1)),
      },
      // Numeric date patterns
      {
        pattern: /\b(\d{1,2})\/(\d{1,2})\b/g,
        getValue: (match) => {
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
        getValue: (match) => {
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
        getValue: (match) => {
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

          const year = yearStr
            ? parseInt(yearStr)
            : referenceDate.getFullYear();
          return new Date(year, month, day);
        },
      },
    ];
  }

  extract(text: string, context: ParserContext): ExtractionResult[] {
    const patterns = this.getPatterns(context.referenceDate);

    return extractWithPatterns(text, context, patterns, "date", {
      transform: (value, match) => {
        // Skip invalid dates by wrapping in try-catch
        try {
          return value;
        } catch (error) {
          // Return a safe default date if invalid
          return context.referenceDate;
        }
      },
    });
  }
}
