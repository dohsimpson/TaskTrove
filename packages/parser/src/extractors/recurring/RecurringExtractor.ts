import type { Extractor } from "../base/Extractor";
import type { ExtractionResult, ParserContext } from "../../types";
import {
  START_BOUNDARY,
  END_BOUNDARY,
  ensureUnicodeFlag,
} from "../../utils/patterns";

const WORD_BOUNDARY_START = "(?:^|\\s)";
const WORD_BOUNDARY_END = "(?=[,.;:]|\\s|$)";

interface RecurringPattern {
  pattern: RegExp;
  getValue: (match: RegExpMatchArray) => string;
}

// Shared weekday mapping for RRULE format
const WEEKDAY_TO_RRULE: { [key: string]: string } = {
  mon: "MO",
  monday: "MO",
  tue: "TU",
  tuesday: "TU",
  wed: "WE",
  wednesday: "WE",
  thu: "TH",
  thursday: "TH",
  fri: "FR",
  friday: "FR",
  sat: "SA",
  saturday: "SA",
  sun: "SU",
  sunday: "SU",
};

// Shared ordinal mapping for month days
const ORDINAL_TO_NUMBER: { [key: string]: string } = {
  "1st": "1",
  "2nd": "2",
  "3rd": "3",
  "4th": "4",
  "5th": "5",
};

// Ordinal word to number mapping (for month day patterns)
const ORDINAL_WORD_TO_NUMBER: { [key: string]: string } = {
  first: "1",
  second: "2",
  third: "3",
  fourth: "4",
  fifth: "5",
  sixth: "6",
  seventh: "7",
  eighth: "8",
  ninth: "9",
  tenth: "10",
  eleventh: "11",
  twelfth: "12",
  thirteenth: "13",
  fourteenth: "14",
  fifteenth: "15",
  sixteenth: "16",
  seventeenth: "17",
  eighteenth: "18",
  nineteenth: "19",
  twentieth: "20",
  "twenty-first": "21",
  "twenty-second": "22",
  "twenty-third": "23",
  "twenty-fourth": "24",
  "twenty-fifth": "25",
  "twenty-sixth": "26",
  "twenty-seventh": "27",
  "twenty-eighth": "28",
  "twenty-ninth": "29",
  thirtieth: "30",
  "thirty-first": "31",
};

const WEEKDAY_SEQUENCE = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const WORKDAY_BYDAY = "MO,TU,WE,TH,FR";

function normalizeWeekdayToken(token: string | undefined): string | null {
  if (!token) return null;
  const cleaned = token
    .trim()
    .toLowerCase()
    .replace(/^(?:every|ev)\s+/, "");
  return WEEKDAY_TO_RRULE[cleaned] || null;
}

function expandWeekdayRange(startToken: string, endToken: string): string[] {
  const start = normalizeWeekdayToken(startToken);
  const end = normalizeWeekdayToken(endToken);
  if (!start || !end) return [];

  const startIndex = WEEKDAY_SEQUENCE.indexOf(start);
  const endIndex = WEEKDAY_SEQUENCE.indexOf(end);
  if (startIndex === -1 || endIndex === -1) {
    return [];
  }

  if (startIndex <= endIndex) {
    return WEEKDAY_SEQUENCE.slice(startIndex, endIndex + 1);
  }

  return [
    ...WEEKDAY_SEQUENCE.slice(startIndex),
    ...WEEKDAY_SEQUENCE.slice(0, endIndex + 1),
  ];
}

// Convert simple recurring values to RRULE format
function convertToRRule(value: string): string {
  // Handle simple frequencies
  if (value === "daily") return "RRULE:FREQ=DAILY";
  if (value === "weekly") return "RRULE:FREQ=WEEKLY";
  if (value === "monthly") return "RRULE:FREQ=MONTHLY";
  if (value === "yearly") return "RRULE:FREQ=YEARLY";
  if (value === "hourly") return "RRULE:FREQ=HOURLY";
  if (value === "quarterly") return "RRULE:FREQ=MONTHLY;INTERVAL=3";

  // Handle weekly with specific day
  if (value.startsWith("weekly ")) {
    const weekday = value.substring(7); // Remove "weekly " prefix (7 chars)
    const rruleDay = WEEKDAY_TO_RRULE[weekday];
    if (rruleDay) return `RRULE:FREQ=WEEKLY;BYDAY=${rruleDay}`;
  }

  // Handle multi-day patterns
  if (value.startsWith("weekly multi")) {
    const daysStr = value.substring(12); // Remove "weekly multi" prefix (12 chars)
    return `RRULE:FREQ=WEEKLY;BYDAY=${daysStr}`;
  }

  // If value is already an RRULE, return as-is
  if (value.startsWith("RRULE:")) {
    return value;
  }

  // Handle "every X days/weeks/months/years/hours"
  const intervalMatch = value.match(
    /^every (\d+) (days?|weeks?|months?|years?|hours?)$/i,
  );
  if (intervalMatch && intervalMatch[2]) {
    const interval = intervalMatch[1];
    const unit = intervalMatch[2].toLowerCase();

    if (unit.startsWith("day")) return `RRULE:FREQ=DAILY;INTERVAL=${interval}`;
    if (unit.startsWith("week"))
      return `RRULE:FREQ=WEEKLY;INTERVAL=${interval}`;
    if (unit.startsWith("month"))
      return `RRULE:FREQ=MONTHLY;INTERVAL=${interval}`;
    if (unit.startsWith("year"))
      return `RRULE:FREQ=YEARLY;INTERVAL=${interval}`;
    if (unit.startsWith("hour"))
      return `RRULE:FREQ=HOURLY;INTERVAL=${interval}`;
  }

  // Handle time-of-day patterns
  if (value.includes(" at ")) {
    const frequency = value.split(" at ")[0];
    if (frequency === "daily") return "RRULE:FREQ=DAILY";
  }

  // Handle special cases
  if (
    value.toLowerCase() === "every workday" ||
    value.toLowerCase() === "every weekday"
  ) {
    return "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR";
  }

  if (value.toLowerCase() === "every weekend") {
    return "RRULE:FREQ=WEEKLY;BYDAY=SA,SU";
  }

  const workdayIntervalMatch = value.match(/^every (\d+) workdays?$/i);
  if (workdayIntervalMatch) {
    return `RRULE:FREQ=DAILY;INTERVAL=${workdayIntervalMatch[1]};BYDAY=${WORKDAY_BYDAY}`;
  }

  // Fallback to original value if no conversion found
  return value;
}

const SIMPLE_PATTERNS: RecurringPattern[] = [
  {
    pattern: new RegExp(
      `${START_BOUNDARY}(daily|every day)${END_BOUNDARY}`,
      ensureUnicodeFlag("gi"),
    ),
    getValue: (match) => "daily",
  },
  {
    pattern: new RegExp(
      `${START_BOUNDARY}(weekly|every week)${END_BOUNDARY}`,
      ensureUnicodeFlag("gi"),
    ),
    getValue: (match) => "weekly",
  },
  {
    pattern: new RegExp(
      `${START_BOUNDARY}(monthly|every month)${END_BOUNDARY}`,
      ensureUnicodeFlag("gi"),
    ),
    getValue: (match) => "monthly",
  },
  {
    pattern: new RegExp(
      `${START_BOUNDARY}(yearly|every year)${END_BOUNDARY}`,
      ensureUnicodeFlag("gi"),
    ),
    getValue: (match) => "yearly",
  },
  {
    pattern: new RegExp(
      `${START_BOUNDARY}(hourly|every hour)${END_BOUNDARY}`,
      ensureUnicodeFlag("gi"),
    ),
    getValue: (match) => "hourly",
  },
  {
    pattern: new RegExp(
      `${START_BOUNDARY}(quarterly|every quarter)${END_BOUNDARY}`,
      ensureUnicodeFlag("gi"),
    ),
    getValue: (match) => "quarterly",
  },
];

// Time-of-day patterns with default times
const TIME_OF_DAY_PATTERNS: RecurringPattern[] = [
  {
    pattern: new RegExp(
      `${START_BOUNDARY}(every morning)${END_BOUNDARY}`,
      ensureUnicodeFlag("gi"),
    ),
    getValue: (match) => "daily at 9am",
  },
  {
    pattern: new RegExp(
      `${START_BOUNDARY}(every afternoon)${END_BOUNDARY}`,
      ensureUnicodeFlag("gi"),
    ),
    getValue: (match) => "daily at 12pm",
  },
  {
    pattern: new RegExp(
      `${START_BOUNDARY}(every evening)${END_BOUNDARY}`,
      ensureUnicodeFlag("gi"),
    ),
    getValue: (match) => "daily at 7pm",
  },
  {
    pattern: new RegExp(
      `${START_BOUNDARY}(every night)${END_BOUNDARY}`,
      ensureUnicodeFlag("gi"),
    ),
    getValue: (match) => "daily at 10pm",
  },
];

// Multi-day list patterns (every monday, friday)
const MULTI_DAY_PATTERNS: RecurringPattern[] = [
  // Pattern with time: "ev mon, fri at 20:00" or "every monday, friday at 3PM"
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((every|ev) ([a-zA-Z]+(?:,\\s*(?:every|ev)?\\s*[a-zA-Z]+)+) at (\\d{1,2}(?::\\d{2})?(?:\\s*(?:AM|PM))?))${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const prefix = match[2]; // "every" or "ev"
      const dayList = match[3]; // "monday, friday" or "mon, fri"
      const timeStr = match[4]; // "20:00" or "3PM"

      if (!dayList) return "weekly";

      // Split by comma and clean up
      const days = dayList.split(",").map((day) => day.trim());

      // Convert directly to RRULE format using shared mapping
      const rruleDays: string[] = [];
      for (const day of days) {
        const rruleDay = normalizeWeekdayToken(day);
        if (rruleDay) {
          rruleDays.push(rruleDay);
        }
      }

      // Parse time to extract hour
      let hour: number | null = null;
      if (timeStr) {
        // Handle 24-hour format (20:00)
        const twentyFourMatch = timeStr.match(/^(\d{1,2})(?::(\d{2}))?$/);
        if (twentyFourMatch && twentyFourMatch[1]) {
          hour = parseInt(twentyFourMatch[1], 10);
        } else {
          // Handle 12-hour format with AM/PM (3PM, 9AM)
          const twelveHourMatch = timeStr.match(
            /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i,
          );
          if (twelveHourMatch && twelveHourMatch[1] && twelveHourMatch[3]) {
            let h = parseInt(twelveHourMatch[1], 10);
            const ampm = twelveHourMatch[3].toUpperCase();
            if (ampm === "PM" && h !== 12) {
              h += 12;
            } else if (ampm === "AM" && h === 12) {
              h = 0;
            }
            hour = h;
          }
        }
      }

      if (rruleDays.length > 0) {
        const rrule = `RRULE:FREQ=WEEKLY;BYDAY=${rruleDays.join(",")}`;
        return hour !== null ? `${rrule};BYHOUR=${hour}` : rrule;
      }

      return "weekly";
    },
  },
  // Pattern without time: "every monday, friday"
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(every|ev) ([a-zA-Z]+(?:,\\s*(?:every|ev)?\\s*[a-zA-Z]+)+)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const prefix = match[1]; // "every" or "ev"
      const dayList = match[2]; // "monday, friday" or "mon, fri"

      if (!dayList) return "weekly";

      // Split by comma and clean up
      const days = dayList.split(",").map((day) => day.trim());

      // Convert directly to RRULE format using shared mapping
      const rruleDays: string[] = [];
      for (const day of days) {
        const rruleDay = normalizeWeekdayToken(day);
        if (rruleDay) {
          rruleDays.push(rruleDay);
        }
      }

      return rruleDays.length > 0
        ? `weekly multi${rruleDays.join(",")}`
        : "weekly";
    },
  },
];

// Special patterns for workday handling
const SPECIAL_PATTERNS: RecurringPattern[] = [
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((?:every|ev) (?:workday|weekday))${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => "every workday",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((?:every|ev) weekend)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => "every weekend",
  },
];

const WEEKDAY_PATTERNS: RecurringPattern[] = [
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((?:every|ev) (monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun))${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const weekdayStr = match[2];
      if (!weekdayStr) return "weekly";

      const weekday = weekdayStr.toLowerCase();
      // Normalize to full day name for convertToRRule
      const normalizedDay =
        weekday.length === 3
          ? Object.keys(WEEKDAY_TO_RRULE).find(
              (key) =>
                key.startsWith(weekday) &&
                WEEKDAY_TO_RRULE[key] === WEEKDAY_TO_RRULE[weekday],
            ) || weekday
          : weekday;

      return `weekly ${normalizedDay}`;
    },
  },
];

const WEEKDAY_RANGE_PATTERNS: RecurringPattern[] = [
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((?:every|ev) (monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun)-(monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun))${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const startDay = match[2];
      const endDay = match[3];
      if (!startDay || !endDay) return "weekly";

      const expanded = expandWeekdayRange(startDay, endDay);
      return expanded.length > 0
        ? `RRULE:FREQ=WEEKLY;BYDAY=${expanded.join(",")}`
        : "weekly";
    },
  },
];

// Ordinal weekday patterns (every 2nd Monday, every 3rd Friday, etc.)
const ORDINAL_WEEKDAY_PATTERNS: RecurringPattern[] = [
  // Pattern with time: "every 3rd friday 8pm" or "every 2nd monday at 9am"
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((?:every|ev) (1st|2nd|3rd|4th|5th) (monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun)(?:\\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december))? (?:at )?(\\d{1,2}(?::\\d{2})?(?:AM|PM)?))${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const ordinal = match[2]; // "1st", "2nd", "3rd", "4th"
      const weekdayStr = match[3]; // "monday", "mon", etc.
      const monthStr = match[4]; // optional month
      const timeStr = match[5]; // "8pm" or "9am" or "20:00"

      if (!ordinal || !weekdayStr) return "weekly";

      const ordinalNum = ORDINAL_TO_NUMBER[ordinal.toLowerCase()];
      const rruleDay = WEEKDAY_TO_RRULE[weekdayStr.toLowerCase()];

      if (!rruleDay || !ordinalNum) return "weekly";

      // Parse time to extract hour
      let hour: number | null = null;
      if (timeStr) {
        // Handle 24-hour format (20:00)
        const twentyFourMatch = timeStr.match(/^(\d{1,2})(?::(\d{2}))?$/);
        if (twentyFourMatch && twentyFourMatch[1]) {
          hour = parseInt(twentyFourMatch[1], 10);
        } else {
          // Handle 12-hour format with AM/PM (8pm, 9am)
          const twelveHourMatch = timeStr.match(
            /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i,
          );
          if (twelveHourMatch && twelveHourMatch[1] && twelveHourMatch[3]) {
            let h = parseInt(twelveHourMatch[1], 10);
            const ampm = twelveHourMatch[3].toUpperCase();
            if (ampm === "PM" && h !== 12) {
              h += 12;
            } else if (ampm === "AM" && h === 12) {
              h = 0;
            }
            hour = h;
          }
        }
      }

      // RRULE format: FREQ=MONTHLY;BYDAY=2MO (2nd Monday of month)
      let rrule = `RRULE:FREQ=MONTHLY;BYDAY=${ordinalNum}${rruleDay}`;
      if (monthStr) {
        const monthNum = MONTH_TO_NUMBER[monthStr.toLowerCase()];
        if (monthNum) {
          rrule = `RRULE:FREQ=YEARLY;BYDAY=${ordinalNum}${rruleDay};BYMONTH=${monthNum}`;
        }
      }
      return hour !== null ? `${rrule};BYHOUR=${hour}` : rrule;
    },
  },
  // Pattern without time: "every 2nd Monday" - negative lookahead to avoid matching when time follows
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((?:every|ev) (1st|2nd|3rd|4th|5th) (monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun)(?:\\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december))?)(?!\\s*(?:at\\s*)?\\d{1,2})${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const ordinal = match[2]; // "1st", "2nd", "3rd", "4th"
      const weekdayStr = match[3]; // "monday", "mon", etc.
      const monthStr = match[4];

      if (!ordinal || !weekdayStr) return "weekly";

      const ordinalNum = ORDINAL_TO_NUMBER[ordinal.toLowerCase()];
      const rruleDay = WEEKDAY_TO_RRULE[weekdayStr.toLowerCase()];

      if (!rruleDay || !ordinalNum) return "weekly";

      // RRULE format: FREQ=MONTHLY;BYDAY=2MO (2nd Monday of month)
      if (monthStr) {
        const monthNum = MONTH_TO_NUMBER[monthStr.toLowerCase()];
        if (monthNum) {
          return `RRULE:FREQ=YEARLY;BYDAY=${ordinalNum}${rruleDay};BYMONTH=${monthNum}`;
        }
      }

      return `RRULE:FREQ=MONTHLY;BYDAY=${ordinalNum}${rruleDay}`;
    },
  },
];

// Month name to number mapping
const MONTH_TO_NUMBER: { [key: string]: string } = {
  jan: "1",
  january: "1",
  feb: "2",
  february: "2",
  mar: "3",
  march: "3",
  apr: "4",
  april: "4",
  may: "5",
  jun: "6",
  june: "6",
  jul: "7",
  july: "7",
  aug: "8",
  august: "8",
  sep: "9",
  september: "9",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

const MONTH_NAME_PATTERN =
  "(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)";

const MONTH_DAY_PATTERNS: RecurringPattern[] = [
  // Yearly patterns with month name - must come first to avoid being caught by monthly patterns
  // "every jan 27th" or "ev january 27"
  {
    pattern: new RegExp(
      `${START_BOUNDARY}((?:every|ev) (jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december) (\\d{1,2})(?:st|nd|rd|th)?)${END_BOUNDARY}`,
      ensureUnicodeFlag("gi"),
    ),
    getValue: (match) => {
      const monthName = match[2]?.toLowerCase();
      const day = match[3];
      const month = monthName ? MONTH_TO_NUMBER[monthName] : null;
      if (!month || !day) return "RRULE:FREQ=YEARLY";
      return `RRULE:FREQ=YEARLY;BYMONTH=${month};BYMONTHDAY=${day}`;
    },
  },
  // Multiple month/date pairs: "every 14 jan, 14 apr, 15 jun, 15 sep"
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((?:every|ev) \\d{1,2}(?:st|nd|rd|th)? ${MONTH_NAME_PATTERN}(?:,\\s*\\d{1,2}(?:st|nd|rd|th)? ${MONTH_NAME_PATTERN})+)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const captured = match[1];
      if (!captured) return "RRULE:FREQ=YEARLY";
      const tokenRegex =
        /(\d{1,2})(?:st|nd|rd|th)?\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)/gi;
      const rules: string[] = [];
      let tokenMatch: RegExpExecArray | null;
      while ((tokenMatch = tokenRegex.exec(captured)) !== null) {
        const day = tokenMatch[1];
        const monthName = tokenMatch[2]?.toLowerCase();
        const monthNum = monthName ? MONTH_TO_NUMBER[monthName] : null;
        if (day && monthNum) {
          rules.push(`RRULE:FREQ=YEARLY;BYMONTH=${monthNum};BYMONTHDAY=${day}`);
        }
      }
      if (rules.length === 0) {
        return "RRULE:FREQ=YEARLY";
      }
      // Return newline-joined RRULEs to preserve pairing semantics
      return rules.join("\n");
    },
  },
  // "ev 7" pattern
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(ev (\\d{1,2}))(?!\\s+(?:day|days|week|weeks|month|months|year|years|hour|hours))${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const day = match[2];
      return `RRULE:FREQ=MONTHLY;BYMONTHDAY=${day}`;
    },
  },
  // Multiple explicit month days: "every 2, every 15, every 27"
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}(((?:every|ev) \\d{1,2}(?:st|nd|rd|th)?)(?:\\s*,\\s*(?:every|ev)?\\s*\\d{1,2}(?:st|nd|rd|th)?)+)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const captured = match[1];
      if (!captured) return "RRULE:FREQ=MONTHLY";
      const dayRegex = /(?:every|ev)?\s*(\d{1,2})(?:st|nd|rd|th)?/gi;
      const days: string[] = [];
      let dayMatch: RegExpExecArray | null;
      while ((dayMatch = dayRegex.exec(captured)) !== null) {
        if (dayMatch[1]) {
          days.push(dayMatch[1]);
        }
      }
      return days.length > 0
        ? `RRULE:FREQ=MONTHLY;BYMONTHDAY=${days.join(",")}`
        : "RRULE:FREQ=MONTHLY";
    },
  },
  // "every 7" pattern without suffix
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((?:every|ev) (\\d{1,2}))(?!\\s+(?:day|days|workday|workdays|week|weeks|month|months|year|years|hour|hours))(?!\\s*,\\s*(?:every|ev)?\\s*\\d)(?=(?:\\s|$|[,.]))`,
      "gi",
    ),
    getValue: (match) => {
      const day = match[2];
      return `RRULE:FREQ=MONTHLY;BYMONTHDAY=${day}`;
    },
  },
  // "every 27th" pattern - with negative lookahead to avoid matching "every 3rd friday"
  // The (?!.*(?:monday|mon|tuesday|tue|...)) prevents matching when followed by a weekday
  {
    pattern: new RegExp(
      `${START_BOUNDARY}(every (\\d{1,2})(?:st|nd|rd|th))(?!.*(?:monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun))${END_BOUNDARY}`,
      ensureUnicodeFlag("gi"),
    ),
    getValue: (match) => {
      const day = match[2];
      return `RRULE:FREQ=MONTHLY;BYMONTHDAY=${day}`;
    },
  },
  // "ev seventh" pattern - ordinal words
  {
    pattern: new RegExp(
      `${START_BOUNDARY}(ev (first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|twenty-first|twenty-second|twenty-third|twenty-fourth|twenty-fifth|twenty-sixth|twenty-seventh|twenty-eighth|twenty-ninth|thirtieth|thirty-first))${END_BOUNDARY}`,
      ensureUnicodeFlag("gi"),
    ),
    getValue: (match) => {
      const ordinalWord = match[2]?.toLowerCase();
      const day = ordinalWord ? ORDINAL_WORD_TO_NUMBER[ordinalWord] : null;
      if (!day) return "RRULE:FREQ=MONTHLY";
      return `RRULE:FREQ=MONTHLY;BYMONTHDAY=${day}`;
    },
  },
];

// Last position patterns (last day, last weekday)
const LAST_POSITION_PATTERNS: RecurringPattern[] = [
  // "ev last day" or "every last day" - last day of month
  {
    pattern: new RegExp(
      `${START_BOUNDARY}((ev|every) last day)${END_BOUNDARY}`,
      ensureUnicodeFlag("gi"),
    ),
    getValue: (match) => {
      return "RRULE:FREQ=MONTHLY;BYMONTHDAY=-1";
    },
  },
  // "ev last mon" or "every last monday" - last occurrence of weekday in month
  {
    pattern: new RegExp(
      `${START_BOUNDARY}((ev|every) last (monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun))${END_BOUNDARY}`,
      ensureUnicodeFlag("gi"),
    ),
    getValue: (match) => {
      const weekdayStr = match[3];
      if (!weekdayStr) return "RRULE:FREQ=MONTHLY";

      const rruleDay = WEEKDAY_TO_RRULE[weekdayStr.toLowerCase()];
      if (!rruleDay) return "RRULE:FREQ=MONTHLY";

      return `RRULE:FREQ=MONTHLY;BYDAY=-1${rruleDay}`;
    },
  },
];

const WORKDAY_POSITION_PATTERNS: RecurringPattern[] = [
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((?:every|ev) first workday)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => `RRULE:FREQ=MONTHLY;BYDAY=${WORKDAY_BYDAY};BYSETPOS=1`,
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((?:every|ev) last workday)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => `RRULE:FREQ=MONTHLY;BYDAY=${WORKDAY_BYDAY};BYSETPOS=-1`,
  },
];

// Every other patterns (skip logic with interval 2)
const EVERY_OTHER_PATTERNS: RecurringPattern[] = [
  // "every other friday" - specific weekday with interval 2
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((?:every|ev) other (monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun))${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const weekdayStr = match[2];
      if (!weekdayStr) return "RRULE:FREQ=WEEKLY;INTERVAL=2";

      const rruleDay = WEEKDAY_TO_RRULE[weekdayStr.toLowerCase()];
      if (!rruleDay) return "RRULE:FREQ=WEEKLY;INTERVAL=2";

      return `RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=${rruleDay}`;
    },
  },
  // "every other day"
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((?:every|ev) other day)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      return "RRULE:FREQ=DAILY;INTERVAL=2";
    },
  },
  // "every other week"
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((?:every|ev) other week)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      return "RRULE:FREQ=WEEKLY;INTERVAL=2";
    },
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((?:every|ev) other month)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => "RRULE:FREQ=MONTHLY;INTERVAL=2",
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((?:every|ev) other year)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: () => "RRULE:FREQ=YEARLY;INTERVAL=2",
  },
];

const INTERVAL_PATTERNS: RecurringPattern[] = [
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((?:every|ev) (\\d+) ((?:work)?days?))${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const days = match[2];
      const unit = match[3];
      if (unit?.startsWith("workday")) {
        return `every ${days} workday`;
      }
      return `every ${days} days`;
    },
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((?:every|ev) (\\d+) weeks?)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const weeks = match[2];
      return `every ${weeks} weeks`;
    },
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((?:every|ev) (\\d+) months?)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const months = match[2];
      return `every ${months} months`;
    },
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((?:every|ev) (\\d+) years?)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const years = match[2];
      return `every ${years} years`;
    },
  },
  {
    pattern: new RegExp(
      `${WORD_BOUNDARY_START}((?:every|ev) (\\d+) hours?)${WORD_BOUNDARY_END}`,
      "gi",
    ),
    getValue: (match) => {
      const hours = match[2];
      return `every ${hours} hours`;
    },
  },
];

export class RecurringExtractor implements Extractor {
  readonly name = "recurring-extractor";
  readonly type = "recurring";

  extract(text: string, context: ParserContext): ExtractionResult[] {
    const results: ExtractionResult[] = [];
    const blockedRanges: Array<{ start: number; end: number }> = [];
    const addResult = ({
      value,
      match,
      startIndex,
      endIndex,
    }: {
      value: string;
      match: string;
      startIndex: number;
      endIndex: number;
    }) => {
      results.push({
        type: "recurring",
        value,
        match,
        startIndex,
        endIndex,
      });
    };

    // Extract special patterns (workday/weekday)
    for (const { pattern, getValue } of SPECIAL_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[1];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;
        const endIndex = startIndex + (match[0]?.length || captured.length);

        const rawValue = getValue(match);
        addResult({
          value: convertToRRule(rawValue),
          match: captured,
          startIndex,
          endIndex,
        });
      }
    }

    // Extract simple patterns
    for (const { pattern, getValue } of SIMPLE_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[1];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;
        const endIndex = startIndex + (match[0]?.length || captured.length);

        const rawValue = getValue(match);
        const rruleValue = convertToRRule(rawValue);
        if (rawValue.includes("workday")) {
          results.push({
            type: "recurring",
            value: `RRULE:FREQ=DAILY;INTERVAL=${match[2]};BYDAY=${WORKDAY_BYDAY}`,
            match: captured,
            startIndex,
            endIndex: startIndex + (match[0]?.length || captured.length),
          });
          continue;
        }

        addResult({
          value: rruleValue,
          match: captured,
          startIndex,
          endIndex,
        });
      }
    }

    // Extract time-of-day patterns
    for (const { pattern, getValue } of TIME_OF_DAY_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[1];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;
        const endIndex = startIndex + (match[0]?.length || captured.length);

        const rawValue = getValue(match);
        const rruleValue = convertToRRule(rawValue);

        addResult({
          value: rruleValue,
          match: captured,
          startIndex,
          endIndex,
        });
      }
    }

    // Extract multi-day patterns
    for (const { pattern, getValue } of MULTI_DAY_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[0]; // Use full match
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;
        const endIndex = startIndex + (match[0]?.length || captured.length);

        const rawValue = getValue(match);
        addResult({
          value: convertToRRule(rawValue),
          match: captured.trim(),
          startIndex,
          endIndex,
        });
        blockedRanges.push({
          start: startIndex,
          end: startIndex + (match[0]?.length || captured.length),
        });
      }
    }

    // Extract weekday patterns
    for (const { pattern, getValue } of WEEKDAY_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[1];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;
        const endIndex = startIndex + (match[0]?.length || captured.length);

        const isBlocked = blockedRanges.some(
          (range) => startIndex >= range.start && startIndex < range.end,
        );
        if (isBlocked) {
          continue;
        }

        const rawValue = getValue(match);
        results.push({
          type: "recurring",
          value: convertToRRule(rawValue),
          match: captured,
          startIndex,
          endIndex,
        });
      }
    }

    // Extract weekday range patterns (mon-fri)
    for (const { pattern, getValue } of WEEKDAY_RANGE_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[1];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;
        const rruleValue = getValue(match);

        results.push({
          type: "recurring",
          value: rruleValue,
          match: captured,
          startIndex,
          endIndex: startIndex + (match[0]?.length || captured.length),
        });
      }
    }

    // Extract ordinal weekday patterns (every 2nd Monday, etc.)
    for (const { pattern, getValue } of ORDINAL_WEEKDAY_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[1];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;
        const endIndex = startIndex + (match[0]?.length || captured.length);

        const rruleValue = getValue(match);

        addResult({
          value: rruleValue,
          match: captured,
          startIndex,
          endIndex,
        });
      }
    }

    // Extract month day patterns
    for (const { pattern, getValue } of MONTH_DAY_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[1];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;
        const endIndex = startIndex + (match[0]?.length || captured.length);
        const isBlocked = blockedRanges.some(
          (range) => startIndex >= range.start && startIndex < range.end,
        );
        if (isBlocked) {
          continue;
        }

        const rruleValue = getValue(match);

        addResult({
          value: rruleValue,
          match: captured,
          startIndex,
          endIndex,
        });

        blockedRanges.push({ start: startIndex, end: endIndex });
      }
    }

    // Extract last position patterns (ev last day, ev last mon)
    for (const { pattern, getValue } of LAST_POSITION_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[1];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;
        const endIndex = startIndex + (match[0]?.length || captured.length);

        const rruleValue = getValue(match);

        addResult({
          value: rruleValue,
          match: captured,
          startIndex,
          endIndex,
        });
      }
    }

    // Extract workday position patterns (first/last workday)
    for (const { pattern, getValue } of WORKDAY_POSITION_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[1];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;
        const rruleValue = getValue(match);

        results.push({
          type: "recurring",
          value: rruleValue,
          match: captured,
          startIndex,
          endIndex: startIndex + (match[0]?.length || captured.length),
        });
      }
    }

    // Extract every other patterns (every other friday, every other day)
    for (const { pattern, getValue } of EVERY_OTHER_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[1];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;
        const endIndex = startIndex + (match[0]?.length || captured.length);

        const rruleValue = getValue(match);

        addResult({
          value: rruleValue,
          match: captured,
          startIndex,
          endIndex,
        });
      }
    }

    // Extract interval patterns
    for (const { pattern, getValue } of INTERVAL_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[1];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;
        const endIndex = startIndex + (match[0]?.length || captured.length);

        const rawValue = getValue(match);
        const rruleValue = convertToRRule(rawValue);

        addResult({
          value: rruleValue,
          match: captured,
          startIndex,
          endIndex,
        });
      }
    }

    return results.sort((a, b) => a.startIndex - b.startIndex);
  }
}

// Export the multi-day patterns for testing
export { MULTI_DAY_PATTERNS };
