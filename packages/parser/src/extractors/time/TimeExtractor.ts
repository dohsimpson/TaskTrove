import type { Extractor } from "../base/Extractor";
import type { ExtractionResult, ParserContext } from "../../types";

interface TimePattern {
  pattern: RegExp;
  getValue: (match: RegExpMatchArray) => string;
}

// "at" patterns (must be processed first to avoid conflicts)
const AT_PATTERNS: TimePattern[] = [
  {
    pattern: /\b(at\s+(\d{1,2})(AM|PM|am|pm))\b/gi,
    getValue: (match) => {
      const hourStr = match[2];
      const periodStr = match[3];
      if (!hourStr || !periodStr) return "00:00";

      const hour = parseInt(hourStr);
      const period = periodStr.toUpperCase();

      if (period === "AM") {
        if (hour === 12) return "00:00"; // 12AM = midnight
        if (hour < 12) return `${hour.toString().padStart(2, "0")}:00`;
      } else {
        // PM
        if (hour === 12) return "12:00"; // 12PM = noon
        if (hour < 12) return `${(hour + 12).toString().padStart(2, "0")}:00`;
      }
      return `${hour.toString().padStart(2, "0")}:00`;
    },
  },
  {
    pattern: /\b(at\s+(\d{1,2}):(\d{2})(AM|PM|am|pm))\b/gi,
    getValue: (match) => {
      const hourStr = match[2];
      const minuteStr = match[3];
      const periodStr = match[4];
      if (!hourStr || !minuteStr || !periodStr) return "00:00";

      const hour = parseInt(hourStr);
      const minute = parseInt(minuteStr);
      const period = periodStr.toUpperCase();

      if (period === "AM") {
        if (hour === 12) return `00:${minute.toString().padStart(2, "0")}`; // 12AM = midnight
        if (hour < 12)
          return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      } else {
        // PM
        if (hour === 12) return `12:${minute.toString().padStart(2, "0")}`; // 12PM = noon
        if (hour < 12)
          return `${(hour + 12).toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      }
      return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
    },
  },
  {
    pattern: /\b(at\s+(\d{1,2}):(\d{2}))\b/g,
    getValue: (match) => {
      const hourStr = match[2];
      const minuteStr = match[3];
      if (!hourStr || !minuteStr) return "00:00";

      const hour = parseInt(hourStr);
      const minute = parseInt(minuteStr);

      // Validate 24-hour format (00-23:00-59)
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      }
      return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
    },
  },
];

// Special time words
const SPECIAL_PATTERNS: TimePattern[] = [
  {
    pattern: /\b(noon)\b/gi,
    getValue: (match) => "12:00",
  },
  {
    pattern: /\b(midnight)\b/gi,
    getValue: (match) => "00:00",
  },
];

// 12-hour patterns with AM/PM (processed after "at" patterns)
const HOUR_12_PATTERNS: TimePattern[] = [
  {
    pattern: /\b(\d{1,2})(AM|PM|am|pm)\b/gi,
    getValue: (match) => {
      const hourStr = match[1];
      const periodStr = match[2];
      if (!hourStr || !periodStr) return "00:00";

      const hour = parseInt(hourStr);
      const period = periodStr.toUpperCase();

      if (period === "AM") {
        if (hour === 12) return "00:00"; // 12AM = midnight
        if (hour < 12) return `${hour.toString().padStart(2, "0")}:00`;
      } else {
        // PM
        if (hour === 12) return "12:00"; // 12PM = noon
        if (hour < 12) return `${(hour + 12).toString().padStart(2, "0")}:00`;
      }
      return `${hour.toString().padStart(2, "0")}:00`;
    },
  },
  {
    pattern: /\b(\d{1,2}):(\d{2})(AM|PM|am|pm)\b/gi,
    getValue: (match) => {
      const hourStr = match[1];
      const minuteStr = match[2];
      const periodStr = match[3];
      if (!hourStr || !minuteStr || !periodStr) return "00:00";

      const hour = parseInt(hourStr);
      const minute = parseInt(minuteStr);
      const period = periodStr.toUpperCase();

      if (period === "AM") {
        if (hour === 12) return `00:${minute.toString().padStart(2, "0")}`; // 12AM = midnight
        if (hour < 12)
          return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      } else {
        // PM
        if (hour === 12) return `12:${minute.toString().padStart(2, "0")}`; // 12PM = noon
        if (hour < 12)
          return `${(hour + 12).toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      }
      return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
    },
  },
];

// 24-hour patterns (processed last)
const HOUR_24_PATTERNS: TimePattern[] = [
  {
    pattern: /\b(\d{1,2}):(\d{2})\b/g,
    getValue: (match) => {
      const hourStr = match[1];
      const minuteStr = match[2];
      if (!hourStr || !minuteStr) return "00:00";

      const hour = parseInt(hourStr);
      const minute = parseInt(minuteStr);

      // Validate 24-hour format (00-23:00-59)
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      }
      return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
    },
  },
];

export class TimeExtractor implements Extractor {
  readonly name = "time-extractor";
  readonly type = "time";

  extract(text: string, context: ParserContext): ExtractionResult[] {
    const results: ExtractionResult[] = [];
    const seenRanges: Array<{ start: number; end: number }> = [];

    // Helper function to check for overlaps
    const hasOverlap = (start: number, end: number): boolean => {
      return seenRanges.some((range) => start < range.end && end > range.start);
    };

    // Helper function to add a result and track its range
    // More specific patterns (longer) should replace generic ones (shorter)
    const addResult = (result: ExtractionResult) => {
      const overlappingIndex = seenRanges.findIndex(
        (range) =>
          result.startIndex < range.end && result.endIndex > range.start,
      );

      if (overlappingIndex === -1) {
        // No overlap, add normally
        results.push(result);
        seenRanges.push({ start: result.startIndex, end: result.endIndex });
      } else {
        // Has overlap, prefer longer (more specific) match
        const existingRange = seenRanges[overlappingIndex];
        if (!existingRange) return;

        const existingLength = existingRange.end - existingRange.start;
        const newLength = result.endIndex - result.startIndex;

        if (newLength > existingLength) {
          // Replace with more specific match
          results[overlappingIndex] = result;
          seenRanges[overlappingIndex] = {
            start: result.startIndex,
            end: result.endIndex,
          };
        }
        // If same length or shorter, keep existing
      }
    };

    // Extract "at" patterns first to avoid conflicts
    for (const { pattern, getValue } of AT_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[0]; // Full match
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;

        addResult({
          type: "time",
          value: getValue(match),
          match: captured,
          startIndex,
          endIndex: startIndex + captured.length,
        });
      }
    }

    // Extract special time patterns (noon, midnight)
    for (const { pattern, getValue } of SPECIAL_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[0];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;

        addResult({
          type: "time",
          value: getValue(match),
          match: captured,
          startIndex,
          endIndex: startIndex + captured.length,
        });
      }
    }

    // Extract 12-hour patterns with AM/PM
    for (const { pattern, getValue } of HOUR_12_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[0];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;

        addResult({
          type: "time",
          value: getValue(match),
          match: captured,
          startIndex,
          endIndex: startIndex + captured.length,
        });
      }
    }

    // Extract 24-hour patterns
    for (const { pattern, getValue } of HOUR_24_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[0];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;

        addResult({
          type: "time",
          value: getValue(match),
          match: captured,
          startIndex,
          endIndex: startIndex + captured.length,
        });
      }
    }

    return results;
  }
}
