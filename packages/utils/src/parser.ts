import {
  format,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  nextMonday,
  nextFriday,
  startOfDay,
} from "date-fns";
import { CommonRRules, buildRRule, RRuleFrequency } from "@tasktrove/types";

export interface ParsedTask {
  title: string;
  project?: string;
  labels: string[];
  priority?: number;
  dueDate?: Date;
  time?: string;
  duration?: string;
  recurring?: string;
  originalText: string;
}

// Safe word boundary patterns - more reliable than \b for our use case
// Use non-capturing group + lookahead to avoid consuming boundary whitespace in captured content
const WORD_BOUNDARY_START = "(?:^|\\s)"; // Non-capturing: start of string or whitespace
const WORD_BOUNDARY_END = "(?=\\s|$)"; // Positive lookahead for whitespace or end of string

// Helper function to get "this weekday" date
function getThisWeekday(dayOfWeek: number): Date {
  const today = new Date();
  const thisWeekday = new Date(today);
  thisWeekday.setDate(today.getDate() + ((dayOfWeek - today.getDay() + 7) % 7));
  return thisWeekday;
}

// Shared weekday definitions
const WEEKDAYS = [
  { name: "sunday", shorthand: "sun", day: 0 },
  { name: "monday", shorthand: "mon", day: 1 },
  { name: "tuesday", shorthand: "tue", day: 2 },
  { name: "wednesday", shorthand: "wed", day: 3 },
  { name: "thursday", shorthand: "thu", day: 4 },
  { name: "friday", shorthand: "fri", day: 5 },
  { name: "saturday", shorthand: "sat", day: 6 },
] as const;

// Helper to generate "this weekday" patterns
function createThisWeekdayPatterns() {
  return WEEKDAYS.map(({ name, day }) => ({
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(this ${name})${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => getThisWeekday(day),
    display: `This ${name.charAt(0).toUpperCase() + name.slice(1)}`,
  }));
}

// Helper to generate bare weekday patterns (e.g., "monday", "saturday")
function createBareWeekdayPatterns() {
  return WEEKDAYS.map(({ name, day }) => ({
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(${name})${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => getThisWeekday(day),
    display: name.charAt(0).toUpperCase() + name.slice(1),
  }));
}

// Helper to generate shorthand weekday patterns (e.g., "mon", "sat")
function createShorthandWeekdayPatterns() {
  return WEEKDAYS.map(({ name, shorthand, day }) => ({
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(${shorthand})${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => getThisWeekday(day),
    display: name.charAt(0).toUpperCase() + name.slice(1),
  }));
}

// Helper to generate "this [shorthand]" weekday patterns (e.g., "this mon", "this sat")
function createThisShorthandWeekdayPatterns() {
  return WEEKDAYS.map(({ name, shorthand, day }) => ({
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(this ${shorthand})${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => getThisWeekday(day),
    display: `This ${name.charAt(0).toUpperCase() + name.slice(1)}`,
  }));
}

// Helper to generate "every [shorthand]" recurring patterns (e.g., "every mon", "every sat")
function createEveryShorthandWeekdayPatterns() {
  return WEEKDAYS.map(({ name, shorthand }) => ({
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every ${shorthand})${WORD_BOUNDARY_END}`,
      "gi",
    ),
    value: `every-${name}`,
    display: `Every ${name.charAt(0).toUpperCase() + name.slice(1)}`,
  }));
}

// Enhanced priority patterns - separate exclamation and p-notation patterns
const PRIORITY_PATTERNS = [
  {
    pattern: new RegExp(`${WORD_BOUNDARY_START}(p1)${WORD_BOUNDARY_END}`, "gi"),
    level: 1,
    display: "P1",
  },
  {
    pattern: new RegExp(`${WORD_BOUNDARY_START}(p2)${WORD_BOUNDARY_END}`, "gi"),
    level: 2,
    display: "P2",
  },
  {
    pattern: new RegExp(`${WORD_BOUNDARY_START}(p3)${WORD_BOUNDARY_END}`, "gi"),
    level: 3,
    display: "P3",
  },
  {
    pattern: new RegExp(`${WORD_BOUNDARY_START}(p4)${WORD_BOUNDARY_END}`, "gi"),
    level: 4,
    display: "P4",
  },
];

// Exclamation mark patterns - processed separately to avoid overlaps
// Use safe word boundaries with capture groups for exclamation marks
const EXCLAMATION_PATTERNS = [
  {
    pattern: new RegExp(`${WORD_BOUNDARY_START}(!!!)${WORD_BOUNDARY_END}`, "g"),
    level: 1,
    display: "P1",
  }, // !!! with safe boundaries
  {
    pattern: new RegExp(`${WORD_BOUNDARY_START}(!!)${WORD_BOUNDARY_END}`, "g"),
    level: 2,
    display: "P2",
  }, // !! with safe boundaries
  {
    pattern: new RegExp(`${WORD_BOUNDARY_START}(!)${WORD_BOUNDARY_END}`, "g"),
    level: 3,
    display: "P3",
  }, // ! with safe boundaries
];

// Enhanced date patterns
const DATE_PATTERNS: StaticDatePattern[] = [
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(today|tod)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => new Date(),
    display: "Today",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(tomorrow|tmr)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => addDays(new Date(), 1),
    display: "Tomorrow",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(yesterday)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => addDays(new Date(), -1),
    display: "Yesterday",
  },

  // Weekend patterns
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(this weekend)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => {
      const today = new Date();
      const saturday = new Date(today);
      saturday.setDate(today.getDate() + ((6 - today.getDay()) % 7));
      return saturday;
    },
    display: "This Weekend",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(next weekend)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => {
      const today = new Date();
      const saturday = new Date(today);
      saturday.setDate(today.getDate() + (6 - today.getDay()) + 7);
      return saturday;
    },
    display: "Next Weekend",
  },

  // Week and month patterns
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(this week)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => new Date(),
    display: "This Week",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(next week)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => addDays(new Date(), 7),
    display: "Next Week",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(this month)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => new Date(),
    display: "This Month",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(next month)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => addDays(new Date(), 30),
    display: "Next Month",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(this year)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => new Date(),
    display: "This Year",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(next year)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => addDays(new Date(), 365),
    display: "Next Year",
  },

  // Complete weekday patterns for "this X"
  ...createThisWeekdayPatterns(),

  // "This [shorthand]" weekday patterns (e.g., "this mon", "this sat")
  ...createThisShorthandWeekdayPatterns(),

  // Complete weekday patterns for "next X"
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(next monday)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => nextMonday(new Date()),
    display: "Next Monday",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(next tuesday)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => {
      const today = new Date();
      const nextTuesday = new Date(today);
      nextTuesday.setDate(today.getDate() + (2 - today.getDay() + 7));
      return nextTuesday;
    },
    display: "Next Tuesday",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(next wednesday)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => {
      const today = new Date();
      const nextWednesday = new Date(today);
      nextWednesday.setDate(today.getDate() + (3 - today.getDay() + 7));
      return nextWednesday;
    },
    display: "Next Wednesday",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(next thursday)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => {
      const today = new Date();
      const nextThursday = new Date(today);
      nextThursday.setDate(today.getDate() + (4 - today.getDay() + 7));
      return nextThursday;
    },
    display: "Next Thursday",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(next friday)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => nextFriday(new Date()),
    display: "Next Friday",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(next saturday)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => {
      const today = new Date();
      const nextSaturday = new Date(today);
      nextSaturday.setDate(today.getDate() + (6 - today.getDay() + 7));
      return nextSaturday;
    },
    display: "Next Saturday",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(next sunday)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => {
      const today = new Date();
      const nextSunday = new Date(today);
      nextSunday.setDate(today.getDate() + (0 - today.getDay() + 7));
      return nextSunday;
    },
    display: "Next Sunday",
  },

  // Bare weekday patterns (e.g., "monday", "saturday")
  ...createBareWeekdayPatterns(),

  // Shorthand weekday patterns (e.g., "mon", "sat")
  ...createShorthandWeekdayPatterns(),

  // Relative day patterns
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(in a day)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => addDays(new Date(), 1),
    display: "In a day",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(in a week)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => addWeeks(new Date(), 1),
    display: "In a week",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(in a month)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => addMonths(new Date(), 1),
    display: "In a month",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(in a year)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => addYears(new Date(), 1),
    display: "In a year",
  },
] as const;

// Special patterns that require match data
const DYNAMIC_DATE_PATTERNS: DynamicDatePattern[] = [
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(in (\\d+) days?)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match: RegExpMatchArray) => {
      const daysStr = match[2];
      if (!daysStr) return null;
      const days = parseInt(daysStr); // match[2] because match[1] is the full capture, match[2] is the number
      return addDays(new Date(), days);
    },
    display: (match: RegExpMatchArray) => `In ${match[2] || "?"} days`,
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(in (\\d+) weeks?)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match: RegExpMatchArray) => {
      const weeksStr = match[2];
      if (!weeksStr) return null;
      const weeks = parseInt(weeksStr);
      return addWeeks(new Date(), weeks);
    },
    display: (match: RegExpMatchArray) => `In ${match[2] || "?"} weeks`,
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(in (\\d+) months?)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match: RegExpMatchArray) => {
      const monthsStr = match[2];
      if (!monthsStr) return null;
      const months = parseInt(monthsStr);
      return addMonths(new Date(), months);
    },
    display: (match: RegExpMatchArray) => `In ${match[2] || "?"} months`,
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(in (\\d+) years?)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match: RegExpMatchArray) => {
      const yearsStr = match[2];
      if (!yearsStr) return null;
      const years = parseInt(yearsStr);
      return addYears(new Date(), years);
    },
    display: (match: RegExpMatchArray) => `In ${match[2] || "?"} years`,
  },
];

// Month name mappings for absolute date parsing
const MONTH_NAMES = {
  // Short form
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
  // Long form (excluding 'may' since it's already included above)
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
} as const;

// Type guard for month names
function isValidMonthName(
  monthName: string,
): monthName is keyof typeof MONTH_NAMES {
  return monthName in MONTH_NAMES;
}

// Helper function to validate if a date is actually valid (handles month-specific day validation)
function isValidDate(year: number, month: number, day: number): boolean {
  // Basic range validation
  if (month < 0 || month > 11 || day < 1 || day > 31) return false;

  // Create date and check if it matches what we expect
  const testDate = new Date(year, month, day);
  return (
    testDate.getFullYear() === year &&
    testDate.getMonth() === month &&
    testDate.getDate() === day
  );
}

// Absolute date patterns that require parsing month names and days
const ABSOLUTE_DATE_PATTERNS: AbsoluteDatePattern[] = [
  // Month name + day (jan 27, january 15)
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\\s+(\\d{1,2}))${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match: RegExpMatchArray) => {
      const monthNameStr = match[2];
      const dayStr = match[3];
      if (!monthNameStr || !dayStr) return null;
      const monthName = monthNameStr.toLowerCase();
      const day = parseInt(dayStr);
      // Type-safe month name lookup using proper type guard
      if (!isValidMonthName(monthName)) return null;
      const monthIndex = MONTH_NAMES[monthName];

      const currentDate = new Date();
      let targetYear = currentDate.getFullYear();

      // Check if date is valid for current year
      if (!isValidDate(targetYear, monthIndex, day)) {
        return null;
      }

      const targetDate = new Date(targetYear, monthIndex, day);

      // If the date has already passed this year, try next year
      if (targetDate < currentDate) {
        targetYear += 1;
        // Validate again for next year (important for leap year handling)
        if (!isValidDate(targetYear, monthIndex, day)) {
          return null;
        }
        targetDate.setFullYear(targetYear);
      }

      return targetDate;
    },
    display: (match: RegExpMatchArray) => `${match[2]} ${match[3]}`,
  },
  // Day + month name (27 jan, 15 february)
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((\\d{1,2})\\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december))${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match: RegExpMatchArray) => {
      const dayStr = match[2];
      const monthNameStr = match[3];
      if (!dayStr || !monthNameStr) return null;
      const day = parseInt(dayStr);
      const monthName = monthNameStr.toLowerCase();
      // Type-safe month name lookup using proper type guard
      if (!isValidMonthName(monthName)) return null;
      const monthIndex = MONTH_NAMES[monthName];

      const currentDate = new Date();
      let targetYear = currentDate.getFullYear();

      // Check if date is valid for current year
      if (!isValidDate(targetYear, monthIndex, day)) {
        return null;
      }

      const targetDate = new Date(targetYear, monthIndex, day);

      // If the date has already passed this year, try next year
      if (targetDate < currentDate) {
        targetYear += 1;
        // Validate again for next year (important for leap year handling)
        if (!isValidDate(targetYear, monthIndex, day)) {
          return null;
        }
        targetDate.setFullYear(targetYear);
      }

      return targetDate;
    },
    display: (match: RegExpMatchArray) => `${match[2]} ${match[3]}`,
  },
  // Numeric date formats (27/1, 1/27, 15/2, 2/15)
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((\\d{1,2})\\/(\\d{1,2}))${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match: RegExpMatchArray) => {
      const part1Str = match[2];
      const part2Str = match[3];
      if (!part1Str || !part2Str) return null;
      const part1 = parseInt(part1Str);
      const part2 = parseInt(part2Str);

      // Basic validation - both parts must be reasonable
      if (part1 < 1 || part1 > 31 || part2 < 1 || part2 > 31) {
        return null;
      }

      // Determine if it's day/month or month/day format
      let day: number, month: number;

      if (part1 > 12 && part2 <= 12) {
        // Must be day/month format (27/1)
        day = part1;
        month = part2 - 1; // Convert to 0-based month index
      } else if (part2 > 12 && part1 <= 12) {
        // Must be month/day format (1/27)
        month = part1 - 1; // Convert to 0-based month index
        day = part2;
      } else if (part1 <= 12 && part2 <= 12) {
        // Ambiguous case (1/2) - assume month/day (US format)
        month = part1 - 1; // Convert to 0-based month index
        day = part2;
      } else {
        // Both parts > 12, invalid date format
        return null;
      }

      const currentDate = new Date();
      let targetYear = currentDate.getFullYear();

      // Validate date for current year
      if (!isValidDate(targetYear, month, day)) {
        return null;
      }

      const targetDate = new Date(targetYear, month, day);

      // If the date has already passed this year, try next year
      if (targetDate < currentDate) {
        targetYear += 1;
        // Validate again for next year (important for leap year handling)
        if (!isValidDate(targetYear, month, day)) {
          return null;
        }
        targetDate.setFullYear(targetYear);
      }

      return targetDate;
    },
    display: (match: RegExpMatchArray) => match[1] || "",
  },
];

// Pattern type definitions
interface TimePattern {
  pattern: RegExp;
  type: "time";
  extractTime: boolean;
}

interface DurationPattern {
  pattern: RegExp;
  type: "duration";
  unit?: string;
}

interface RecurringPattern {
  pattern: RegExp;
  value: string;
  display: string;
  isDynamic?: boolean;
}

interface DynamicRecurringPattern {
  pattern: RegExp;
  getValue: (match: RegExpMatchArray) => string;
  display: (match: RegExpMatchArray) => string;
}

interface StaticDatePattern {
  pattern: RegExp;
  getValue: () => Date;
  display: string;
}

interface DynamicDatePattern {
  pattern: RegExp;
  getValue: (match: RegExpMatchArray) => Date | null;
  display: (match: RegExpMatchArray) => string;
}

interface AbsoluteDatePattern {
  pattern: RegExp;
  getValue: (match: RegExpMatchArray) => Date | null;
  display: (match: RegExpMatchArray) => string;
}

// Type guards for pattern discrimination
function isDynamicRecurringPattern(
  pattern: RecurringPattern | DynamicRecurringPattern,
): pattern is DynamicRecurringPattern {
  return "getValue" in pattern && typeof pattern.getValue === "function";
}

// New time patterns
const TIME_PATTERNS: TimePattern[] = [
  // Match "at 3PM" pattern first - must capture the full "at 3PM" including "at"
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(at\\s+\\d{1,2}(?::\\d{2})?(?:\\s*(?:AM|PM))?)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    type: "time",
    extractTime: true,
  },
  // Match standalone time patterns
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(\\d{1,2}:\\d{2}(?:\\s*(?:AM|PM))?)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    type: "time",
    extractTime: false,
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(\\d{1,2}(?:AM|PM))${WORD_BOUNDARY_END}`,
      "gi",
    ),
    type: "time",
    extractTime: false,
  },
];

// New duration patterns
const DURATION_PATTERNS: DurationPattern[] = [
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(for\\s+\\d+\\s*(?:hour|hr|minute|min|day)s?)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    type: "duration",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(\\d+h(?:our)?s?)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    type: "duration",
    unit: "hour",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(\\d+m(?:in)?s?)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    type: "duration",
    unit: "minute",
  },
];

// Enhanced recurring patterns
const RECURRING_PATTERNS: RecurringPattern[] = [
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every day|daily)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    value: "daily",
    display: "Daily",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every week|weekly)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    value: "weekly",
    display: "Weekly",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every month|monthly)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    value: "monthly",
    display: "Monthly",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every workday|every weekday)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    value: "every-workday",
    display: "Every workday",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every monday)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    value: "every-monday",
    display: "Every Monday",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every tuesday)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    value: "every-tuesday",
    display: "Every Tuesday",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every wednesday)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    value: "every-wednesday",
    display: "Every Wednesday",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every thursday)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    value: "every-thursday",
    display: "Every Thursday",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every friday)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    value: "every-friday",
    display: "Every Friday",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every saturday)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    value: "every-saturday",
    display: "Every Saturday",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every sunday)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    value: "every-sunday",
    display: "Every Sunday",
  },

  // "Every [shorthand]" weekday patterns (e.g., "every mon", "every sat")
  ...createEveryShorthandWeekdayPatterns(),

  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every weekend)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    value: "every-weekend",
    display: "Every weekend",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every other day)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    value: "every-other-day",
    display: "Every other day",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every other week)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    value: "every-other-week",
    display: "Every other week",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(biweekly)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    value: "biweekly",
    display: "Biweekly",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(quarterly)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    value: "quarterly",
    display: "Quarterly",
  },
];

// Dynamic recurring patterns that require match data
const DYNAMIC_RECURRING_PATTERNS: DynamicRecurringPattern[] = [
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every (\\d+) days?)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match: RegExpMatchArray) => `every-${match[2]}-days`,
    display: (match: RegExpMatchArray) => `Every ${match[2]} days`,
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every (\\d+) weeks?)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match: RegExpMatchArray) => `every-${match[2]}-weeks`,
    display: (match: RegExpMatchArray) => `Every ${match[2]} weeks`,
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every (\\d+) months?)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match: RegExpMatchArray) => `every-${match[2]}-months`,
    display: (match: RegExpMatchArray) => `Every ${match[2]} months`,
  },
];

/**
 * Convert old-style recurring patterns to RRULE format
 */
export function convertToRRule(recurringValue: string): string {
  switch (recurringValue) {
    case "daily":
      return CommonRRules.daily();
    case "weekly":
      return CommonRRules.weekly();
    case "monthly":
      return CommonRRules.monthly();
    case "quarterly":
      return buildRRule({ freq: RRuleFrequency.MONTHLY, interval: 3 });
    case "yearly":
      return CommonRRules.yearly();
    case "biweekly":
      return CommonRRules.everyNWeeks(2);
    case "every-workday":
    case "every-weekday":
      return CommonRRules.everyWeekday();
    case "every-weekend":
      return CommonRRules.everyWeekend();
    case "every-monday":
      return CommonRRules.everyMonday();
    case "every-tuesday":
      return CommonRRules.everyTuesday();
    case "every-wednesday":
      return CommonRRules.everyWednesday();
    case "every-thursday":
      return CommonRRules.everyThursday();
    case "every-friday":
      return CommonRRules.everyFriday();
    case "every-saturday":
      return CommonRRules.everySaturday();
    case "every-sunday":
      return CommonRRules.everySunday();
    case "every-other-day":
      return CommonRRules.everyNDays(2);
    case "every-other-week":
      return CommonRRules.everyNWeeks(2);
    default: {
      // Handle dynamic patterns like "every-3-days", "every-2-weeks", "every-6-months"
      const dynamicDayMatch = recurringValue.match(/^every-(\d+)-days?$/);
      if (dynamicDayMatch && dynamicDayMatch[1]) {
        const interval = parseInt(dynamicDayMatch[1], 10);
        return CommonRRules.everyNDays(interval);
      }

      const dynamicWeekMatch = recurringValue.match(/^every-(\d+)-weeks?$/);
      if (dynamicWeekMatch && dynamicWeekMatch[1]) {
        const interval = parseInt(dynamicWeekMatch[1], 10);
        return CommonRRules.everyNWeeks(interval);
      }

      const dynamicMonthMatch = recurringValue.match(/^every-(\d+)-months?$/);
      if (dynamicMonthMatch && dynamicMonthMatch[1]) {
        const interval = parseInt(dynamicMonthMatch[1], 10);
        return buildRRule({ freq: RRuleFrequency.MONTHLY, interval });
      }

      // If it's already an RRULE, return as-is
      if (recurringValue.startsWith("RRULE:")) {
        return recurringValue;
      }

      // Fallback: return as daily RRULE if we can't parse it
      console.warn(
        `Unknown recurring pattern: ${recurringValue}, defaulting to daily`,
      );
      return CommonRRules.daily();
    }
  }
}

interface DynamicPatternsConfig {
  projects?: Array<{ name: string }>;
  labels?: Array<{ name: string }>;
}

export function parseEnhancedNaturalLanguage(
  text: string,
  disabledSections: Set<string> = new Set(),
  config?: DynamicPatternsConfig,
): ParsedTask {
  let cleanText = text.trim();
  const parsed: ParsedTask = {
    title: "",
    labels: [],
    originalText: text,
  };

  // Extract project (#project) - only if not disabled, take the last one
  let projectMatches: string[] = [];
  let projectRegex: RegExp;

  if (config?.projects && config.projects.length > 0) {
    // Use dynamic patterns based on actual project names
    const projectNames = config.projects.map((p) =>
      p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    );
    projectRegex = new RegExp(`#(${projectNames.join("|")})`, "gi");
    const matches = cleanText.match(projectRegex);
    if (matches) {
      projectMatches = matches;
    }
  } else {
    // Fallback to static pattern for backward compatibility
    const matches = cleanText.match(/#(\w+)/g);
    if (matches) {
      projectMatches = matches;
      projectRegex = /#\w+/g;
    }
  }

  if (projectMatches.length > 0) {
    const enabledProjects = projectMatches.filter(
      (match) => !disabledSections.has(match.toLowerCase()),
    );
    if (enabledProjects.length > 0) {
      // Take the last project match and extract the name (remove #)
      const lastProject = enabledProjects[enabledProjects.length - 1];
      if (lastProject) {
        parsed.project = lastProject.substring(1);
      }

      // Remove all project matches from clean text
      if (config?.projects && config.projects.length > 0) {
        enabledProjects.forEach((project) => {
          cleanText = cleanText.replace(project, "").trim();
        });
      } else {
        cleanText = cleanText.replace(/#\w+/g, "").trim();
      }
    }
  }

  // Extract labels (@label) - only if not disabled, deduplicate
  let labelMatches: string[] = [];

  if (config?.labels && config.labels.length > 0) {
    // Use dynamic patterns based on actual label names
    const labelNames = config.labels.map((l) =>
      l.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    );
    const labelRegex = new RegExp(`@(${labelNames.join("|")})`, "gi");
    const matches = cleanText.match(labelRegex);
    if (matches) {
      labelMatches = matches;
    }
  } else {
    // Fallback to static pattern for backward compatibility
    const matches = cleanText.match(/@(\w+)/g);
    if (matches) {
      labelMatches = matches;
    }
  }

  if (labelMatches.length > 0) {
    const enabledLabels = labelMatches.filter(
      (match) => !disabledSections.has(match.toLowerCase()),
    );
    if (enabledLabels.length > 0) {
      // Deduplicate labels by converting to Set and back to array
      const uniqueLabels = [
        ...new Set(enabledLabels.map((label) => label.substring(1))),
      ];
      parsed.labels = uniqueLabels;

      // Remove all label matches from clean text
      enabledLabels.forEach((label) => {
        cleanText = cleanText.replace(label, "").trim();
      });
    }
  }

  // Extract priority - handle exclamation marks with precedence (longest first)
  const allPriorityMatches: (RegExpMatchArray & { level: number })[] = [];

  // Find all potential priority matches (both exclamation and p-notation)
  const allPatterns = [...EXCLAMATION_PATTERNS, ...PRIORITY_PATTERNS];

  for (const pattern of allPatterns) {
    const matches = [...cleanText.matchAll(pattern.pattern)];

    // All patterns now use capture groups, so always check match[1]
    const enabledMatches = matches.filter((match) => {
      const checkValue = match[1];
      if (!checkValue) return false;
      return !disabledSections.has(checkValue.toLowerCase());
    });

    for (const match of enabledMatches) {
      allPriorityMatches.push(Object.assign(match, { level: pattern.level }));
    }
  }

  // Remove overlapping exclamation marks (prioritize longest matches)
  const filteredMatches: (RegExpMatchArray & { level: number })[] = [];
  const processedRanges: Array<{ start: number; end: number }> = [];

  // Sort matches by position
  allPriorityMatches.sort((a, b) => (a.index || 0) - (b.index || 0));

  for (const match of allPriorityMatches) {
    const start = match.index || 0;
    const end = start + match[0].length;

    // Check if this match overlaps with any previously processed range
    const hasOverlap = processedRanges.some(
      (range) => start < range.end && end > range.start,
    );

    if (!hasOverlap) {
      filteredMatches.push(match);
      processedRanges.push({ start, end });
    } else {
      // If there's overlap, prefer the longer match (exclamation marks vs single !)
      const overlappingRange = processedRanges.find(
        (range) => start < range.end && end > range.start,
      );
      if (overlappingRange) {
        const existingMatchIndex = filteredMatches.findIndex(
          (m) =>
            (m.index || 0) >= overlappingRange.start &&
            (m.index || 0) < overlappingRange.end,
        );
        if (existingMatchIndex !== -1) {
          const existingMatch = filteredMatches[existingMatchIndex];
          if (!existingMatch) continue;
          // Replace if current match is longer
          if (match[0].length > existingMatch[0].length) {
            filteredMatches[existingMatchIndex] = match;
            processedRanges[processedRanges.indexOf(overlappingRange)] = {
              start,
              end,
            };
          }
        }
      }
    }
  }

  // Find the last priority match
  if (filteredMatches.length > 0) {
    const lastMatch = filteredMatches.reduce((latest, current) =>
      (current.index || 0) > (latest.index || 0) ? current : latest,
    );
    parsed.priority = lastMatch.level;
  }

  // Remove all priority matches from text (in reverse order to avoid position shifts)
  const sortedMatches = filteredMatches.sort(
    (a, b) => (b.index || 0) - (a.index || 0),
  );
  for (const match of sortedMatches) {
    const startIndex = match.index || 0;
    const endIndex = startIndex + match[0].length;

    // For exclamation patterns with capture groups, only remove the captured exclamation marks
    if (
      match[1] &&
      (match[1] === "!" || match[1] === "!!" || match[1] === "!!!")
    ) {
      // Find the position of the captured group within the full match
      const capturedText = match[1];
      const fullMatch = match[0];
      const captureStartOffset = fullMatch.indexOf(capturedText);
      const captureStart = startIndex + captureStartOffset;
      const captureEnd = captureStart + capturedText.length;
      cleanText =
        cleanText.substring(0, captureStart) +
        " ".repeat(capturedText.length) +
        cleanText.substring(captureEnd);
    } else {
      // For regular matches, remove the entire match
      cleanText =
        cleanText.substring(0, startIndex) +
        " ".repeat(match[0].length) +
        cleanText.substring(endIndex);
    }
  }
  cleanText = cleanText.replace(/\s+/g, " ").trim();

  // Extract time - only if not disabled, take the last occurrence
  let lastTimeMatch: { match: RegExpMatchArray; pattern: TimePattern } | null =
    null;
  const allTimeMatches: RegExpMatchArray[] = [];
  for (const timePattern of TIME_PATTERNS) {
    const matches = [...cleanText.matchAll(timePattern.pattern)];
    const enabledMatches = matches.filter((match) => {
      const checkValue = match[1];
      if (!checkValue) return false;
      return !disabledSections.has(checkValue.toLowerCase());
    });
    allTimeMatches.push(...enabledMatches);
    if (enabledMatches.length > 0) {
      // Take the last match for this time pattern
      const lastMatch = enabledMatches[enabledMatches.length - 1];
      if (!lastMatch) continue;
      // matchAll results always have index defined
      const lastIndex = lastMatch.index || 0;
      const prevIndex = lastTimeMatch?.match.index || 0;
      if (!lastTimeMatch || lastIndex > prevIndex) {
        lastTimeMatch = { match: lastMatch, pattern: timePattern };
      }
    }
  }
  if (lastTimeMatch) {
    if (lastTimeMatch.pattern.extractTime) {
      // For "at 3PM" patterns, extract just the time part, removing "at "
      const timeStr = lastTimeMatch.match[1];
      if (!timeStr) return parsed;
      parsed.time = timeStr.replace(/^at\s+/i, "").trim();
    } else {
      // For standalone time patterns, use the captured group
      parsed.time = lastTimeMatch.match[1] || lastTimeMatch.match[0];
    }
  }
  // Remove all time matches from text
  for (const match of allTimeMatches) {
    cleanText = cleanText.replace(match[0], " ").trim();
  }

  // Extract duration - only if not disabled, take the last occurrence
  let lastDurationMatch: {
    match: RegExpMatchArray;
    pattern: DurationPattern;
  } | null = null;
  const allDurationMatches: RegExpMatchArray[] = [];
  for (const durationPattern of DURATION_PATTERNS) {
    const matches = [...cleanText.matchAll(durationPattern.pattern)];
    const enabledMatches = matches.filter((match) => {
      const checkValue = match[1];
      if (!checkValue) return false;
      return !disabledSections.has(checkValue.toLowerCase());
    });
    allDurationMatches.push(...enabledMatches);
    if (enabledMatches.length > 0) {
      // Take the last match for this duration pattern
      const lastMatch = enabledMatches[enabledMatches.length - 1];
      if (!lastMatch) continue;
      // matchAll results always have index defined
      const currentIndex = lastMatch.index || 0;
      const lastIndex = lastDurationMatch?.match.index || 0;
      if (!lastDurationMatch || currentIndex > lastIndex) {
        lastDurationMatch = { match: lastMatch, pattern: durationPattern };
      }
    }
  }
  if (lastDurationMatch) {
    parsed.duration = lastDurationMatch.match[1];
  }
  // Remove all duration matches from text
  for (const match of allDurationMatches) {
    cleanText = cleanText.replace(match[0], " ").trim();
  }

  // Extract recurring patterns first - only if not disabled, take the last occurrence
  let lastRecurringMatch: {
    match: RegExpMatchArray;
    pattern: RecurringPattern | DynamicRecurringPattern;
    isDynamic?: boolean;
  } | null = null;
  const allRecurringMatches: RegExpMatchArray[] = [];

  // Check static recurring patterns
  for (const recurringPattern of RECURRING_PATTERNS) {
    const matches = [...cleanText.matchAll(recurringPattern.pattern)];
    const enabledMatches = matches.filter((match) => {
      const checkValue = match[1];
      if (!checkValue) return false;
      return !disabledSections.has(checkValue.toLowerCase());
    });
    allRecurringMatches.push(...enabledMatches);
    if (enabledMatches.length > 0) {
      // Take the last match for this recurring pattern
      const lastMatch = enabledMatches[enabledMatches.length - 1];
      if (!lastMatch) continue;
      // matchAll results always have index defined
      const currentIndex = lastMatch.index || 0;
      const lastIndex = lastRecurringMatch?.match.index || 0;
      if (!lastRecurringMatch || currentIndex > lastIndex) {
        lastRecurringMatch = {
          match: lastMatch,
          pattern: recurringPattern,
          isDynamic: false,
        };
      }
    }
  }

  // Check dynamic recurring patterns
  for (const recurringPattern of DYNAMIC_RECURRING_PATTERNS) {
    const matches = [...cleanText.matchAll(recurringPattern.pattern)];
    const enabledMatches = matches.filter((match) => {
      const checkValue = match[1];
      if (!checkValue) return false;
      return !disabledSections.has(checkValue.toLowerCase());
    });
    allRecurringMatches.push(...enabledMatches);
    if (enabledMatches.length > 0) {
      // Take the last match for this recurring pattern
      const lastMatch = enabledMatches[enabledMatches.length - 1];
      if (!lastMatch) continue;
      // matchAll results always have index defined
      const currentIndex = lastMatch.index || 0;
      const lastIndex = lastRecurringMatch?.match.index || 0;
      if (!lastRecurringMatch || currentIndex > lastIndex) {
        lastRecurringMatch = {
          match: lastMatch,
          pattern: recurringPattern,
          isDynamic: true,
        };
      }
    }
  }

  if (lastRecurringMatch) {
    let recurringValue: string;
    if (
      lastRecurringMatch.isDynamic &&
      isDynamicRecurringPattern(lastRecurringMatch.pattern)
    ) {
      recurringValue = lastRecurringMatch.pattern.getValue(
        lastRecurringMatch.match,
      );
    } else if (
      !lastRecurringMatch.isDynamic &&
      !isDynamicRecurringPattern(lastRecurringMatch.pattern)
    ) {
      recurringValue = lastRecurringMatch.pattern.value;
    } else {
      // Fallback - shouldn't happen if isDynamic flag is consistent
      throw new Error("Inconsistent pattern type and isDynamic flag");
    }
    // Convert old-style patterns to RRULE format
    parsed.recurring = convertToRRule(recurringValue);
  }
  // Remove all recurring matches from text
  for (const match of allRecurringMatches) {
    cleanText = cleanText.replace(match[0], " ").trim();
  }

  // Extract due date (only if no recurring pattern was found) - only if not disabled, take the last occurrence
  let lastDateMatch: {
    match: RegExpMatchArray;
    pattern: DynamicDatePattern | StaticDatePattern | AbsoluteDatePattern;
    type: "static" | "dynamic" | "absolute";
  } | null = null;
  const allDateMatches: RegExpMatchArray[] = [];

  // Check static date patterns first
  for (const datePattern of DATE_PATTERNS) {
    const matches = [...cleanText.matchAll(datePattern.pattern)];
    const enabledMatches = matches.filter(
      (match) => !disabledSections.has(match[0].toLowerCase().trim()),
    );
    allDateMatches.push(...enabledMatches);
    if (enabledMatches.length > 0) {
      // Take the last match for this date pattern
      const lastMatch = enabledMatches[enabledMatches.length - 1];
      if (!lastMatch) continue;
      // matchAll results always have index defined
      const currentIndex = lastMatch.index || 0;
      const lastIndex = lastDateMatch?.match.index || 0;
      if (!lastDateMatch || currentIndex > lastIndex) {
        lastDateMatch = {
          match: lastMatch,
          pattern: datePattern,
          type: "static",
        };
      }
    }
  }

  // Check dynamic date patterns
  for (const datePattern of DYNAMIC_DATE_PATTERNS) {
    const matches = [...cleanText.matchAll(datePattern.pattern)];
    const enabledMatches = matches.filter((match) => {
      const checkValue = match[1];
      if (!checkValue) return false;
      return !disabledSections.has(checkValue.toLowerCase());
    });
    allDateMatches.push(...enabledMatches);
    if (enabledMatches.length > 0) {
      // Take the last match for this date pattern
      const lastMatch = enabledMatches[enabledMatches.length - 1];
      if (!lastMatch) continue;
      // matchAll results always have index defined
      const currentIndex = lastMatch.index || 0;
      const lastIndex = lastDateMatch?.match.index || 0;
      if (!lastDateMatch || currentIndex > lastIndex) {
        lastDateMatch = {
          match: lastMatch,
          pattern: datePattern,
          type: "dynamic",
        };
      }
    }
  }

  // Check absolute date patterns (month name + day, day + month name, numeric formats)
  const validAbsoluteDateMatches: RegExpMatchArray[] = [];
  for (const datePattern of ABSOLUTE_DATE_PATTERNS) {
    const matches = [...cleanText.matchAll(datePattern.pattern)];
    const enabledMatches = matches.filter((match) => {
      const checkValue = match[1];
      if (!checkValue) return false;
      return !disabledSections.has(checkValue.toLowerCase());
    });

    // Only include matches that result in valid dates
    const validMatches = enabledMatches.filter((match) => {
      const testDate = datePattern.getValue(match);
      return testDate !== null;
    });

    validAbsoluteDateMatches.push(...validMatches);
    allDateMatches.push(...validMatches); // Only add valid matches to text removal list

    if (validMatches.length > 0) {
      // Take the last match for this date pattern
      const lastMatch = validMatches[validMatches.length - 1];
      if (!lastMatch) continue;
      // matchAll results always have index defined
      const currentIndex = lastMatch.index || 0;
      const lastIndex = lastDateMatch?.match.index || 0;
      if (!lastDateMatch || currentIndex > lastIndex) {
        lastDateMatch = {
          match: lastMatch,
          pattern: datePattern,
          type: "absolute",
        };
      }
    }
  }

  // Only set due date if no recurring pattern was found
  if (!parsed.recurring && lastDateMatch) {
    let dateValue: Date | null = null;

    if (lastDateMatch.type === "static") {
      // Static patterns have getValue() with no parameters
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      dateValue = (lastDateMatch.pattern as StaticDatePattern).getValue();
    } else if (lastDateMatch.type === "absolute") {
      // Absolute patterns have getValue(match) that can return null
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      dateValue = (lastDateMatch.pattern as AbsoluteDatePattern).getValue(
        lastDateMatch.match,
      );
    } else {
      // Dynamic patterns have getValue(match)
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      dateValue = (lastDateMatch.pattern as DynamicDatePattern).getValue(
        lastDateMatch.match,
      );
    }

    // Only set due date if we got a valid date (absolute date patterns can return null for invalid dates)
    if (dateValue) {
      parsed.dueDate = startOfDay(dateValue);
    }
  } else if (!parsed.recurring && parsed.time) {
    // If we have time but no date, set due date to today
    parsed.dueDate = startOfDay(new Date());
  }

  // Remove all date matches from text (regardless of whether recurring pattern is present)
  for (const match of allDateMatches) {
    cleanText = cleanText.replace(match[0], " ").trim();
  }

  // Clean up extra spaces and set title
  parsed.title = cleanText.replace(/\s+/g, " ").trim();

  return parsed;
}

/**
 * Converts a time string like "9AM", "2:30PM", "17:00" to HH:mm:ss format
 */
export function convertTimeToHHMMSS(timeString: string): string | null {
  if (!timeString) return null;

  const cleanTime = timeString.trim().toUpperCase();

  // Handle 24-hour format (e.g., "17:00", "09:30")
  const twentyFourHourMatch = cleanTime.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHourMatch) {
    const hoursStr = twentyFourHourMatch[1];
    const minutesStr = twentyFourHourMatch[2];
    if (!hoursStr || !minutesStr) return null;
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;
    }
  }

  // Handle AM/PM format (e.g., "9AM", "2:30PM", "11:45AM")
  const ampmMatch = cleanTime.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (ampmMatch) {
    const hoursStr = ampmMatch[1];
    const ampm = ampmMatch[3];
    if (!hoursStr || !ampm) return null;
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(ampmMatch[2] || "0", 10);

    // Convert to 24-hour format
    if (ampm === "PM" && hours !== 12) {
      hours += 12;
    } else if (ampm === "AM" && hours === 12) {
      hours = 0;
    }

    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;
    }
  }

  return null;
}

// Utility functions for displaying parsed values
export function getPriorityDisplay(priority: number): string {
  switch (priority) {
    case 1:
      return "P1";
    case 2:
      return "P2";
    case 3:
      return "P3";
    case 4:
      return "P4";
    default:
      return `P${priority}`;
  }
}

export function getPriorityColor(priority: number): string {
  switch (priority) {
    case 1:
      return "bg-red-500 hover:bg-red-600 text-white";
    case 2:
      return "bg-orange-500 hover:bg-orange-600 text-white";
    case 3:
      return "bg-blue-500 hover:bg-blue-600 text-white";
    case 4:
      return "bg-gray-500 hover:bg-gray-600 text-white";
    default:
      return "bg-gray-500 hover:bg-gray-600 text-white";
  }
}

export function getDateDisplay(date: Date): string {
  return format(date, "MMM d");
}

export function getRecurringDisplay(recurringValue: string): string {
  const recurringPattern = RECURRING_PATTERNS.find(
    (p) => p.value === recurringValue,
  );
  return recurringPattern?.display || recurringValue;
}

export function getTimeDisplay(time: string): string {
  // Normalize time format
  return time.toUpperCase().replace(/\s+/g, " ");
}

export function getDurationDisplay(duration: string): string {
  return duration.toLowerCase();
}

// Export pattern constants for use in autocomplete suggestions
export const DATE_SUGGESTIONS = [
  { value: "today", display: "Today", icon: "📅" },
  { value: "tod", display: "Today", icon: "📅" },
  { value: "tomorrow", display: "Tomorrow", icon: "📅" },
  { value: "tmr", display: "Tomorrow", icon: "📅" },
  { value: "next week", display: "Next week", icon: "📅" },
  { value: "next month", display: "Next month", icon: "📅" },
  { value: "this friday", display: "This Friday", icon: "📅" },
  { value: "every day", display: "Every day", icon: "🔄" },
  { value: "weekly", display: "Weekly", icon: "🔄" },
  { value: "monthly", display: "Monthly", icon: "🔄" },
];

export const TIME_SUGGESTIONS = [
  { value: "9AM", display: "9:00 AM", icon: "⏰" },
  { value: "10AM", display: "10:00 AM", icon: "⏰" },
  { value: "2PM", display: "2:00 PM", icon: "⏰" },
  { value: "5PM", display: "5:00 PM", icon: "⏰" },
  { value: "6PM", display: "6:00 PM", icon: "⏰" },
];

// Export pattern constants for shared use
export {
  PRIORITY_PATTERNS,
  EXCLAMATION_PATTERNS,
  DATE_PATTERNS,
  DYNAMIC_DATE_PATTERNS,
  ABSOLUTE_DATE_PATTERNS,
  TIME_PATTERNS,
  DURATION_PATTERNS,
  RECURRING_PATTERNS,
  DYNAMIC_RECURRING_PATTERNS,
  WORD_BOUNDARY_START,
  WORD_BOUNDARY_END,
};
