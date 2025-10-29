/**
 * Constants and Utilities
 *
 * Special IDs, date/time schemas, RRULE utilities, and other constants.
 */

import { z } from "zod";
import { parse, isValid, parseISO, format } from "date-fns";
import { createProjectId } from "./id";
import type { ProjectId, LabelId, GroupId } from "./id";
import {
  AVATAR_DATA_URL_REGEX,
  DEFAULT_AVATAR_DIR,
  STANDARD_VIEW_IDS,
} from "@tasktrove/constants";

// =============================================================================
// SPECIAL PROJECT IDS
// =============================================================================

/**
 * Special project IDs for standard views
 * These synthetic ProjectIds provide context for view state management
 * UUIDs must follow the pattern: xxxxxxxx-xxxx-[1-8]xxx-[89ab]xxx-xxxxxxxxxxxx
 */
export const INBOX_PROJECT_ID = createProjectId(
  "00000000-0000-0000-0000-000000000000",
);
export const TODAY_PROJECT_ID = createProjectId(
  "11111111-1111-1111-8111-111111111111",
);
export const UPCOMING_PROJECT_ID = createProjectId(
  "22222222-2222-2222-8222-222222222222",
);
export const COMPLETED_PROJECT_ID = createProjectId(
  "33333333-3333-3333-8333-333333333333",
);
export const ALL_PROJECT_ID = createProjectId(
  "44444444-4444-4444-8444-444444444444",
);
export const ANALYTICS_PROJECT_ID = createProjectId(
  "55555555-5555-5555-8555-555555555555",
);
export const SEARCH_PROJECT_ID = createProjectId(
  "66666666-6666-6666-8666-666666666666",
);

// =============================================================================
// AVATAR SCHEMAS
// =============================================================================

/**
 * Avatar file path - string type for file system paths to avatar files
 */
export const AvatarFilePathSchema = z
  .string()
  .refine((path) => path.startsWith(`${DEFAULT_AVATAR_DIR}/`), {
    message: `Avatar path must start with ${DEFAULT_AVATAR_DIR}/`,
  })
  .brand("AvatarFilePath");

/**
 * Avatar base64 data - string type for base64 encoded image data URLs
 */
export const AvatarBase64Schema = z
  .string()
  .regex(AVATAR_DATA_URL_REGEX, {
    message: "Avatar must be a valid base64 encoded image data URL",
  })
  .brand("AvatarBase64");

export type AvatarFilePath = z.infer<typeof AvatarFilePathSchema>;
export type AvatarBase64 = z.infer<typeof AvatarBase64Schema>;

export const createAvatarFilePath = (path: string): AvatarFilePath =>
  AvatarFilePathSchema.parse(path);
export const createAvatarBase64 = (base64: string): AvatarBase64 =>
  AvatarBase64Schema.parse(base64);

// =============================================================================
// DATE/TIME SCHEMAS
// =============================================================================

/**
 * Date schema utility for parsing yyyy-MM-dd format dates
 */
export const dateSchema = z.string().transform((str, ctx) => {
  const parsedDate = parse(str, "yyyy-MM-dd", new Date());

  if (!isValid(parsedDate)) {
    ctx.addIssue({
      code: "custom",
      message: "Invalid date format, please use yyyy-MM-dd",
    });
    return z.NEVER;
  }
  return parsedDate;
});

/**
 * Time schema utility for parsing HH:mm:ss format times
 */
export const timeSchema = z.string().transform((str, ctx) => {
  const parsedTime = parse(str, "HH:mm:ss", new Date());

  if (!isValid(parsedTime)) {
    ctx.addIssue({
      code: "custom",
      message: "Invalid time format, please use HH:mm:ss",
    });
    return z.NEVER;
  }

  return parsedTime;
});

/**
 * Flexible date schema that accepts both Date objects and yyyy-MM-dd strings
 */
export const flexibleDateSchema = z.union([z.date(), dateSchema]);

/**
 * Flexible time schema that accepts both Date objects and HH:mm:ss strings
 */
export const flexibleTimeSchema = z.union([z.date(), timeSchema]);

/**
 * DateTime schema utility for parsing ISO format datetime strings
 */
export const dateTimeSchema = z.iso.datetime();

/**
 * DateTime transformation schema that converts ISO strings to Date objects
 */
export const dateTimeFromStringSchema = z.iso.datetime().transform((str) => {
  return parseISO(str);
});

/**
 * Flexible datetime schema that accepts Date objects and ISO datetime strings
 */
export const flexibleDateTimeSchema = z.union([
  z.date(),
  dateTimeFromStringSchema,
]);

/**
 * Schema for serializing Date objects to "yyyy-MM-dd" strings.
 * Accepts Date objects or ISO time strings.
 * Transforms Date objects to "yyyy-MM-dd" strings.
 */
export const flexibleDateSerializationSchema = z.union([
  z.iso.date(),
  z.instanceof(Date).transform((val) => {
    return format(val, "yyyy-MM-dd");
  }),
]);

/**
 * Schema for serializing Date objects to "HH:mm:ss" strings.
 * Accepts Date objects or ISO time strings.
 * Transforms Date objects to "HH:mm:ss" strings.
 */
export const flexibleTimeSerializationSchema = z.union([
  z.iso.time(),
  z.instanceof(Date).transform((val) => format(val, "HH:mm:ss")),
]);

/**
 * Schema for serializing Date objects to ISO 8601 datetime strings.
 * Accepts Date objects or ISO datetime strings.
 * Transforms Date objects to ISO 8601 strings.
 */
export const flexibleDateTimeSerializationSchema = z.union([
  z.iso.datetime(),
  z.instanceof(Date).transform((val) => val.toISOString()),
]);

// =============================================================================
// RRULE UTILITIES
// =============================================================================

/**
 * RRULE frequency constants
 */
export const RRuleFrequency = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  YEARLY: "YEARLY",
} as const;

export type RRuleFrequencyType =
  (typeof RRuleFrequency)[keyof typeof RRuleFrequency];

/**
 * RRULE weekday constants
 */
export const RRuleWeekday = {
  MO: "MO",
  TU: "TU",
  WE: "WE",
  TH: "TH",
  FR: "FR",
  SA: "SA",
  SU: "SU",
} as const;

export type RRuleWeekdayType = (typeof RRuleWeekday)[keyof typeof RRuleWeekday];

/**
 * RRULE builder interface for type-safe RRULE construction
 */
export interface RRuleBuilder {
  freq: RRuleFrequencyType;
  interval?: number;
  count?: number;
  until?: string;
  byday?: RRuleWeekdayType[];
  bymonth?: number[];
  bymonthday?: number[];
  bysetpos?: number[];
}

/**
 * Utility function to build RRULE strings from structured data
 */
export function buildRRule(options: RRuleBuilder): string {
  const parts: string[] = [`FREQ=${options.freq}`];

  if (options.interval && options.interval > 1) {
    parts.push(`INTERVAL=${options.interval}`);
  }

  if (options.count) {
    parts.push(`COUNT=${options.count}`);
  }

  if (options.until) {
    parts.push(`UNTIL=${options.until}`);
  }

  if (options.byday && options.byday.length > 0) {
    parts.push(`BYDAY=${options.byday.join(",")}`);
  }

  if (options.bymonth && options.bymonth.length > 0) {
    parts.push(`BYMONTH=${options.bymonth.join(",")}`);
  }

  if (options.bymonthday && options.bymonthday.length > 0) {
    parts.push(`BYMONTHDAY=${options.bymonthday.join(",")}`);
  }

  if (options.bysetpos && options.bysetpos.length > 0) {
    parts.push(`BYSETPOS=${options.bysetpos.join(",")}`);
  }

  return `RRULE:${parts.join(";")}`;
}

/**
 * Utility function to parse RRULE strings into structured data
 */
export function parseRRule(rrule: string): RRuleBuilder | null {
  if (!rrule.startsWith("RRULE:")) {
    return null;
  }

  const parts = rrule.substring(6).split(";");
  const rules = new Map<string, string>();

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key && value) {
      rules.set(key.toUpperCase(), value.toUpperCase());
    }
  }

  const freqValue = rules.get("FREQ");
  if (!freqValue) {
    return null;
  }

  const isValidFreq = (value: string): value is RRuleFrequencyType => {
    const validFreqs: readonly string[] = Object.values(RRuleFrequency);
    return validFreqs.includes(value);
  };

  if (!isValidFreq(freqValue)) {
    return null;
  }

  const freq: RRuleFrequencyType = freqValue;
  const result: RRuleBuilder = { freq };

  const interval = rules.get("INTERVAL");
  if (interval) {
    const intervalNum = parseInt(interval, 10);
    if (!isNaN(intervalNum)) {
      result.interval = intervalNum;
    }
  }

  const count = rules.get("COUNT");
  if (count) {
    const countNum = parseInt(count, 10);
    if (!isNaN(countNum)) {
      result.count = countNum;
    }
  }

  const until = rules.get("UNTIL");
  if (until) {
    result.until = until;
  }

  const byday = rules.get("BYDAY");
  if (byday) {
    const isValidWeekday = (day: string): day is RRuleWeekdayType => {
      const validWeekdays: readonly string[] = Object.values(RRuleWeekday);
      return validWeekdays.includes(day);
    };

    const days = byday.split(",").filter(isValidWeekday);
    if (days.length > 0) {
      result.byday = days;
    }
  }

  const bymonth = rules.get("BYMONTH");
  if (bymonth) {
    const months = bymonth
      .split(",")
      .map((m) => parseInt(m, 10))
      .filter((m) => !isNaN(m) && m >= 1 && m <= 12);
    if (months.length > 0) {
      result.bymonth = months;
    }
  }

  const bymonthday = rules.get("BYMONTHDAY");
  if (bymonthday) {
    const days = bymonthday
      .split(",")
      .map((d) => parseInt(d, 10))
      .filter((d) => !isNaN(d) && d !== 0 && d >= -31 && d <= 31);
    if (days.length > 0) {
      result.bymonthday = days;
    }
  }

  const bysetpos = rules.get("BYSETPOS");
  if (bysetpos) {
    const positions = bysetpos
      .split(",")
      .map((p) => parseInt(p, 10))
      .filter((p) => !isNaN(p) && p !== 0 && p >= -366 && p <= 366);
    if (positions.length > 0) {
      result.bysetpos = positions;
    }
  }

  return result;
}

/**
 * Common RRULE patterns for easy task creation
 */
export const CommonRRules = {
  daily: () => buildRRule({ freq: RRuleFrequency.DAILY }),
  weekly: () => buildRRule({ freq: RRuleFrequency.WEEKLY }),
  monthly: () => buildRRule({ freq: RRuleFrequency.MONTHLY }),
  yearly: () => buildRRule({ freq: RRuleFrequency.YEARLY }),
  everyNDays: (n: number) =>
    buildRRule({ freq: RRuleFrequency.DAILY, interval: n }),
  everyNWeeks: (n: number) =>
    buildRRule({ freq: RRuleFrequency.WEEKLY, interval: n }),
  everyWeekday: () =>
    buildRRule({
      freq: RRuleFrequency.WEEKLY,
      byday: [
        RRuleWeekday.MO,
        RRuleWeekday.TU,
        RRuleWeekday.WE,
        RRuleWeekday.TH,
        RRuleWeekday.FR,
      ],
    }),
  everyWeekend: () =>
    buildRRule({
      freq: RRuleFrequency.WEEKLY,
      byday: [RRuleWeekday.SA, RRuleWeekday.SU],
    }),
  everyMonday: () =>
    buildRRule({ freq: RRuleFrequency.WEEKLY, byday: [RRuleWeekday.MO] }),
  everyTuesday: () =>
    buildRRule({ freq: RRuleFrequency.WEEKLY, byday: [RRuleWeekday.TU] }),
  everyWednesday: () =>
    buildRRule({ freq: RRuleFrequency.WEEKLY, byday: [RRuleWeekday.WE] }),
  everyThursday: () =>
    buildRRule({ freq: RRuleFrequency.WEEKLY, byday: [RRuleWeekday.TH] }),
  everyFriday: () =>
    buildRRule({ freq: RRuleFrequency.WEEKLY, byday: [RRuleWeekday.FR] }),
  everySaturday: () =>
    buildRRule({ freq: RRuleFrequency.WEEKLY, byday: [RRuleWeekday.SA] }),
  everySunday: () =>
    buildRRule({ freq: RRuleFrequency.WEEKLY, byday: [RRuleWeekday.SU] }),
  nTimes: (freq: RRuleFrequencyType, count: number) =>
    buildRRule({ freq, count }),
  untilDate: (freq: RRuleFrequencyType, until: string) =>
    buildRRule({ freq, until }),
} as const;

// =============================================================================
// API ROUTES
// =============================================================================

/**
 * Branded type for API routes to ensure type safety
 */
export const ApiRouteSchema = z.string().brand("ApiRoute");
export type ApiRoute = z.infer<typeof ApiRouteSchema>;

/**
 * Create a typed API route
 */
export function createApiRoute(path: string): ApiRoute {
  return ApiRouteSchema.parse(path);
}

/**
 * All available API routes - single source of truth for route paths
 */
export const API_ROUTES = {
  // v1 routes (actually in v1/ directory) - support bearer token authentication
  V1_TASKS: createApiRoute("/api/v1/tasks"),
  V1_PROJECTS: createApiRoute("/api/v1/projects"),
  V1_LABELS: createApiRoute("/api/v1/labels"),
  V1_GROUPS: createApiRoute("/api/v1/groups"),
  V1_SETTINGS: createApiRoute("/api/v1/settings"),
  V1_USER: createApiRoute("/api/v1/user"),
  V1_ASSETS: createApiRoute("/api/v1/assets/[...path]"),

  // Root-level routes (NOT in v1/ directory) - session-only authentication
  HEALTH: createApiRoute("/api/health"),
  BACKUP: createApiRoute("/api/backup"),
  IMPORT: createApiRoute("/api/import"),
  DATA_INITIALIZE: createApiRoute("/api/data/initialize"),
  DATA_MIGRATE: createApiRoute("/api/data/migrate"),
  INITIAL_SETUP: createApiRoute("/api/initial-setup"),
  AUTH: createApiRoute("/api/auth/[...nextauth]"),
  NOT_FOUND: createApiRoute("/api/[...notFound]"),
} as const;

/**
 * Type for all available API route keys
 */
export type ApiRouteKey = keyof typeof API_ROUTES;

/**
 * Type for API route values (the actual path strings)
 */
export type ApiRoutePath = (typeof API_ROUTES)[ApiRouteKey];

// =============================================================================
// MISC CONSTANTS
// =============================================================================

/** Task priority type (1=highest, 4=lowest) */
export type TaskPriority = 1 | 2 | 3 | 4;

/**
 * JSON schema utility for validating any JSON-encodable value
 */
export const JsonSchema = z.json();

/**
 * TypeScript type for JSON-encodable values
 */
export type Json = z.infer<typeof JsonSchema>;

/**
 * Standard view identifiers used in the application
 */
export type StandardViewId = (typeof STANDARD_VIEW_IDS)[number];

/**
 * All possible view identifiers for routing and view state management
 * - StandardViewId: Built-in views like inbox, today, etc.
 * - ProjectId: Branded UUID for project views
 * - LabelId: Branded UUID for label views
 * - GroupId: Branded UUID for project group views
 */
export type ViewId = StandardViewId | ProjectId | LabelId | GroupId;
