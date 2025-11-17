import { addDays, addWeeks, addMonths, addYears } from "date-fns";
import type { Extractor } from "../base/Extractor";
import type { ExtractionResult, ParserContext } from "../../types";
import { buildBoundedPattern } from "../../utils/patterns";

export class DurationDateExtractor implements Extractor {
  readonly name = "duration-date-extractor";
  readonly type = "date";

  extract(text: string, context: ParserContext): ExtractionResult[] {
    const results: ExtractionResult[] = [];
    const now = context.referenceDate;

    // Days: "in 3d", "in 1 day", "in 2 days"
    const dayPatterns = [
      {
        pattern: buildBoundedPattern("(in (\\d+)d)"),
        getFutureDate: (days: number) => addDays(now, days),
      },
      {
        pattern: buildBoundedPattern("(in (\\d+)\\s+day)"),
        getFutureDate: (days: number) => addDays(now, days),
      },
      {
        pattern: buildBoundedPattern("(in (\\d+)\\s+days)"),
        getFutureDate: (days: number) => addDays(now, days),
      },
    ];

    // Weeks: "in 1w", "in 1 week", "in 2 weeks"
    const weekPatterns = [
      {
        pattern: buildBoundedPattern("(in (\\d+)w)"),
        getFutureDate: (weeks: number) => addWeeks(now, weeks),
      },
      {
        pattern: buildBoundedPattern("(in (\\d+)\\s+week)"),
        getFutureDate: (weeks: number) => addWeeks(now, weeks),
      },
      {
        pattern: buildBoundedPattern("(in (\\d+)\\s+weeks)"),
        getFutureDate: (weeks: number) => addWeeks(now, weeks),
      },
    ];

    // Months: "in 2mo", "in 1 month", "in 3 months"
    const monthPatterns = [
      {
        pattern: buildBoundedPattern("(in (\\d+)mo)"),
        getFutureDate: (months: number) => addMonths(now, months),
      },
      {
        pattern: buildBoundedPattern("(in (\\d+)\\s+month)"),
        getFutureDate: (months: number) => addMonths(now, months),
      },
      {
        pattern: buildBoundedPattern("(in (\\d+)\\s+months)"),
        getFutureDate: (months: number) => addMonths(now, months),
      },
    ];

    // Years: "in 1y", "in 2 years", "in 1 year"
    const yearPatterns = [
      {
        pattern: buildBoundedPattern("(in (\\d+)y)"),
        getFutureDate: (years: number) => addYears(now, years),
      },
      {
        pattern: buildBoundedPattern("(in (\\d+)\\s+year)"),
        getFutureDate: (years: number) => addYears(now, years),
      },
      {
        pattern: buildBoundedPattern("(in (\\d+)\\s+years)"),
        getFutureDate: (years: number) => addYears(now, years),
      },
    ];

    // Process all patterns
    const allPatterns = [
      ...dayPatterns,
      ...weekPatterns,
      ...monthPatterns,
      ...yearPatterns,
    ];

    for (const { pattern, getFutureDate } of allPatterns) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[0]; // Full match
        if (!captured) continue;

        // Check if disabled
        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const unitStr = match[2]; // The numeric value
        if (!unitStr) continue;

        const startIndex = match.index || 0;
        const numericValue = parseInt(unitStr);
        const futureDate = getFutureDate(numericValue);

        results.push({
          type: "date",
          value: futureDate,
          match: captured,
          startIndex,
          endIndex: startIndex + captured.length,
        });
      }
    }

    return results;
  }
}
