import type { Processor } from "./base/Processor";
import type { ExtractionResult, ParserContext } from "@tasktrove/parser/types";

export class DateTimeSplitter implements Processor {
  readonly name = "datetime-splitter";

  process(
    results: ExtractionResult[],
    context: ParserContext,
  ): ExtractionResult[] {
    const processedResults: ExtractionResult[] = [];
    const dateResults = results.filter((r) => r.type === "date");
    const timeResults = results.filter((r) => r.type === "time");
    const otherResults = results.filter(
      (r) => r.type !== "date" && r.type !== "time",
    );

    // Process each date result to potentially split it into date + time
    for (const dateResult of dateResults) {
      const dateValue = dateResult.value as Date;

      // Check if this date came from a time-specific pattern
      const isTimePattern =
        dateResult.match &&
        (/^\s*in\s+\d+(?:min|h|sec|s|m|hours?)\b/i.test(dateResult.match) ||
          /^\s*in\s+\d+h\s*\d+m(?:in)?\b/i.test(dateResult.match));

      // Check if the date has a time component that's not midnight
      const hasTimeComponent =
        dateValue &&
        (dateValue.getHours() !== 0 ||
          dateValue.getMinutes() !== 0 ||
          dateValue.getSeconds() !== 0 ||
          dateValue.getMilliseconds() !== 0);

      // Only split into separate date + time if:
      // 1. It came from a time pattern (like "in 5min", "in 2h")
      // 2. AND it has a time component
      if (
        dateValue &&
        isTimePattern &&
        hasTimeComponent &&
        timeResults.length === 0
      ) {
        // Create a separate time result
        const hours = dateValue.getHours();
        const minutes = dateValue.getMinutes();
        const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

        const timeResult: ExtractionResult = {
          type: "time",
          value: timeString,
          match: dateResult.match, // Use the same match text
          startIndex: dateResult.startIndex,
          endIndex: dateResult.endIndex,
        };

        // Create a date-only result (midnight of that day)
        const dateOnlyResult = {
          ...dateResult,
          value: new Date(
            dateValue.getFullYear(),
            dateValue.getMonth(),
            dateValue.getDate(),
          ),
        };

        processedResults.push(dateOnlyResult);
        processedResults.push(timeResult);
      } else {
        // Keep the date result as-is
        processedResults.push(dateResult);
      }
    }

    // Add all other results
    processedResults.push(...timeResults);
    processedResults.push(...otherResults);

    return processedResults;
  }
}
