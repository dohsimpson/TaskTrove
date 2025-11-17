import { addDays, addWeeks, addMonths, addYears, startOfDay } from "date-fns";
import type { Extractor } from "../../extractors/base/Extractor";
import type { ExtractionResult, ParserContext } from "../../types";
import { buildBoundedPattern } from "../../utils/patterns";

// Chinese text doesn't typically use spaces as word boundaries
// We'll match patterns anywhere in the text

interface ChineseDatePattern {
  pattern: RegExp;
  getValue: (referenceDate: Date) => Date;
}

const ASCII_WORD_CLASS = "A-Za-z0-9_";

const bounded = (body: string): RegExp =>
  buildBoundedPattern(body, "g", ASCII_WORD_CLASS);

const CHINESE_DATE_PATTERNS: ChineseDatePattern[] = [
  // 今天 (today)
  {
    pattern: bounded("(今天)"),
    getValue: (ref) => startOfDay(ref),
  },
  // 明天 (tomorrow)
  {
    pattern: bounded("(明天)"),
    getValue: (ref) => startOfDay(addDays(ref, 1)),
  },
  // 昨天 (yesterday)
  {
    pattern: bounded("(昨天)"),
    getValue: (ref) => startOfDay(addDays(ref, -1)),
  },
  // 后天 (day after tomorrow)
  {
    pattern: bounded("(后天)"),
    getValue: (ref) => startOfDay(addDays(ref, 2)),
  },
  // 前天 (day before yesterday)
  {
    pattern: bounded("(前天)"),
    getValue: (ref) => startOfDay(addDays(ref, -2)),
  },
  // 下周 (next week)
  {
    pattern: bounded("(下周)"),
    getValue: (ref) => startOfDay(addDays(ref, 7)),
  },
  // 上周 (last week)
  {
    pattern: bounded("(上周)"),
    getValue: (ref) => startOfDay(addDays(ref, -7)),
  },
  // 下个月 (next month)
  {
    pattern: bounded("(下个月)"),
    getValue: (ref) => startOfDay(addDays(ref, 30)),
  },
  // 上个月 (last month)
  {
    pattern: bounded("(上个月)"),
    getValue: (ref) => startOfDay(addDays(ref, -30)),
  },
  // 明年 (next year)
  {
    pattern: bounded("(明年)"),
    getValue: (ref) => startOfDay(addDays(ref, 365)),
  },
  // 去年 (last year)
  {
    pattern: bounded("(去年)"),
    getValue: (ref) => startOfDay(addDays(ref, -365)),
  },
];

export class ChineseDateExtractor implements Extractor {
  readonly name = "chinese-date-extractor";
  readonly type = "date";

  extract(text: string, context: ParserContext): ExtractionResult[] {
    const results: ExtractionResult[] = [];

    for (const { pattern, getValue } of CHINESE_DATE_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[1];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;
        const dateValue = getValue(context.referenceDate);

        results.push({
          type: "date",
          value: dateValue,
          match: captured,
          startIndex,
          endIndex: startIndex + captured.length,
        });
      }
    }

    return results;
  }
}
