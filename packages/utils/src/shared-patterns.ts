import {
  PRIORITY_PATTERNS,
  EXCLAMATION_PATTERNS,
  DATE_PATTERNS,
  DYNAMIC_DATE_PATTERNS,
  ABSOLUTE_DATE_PATTERNS,
  TIME_PATTERNS,
  DURATION_PATTERNS,
  RECURRING_PATTERNS,
  DYNAMIC_RECURRING_PATTERNS,
  TIME_SUGGESTIONS,
  WORD_BOUNDARY_START,
  WORD_BOUNDARY_END,
} from "./parser";

export interface AutocompleteSuggestion {
  type:
    | "tag"
    | "project"
    | "date"
    | "priority"
    | "time"
    | "duration"
    | "recurring"
    | "estimation"
    | "create";
  value: string;
  display: string;
  description?: string;
}

export interface HighlightingPattern {
  type:
    | "project"
    | "label"
    | "time"
    | "date"
    | "priority"
    | "recurring"
    | "duration"
    | "estimation"
    | "text";
  regex: RegExp;
}

export interface AutocompleteDetectionPattern {
  type:
    | "tag"
    | "project"
    | "date"
    | "priority"
    | "time"
    | "duration"
    | "recurring"
    | "estimation";
  patterns: RegExp[];
  extractQuery: (match: RegExpMatchArray) => string;
}

/**
 * Generate date suggestions from parser patterns (all patterns the parser supports)
 */
export function generateDateSuggestions(): AutocompleteSuggestion[] {
  const suggestions: AutocompleteSuggestion[] = [];

  // Use static date patterns from parser (ones with string display property)
  DATE_PATTERNS.forEach((pattern) => {
    suggestions.push({
      type: "date",
      value: pattern.display.toLowerCase(),
      display: pattern.display,
      description: `Due ${pattern.display.toLowerCase()}`,
    });
  });

  // Add examples from dynamic patterns that user might type
  const dynamicExamples = [
    { value: "in 3 days", display: "In 3 days", description: "Due in 3 days" },
    {
      value: "in 2 weeks",
      display: "In 2 weeks",
      description: "Due in 2 weeks",
    },
    { value: "in 1 week", display: "In 1 week", description: "Due in 1 week" },
  ];

  dynamicExamples.forEach((example) => {
    suggestions.push({
      type: "date",
      value: example.value,
      display: example.display,
      description: example.description,
    });
  });

  // Add examples from absolute date patterns that user might type
  const absoluteExamples = [
    { value: "jan 15", display: "Jan 15", description: "Due Jan 15" },
    { value: "feb 20", display: "Feb 20", description: "Due Feb 20" },
    { value: "1/15", display: "1/15", description: "Due 1/15" },
    { value: "12/25", display: "12/25", description: "Due 12/25" },
  ];

  absoluteExamples.forEach((example) => {
    suggestions.push({
      type: "date",
      value: example.value,
      display: example.display,
      description: example.description,
    });
  });

  return suggestions;
}

/**
 * Generate priority suggestions from parser patterns
 */
export function generatePrioritySuggestions(): AutocompleteSuggestion[] {
  const suggestions: AutocompleteSuggestion[] = [];

  // Priority suggestions from p-notation
  PRIORITY_PATTERNS.forEach((pattern) => {
    suggestions.push({
      type: "priority",
      value: pattern.level.toString(),
      display: pattern.display,
      description: `Priority ${pattern.level} - ${pattern.level === 1 ? "Highest" : pattern.level === 2 ? "High" : pattern.level === 3 ? "Medium" : "Low"}`,
    });
  });

  // Priority suggestions from exclamation marks
  EXCLAMATION_PATTERNS.forEach((pattern) => {
    // Extract the exclamation marks from the pattern
    const match = pattern.pattern.source.match(/\(([!]+)\)/);
    if (match) {
      const exclamations = match[1];
      if (exclamations) {
        suggestions.push({
          type: "priority",
          value: exclamations,
          display: exclamations,
          description: `Priority ${pattern.level} - ${pattern.level === 1 ? "Highest" : pattern.level === 2 ? "High" : pattern.level === 3 ? "Medium" : "Low"}`,
        });
      }
    }
  });

  return suggestions;
}

/**
 * Generate time suggestions from parser patterns
 */
export function generateTimeSuggestions(): AutocompleteSuggestion[] {
  const suggestions: AutocompleteSuggestion[] = [];

  // Use existing time suggestions from parser
  TIME_SUGGESTIONS.forEach((timeSuggestion) => {
    suggestions.push({
      type: "time",
      value: timeSuggestion.value,
      display: timeSuggestion.display,
      description: `At ${timeSuggestion.display}`,
    });
  });

  // Add common times that parser supports
  const additionalTimes = [
    { value: "8AM", display: "8:00 AM", description: "At 8:00 AM" },
    { value: "10:30AM", display: "10:30 AM", description: "At 10:30 AM" },
    { value: "12PM", display: "12:00 PM", description: "At 12:00 PM" },
    { value: "1PM", display: "1:00 PM", description: "At 1:00 PM" },
    { value: "3PM", display: "3:00 PM", description: "At 3:00 PM" },
    { value: "4PM", display: "4:00 PM", description: "At 4:00 PM" },
    { value: "at 5PM", display: "At 5PM", description: "At 5PM" },
    { value: "15:00", display: "15:00", description: "At 15:00 (3PM)" },
  ];

  additionalTimes.forEach((time) => {
    suggestions.push({
      type: "time",
      value: time.value,
      display: time.display,
      description: time.description,
    });
  });

  return suggestions;
}

/**
 * Generate recurring suggestions based on parser knowledge (manually defined for simplicity)
 */
export function generateRecurringSuggestions(): AutocompleteSuggestion[] {
  const suggestions: AutocompleteSuggestion[] = [];

  // Common recurring patterns that we know the parser supports
  const recurringOptions = [
    { value: "daily", display: "Daily", description: "Repeat daily" },
    { value: "weekly", display: "Weekly", description: "Repeat weekly" },
    { value: "monthly", display: "Monthly", description: "Repeat monthly" },
    {
      value: "biweekly",
      display: "Biweekly",
      description: "Repeat every two weeks",
    },
    {
      value: "every day",
      display: "Every day",
      description: "Repeat every day",
    },
    {
      value: "every week",
      display: "Every week",
      description: "Repeat every week",
    },
    {
      value: "every month",
      display: "Every month",
      description: "Repeat every month",
    },
    {
      value: "every monday",
      display: "Every Monday",
      description: "Repeat every Monday",
    },
    {
      value: "every 2 days",
      display: "Every 2 days",
      description: "Repeat every 2 days",
    },
  ];

  recurringOptions.forEach((option) => {
    suggestions.push({
      type: "recurring",
      value: option.value,
      display: option.display,
      description: option.description,
    });
  });

  return suggestions;
}

/**
 * Generate duration suggestions based on parser knowledge (manually defined for simplicity)
 */
export function generateDurationSuggestions(): AutocompleteSuggestion[] {
  const suggestions: AutocompleteSuggestion[] = [];

  // Common duration patterns that we know the parser supports
  const durationOptions = [
    { value: "1h", display: "1 hour", description: "For 1 hour" },
    { value: "30m", display: "30 minutes", description: "For 30 minutes" },
    { value: "2h", display: "2 hours", description: "For 2 hours" },
    { value: "45m", display: "45 minutes", description: "For 45 minutes" },
    { value: "for 1 hour", display: "For 1 hour", description: "For 1 hour" },
  ];

  durationOptions.forEach((option) => {
    suggestions.push({
      type: "duration",
      value: option.value,
      display: option.display,
      description: option.description,
    });
  });

  return suggestions;
}

/**
 * Generate estimation suggestions based on common presets
 */
export function generateEstimationSuggestions(): AutocompleteSuggestion[] {
  const suggestions: AutocompleteSuggestion[] = [];

  // Common estimation presets matching the time estimation picker
  const estimationOptions = [
    { value: "5m", display: "5m", description: "Estimated time: 5 minutes" },
    { value: "15m", display: "15m", description: "Estimated time: 15 minutes" },
    { value: "30m", display: "30m", description: "Estimated time: 30 minutes" },
    { value: "1h", display: "1h", description: "Estimated time: 1 hour" },
    { value: "2h", display: "2h", description: "Estimated time: 2 hours" },
    { value: "4h", display: "4h", description: "Estimated time: 4 hours" },
  ];

  estimationOptions.forEach((option) => {
    suggestions.push({
      type: "estimation",
      value: option.value,
      display: option.display,
      description: option.description,
    });
  });

  return suggestions;
}

/**
 * Shared estimation regex pattern used for parsing and highlighting
 */
export const ESTIMATION_REGEX_PATTERN = `~(?:\\d+(?:h|hours?|hour))?(?:\\d+(?:m|mins?|minutes?|min))?`;

/**
 * Parse estimation string (e.g., ~30min, ~1h30m, ~2h) into seconds
 */
export function parseEstimationToSeconds(
  estimationString: string,
): number | null {
  if (!estimationString || !estimationString.startsWith("~")) {
    return null;
  }

  const timeStr = estimationString.slice(1); // Remove the ~ prefix

  // Single flexible pattern that handles any mix of hour/minute formats:
  // - Hours: h, hour, hours
  // - Minutes: m, min, mins, minute, minutes
  // - Combinations: 1h30m, 2hours45mins, 1hour30minutes, 1h30mins, etc.
  const combinedPattern =
    /^(?:(\d+)(h|hours?|hour))?(?:(\d+)(m|mins?|minutes?|min))?$/;
  const match = timeStr.match(combinedPattern);

  if (!match) {
    return null;
  }

  const hoursStr = match[1];
  const minutesStr = match[3];

  // Must have at least hours or minutes
  if (!hoursStr && !minutesStr) {
    return null;
  }

  const hours = hoursStr ? parseInt(hoursStr, 10) : 0;
  const minutes = minutesStr ? parseInt(minutesStr, 10) : 0;
  const totalSeconds = hours * 3600 + minutes * 60;

  return totalSeconds > 0 ? totalSeconds : null;
}

/**
 * Generate comprehensive highlighting patterns using parser's safe boundaries
 */
interface DynamicPatternsConfig {
  projects?: Array<{ name: string }>;
  labels?: Array<{ name: string }>;
}

export function generateHighlightingPatterns(
  config?: DynamicPatternsConfig,
): HighlightingPattern[] {
  const patterns: HighlightingPattern[] = [];

  // Project and label patterns with dynamic name support
  if (config?.projects && config.projects.length > 0) {
    const projectNames = config.projects.map((p) =>
      p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    );
    const projectRegex = new RegExp(`#(${projectNames.join("|")})`, "gi");
    patterns.push({ type: "project", regex: projectRegex });
  } else {
    patterns.push({ type: "project", regex: /#(\w+)/g });
  }

  if (config?.labels && config.labels.length > 0) {
    const labelNames = config.labels.map((l) =>
      l.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    );
    const labelRegex = new RegExp(`@(${labelNames.join("|")})`, "gi");
    patterns.push({ type: "label", regex: labelRegex });
  } else {
    patterns.push({ type: "label", regex: /@(\w+)/g });
  }

  // Priority patterns - combine p-notation and exclamations with safe boundaries
  const priorityCaptures = [
    ...PRIORITY_PATTERNS.map((p) => `p${p.level}`),
    ...EXCLAMATION_PATTERNS.map((p) => {
      const match = p.pattern.source.match(/\([!]+\)/);
      return match ? match[0].slice(1, -1) : "";
    }).filter(Boolean),
  ];
  const priorityRegex = new RegExp(
    `${WORD_BOUNDARY_START}(${priorityCaptures.join("|")})${WORD_BOUNDARY_END}`,
    "gi",
  );
  patterns.push({ type: "priority", regex: priorityRegex });

  // Date patterns - comprehensive patterns covering all parser patterns
  const dateCaptures = [
    // Static patterns from DATE_PATTERNS
    ...DATE_PATTERNS.map((p) => p.display.toLowerCase()),
    "tod",
    "tmr",
    // "This [shorthand]" weekday patterns (these should come before bare shorthands for precedence)
    "this mon",
    "this tue",
    "this wed",
    "this thu",
    "this fri",
    "this sat",
    "this sun",
    // Shorthand weekday patterns
    "mon",
    "tue",
    "wed",
    "thu",
    "fri",
    "sat",
    "sun",
    // Common dynamic patterns
    "in \\d+ days?",
    "in \\d+ weeks?",
    "in \\d+ months?",
    // Absolute date patterns
    "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\\s+\\d{1,2}",
    "\\d{1,2}/\\d{1,2}",
    "\\d{1,2}-\\d{1,2}",
  ];
  const dateRegex = new RegExp(
    `${WORD_BOUNDARY_START}(${dateCaptures.join("|")})${WORD_BOUNDARY_END}`,
    "gi",
  );
  patterns.push({ type: "date", regex: dateRegex });

  // Time patterns - only match explicit time formats to avoid highlighting standalone numbers
  const timeRegex = new RegExp(
    `${WORD_BOUNDARY_START}(\\d{1,2}:\\d{2}(?:\\s*(?:AM|PM))?|\\d{1,2}(?:AM|PM)|at\\s+\\d{1,2}(?:\\d{2})?(?:\\s*(?:AM|PM))?)${WORD_BOUNDARY_END}`,
    "gi",
  );
  patterns.push({ type: "time", regex: timeRegex });

  // Duration patterns - basic duration matching
  const durationRegex = new RegExp(
    `${WORD_BOUNDARY_START}(\\d+(?:h|m|hour|min)s?|for\\s+\\d+\\s*\\w+)${WORD_BOUNDARY_END}`,
    "gi",
  );
  patterns.push({ type: "duration", regex: durationRegex });

  // Estimation patterns - match ~ followed by time estimates like ~30min, ~1h30m, ~1hour40mins, ~2hours
  const estimationRegex = new RegExp(
    `${WORD_BOUNDARY_START}(${ESTIMATION_REGEX_PATTERN})${WORD_BOUNDARY_END}`,
    "gi",
  );
  patterns.push({ type: "estimation", regex: estimationRegex });

  // Recurring patterns - comprehensive patterns including dynamic ones
  const recurringCaptures = [
    "daily",
    "weekly",
    "monthly",
    "biweekly",
    "every day",
    "every week",
    "every month",
    "every monday",
    "every tuesday",
    "every wednesday",
    "every thursday",
    "every friday",
    "every saturday",
    "every sunday",
    // "Every [shorthand]" patterns
    "every mon",
    "every tue",
    "every wed",
    "every thu",
    "every fri",
    "every sat",
    "every sun",
    "every \\d+ days?",
    "every \\d+ weeks?",
    "every \\d+ months?",
  ];
  const recurringRegex = new RegExp(
    `${WORD_BOUNDARY_START}(${recurringCaptures.join("|")})${WORD_BOUNDARY_END}`,
    "gi",
  );
  patterns.push({ type: "recurring", regex: recurringRegex });

  return patterns;
}

/**
 * Check if a string matches any of the parser's patterns for a given type
 */
export function matchesParserPattern(
  text: string,
  type: "date" | "time" | "priority" | "recurring" | "duration",
): boolean {
  const allPatterns = {
    date: [
      ...DATE_PATTERNS,
      ...DYNAMIC_DATE_PATTERNS,
      ...ABSOLUTE_DATE_PATTERNS,
    ],
    time: TIME_PATTERNS,
    priority: [...PRIORITY_PATTERNS, ...EXCLAMATION_PATTERNS],
    recurring: [...RECURRING_PATTERNS, ...DYNAMIC_RECURRING_PATTERNS],
    duration: DURATION_PATTERNS,
  };

  const patterns = allPatterns[type];

  // Test with word boundaries - patterns expect start/end of string or spaces
  const testText = ` ${text} `;
  return patterns.some((pattern) => {
    // Reset global regex lastIndex to avoid state issues with repeated tests
    pattern.pattern.lastIndex = 0;
    return pattern.pattern.test(testText);
  });
}
