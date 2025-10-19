import { addDays, addWeeks, addMonths, addYears } from "date-fns";
import type { Extractor } from "../base/Extractor";
import type { ExtractionResult, ParserContext } from "../../types";

export class DurationDateExtractor implements Extractor {
  readonly name = "duration-date-extractor";
  readonly type = "date";

  extract(text: string, context: ParserContext): ExtractionResult[] {
    const results: ExtractionResult[] = [];
    const now = context.referenceDate;

    // Days: "in 3d", "in 1 day", "in 2 days"
    const dayPatterns = [
      {
        pattern: /\b(in (\d+)d)\b/gi,
        getFutureDate: (days: number) => addDays(now, days),
      },
      {
        pattern: /\b(in (\d+)\s+day)\b/gi,
        getFutureDate: (days: number) => addDays(now, days),
      },
      {
        pattern: /\b(in (\d+)\s+days)\b/gi,
        getFutureDate: (days: number) => addDays(now, days),
      },
    ];

    // Weeks: "in 1w", "in 1 week", "in 2 weeks"
    const weekPatterns = [
      {
        pattern: /\b(in (\d+)w)\b/gi,
        getFutureDate: (weeks: number) => addWeeks(now, weeks),
      },
      {
        pattern: /\b(in (\d+)\s+week)\b/gi,
        getFutureDate: (weeks: number) => addWeeks(now, weeks),
      },
      {
        pattern: /\b(in (\d+)\s+weeks)\b/gi,
        getFutureDate: (weeks: number) => addWeeks(now, weeks),
      },
    ];

    // Months: "in 2mo", "in 1 month", "in 3 months"
    const monthPatterns = [
      {
        pattern: /\b(in (\d+)mo)\b/gi,
        getFutureDate: (months: number) => addMonths(now, months),
      },
      {
        pattern: /\b(in (\d+)\s+month)\b/gi,
        getFutureDate: (months: number) => addMonths(now, months),
      },
      {
        pattern: /\b(in (\d+)\s+months)\b/gi,
        getFutureDate: (months: number) => addMonths(now, months),
      },
    ];

    // Years: "in 1y", "in 2 years", "in 1 year"
    const yearPatterns = [
      {
        pattern: /\b(in (\d+)y)\b/gi,
        getFutureDate: (years: number) => addYears(now, years),
      },
      {
        pattern: /\b(in (\d+)\s+year)\b/gi,
        getFutureDate: (years: number) => addYears(now, years),
      },
      {
        pattern: /\b(in (\d+)\s+years)\b/gi,
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
