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
import { buildBoundedPattern } from "../../utils/patterns";

// Prefer day/month interpretation for ambiguous numeric dates when enabled via context.

function isValidDateComponents(
  year: number,
  month: number,
  day: number,
): boolean {
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return false;
  }

  const candidate = new Date(year, month - 1, day);
  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
}

function toMonthDay(
  first: number,
  second: number,
  preferDayMonthFormat: boolean,
): { month: number; day: number } | null {
  if (preferDayMonthFormat) {
    return { day: first, month: second };
  }
  return { month: first, day: second };
}

function buildDateFromNumericParts(
  year: number,
  first: number,
  second: number,
  preferDayMonthFormat: boolean,
): Date | null {
  const parts = toMonthDay(first, second, preferDayMonthFormat);
  if (!parts) {
    return null;
  }

  const { month, day } = parts;

  if (!isValidDateComponents(year, month, day)) {
    return null;
  }

  return new Date(year, month - 1, day);
}

export class DateExtractor implements Extractor {
  readonly name = "date-extractor";
  readonly type = "date";

  private readonly bounded = (body: string, flags: string = "gi"): RegExp =>
    buildBoundedPattern(body, flags);

  private getPatterns(
    referenceDate: Date,
    preferDayMonthFormat: boolean,
  ): Pattern<Date>[] {
    const bounded = this.bounded;

    return [
      // Relative dates
      {
        pattern: bounded("(today)"),
        getValue: () => startOfDay(referenceDate),
      },
      {
        pattern: bounded("(tod)"),
        getValue: () => startOfDay(referenceDate),
      },
      {
        pattern: bounded("(tomorrow)"),
        getValue: () => startOfDay(addDays(referenceDate, 1)),
      },
      {
        pattern: bounded("(tmr)"),
        getValue: () => startOfDay(addDays(referenceDate, 1)),
      },
      {
        pattern: bounded("(tom)"),
        getValue: () => startOfDay(addDays(referenceDate, 1)),
      },
      {
        pattern: bounded("(yesterday)"),
        getValue: () => startOfDay(subDays(referenceDate, 1)),
      },
      {
        pattern: bounded("(next week)"),
        getValue: () => startOfDay(addWeeks(referenceDate, 1)),
      },
      {
        pattern: bounded("(last week)"),
        getValue: () => startOfDay(subWeeks(referenceDate, 1)),
      },
      {
        pattern: bounded("(next month)"),
        getValue: () => startOfDay(addMonths(referenceDate, 1)),
      },
      {
        pattern: bounded("(last month)"),
        getValue: () => startOfDay(subMonths(referenceDate, 1)),
      },
      {
        pattern: bounded("(next year)"),
        getValue: () => startOfDay(addYears(referenceDate, 1)),
      },
      {
        pattern: bounded("(last year)"),
        getValue: () => startOfDay(subYears(referenceDate, 1)),
      },
      // "in X days/weeks/months/years" patterns
      {
        pattern: bounded("(in (\\d+) days?)"),
        getValue: (match) => {
          const daysStr = match[2];
          if (!daysStr) return referenceDate;
          const days = parseInt(daysStr);
          return startOfDay(addDays(referenceDate, days));
        },
      },
      {
        pattern: bounded("(in (\\d+) weeks?)"),
        getValue: (match) => {
          const weeksStr = match[2];
          if (!weeksStr) return referenceDate;
          const weeks = parseInt(weeksStr);
          return startOfDay(addWeeks(referenceDate, weeks));
        },
      },
      {
        pattern: bounded("(in (\\d+) months?)"),
        getValue: (match) => {
          const monthsStr = match[2];
          if (!monthsStr) return referenceDate;
          const months = parseInt(monthsStr);
          return startOfDay(addMonths(referenceDate, months));
        },
      },
      {
        pattern: bounded("(in (\\d+) years?)"),
        getValue: (match) => {
          const yearsStr = match[2];
          if (!yearsStr) return referenceDate;
          const years = parseInt(yearsStr);
          return startOfDay(addYears(referenceDate, years));
        },
      },
      // "in an hour/a week/a month/a year" patterns
      {
        pattern: bounded("(in an hour)"),
        getValue: () => new Date(referenceDate.getTime() + 60 * 60 * 1000),
      },
      {
        pattern: bounded("(in a day)"),
        getValue: () => startOfDay(addDays(referenceDate, 1)),
      },
      {
        pattern: bounded("(in a week)"),
        getValue: () => startOfDay(addWeeks(referenceDate, 1)),
      },
      {
        pattern: bounded("(in a month)"),
        getValue: () => startOfDay(addMonths(referenceDate, 1)),
      },
      {
        pattern: bounded("(in a year)"),
        getValue: () => startOfDay(addYears(referenceDate, 1)),
      },
      // Numeric date patterns
      {
        pattern: bounded("(\\d{1,2})/(\\d{1,2})", "g"),
        getValue: (match) => {
          const firstStr = match[1];
          const secondStr = match[2];
          if (!firstStr || !secondStr) return null;

          const first = Number.parseInt(firstStr, 10);
          const second = Number.parseInt(secondStr, 10);
          if (Number.isNaN(first) || Number.isNaN(second)) {
            return null;
          }

          return buildDateFromNumericParts(
            referenceDate.getFullYear(),
            first,
            second,
            preferDayMonthFormat,
          );
        },
      },
      {
        pattern: bounded("(\\d{1,2})/(\\d{1,2})/(\\d{2,4})", "g"),
        getValue: (match) => {
          const firstStr = match[1];
          const secondStr = match[2];
          const yearStr = match[3];
          if (!firstStr || !secondStr || !yearStr) return null;

          const first = Number.parseInt(firstStr, 10);
          const second = Number.parseInt(secondStr, 10);
          const parsedYear = Number.parseInt(yearStr, 10);

          if (
            Number.isNaN(first) ||
            Number.isNaN(second) ||
            Number.isNaN(parsedYear)
          ) {
            return null;
          }

          const fullYear = parsedYear < 100 ? 2000 + parsedYear : parsedYear;
          return buildDateFromNumericParts(
            fullYear,
            first,
            second,
            preferDayMonthFormat,
          );
        },
      },
      {
        pattern: bounded("(\\d{4})-(\\d{2})-(\\d{2})", "g"),
        getValue: (match) => {
          const yearStr = match[1];
          const monthStr = match[2];
          const dayStr = match[3];
          if (!yearStr || !monthStr || !dayStr) return null;

          const year = Number.parseInt(yearStr, 10);
          const month = Number.parseInt(monthStr, 10);
          const day = Number.parseInt(dayStr, 10);

          if (!isValidDateComponents(year, month, day)) {
            return null;
          }

          return new Date(year, month - 1, day);
        },
      },
      // Month name patterns
      {
        pattern: bounded(
          "(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|october|oct|november|nov|december|dec)\\s+(\\d{1,2})(?:\\s+(\\d{4}))?",
        ),
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
    const patterns = this.getPatterns(
      context.referenceDate,
      Boolean(context.preferDayMonthFormat),
    );

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
