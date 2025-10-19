import { TaskParser } from "@tasktrove/parser";
import type { ParsedTask, ParserContext } from "@tasktrove/parser";

interface DynamicPatternsConfig {
  projects?: Array<{ name: string }>;
  labels?: Array<{ name: string }>;
}

// Create default parser instance
const defaultParser = new TaskParser();

/**
 * Backwards-compatible adapter for the old parseEnhancedNaturalLanguage API
 */
export function parseEnhancedNaturalLanguage(
  text: string,
  disabledSections: Set<string> = new Set(),
  config?: DynamicPatternsConfig,
): ParsedTask {
  const context: ParserContext = {
    locale: "en",
    referenceDate: new Date(),
    disabledSections,
    projects: config?.projects,
    labels: config?.labels,
  };

  const result = defaultParser.parse(text, context);
  return result.parsed;
}

// Compatibility exports for functions that were in the old enhanced-natural-language-parser
export function convertTimeToHHMMSS(timeStr: string): string {
  // Convert time string like "3PM" or "14:00" to HH:MM:SS format
  const time = timeStr.trim();

  // Handle HH:MM format
  if (/^\d{1,2}:\d{2}$/.test(time)) {
    const [hours, minutes] = time.split(":").map(Number);
    if (hours !== undefined && minutes !== undefined) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;
    }
  }

  // Handle AM/PM format
  if (/^\d{1,2}\s*(AM|PM)$/i.test(time)) {
    const match = time.match(/^(\d{1,2})\s*(AM|PM)$/i);
    if (match && match[1] && match[2]) {
      let hours = parseInt(match[1]);
      const period = match[2].toUpperCase();

      if (period === "PM" && hours !== 12) {
        hours += 12;
      } else if (period === "AM" && hours === 12) {
        hours = 0;
      }

      return `${hours.toString().padStart(2, "0")}:00:00`;
    }
  }

  return "";
}

export function getPriorityDisplay(priority?: number): string {
  if (!priority) return "";
  return `P${priority}`;
}

export function getPriorityBackgroundColor(priority?: number): string {
  if (!priority) return "transparent";
  const colorMap = new Map([
    [1, "#dc2626"], // red-600
    [2, "#ea580c"], // orange-600
    [3, "#d97706"], // amber-600
    [4, "#6b7280"], // gray-500
  ]);
  return colorMap.get(priority) || "#6b7280";
}

export function getDateDisplay(date?: Date): string {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

export function getRecurringDisplay(recurring?: string): string {
  if (!recurring) return "";
  return recurring;
}

export function getTimeDisplay(time?: string): string {
  if (!time) return "";
  return time;
}

export function getDurationDisplay(duration?: string): string {
  if (!duration) return "";
  return duration;
}

// Re-export suggestions that were in the old parser
export const DATE_SUGGESTIONS = [
  { value: "today", display: "Today", icon: "📅" },
  { value: "tomorrow", display: "Tomorrow", icon: "📅" },
  { value: "yesterday", display: "Yesterday", icon: "📅" },
  { value: "next week", display: "Next Week", icon: "📅" },
  { value: "next month", display: "Next Month", icon: "📅" },
  { value: "next year", display: "Next Year", icon: "📅" },
];

export const TIME_SUGGESTIONS = [
  { value: "9AM", display: "9:00 AM", icon: "🕘" },
  { value: "12PM", display: "12:00 PM", icon: "🕛" },
  { value: "2PM", display: "2:00 PM", icon: "🕑" },
  { value: "3PM", display: "3:00 PM", icon: "🕑" },
  { value: "6PM", display: "6:00 PM", icon: "🕕" },
];

// Export type for compatibility
export type { ParsedTask };

// Compatibility constants for shared-patterns (simplified versions)
export const WORD_BOUNDARY_START = "(?:^|\\s)";
export const WORD_BOUNDARY_END = "(?=\\s|$)";

// Basic priority patterns for shared-patterns compatibility
export const PRIORITY_PATTERNS = [
  { level: 1, display: "P1 - Highest", pattern: /p1/gi },
  { level: 2, display: "P2 - High", pattern: /p2/gi },
  { level: 3, display: "P3 - Medium", pattern: /p3/gi },
  { level: 4, display: "P4 - Low", pattern: /p4/gi },
];

export const EXCLAMATION_PATTERNS = [
  { level: 1, pattern: /!!!/g },
  { level: 2, pattern: /!!/g },
  { level: 3, pattern: /!/g },
];

// Basic date patterns for shared-patterns compatibility
export const DATE_PATTERNS = [
  { display: "Today", pattern: /today/gi },
  { display: "Tomorrow", pattern: /tomorrow/gi },
  { display: "Yesterday", pattern: /yesterday/gi },
  { display: "Next week", pattern: /next week/gi },
  { display: "Next month", pattern: /next month/gi },
  { display: "Next year", pattern: /next year/gi },
];

export const DYNAMIC_DATE_PATTERNS = [
  { display: "In X days", pattern: /in \d+ days/gi },
  { display: "In X weeks", pattern: /in \d+ weeks/gi },
  { display: "This Monday", pattern: /this monday/gi },
  { display: "This Tuesday", pattern: /this tuesday/gi },
  { display: "This Wednesday", pattern: /this wednesday/gi },
  { display: "This Thursday", pattern: /this thursday/gi },
  { display: "This Friday", pattern: /this friday/gi },
  { display: "This Saturday", pattern: /this saturday/gi },
  { display: "This Sunday", pattern: /this sunday/gi },
  { display: "Next Monday", pattern: /next monday/gi },
  { display: "Next Tuesday", pattern: /next tuesday/gi },
  { display: "Next Wednesday", pattern: /next wednesday/gi },
  { display: "Next Thursday", pattern: /next thursday/gi },
  { display: "Next Friday", pattern: /next friday/gi },
  { display: "Next Saturday", pattern: /next saturday/gi },
  { display: "Next Sunday", pattern: /next sunday/gi },
];

export const ABSOLUTE_DATE_PATTERNS = [
  {
    display: "Jan 15",
    pattern: /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}/gi,
  },
  { display: "1/15", pattern: /\d{1,2}\/\d{1,2}/gi },
];

// Basic time patterns
export const TIME_PATTERNS = [
  { display: "3PM", pattern: /\d{1,2}(AM|PM)/gi },
  { display: "15:00", pattern: /\d{1,2}:\d{2}/gi },
];

// Basic duration patterns
export const DURATION_PATTERNS = [
  { display: "1h", pattern: /\d+h/gi },
  { display: "30m", pattern: /\d+m/gi },
  { display: "For 1 hour", pattern: /for \d+ hours?/gi },
];

// Basic recurring patterns
export const RECURRING_PATTERNS = [
  { display: "Daily", pattern: /daily/gi },
  { display: "Weekly", pattern: /weekly/gi },
  { display: "Monthly", pattern: /monthly/gi },
  { display: "Every day", pattern: /every day/gi },
  { display: "Every week", pattern: /every week/gi },
  { display: "Every month", pattern: /every month/gi },
];

export const DYNAMIC_RECURRING_PATTERNS = [
  { display: "Every X days", pattern: /every \d+ days/gi },
  {
    display: "Every Monday",
    pattern:
      /every (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
  },
];
