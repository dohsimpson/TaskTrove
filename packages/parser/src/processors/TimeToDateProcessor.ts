import { startOfDay } from "date-fns";
import type { Processor } from "./base/Processor";
import type { ExtractionResult, ParserContext } from "@tasktrove/parser/types";

export class TimeToDateProcessor implements Processor {
  readonly name = "time-to-date-processor";

  process(
    results: ExtractionResult[],
    context: ParserContext,
  ): ExtractionResult[] {
    const hasDate = results.some((r) => r.type === "date");
    const timeResults = results.filter((r) => r.type === "time");
    const otherResults = results.filter(
      (r) => r.type !== "time" && r.type !== "date",
    );

    // If there's already a date, don't create one
    if (hasDate) {
      return results;
    }

    // Only create today's date if there are explicit time patterns (like "at 3PM", "14:00")
    // but NOT for duration patterns (like "in 5min", "in 2h")
    const hasExplicitTime = timeResults.some((r) => !r.match.startsWith("in "));

    if (hasExplicitTime) {
      const todayResult: ExtractionResult = {
        type: "date",
        value: startOfDay(context.referenceDate),
        match: "", // Empty match since it's implied, not explicitly in text
        startIndex: -1, // Special position to indicate it's implied
        endIndex: -1,
      };

      return [...otherResults, todayResult, ...timeResults];
    }

    // No explicit time results, return as-is (duration patterns should not create dates)
    return results;
  }
}
