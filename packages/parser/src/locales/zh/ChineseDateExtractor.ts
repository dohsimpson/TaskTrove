import { addDays, addWeeks, addMonths, addYears, startOfDay } from "date-fns";
import type { Extractor } from "../../extractors/base/Extractor";
import type { ExtractionResult, ParserContext } from "../../types";

// Chinese text doesn't typically use spaces as word boundaries
// We'll match patterns anywhere in the text

interface ChineseDatePattern {
  pattern: RegExp;
  getValue: (referenceDate: Date) => Date;
}

const CHINESE_DATE_PATTERNS: ChineseDatePattern[] = [
  // 今天 (today)
  {
    pattern: /(今天)/g,
    getValue: (ref) => startOfDay(ref),
  },
  // 明天 (tomorrow)
  {
    pattern: /(明天)/g,
    getValue: (ref) => startOfDay(addDays(ref, 1)),
  },
  // 昨天 (yesterday)
  {
    pattern: /(昨天)/g,
    getValue: (ref) => startOfDay(addDays(ref, -1)),
  },
  // 后天 (day after tomorrow)
  {
    pattern: /(后天)/g,
    getValue: (ref) => startOfDay(addDays(ref, 2)),
  },
  // 前天 (day before yesterday)
  {
    pattern: /(前天)/g,
    getValue: (ref) => startOfDay(addDays(ref, -2)),
  },
  // 下周 (next week)
  {
    pattern: /(下周)/g,
    getValue: (ref) => startOfDay(addDays(ref, 7)),
  },
  // 上周 (last week)
  {
    pattern: /(上周)/g,
    getValue: (ref) => startOfDay(addDays(ref, -7)),
  },
  // 下个月 (next month)
  {
    pattern: /(下个月)/g,
    getValue: (ref) => startOfDay(addDays(ref, 30)),
  },
  // 上个月 (last month)
  {
    pattern: /(上个月)/g,
    getValue: (ref) => startOfDay(addDays(ref, -30)),
  },
  // 明年 (next year)
  {
    pattern: /(明年)/g,
    getValue: (ref) => startOfDay(addDays(ref, 365)),
  },
  // 去年 (last year)
  {
    pattern: /(去年)/g,
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
