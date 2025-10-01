/**
 * Comprehensive Zod schemas and TypeScript types for TaskTrove
 *
 * This file contains all the type definitions and validation schemas.
 * Types are generated from Zod schemas to maintain a single source of truth.
 */

import { z } from "zod";
import {
  AVATAR_DATA_URL_REGEX,
  DEFAULT_AVATAR_DIR,
} from "@tasktrove/constants";
import { parse, isValid, parseISO, format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { ApiErrorCode, ApiErrorCodeSchema } from "./api-errors";

// Re-export API error codes for convenience
export { ApiErrorCode, ApiErrorCodeSchema } from "./api-errors";

// =============================================================================
// BRANDED ID TYPES
// =============================================================================

/**
 * Task ID - string type that must be a UUID
 */
export const TaskIdSchema = z.uuid().brand("TaskId");

/**
 * Project ID - string type that must be a UUID
 */
export const ProjectIdSchema = z.uuid().brand("ProjectId");

/**
 * Label ID - string type that must be a UUID
 */
export const LabelIdSchema = z.uuid().brand("LabelId");

/**
 * Subtask ID - string type that must be a UUID
 */
export const SubtaskIdSchema = z.uuid().brand("SubtaskId");

/**
 * Comment ID - string type that must be a UUID
 */
export const CommentIdSchema = z.uuid().brand("CommentId");

/**
 * User ID - string type that must be a UUID
 */
export const UserIdSchema = z.uuid().brand("UserId");

/**
 * Team ID - string type that must be a UUID
 */
export const TeamIdSchema = z.uuid().brand("TeamId");

/**
 * Voice Command ID - string type that must be a UUID
 */
export const VoiceCommandIdSchema = z.uuid().brand("VoiceCommandId");

/**
 * Section ID - number type for project sections
 */
export const SectionIdSchema = z.string().uuid().brand("SectionId");

/**
 * Group ID - string type that must be a UUID
 */
export const GroupIdSchema = z.uuid().brand("GroupId");

/**
 * Version String - string type that must follow semantic versioning format (v\d.\d.\d)
 */
export const VersionStringSchema = z
  .string()
  .regex(/^v\d+\.\d+\.\d+$/, "Version must follow format v0.0.0")
  .brand("VersionString");

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

// Inferred types for IDs
export type TaskId = z.infer<typeof TaskIdSchema>;
export type ProjectId = z.infer<typeof ProjectIdSchema>;
export type LabelId = z.infer<typeof LabelIdSchema>;
export type SubtaskId = z.infer<typeof SubtaskIdSchema>;
export type CommentId = z.infer<typeof CommentIdSchema>;
export type UserId = z.infer<typeof UserIdSchema>;
export type TeamId = z.infer<typeof TeamIdSchema>;
export type VoiceCommandId = z.infer<typeof VoiceCommandIdSchema>;
export type SectionId = z.infer<typeof SectionIdSchema>;
export type GroupId = z.infer<typeof GroupIdSchema>;
export type VersionString = z.infer<typeof VersionStringSchema>;
export type AvatarFilePath = z.infer<typeof AvatarFilePathSchema>;
export type AvatarBase64 = z.infer<typeof AvatarBase64Schema>;

/** Task priority type (1=highest, 4=lowest) */
export type TaskPriority = 1 | 2 | 3 | 4;

// Helper functions to create ID types (for migration and testing)
export const createTaskId = (id: string): TaskId => TaskIdSchema.parse(id);
export const createProjectId = (id: string): ProjectId =>
  ProjectIdSchema.parse(id);
export const createLabelId = (id: string): LabelId => LabelIdSchema.parse(id);
export const createSubtaskId = (id: string): SubtaskId =>
  SubtaskIdSchema.parse(id);
export const createCommentId = (id: string): CommentId =>
  CommentIdSchema.parse(id);
export const createUserId = (id: string): UserId => UserIdSchema.parse(id);
export const createTeamId = (id: string): TeamId => TeamIdSchema.parse(id);
export const createVoiceCommandId = (id: string): VoiceCommandId =>
  VoiceCommandIdSchema.parse(id);
export const createSectionId = (id: string): SectionId =>
  SectionIdSchema.parse(id);
export const createGroupId = (id: string): GroupId => GroupIdSchema.parse(id);
export const createVersionString = (version: string): VersionString =>
  VersionStringSchema.parse(version);
export const createAvatarFilePath = (path: string): AvatarFilePath =>
  AvatarFilePathSchema.parse(path);
export const createAvatarBase64 = (base64: string): AvatarBase64 =>
  AvatarBase64Schema.parse(base64);

/**
 * Validates RRULE (Recurrence Rule) strings according to RFC 5545
 * Used by Zod schema validation for recurring task patterns
 */
export function validateRRule(
  val: string | undefined,
  ctx: z.RefinementCtx,
): void {
  if (!val) return; // Allow undefined/null values

  // RRULE must start with "RRULE:" prefix
  if (!val.startsWith("RRULE:")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Recurring pattern must be a valid RRULE starting with "RRULE:"',
    });
    return;
  }

  const rrule = val.substring(6); // Remove "RRULE:" prefix
  const parts = rrule.split(";");
  const rules = new Map<string, string>();

  // Parse RRULE parts
  for (const part of parts) {
    const [key, value] = part.split("=");
    if (!key || !value) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid RRULE format: "${part}"`,
      });
      return;
    }
    rules.set(key.toUpperCase(), value.toUpperCase());
  }

  // FREQ is required
  const freq = rules.get("FREQ");
  if (!freq) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "RRULE must contain FREQ (frequency) parameter",
    });
    return;
  }

  // Validate FREQ values
  const validFreqs = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"];
  if (!validFreqs.includes(freq)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid FREQ value: "${freq}". Must be one of: ${validFreqs.join(", ")}`,
    });
    return;
  }

  // Validate INTERVAL if present
  const interval = rules.get("INTERVAL");
  if (interval) {
    const intervalNum = parseInt(interval, 10);
    if (isNaN(intervalNum) || intervalNum < 1 || intervalNum > 366) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid INTERVAL value: "${interval}". Must be a number between 1 and 366`,
      });
      return;
    }
  }

  // Validate COUNT if present
  const count = rules.get("COUNT");
  if (count) {
    const countNum = parseInt(count, 10);
    if (isNaN(countNum) || countNum < 1 || countNum > 1000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid COUNT value: "${count}". Must be a number between 1 and 1000`,
      });
      return;
    }
  }

  // Validate UNTIL if present (basic ISO date format check)
  const until = rules.get("UNTIL");
  if (until) {
    // Support both YYYYMMDD and YYYYMMDDTHHMMSSZ formats
    const dateOnlyPattern = /^\d{8}$/; // YYYYMMDD
    const dateTimePattern = /^\d{8}T\d{6}Z?$/; // YYYYMMDDTHHMMSSZ

    if (!dateOnlyPattern.test(until) && !dateTimePattern.test(until)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid UNTIL value: "${until}". Must be in YYYYMMDD or YYYYMMDDTHHMMSSZ format`,
      });
      return;
    }

    // Parse date to ensure it's valid
    let year: number, month: number, day: number;

    if (dateOnlyPattern.test(until)) {
      year = parseInt(until.substring(0, 4), 10);
      month = parseInt(until.substring(4, 6), 10);
      day = parseInt(until.substring(6, 8), 10);
    } else {
      year = parseInt(until.substring(0, 4), 10);
      month = parseInt(until.substring(4, 6), 10);
      day = parseInt(until.substring(6, 8), 10);
    }

    // Basic date validation
    if (
      year < 1900 ||
      year > 2100 ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid UNTIL date: "${until}". Date components out of valid range`,
      });
      return;
    }

    // Check if both COUNT and UNTIL are specified (not allowed)
    if (count) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "RRULE cannot contain both COUNT and UNTIL parameters",
      });
      return;
    }
  }

  // Validate BYDAY if present
  const byday = rules.get("BYDAY");
  if (byday) {
    const validDays = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
    const days = byday.split(",");

    for (const day of days) {
      // Support both "MO" and "+1MO" or "-1MO" formats
      const dayMatch = day.match(/^([+-]?\d+)?([A-Z]{2})$/);
      if (!dayMatch) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid BYDAY value: "${day}". Must be a valid weekday code (MO, TU, WE, TH, FR, SA, SU) optionally prefixed with position (+1MO, -1FR, etc.)`,
        });
        return;
      }

      const [, position, dayCode] = dayMatch;

      if (!dayCode || !validDays.includes(dayCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid BYDAY day code: "${dayCode}". Must be one of: ${validDays.join(", ")}`,
        });
        return;
      }

      // If position is specified, validate it
      if (position) {
        const posNum = parseInt(position, 10);
        if (isNaN(posNum) || posNum === 0 || posNum < -53 || posNum > 53) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid BYDAY position: "${position}". Must be a non-zero number between -53 and 53`,
          });
          return;
        }
      }
    }
  }

  // Validate BYMONTH if present
  const bymonth = rules.get("BYMONTH");
  if (bymonth) {
    const months = bymonth.split(",");
    for (const month of months) {
      const monthNum = parseInt(month, 10);
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid BYMONTH value: "${month}". Must be a number between 1 and 12`,
        });
        return;
      }
    }
  }

  // Validate BYMONTHDAY if present
  const bymonthday = rules.get("BYMONTHDAY");
  if (bymonthday) {
    const days = bymonthday.split(",");
    for (const day of days) {
      const dayNum = parseInt(day, 10);
      if (isNaN(dayNum) || dayNum === 0 || dayNum < -31 || dayNum > 31) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid BYMONTHDAY value: "${day}". Must be a non-zero number between -31 and 31`,
        });
        return;
      }
    }
  }
}

// =============================================================================
// CONSTANTS
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

/**
 * Date schema utility for parsing yyyy-MM-dd format dates
 */
export const dateSchema = z.string().transform((str, ctx) => {
  const parsedDate = parse(str, "yyyy-MM-dd", new Date());

  // Check if the parsed date is valid
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
  // Use `parse` to convert the string to a Date object.
  // The third argument is a reference date, which allows `parse` to work even with a time-only string.
  const parsedTime = parse(str, "HH:mm:ss", new Date());

  // Use `isValid` to check if the parsing was successful.
  // This is a more reliable check than `isNaN(parsedTime.getTime())`.
  if (!isValid(parsedTime)) {
    ctx.addIssue({
      code: "custom",
      message: "Invalid time format, please use HH:mm:ss",
    });
    return z.NEVER; // This tells Zod that the transformation failed.
  }

  return parsedTime;
});

/**
 * Flexible date schema that accepts both Date objects and yyyy-MM-dd strings
 */
export const flexibleDateSchema = z.union([
  z.date(), // Tries to validate as a Date object first
  dateSchema, // If that fails, it tries to validate and transform the string
]);

/**
 * Flexible time schema that accepts both Date objects and HH:mm:ss strings
 */
export const flexibleTimeSchema = z.union([
  z.date(), // Tries to validate as a Date object first
  timeSchema, // If that fails, it tries to validate and transform the string
]);

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
  z.date(), // Tries to validate as a Date object first
  dateTimeFromStringSchema, // Then tries to transform ISO datetime strings to Date objects
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
// CORE TASK SCHEMAS
// =============================================================================

/**
 * Schema for a project section - extends IBaseGroup with items array
 */
export const ProjectSectionSchema: z.ZodType<ProjectSection> = z.object({
  /** Unique identifier for the section */
  id: GroupIdSchema,
  /** Display name of the section */
  name: z.string(),
  /** Unique SEO friendly slug (empty string for sections) */
  slug: z.string().default(""),
  /** Optional description */
  description: z.string().optional(),
  /** Section color (hex code) */
  color: z.string().optional(),
  /** Type discriminator for sections */
  type: z.literal("section"),
  /** Array of task IDs in display order for this section */
  items: z.array(TaskIdSchema),
});

/**
 * Schema for a subtask within a main task
 */
export const SubtaskSchema = z.object({
  /** Unique identifier for the subtask */
  id: SubtaskIdSchema,
  /** Title/description of the subtask */
  title: z.string(),
  /** Whether the subtask is completed */
  completed: z.boolean(),
  /** Order index for display/sorting */
  order: z.number().optional(),
  /** Task estimation in seconds */
  estimation: z.number().optional(),
});

/**
 * Schema for a comment on a task
 */
export const TaskCommentSchema = z.object({
  /** Unique identifier for the comment */
  id: CommentIdSchema,
  /** Comment content/text */
  content: z.string(),
  /** When the comment was created */
  createdAt: flexibleDateTimeSchema,
});

// Serialization schema for TaskComment (colocated with TaskCommentSchema for high correlation)
export const TaskCommentSerializationSchema = z.object({
  ...TaskCommentSchema.shape,
  createdAt: flexibleDateTimeSerializationSchema,
});

/**
 * Schema for a user account
 */
export const UserSchema = z.object({
  /** Username for the user */
  username: z.string(),
  /** Password for authentication */
  password: z.string(),
  /** File path to user's avatar image */
  avatar: AvatarFilePathSchema.optional(),
  /** API token for bearer authentication - 32 character hexadecimal string */
  apiToken: z
    .string()
    .length(32)
    .regex(
      /^[0-9a-f]{32}$/,
      "API token must be a 32-character hexadecimal string",
    )
    .optional(),
});

// Serialization schema for User (colocated with UserSchema for high correlation)
export const UserSerializationSchema = UserSchema;

/**
 * Schema for view state configuration
 */
export const ViewStateSchema = z.object({
  /** Current view mode */
  viewMode: z.enum(["list", "kanban", "calendar"]),
  /** Field to sort by */
  sortBy: z.string(),
  /** Sort direction */
  sortDirection: z.enum(["asc", "desc"]),
  /** Whether to show completed tasks */
  showCompleted: z.boolean(),
  /** Whether to show overdue tasks */
  showOverdue: z.boolean(),
  /** Current search query */
  searchQuery: z.string(),
  /** Whether to show the side panel */
  showSidePanel: z.boolean(),
  /** Whether to use compact task item view */
  compactView: z.boolean(),
  /** Array of collapsed section IDs (for project views with sections) */
  collapsedSections: z.array(z.string()).optional(),
  /** Active task filters for current view */
  activeFilters: z
    .object({
      /** Filter by project IDs */
      projectIds: z.array(ProjectIdSchema).optional(),
      /** Filter by label names */
      labels: z.array(z.string()).nullable().optional(),
      /** Filter by priority levels */
      priorities: z
        .array(
          z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
        )
        .optional(),
      /** Filter by completion status */
      completed: z.boolean().optional(),
      /** Filter by due date (flexible preset or custom range) */
      dueDateFilter: z
        .object({
          /** Quick preset filters */
          preset: z
            .enum([
              "overdue",
              "today",
              "tomorrow",
              "thisWeek",
              "nextWeek",
              "noDueDate",
            ])
            .optional(),
          /** Custom date range */
          customRange: z
            .object({
              start: z.date().optional(),
              end: z.date().optional(),
            })
            .optional(),
        })
        .optional(),
      /** Filter by assigned team members */
      assignedTo: z.array(UserIdSchema).optional(),
      /** Filter by task status */
      status: z.array(z.string()).optional(),
    })
    .optional(),
});

/**
 * Schema for view states record - maps view IDs to view states
 */
export const ViewStatesSchema = z.record(z.string(), ViewStateSchema);

/**
 * Inferred type for view states record
 */
export type ViewStates = z.infer<typeof ViewStatesSchema>;

/**
 * Global view options schema - UI preferences that apply across all views
 */
export const GlobalViewOptionsSchema = z.object({
  sidePanelWidth: z.number().min(20).max(80),
});

/**
 * Inferred type for global view options
 */
export type GlobalViewOptions = z.infer<typeof GlobalViewOptionsSchema>;

/**
 * RRULE utility types and functions
 */
export const RRuleFrequency = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  YEARLY: "YEARLY",
} as const;

export type RRuleFrequencyType =
  (typeof RRuleFrequency)[keyof typeof RRuleFrequency];

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

  // Type guard to check if the value is a valid RRuleFrequencyType
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
    // Type guard to check if a string is a valid RRuleWeekdayType
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

/**
 * Main Task schema with all properties
 */
export const TaskSchema = z.object({
  /** Unique identifier for the task */
  id: TaskIdSchema.default(() => TaskIdSchema.parse(uuidv4())),
  /** Task title */
  title: z.string(),
  /** Optional task description */
  description: z.string().optional(),
  /** Whether the task is completed */
  completed: z.boolean(),
  /** Task priority level (1=highest, 4=lowest) */
  priority: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  /** Due date for the task */
  dueDate: flexibleDateSchema.optional(),
  /** Due time for the task in HH:MM format */
  dueTime: flexibleTimeSchema.optional(),
  /** ID of the project this task belongs to (defaults to 'inbox' if not specified) */
  projectId: ProjectIdSchema.optional(),
  /** Array of label IDs associated with the task */
  labels: z.array(LabelIdSchema),
  /** Subtasks within this task */
  subtasks: z.array(SubtaskSchema),
  /** Comments on this task */
  comments: z.array(TaskCommentSchema),
  /** File attachments (URLs or file paths) */
  attachments: z.array(z.string()),
  /** When the task was created */
  createdAt: flexibleDateTimeSchema.default(new Date()),
  /** When the task was completed (if completed) */
  completedAt: flexibleDateTimeSchema.optional(),
  /** Current status of the task */
  status: z.string().optional(),
  /** Order index for display/sorting */
  order: z.number().optional(),
  /** Recurring pattern using RRULE format (RFC 5545) */
  recurring: z.string().optional().superRefine(validateRRule),
  /** Mode for calculating next due date in recurring tasks (defaults to "dueDate") */
  recurringMode: z.union([z.literal("dueDate"), z.literal("completedAt")]),
  /** Whether the task is marked as favorite */
  favorite: z.boolean().optional(),
  /** Time spent on task in minutes */
  timeSpent: z.number().optional(),
  /** Number of times task was postponed */
  postponedCount: z.number().optional(),
  /** Energy level required (1=low, 5=high) */
  energyLevel: z
    .union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
    ])
    .optional(),
  /** Task estimation in seconds */
  estimation: z.number().optional(),
});

// Base serialization schemas for Task (colocated with TaskSchema for high correlation)
export const TaskSerializationSchema = z.object({
  ...TaskSchema.shape,
  dueDate: flexibleDateSerializationSchema.optional(),
  dueTime: flexibleTimeSerializationSchema.optional(),
  createdAt: flexibleDateTimeSerializationSchema,
  completedAt: flexibleDateTimeSerializationSchema.optional(),
  comments: z.array(TaskCommentSerializationSchema).default([]),
});
export const TaskArraySerializationSchema = z.array(TaskSerializationSchema);

/**
 * Project schema with view state and sections
 */
export const ProjectSchema = z.object({
  /** Unique identifier for the project */
  id: ProjectIdSchema,
  /** Project name */
  name: z.string(),
  /** Unique SEO friendly Slug */
  slug: z.string(),
  /** Project color (hex code) */
  color: z.string(),
  /** Whether the project is shared with team */
  shared: z.boolean(),
  /** Array of sections within this project */
  sections: z.array(ProjectSectionSchema),
});

// Base serialization schema for Project (colocated with ProjectSchema for high correlation)
export const ProjectSerializationSchema = ProjectSchema;

/**
 * Label schema
 */
export const LabelSchema = z.object({
  /** Unique identifier for the label */
  id: LabelIdSchema,
  /** Label name */
  name: z.string(),
  /** Unique SEO friendly Slug */
  slug: z.string(),
  /** Label color (hex code) */
  color: z.string(),
});

// Base serialization schema for Label (colocated with LabelSchema for high correlation)
export const LabelSerializationSchema = LabelSchema;

/**
 * TypeScript interfaces for recursive Group types
 * Define interfaces first to provide proper type information for z.ZodType
 */

/** Base interface for all group types */
interface IBaseGroup {
  id: GroupId;
  name: string;
  slug: string;
  description?: string;
  color?: string;
}

/** Project Section interface - extends IBaseGroup with items for task ordering */
export interface ProjectSection extends IBaseGroup {
  type: "section";
  items: TaskId[];
}

/** Project Group interface - can contain ProjectIds or other ProjectGroups */
export interface ProjectGroup extends IBaseGroup {
  type: "project";
  items: (ProjectId | ProjectGroup)[];
}

/** Label Group interface - can contain LabelIds or other LabelGroups */
export interface LabelGroup extends IBaseGroup {
  type: "label";
  items: (LabelId | LabelGroup)[];
}

/**
 * Generic type guard to check if an item is a specific Group type (vs a string ID)
 * In group items arrays, items can only be either string IDs or Group objects
 */
export function isGroup<T extends ProjectGroup | LabelGroup>(
  item: unknown,
): item is T {
  return typeof item === "object" && item !== null && "id" in item;
}

/**
 * Recursive Group schemas with proper TypeScript typing
 * Uses z.ZodType<Interface> pattern for type safety with recursive schemas
 */

// Project Group Schema with manual typing
// eslint-disable-next-line prefer-const
let ProjectGroupSchema: z.ZodType<ProjectGroup>;
export { ProjectGroupSchema };
ProjectGroupSchema = z
  .object({
    type: z.literal("project"),
    id: GroupIdSchema,
    name: z.string(),
    slug: z.string(),
    description: z.string().optional(),
    color: z.string().optional(),
    items: z.array(
      z.union([ProjectIdSchema, z.lazy(() => ProjectGroupSchema)]),
    ),
  })
  .refine(
    (group) => {
      // Prevent circular reference by checking if group contains itself as direct child
      const childGroups = group.items.filter(isGroup<ProjectGroup>);
      return !childGroups.some((childGroup) => childGroup.id === group.id);
    },
    {
      message:
        "Group cannot contain itself as a direct child (circular reference)",
      path: ["items"],
    },
  );

// Label Group Schema with manual typing
// eslint-disable-next-line prefer-const
let LabelGroupSchema: z.ZodType<LabelGroup>;
export { LabelGroupSchema };
LabelGroupSchema = z
  .object({
    type: z.literal("label"),
    id: GroupIdSchema,
    name: z.string(),
    slug: z.string(),
    description: z.string().optional(),
    color: z.string().optional(),
    items: z.array(z.union([LabelIdSchema, z.lazy(() => LabelGroupSchema)])),
  })
  .refine(
    (group) => {
      // Prevent circular reference by checking if group contains itself as direct child
      const childGroups = group.items.filter(isGroup<LabelGroup>);
      return !childGroups.some((childGroup) => childGroup.id === group.id);
    },
    {
      message:
        "Group cannot contain itself as a direct child (circular reference)",
      path: ["items"],
    },
  );

/**
 * Group schema - union of all group types
 */
export const GroupSchema = z.union([ProjectGroupSchema, LabelGroupSchema]);

// Base serialization schema for Group (colocated with GroupSchema for high correlation)
export const GroupSerializationSchema = GroupSchema;

/**
 * Settings schemas - need to be defined before DataFileSchema
 */
export const DataSettingsSchema = z.object({
  /** Auto backup configuration */
  autoBackup: z.object({
    enabled: z.boolean(),
    /** Time to run daily backup in HH:MM format (24-hour) */
    backupTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    /** Maximum number of backup files to keep (-1 for unlimited) */
    maxBackups: z.number(),
  }),
});

// Notification schemas (moved here before UserSettingsSchema)
// Advanced notification schemas - commented out for future implementation
/*
export const NotificationChannelsSchema = z.object({
  push: z.boolean(),
  email: z.boolean(),
  desktop: z.boolean(),
  mobile: z.boolean(),
})

export const NotificationScheduleSchema = z.object({
  quietHours: z.object({
    enabled: z.boolean(),
    start: z.string(),
    end: z.string(),
  }),
  weekends: z.boolean(),
  holidays: z.boolean(),
})

export const NotificationTypesSchema = z.object({
  reminders: z.boolean(),
  deadlines: z.boolean(),
  collaboration: z.boolean(),
  achievements: z.boolean(),
  system: z.boolean(),
})

export const NotificationFrequencySchema = z.object({
  immediate: z.boolean(),
  digest: z.enum(["never", "daily", "weekly"]),
  digestTime: z.string(),
})

export const NotificationSoundSchema = z.object({
  enabled: z.boolean(),
  volume: z.number().min(0).max(100),
})
*/

export const NotificationSettingsSchema = z.object({
  /** Whether notifications are globally enabled */
  enabled: z.boolean(),
  /** Whether notifications require user interaction to dismiss */
  requireInteraction: z.boolean(),
  /** Notification channels */
  // channels: NotificationChannelsSchema,
  /** Schedule settings */
  // schedule: NotificationScheduleSchema,
  /** Type preferences */
  // types: NotificationTypesSchema,
  /** Frequency settings */
  // frequency: NotificationFrequencySchema,
  /** Sound settings */
  // sound: NotificationSoundSchema,
});

// General settings schema
export const GeneralSettingsSchema = z.object({
  /** Default view on app launch */
  startView: z.union([z.enum(STANDARD_VIEW_IDS), z.literal("lastViewed")]),
  /** Enable/disable sound effects */
  soundEnabled: z.boolean(),
  /** Enable/disable auto-linkification of URLs in task titles */
  linkifyEnabled: z.boolean(),
  /** Enable/disable popover hover open behavior */
  popoverHoverOpen: z.boolean(),
});

export const UserSettingsSchema = z.object({
  data: DataSettingsSchema,
  notifications: NotificationSettingsSchema,
  general: GeneralSettingsSchema,
});
/** Schema for scheduled notification */
export const ScheduledNotificationSchema = z.object({
  /** Task ID */
  taskId: TaskIdSchema,
  /** Task title for notification */
  taskTitle: z.string(),
  /** When the notification should fire */
  notifyAt: flexibleDateTimeSchema,
  /** Type of notification */
  type: z.enum(["due", "reminder"]),
});

/** Scheduled notification information */
export type ScheduledNotification = z.infer<typeof ScheduledNotificationSchema>;

/** Schema for a set of scheduled notifications */
export const ScheduledNotificationSetSchema = z.set(
  ScheduledNotificationSchema,
);

/** Set of scheduled notifications */
export type ScheduledNotificationSet = z.infer<
  typeof ScheduledNotificationSetSchema
>;

/** Notification permission status */
export type NotificationPermissionStatus = "default" | "granted" | "denied";

export const DataFileSchema = z.object({
  tasks: z.array(TaskSchema),
  projects: z.array(ProjectSchema),
  labels: z.array(LabelSchema),
  projectGroups: ProjectGroupSchema,
  labelGroups: LabelGroupSchema,
  settings: UserSettingsSchema,
  user: UserSchema,
  version: VersionStringSchema.optional(), // TODO: make this required after v0.9.0
});

export const DataFileSerializationSchema = z.object({
  ...DataFileSchema.shape,
  tasks: z.array(TaskSerializationSchema),
  projects: z.array(ProjectSerializationSchema),
  labels: z.array(LabelSerializationSchema),
  user: UserSerializationSchema,
});

// =============================================================================
// GENERATED TYPESCRIPT TYPES
// =============================================================================

export type Subtask = z.infer<typeof SubtaskSchema>;
export type TaskComment = z.infer<typeof TaskCommentSchema>;
export type User = z.infer<typeof UserSchema>;
export type ViewState = z.infer<typeof ViewStateSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Label = z.infer<typeof LabelSchema>;
export type GeneralSettings = z.infer<typeof GeneralSettingsSchema>;
export type Group = ProjectGroup | LabelGroup;
export type DataFile = z.infer<typeof DataFileSchema>;
export type TaskSerialization = z.infer<typeof TaskSerializationSchema>;
export type TaskArraySerialization = z.infer<
  typeof TaskArraySerializationSchema
>;
export type UserSerialization = z.infer<typeof UserSerializationSchema>;
export type ProjectSerialization = z.infer<typeof ProjectSerializationSchema>;
export type LabelSerialization = z.infer<typeof LabelSerializationSchema>;
export type GroupSerialization = z.infer<typeof GroupSerializationSchema>;
export type DataFileSerialization = z.infer<typeof DataFileSerializationSchema>;

// =============================================================================
// VIEW IDENTIFIER TYPES
// =============================================================================

import { STANDARD_VIEW_IDS } from "@tasktrove/constants";

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

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

/**
 * Overall productivity metrics for a given time period
 */
export interface ProductivityMetrics {
  /** Number of tasks completed in the period */
  tasksCompleted: number;
  /** Number of tasks created in the period */
  tasksCreated: number;
  /** Completion rate as a percentage */
  completionRate: number;
  /** Average time to complete tasks in minutes */
  averageCompletionTime: number;
  /** Current completion streak in days */
  streak: number;
  /** Overall productivity score (0-100) */
  productivityScore: number;
  /** Total focus time in minutes */
  focusTime: number;
  /** Number of overdue tasks */
  overdueCount: number;
}

/**
 * Trend data point for analytics charts
 */
export interface TrendData {
  /** Date label for the data point */
  date: string;
  /** Number of tasks completed on this date */
  completed: number;
  /** Number of tasks created on this date */
  created: number;
  /** Focus time in minutes for this date */
  focusTime: number;
  /** Productivity score for this date */
  productivityScore: number;
}

/**
 * Analytics data for a specific project
 */
export interface ProjectAnalytics {
  /** Project ID */
  projectId: ProjectId;
  /** Project name */
  projectName: string;
  /** Number of completed tasks in the project */
  tasksCompleted: number;
  /** Total number of tasks in the project */
  tasksTotal: number;
  /** Completion rate as a percentage */
  completionRate: number;
  /** Average time spent per task in minutes */
  averageTimeSpent: number;
  /** Project color */
  color: string;
}

/**
 * Analytics data for a specific label
 */
export interface LabelAnalytics {
  /** Label name */
  labelName: string;
  /** Number of completed tasks with this label */
  tasksCompleted: number;
  /** Total number of tasks with this label */
  tasksTotal: number;
  /** Completion rate as a percentage */
  completionRate: number;
  /** Label color */
  color: string;
}

/**
 * Time of day analytics data point
 */
export interface TimeOfDayData {
  /** Hour of the day (0-23) */
  hour: number;
  /** Number of tasks completed in this hour */
  completed: number;
  /** Number of tasks created in this hour */
  created: number;
}

/**
 * Focus session data
 */
export interface FocusSession {
  /** When the focus session occurred */
  date: Date;
  /** Duration of the session in minutes */
  duration: number;
  /** Optional task ID if session was for a specific task */
  taskId?: TaskId;
}

// =============================================================================
// TEAM TYPES
// =============================================================================

/**
 * Team member information
 */
export interface TeamMember {
  /** Unique identifier for the member */
  id: UserId;
  /** Member's display name */
  name: string;
  /** Member's email address */
  email: string;
  /** Member's role in the team */
  role: "owner" | "admin" | "member" | "viewer";
  /** Member's current status */
  status: "active" | "inactive" | "pending";
  /** When the member joined the team */
  joinedAt: Date;
  /** Last time the member was active */
  lastActive: Date;
  /** Number of tasks assigned to the member */
  tasksAssigned: number;
  /** Number of tasks completed by the member */
  tasksCompleted: number;
  /** Productivity score (0-100) */
  productivity: number;
  /** Departments the member belongs to */
  departments: string[];
}

/**
 * Team settings configuration
 */
export interface TeamSettings {
  /** Team visibility level */
  visibility: "public" | "private";
  /** Whether join requests require approval */
  joinApproval: boolean;
  /** Who can assign tasks */
  taskAssignment: "all" | "admins" | "owners";
}

/**
 * Team interface
 */
export interface Team {
  /** Unique identifier for the team */
  id: TeamId;
  /** Team name */
  name: string;
  /** Team description */
  description?: string;
  /** Team members */
  members: TeamMember[];
  /** Number of projects in the team */
  projects: number;
  /** When the team was created */
  createdAt: Date;
  /** Team settings */
  settings: TeamSettings;
}

/**
 * Team statistics
 */
export interface TeamStats {
  /** Total tasks across all team members */
  totalTasks: number;
  /** Completed tasks across all team members */
  completedTasks: number;
  /** Overdue tasks across all team members */
  overdueTasks: number;
  /** Average productivity across all team members */
  avgProductivity: number;
  /** Number of active team members */
  activeMembers: number;
  /** Number of projects in progress */
  projectsInProgress: number;
}

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

// Advanced notification interfaces - commented out for future implementation
/*
// Notification channel settings
export interface NotificationChannels {
  // Push notifications
  push: boolean
  // Email notifications  
  email: boolean
  // Desktop notifications
  desktop: boolean
  // Mobile notifications
  mobile: boolean
}

// Quiet hours configuration
export interface QuietHours {
  // Whether quiet hours are enabled
  enabled: boolean
  // Start time (HH:MM format)
  start: string
  // End time (HH:MM format)
  end: string
}

// Notification schedule settings
export interface NotificationSchedule {
  // Quiet hours configuration
  quietHours: QuietHours
  // Whether to send notifications on weekends
  weekends: boolean
  // Whether to send notifications on holidays
  holidays: boolean
}

// Notification type preferences
export interface NotificationTypes {
  // Task reminders
  reminders: boolean
  // Deadline notifications
  deadlines: boolean
  // Team collaboration notifications
  collaboration: boolean
  // Achievement notifications
  achievements: boolean
  // System notifications
  system: boolean
}
*/

// Simplified interfaces for basic notification functionality
export interface NotificationChannels {
  /** Desktop notifications */
  desktop: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NotificationSchedule {
  // Simplified - no complex scheduling for now
}

export interface NotificationTypes {
  /** Deadline notifications */
  deadlines: boolean;
}

/**
 * Notification frequency settings
 */
export interface NotificationFrequency {
  /** Send notifications immediately */
  immediate: boolean;
  /** Digest frequency */
  digest: "never" | "daily" | "weekly";
  /** Time to send digest (HH:MM format) */
  digestTime: string;
}

/**
 * Sound settings for notifications
 */
export interface NotificationSound {
  /** Whether sound is enabled */
  enabled: boolean;
  /** Volume level (0-100) */
  volume: number;
  /** Custom sound file path */
  soundFile?: string;
}

/**
 * Complete notification settings
 */
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;

// =============================================================================
// USER SETTINGS TYPES
// =============================================================================

/**
 * Appearance and theme settings
 */
export interface AppearanceSettings {
  /** Theme preference */
  theme: "light" | "dark" | "system";
  /** Custom color scheme */
  colorScheme?: string;
  /** Interface density */
  density: "compact" | "comfortable" | "spacious";
  /** Font size multiplier */
  fontScale: number;
  /** Sidebar position */
  sidebarPosition: "left" | "right";
  /** Language preference */
  language: string;
  /** High contrast mode */
  highContrast: boolean;
  /** Reduced motion preference */
  reducedMotion: boolean;
  /** Show task metadata by default */
  showTaskMetadata: boolean;
  /** Priority colors enabled */
  priorityColors: boolean;
  /** Date format preference */
  dateFormat: "MM/dd/yyyy" | "dd/MM/yyyy" | "yyyy-MM-dd";
}

/**
 * Behavior and preference settings
 */
export interface BehaviorSettings {
  /** Default view on app launch */
  startView: StandardViewId | "lastViewed";
  /** First day of week */
  weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, etc.
  /** Working days of the week */
  workingDays: number[];
  /** Time format preference */
  timeFormat: "12h" | "24h";
  /** System locale */
  systemLocale: string;
  /** Default task priority */
  defaultTaskPriority: TaskPriority;
  /** Auto-assign new tasks to current project */
  autoAssignToCurrentProject: boolean;
  /** Auto-focus title field when creating tasks */
  autoFocusTaskTitle: boolean;
  /** Default project for new tasks */
  defaultProjectId?: ProjectId;
  /** Enable keyboard shortcuts */
  keyboardShortcuts: boolean;
  /** Confirmation dialogs */
  confirmations: {
    deleteTask: boolean;
    deleteProject: boolean;
    deleteLabel: boolean;
    markAllComplete: boolean;
  };
}

// Data settings type will be generated from schema later

/**
 * Productivity and analytics settings
 */
export interface ProductivitySettings {
  /** Pomodoro timer configuration */
  pomodoro: {
    workDuration: number; // minutes
    shortBreakDuration: number; // minutes
    longBreakDuration: number; // minutes
    longBreakInterval: number; // number of sessions
    autoStartBreaks: boolean;
    autoStartWork: boolean;
    soundEnabled: boolean;
  };
  /** Goal tracking settings */
  goals: {
    dailyTaskTarget: number;
    weeklyTaskTarget: number;
    trackingEnabled: boolean;
    showProgress: boolean;
  };
  /** Analytics preferences */
  analytics: {
    dataCollection: boolean;
    showMetrics: boolean;
    metricVisibility: {
      productivity: boolean;
      streak: boolean;
      timeSpent: boolean;
      completion: boolean;
    };
  };
  /** Focus mode settings */
  focusMode: {
    enabled: boolean;
    hideDistractions: boolean;
    minimalUI: boolean;
    blockNotifications: boolean;
  };
}

/**
 * Complete user settings configuration
 */
// Old manual UserSettings interface - replaced with generated type
// export interface UserSettings {
//   /** Appearance and theme settings */
//   appearance: AppearanceSettings
//   /** Behavior and preference settings */
//   behavior: BehaviorSettings
//   /** Notification settings */
//   notifications: NotificationSettings
//   /** Data management and sync settings */
//   data: DataSettings
//   /** Integration settings */
//   integrations: DataSettings
//   /** Productivity and analytics settings */
//   productivity: ProductivitySettings
// }

/**
 * Partial user settings for updates - allows nested partials
 */
// Old manual PartialUserSettings interface - replaced with generated type
// export interface PartialUserSettings {
//   /** Appearance and theme settings */
//   appearance?: Partial<AppearanceSettings>
//   /** Behavior and preference settings */
//   behavior?: Partial<BehaviorSettings>
//   /** Notification settings */
//   notifications?: Partial<NotificationSettings>
//   /** Data management and sync settings */
//   data?: Partial<DataSettings>
//   /** Integration settings */
//   integrations?: Partial<DataSettings>
//   /** Productivity and analytics settings */
//   productivity?: Partial<ProductivitySettings>
// }

// =============================================================================
// SYNC AND PERFORMANCE TYPES
// =============================================================================

/**
 * Sync status for data synchronization
 */
export type SyncStatus = "idle" | "syncing" | "error" | "success";

/**
 * Sync configuration
 */
export interface SyncConfig {
  /** Whether auto-sync is enabled */
  autoSync: boolean;
  /** Sync interval in milliseconds */
  syncInterval: number;
  /** Whether to sync on window focus */
  syncOnFocus: boolean;
  /** Whether to sync on network reconnection */
  syncOnReconnect: boolean;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Delay between retry attempts in milliseconds */
  retryDelay: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Last sync timestamp */
  lastSync?: Date;
  /** Current sync status */
  syncStatus: SyncStatus;
  /** Number of pending changes */
  pendingChanges: number;
  /** Average sync duration in milliseconds */
  avgSyncDuration: number;
  /** Number of sync errors in current session */
  syncErrors: number;
  /** App loading time in milliseconds */
  loadTime: number;
  /** Memory usage in MB */
  memoryUsage?: number;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = unknown> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error message if unsuccessful */
  error?: string;
  /** Additional metadata */
  meta?: {
    /** Total count for paginated results */
    total?: number;
    /** Current page */
    page?: number;
    /** Items per page */
    limit?: number;
    /** Request timestamp */
    timestamp: Date;
  };
}

// =============================================================================
// FILTER AND SEARCH TYPES
// =============================================================================

/**
 * Filter criteria for tasks
 */
export interface TaskFilter {
  /** Filter by project IDs */
  projectIds?: ProjectId[];
  /** Filter by label names */
  labels?: string[];
  /** Filter by priority levels */
  priorities?: Array<1 | 2 | 3 | 4>;
  /** Filter by completion status */
  completed?: boolean;
  /** Filter by due date range */
  dueDateRange?: {
    start?: Date;
    end?: Date;
  };
  /** Filter by assigned team members */
  assignedTo?: UserId[];
  /** Filter by task status */
  status?: string[];
  /** Search query for title/description */
  searchQuery?: string;
}

/**
 * Sort configuration
 */
export interface SortConfig {
  /** Field to sort by */
  field: string;
  /** Sort direction */
  direction: "asc" | "desc";
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Generic linked list node
 */
export interface LinkedListNode {
  /** Unique identifier */
  id: string;
  /** ID of the next item in the list */
  nextId: string | null;
}

/**
 * Date range for filtering and analytics
 */
export interface DateRange {
  /** Start date */
  start: Date;
  /** End date */
  end: Date;
}

/**
 * Time period options for analytics
 */
export type TimePeriod = "today" | "week" | "month" | "year";

/**
 * Color palette for themes
 */
export interface ColorPalette {
  /** Primary color */
  primary: string;
  /** Secondary color */
  secondary: string;
  /** Accent color */
  accent: string;
  /** Background color */
  background: string;
  /** Text color */
  text: string;
  /** Border color */
  border: string;
  /** Success color */
  success: string;
  /** Warning color */
  warning: string;
  /** Error color */
  error: string;
}

/**
 * JSON schema utility for validating any JSON-encodable value
 */
export const JsonSchema = z.json();

/**
 * TypeScript type for JSON-encodable values
 */
export type Json = z.infer<typeof JsonSchema>;

// =============================================================================
// API REQUEST/RESPONSE SCHEMAS
// =============================================================================

/**
 * Schema for creating a new task via API
 * Uses .partial() to allow frontend to send partial data, with defaults applied in business logic
 * Includes sectionId for API compatibility (not part of Task schema itself)
 */
export const CreateTaskRequestSchema = TaskSchema.partial()
  .omit({
    id: true,
    createdAt: true,
    completedAt: true,
    completed: true,
  })
  .required({
    title: true,
  })
  .extend({
    sectionId: GroupIdSchema.optional(),
  });

// Serialization schemas for CreateTask (colocated with request schema)
export const TaskCreateSerializationSchema = TaskSerializationSchema.partial()
  .omit({
    id: true,
    createdAt: true,
    completedAt: true,
    completed: true,
  })
  .required({
    title: true,
  });
export const TaskCreateArraySerializationSchema = z.array(
  TaskCreateSerializationSchema,
);

/**
 * Schema for creating a new project via API
 * Uses .partial() to allow frontend to send partial data, with defaults applied in business logic
 */
export const CreateProjectRequestSchema = ProjectSchema.partial()
  .omit({
    id: true,
  })
  .required({
    name: true,
  });

// Serialization schemas for CreateProject (colocated with request schema)
export const ProjectCreateSerializationSchema =
  ProjectSerializationSchema.partial()
    .omit({
      id: true,
    })
    .required({
      name: true,
      color: true,
    });
export const ProjectCreateArraySerializationSchema = z.array(
  ProjectCreateSerializationSchema,
);

/**
 * Schema for creating a new label via API
 * Uses .partial() to allow frontend to send partial data, with defaults applied in business logic
 */
export const CreateLabelRequestSchema = LabelSchema.partial()
  .omit({
    id: true,
  })
  .required({
    name: true,
  });

// Serialization schemas for CreateLabel (colocated with request schema)
export const LabelCreateSerializationSchema = LabelSerializationSchema.partial()
  .omit({
    id: true,
  })
  .required({
    name: true,
  });
export const LabelCreateArraySerializationSchema = z.array(
  LabelCreateSerializationSchema,
);

/**
 * Schema for updating tasks via API
 * Includes sectionId for API compatibility (not part of Task schema itself)
 */
export const UpdateTaskRequestSchema = TaskSchema.partial()
  .required({
    id: true,
  })
  .omit({
    createdAt: true,
    completedAt: true,
  })
  .extend({
    dueDate: TaskSchema.shape.dueDate.nullable(),
    dueTime: TaskSchema.shape.dueTime.nullable(),
    recurring: TaskSchema.shape.recurring.nullable(),
    estimation: TaskSchema.shape.estimation.nullable(),
    projectId: TaskSchema.shape.projectId.nullable(),
    sectionId: GroupIdSchema.optional(),
  });

// Serialization schemas for UpdateTask (colocated with request schema)
export const TaskUpdateSerializationSchema = TaskSerializationSchema.partial()
  .required({
    id: true,
  })
  .omit({
    createdAt: true,
    completedAt: true,
  })
  .extend({
    dueDate: TaskSerializationSchema.shape.dueDate.nullable(),
    dueTime: TaskSerializationSchema.shape.dueTime.nullable(),
    recurring: TaskSerializationSchema.shape.recurring.nullable(),
    estimation: TaskSerializationSchema.shape.estimation.nullable(),
    projectId: TaskSerializationSchema.shape.projectId.nullable(),
  });
export const TaskUpdateArraySerializationSchema = z.array(
  TaskUpdateSerializationSchema,
);

/**
 * Union schema that accepts either single update or array of updates
 */
export const TaskUpdateUnionSchema = z.union([
  UpdateTaskRequestSchema,
  UpdateTaskRequestSchema.array(),
]);

/**
 * Schema for updating projects via API
 */
export const UpdateProjectRequestSchema = ProjectSchema.partial().required({
  id: true,
});

// Serialization schemas for UpdateProject (colocated with request schema)
export const ProjectUpdateSerializationSchema =
  ProjectSerializationSchema.partial().required({
    id: true,
  });
export const ProjectUpdateArraySerializationSchema = z.array(
  ProjectUpdateSerializationSchema,
);

/**
 * Union schema that accepts either single project update or array of updates
 */
export const ProjectUpdateUnionSchema = z.union([
  UpdateProjectRequestSchema,
  UpdateProjectRequestSchema.array(),
]);

/**
 * Schema for updating labels via API
 */
export const UpdateLabelRequestSchema = LabelSchema.partial().required({
  id: true,
});

/**
 * Union schema that accepts either single label update or array of updates
 */
export const LabelUpdateUnionSchema = z.union([
  UpdateLabelRequestSchema,
  UpdateLabelRequestSchema.array(),
]);

// Serialization schemas for UpdateLabel (colocated with request schema)
export const LabelUpdateSerializationSchema =
  LabelSerializationSchema.partial().required({
    id: true,
  });
export const LabelUpdateArraySerializationSchema = z.array(
  LabelUpdateSerializationSchema,
);

/**
 * Schema for updating user via API
 */
export const UpdateUserRequestSchema = UserSchema.partial().extend({
  avatar: AvatarBase64Schema.nullable().optional(),
  apiToken: UserSchema.shape.apiToken.nullable(),
});

/**
 * Schema for initial setup request - setting password for first time
 */
export const InitialSetupRequestSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

// Serialization schemas for UpdateUser (colocated with request schema)
export const UserUpdateSerializationSchema = UpdateUserRequestSchema;

/**
 * Schema for delete requests
 */
export const DeleteTaskRequestSchema = z.object({
  ids: z.array(TaskIdSchema).min(1, "At least one task ID is required"),
});

// Serialization schemas for DeleteTask (colocated with request schema)
export const TaskDeleteSerializationSchema = z.object({
  ids: z.array(TaskIdSchema),
});
export const TaskDeleteArraySerializationSchema = z.array(
  TaskDeleteSerializationSchema,
);

export const DeleteProjectRequestSchema = z.object({
  ids: z.array(ProjectIdSchema).min(1, "At least one project ID is required"),
});

// Serialization schemas for DeleteProject (colocated with request schema)
export const ProjectDeleteSerializationSchema = z.object({
  ids: z.array(ProjectIdSchema),
});
export const ProjectDeleteArraySerializationSchema = z.array(
  ProjectDeleteSerializationSchema,
);
export const DeleteLabelRequestSchema = LabelSchema.pick({ id: true });

// Serialization schemas for DeleteLabel (colocated with request schema)
export const LabelDeleteSerializationSchema = z.object({ id: LabelIdSchema });
export const LabelDeleteArraySerializationSchema = z.array(
  LabelDeleteSerializationSchema,
);

/**
 * Generic API response schema
 */
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

/**
 * Task creation response schema
 */
export const CreateTaskResponseSchema = ApiResponseSchema.extend({
  taskIds: z.array(TaskIdSchema),
});

/**
 * Label creation response schema
 */
export const CreateLabelResponseSchema = ApiResponseSchema.extend({
  labelIds: z.array(LabelIdSchema),
});

/**
 * Task update response schema
 */
export const UpdateTaskResponseSchema = ApiResponseSchema.extend({
  taskIds: z.array(TaskIdSchema),
});

/**
 * Delete response schema
 */
export const DeleteTaskResponseSchema = ApiResponseSchema.extend({
  taskIds: z.array(TaskIdSchema),
});

/**
 * Project update response schema
 */
export const UpdateProjectResponseSchema = ApiResponseSchema.extend({
  projects: z.array(ProjectSchema).optional(),
  count: z.number().optional(),
});

/**
 * Project creation response schema
 */
export const CreateProjectResponseSchema = ApiResponseSchema.extend({
  projectIds: z.array(ProjectIdSchema),
});

/**
 * Project deletion response schema
 */
export const DeleteProjectResponseSchema = ApiResponseSchema.extend({
  projectIds: z.array(ProjectIdSchema),
});

/**
 * Label update response schema
 */
export const UpdateLabelResponseSchema = ApiResponseSchema.extend({
  labels: z.array(LabelSchema).optional(),
  count: z.number().optional(),
});

/**
 * Label deletion response schema
 */
export const DeleteLabelResponseSchema = ApiResponseSchema.extend({
  labelIds: z.array(LabelIdSchema),
});

/**
 * Initial setup response schema
 */
export const InitialSetupResponseSchema = ApiResponseSchema.extend({
  user: UserSchema,
});

/**
 * Error response schema
 */
export const ErrorResponseSchema = z.object({
  code: ApiErrorCodeSchema,
  error: z.string(),
  message: z.string(),
  stack: z.string().optional(),
  filePath: z.string().optional(),
});
/**
 * API Response Metadata - included in all GET responses
 */
export const ApiResponseMetaSchema = z.object({
  /** Number of items in the response */
  count: z.number(),
  /** ISO timestamp of when the response was generated */
  timestamp: z.string(),
  /** Data version (semantic versioning) */
  version: z.string(),
});

/**
 * GET /api/tasks response schema - returns only tasks
 */
export const GetTasksResponseSchema = z.object({
  tasks: z.array(TaskSerializationSchema),
  meta: ApiResponseMetaSchema,
});

/**
 * GET /api/projects response schema - returns only projects
 */
export const GetProjectsResponseSchema = z.object({
  projects: z.array(ProjectSerializationSchema),
  meta: ApiResponseMetaSchema,
});

/**
 * GET /api/labels response schema - returns only labels
 */
export const GetLabelsResponseSchema = z.object({
  labels: z.array(LabelSerializationSchema),
  meta: ApiResponseMetaSchema,
});

/**
 * GET /api/groups response schema - returns both project and label groups
 */
export const GetGroupsResponseSchema = z.object({
  projectGroups: ProjectGroupSchema,
  labelGroups: LabelGroupSchema,
  meta: ApiResponseMetaSchema,
});

/**
 * GET /api/settings response schema - returns user settings
 */
export const GetSettingsResponseSchema = z.object({
  settings: UserSettingsSchema,
  meta: ApiResponseMetaSchema,
});

/**
 * GET /api/user response schema - returns user information
 */
export const GetUserResponseSchema = z.object({
  user: UserSerializationSchema,
  meta: ApiResponseMetaSchema,
});

/**
 * GET /api/data response schema - returns complete data structure
 * This endpoint is for clients that need the full data structure
 */
export const GetDataResponseSchema = DataFileSerializationSchema.extend({
  meta: ApiResponseMetaSchema,
});

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type CreateLabelRequest = z.infer<typeof CreateLabelRequestSchema>;
export type UpdateTaskRequest = z.infer<typeof UpdateTaskRequestSchema>;
export type TaskUpdateUnion = z.infer<typeof TaskUpdateUnionSchema>;
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;
export type ProjectUpdateUnion = z.infer<typeof ProjectUpdateUnionSchema>;
export type UpdateLabelRequest = z.infer<typeof UpdateLabelRequestSchema>;
export type LabelUpdateUnion = z.infer<typeof LabelUpdateUnionSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type InitialSetupRequest = z.infer<typeof InitialSetupRequestSchema>;
export type InitialSetupResponse = z.infer<typeof InitialSetupResponseSchema>;
export type UpdateUserResponse = z.infer<typeof UpdateUserResponseSchema>;
export type DeleteTaskRequest = z.infer<typeof DeleteTaskRequestSchema>;
export type DeleteProjectRequest = z.infer<typeof DeleteProjectRequestSchema>;
export type DeleteLabelRequest = z.infer<typeof DeleteLabelRequestSchema>;

export type CreateTaskResponse = z.infer<typeof CreateTaskResponseSchema>;
export type CreateLabelResponse = z.infer<typeof CreateLabelResponseSchema>;
export type UpdateTaskResponse = z.infer<typeof UpdateTaskResponseSchema>;
export type CreateProjectResponse = z.infer<typeof CreateProjectResponseSchema>;
export type UpdateProjectResponse = z.infer<typeof UpdateProjectResponseSchema>;
export type DeleteProjectResponse = z.infer<typeof DeleteProjectResponseSchema>;
export type UpdateLabelResponse = z.infer<typeof UpdateLabelResponseSchema>;
export type DeleteLabelResponse = z.infer<typeof DeleteLabelResponseSchema>;

// =============================================================================
// GROUP API SCHEMAS
// =============================================================================

// Group Request Schemas
export const CreateGroupRequestSchema = z.object({
  /** Group type - determines what kind of items this group contains */
  type: z.literal("task").or(z.literal("project")).or(z.literal("label")),
  /** Group name */
  name: z.string(),
  /** Optional group description */
  description: z.string().optional(),
  /** Group color (hex code) */
  color: z.string().optional(),
  /** Parent group ID - where to add this new group (optional for root level) */
  parentId: GroupIdSchema.optional(),
});

// Type-specific update schemas with required type field
export const UpdateProjectGroupRequestSchema = z.object({
  /** Group ID to update */
  id: GroupIdSchema,
  /** Group type - must be "project" */
  type: z.literal("project"),
  /** Updated group name */
  name: z.string().optional(),
  /** Updated group slug */
  slug: z.string().optional(),
  /** Updated group description */
  description: z.string().optional(),
  /** Updated group color */
  color: z.string().optional(),
  /** Updated group items - allows updating the project assignments */
  items: z
    .array(z.union([ProjectIdSchema, z.lazy(() => ProjectGroupSchema)]))
    .optional(),
});

export const UpdateLabelGroupRequestSchema = z.object({
  /** Group ID to update */
  id: GroupIdSchema,
  /** Group type - must be "label" */
  type: z.literal("label"),
  /** Updated group name */
  name: z.string().optional(),
  /** Updated group slug */
  slug: z.string().optional(),
  /** Updated group description */
  description: z.string().optional(),
  /** Updated group color */
  color: z.string().optional(),
  /** Updated group items - allows updating the label assignments */
  items: z
    .array(z.union([LabelIdSchema, z.lazy(() => LabelGroupSchema)]))
    .optional(),
});

// Discriminated union - Zod automatically validates based on type field
export const UpdateGroupRequestSchema = z.discriminatedUnion("type", [
  UpdateProjectGroupRequestSchema,
  UpdateLabelGroupRequestSchema,
]);

export const GroupUpdateUnionSchema = z.union([
  UpdateGroupRequestSchema,
  UpdateGroupRequestSchema.array(),
]);

// Bulk Group Update Schemas for reordering
export const BulkProjectGroupUpdateSchema = z.object({
  type: z.literal("project"),
  groups: z.array(ProjectGroupSchema),
});

export const BulkLabelGroupUpdateSchema = z.object({
  type: z.literal("label"),
  groups: z.array(LabelGroupSchema),
});

export const BulkGroupUpdateSchema = z.discriminatedUnion("type", [
  BulkProjectGroupUpdateSchema,
  BulkLabelGroupUpdateSchema,
]);

export const DeleteGroupRequestSchema = z.object({
  /** Group ID to delete */
  id: GroupIdSchema,
});

// Group Response Schemas
export const CreateGroupResponseSchema = ApiResponseSchema.extend({
  groupIds: z.array(GroupIdSchema),
});

export const UpdateGroupResponseSchema = ApiResponseSchema.extend({
  groups: z.array(GroupSchema).optional(),
  count: z.number().optional(),
});

export const DeleteGroupResponseSchema = ApiResponseSchema.extend({
  groupIds: z.array(GroupIdSchema),
});

// Group Request/Response Types
export type CreateGroupRequest = z.infer<typeof CreateGroupRequestSchema>;
export type UpdateProjectGroupRequest = z.infer<
  typeof UpdateProjectGroupRequestSchema
>;
export type UpdateLabelGroupRequest = z.infer<
  typeof UpdateLabelGroupRequestSchema
>;
export type UpdateGroupRequest = z.infer<typeof UpdateGroupRequestSchema>;
export type GroupUpdateUnion = z.infer<typeof GroupUpdateUnionSchema>;
export type BulkProjectGroupUpdate = z.infer<
  typeof BulkProjectGroupUpdateSchema
>;
export type BulkLabelGroupUpdate = z.infer<typeof BulkLabelGroupUpdateSchema>;
export type BulkGroupUpdate = z.infer<typeof BulkGroupUpdateSchema>;
export type DeleteGroupRequest = z.infer<typeof DeleteGroupRequestSchema>;
export type CreateGroupResponse = z.infer<typeof CreateGroupResponseSchema>;
export type UpdateGroupResponse = z.infer<typeof UpdateGroupResponseSchema>;
export type DeleteGroupResponse = z.infer<typeof DeleteGroupResponseSchema>;
export type DeleteTaskResponse = z.infer<typeof DeleteTaskResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
// GET endpoint response types
export type ApiResponseMeta = z.infer<typeof ApiResponseMetaSchema>;
export type GetTasksResponse = z.infer<typeof GetTasksResponseSchema>;
export type GetProjectsResponse = z.infer<typeof GetProjectsResponseSchema>;
export type GetLabelsResponse = z.infer<typeof GetLabelsResponseSchema>;
export type GetGroupsResponse = z.infer<typeof GetGroupsResponseSchema>;
export type GetSettingsResponse = z.infer<typeof GetSettingsResponseSchema>;
export type GetUserResponse = z.infer<typeof GetUserResponseSchema>;
export type GetDataResponse = z.infer<typeof GetDataResponseSchema>;

// =============================================================================
// VOICE COMMAND TYPES
// =============================================================================

/**
 * Schema for a voice command
 */
export const VoiceCommandSchema = z.object({
  /** Unique identifier for the command */
  id: VoiceCommandIdSchema,
  /** The spoken phrase that triggered the command */
  phrase: z.string(),
  /** The action to be performed */
  action: z.string(),
  /** Additional parameters for the command */
  parameters: z.record(z.string(), z.unknown()).optional(),
  /** Confidence level of the speech recognition (0-100) */
  confidence: z.number(),
  /** When the command was issued */
  timestamp: z.date().optional(),
  /** Whether the command has been executed */
  executed: z.boolean().optional(),
  /** Result of the command execution */
  result: z.string().optional(),
});

/**
 * Type for voice commands
 */
export type VoiceCommand = z.infer<typeof VoiceCommandSchema>;

// =============================================================================
// TYPE GUARDS AND VALIDATORS
// =============================================================================

/**
 * Type guard to check if a value is a valid priority
 */
// =============================================================================
// SETTINGS SCHEMAS
// =============================================================================

// (Duplicate schemas removed - they are now defined earlier in the file before UserSettingsSchema)

// /**
//  * Appearance settings schema - Placeholder for future implementation
//  */
// export const AppearanceSettingsSchema = z.object({
//   theme: z.enum(["light", "dark", "system"]),
//   colorScheme: z.string().optional(),
//   density: z.enum(["compact", "comfortable", "spacious"]),
//   fontScale: z.number().min(0.8).max(1.5),
//   sidebarPosition: z.enum(["left", "right"]),
//   language: z.string(),
//   highContrast: z.boolean(),
//   reducedMotion: z.boolean(),
//   showTaskMetadata: z.boolean(),
//   priorityColors: z.boolean(),
//   dateFormat: z.enum(["MM/dd/yyyy", "dd/MM/yyyy", "yyyy-MM-dd"]),
// })

// Minimal appearance settings for now
export const AppearanceSettingsSchema = z.object({}).optional();

// /**
//  * Behavior settings schema - Placeholder for future implementation
//  */
// export const BehaviorSettingsSchema = z.object({
//   startView: z.union([
//     z.enum(["inbox", "today", "upcoming", "completed", "all", "analytics", "search"]),
//     z.literal("lastViewed"),
//   ]),
//   weekStartDay: z.union([
//     z.literal(0),
//     z.literal(1),
//     z.literal(2),
//     z.literal(3),
//     z.literal(4),
//     z.literal(5),
//     z.literal(6),
//   ]),
//   workingDays: z.array(z.number().min(0).max(6)),
//   timeFormat: z.enum(["12h", "24h"]),
//   systemLocale: z.string(),
//   defaultTaskPriority: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
//   autoAssignToCurrentProject: z.boolean(),
//   autoFocusTaskTitle: z.boolean(),
//   defaultProjectId: ProjectIdSchema.optional(),
//   keyboardShortcuts: z.boolean(),
//   confirmations: z.object({
//     deleteTask: z.boolean(),
//     deleteProject: z.boolean(),
//     deleteLabel: z.boolean(),
//     markAllComplete: z.boolean(),
//   }),
// })

// Minimal behavior settings for now - moved before UserSettingsSchema
// export const BehaviorSettingsSchema = // MOVED ABOVE

// /**
//  * Notification settings schema - Placeholder for future implementation
//  */
// export const NotificationSettingsSchema = z.object({
//   enabled: z.boolean(),
//   channels: NotificationChannelsSchema,
//   schedule: NotificationScheduleSchema,
//   types: NotificationTypesSchema,
//   frequency: NotificationFrequencySchema,
//   sound: NotificationSoundSchema,
// })

// (NotificationSettingsSchema moved earlier in the file before UserSettingsSchema)

// /**
//  * Data settings schema - Placeholder for future implementation
//  */
// export const DataSettingsSchema = z.object({
//   autoBackup: z.object({
//     enabled: z.boolean(),
//     frequency: z.enum(["daily", "weekly", "monthly"]),
//     maxBackups: z.number().min(1).max(50),
//     includeCompleted: z.boolean(),
//   }),
//   exportPreferences: z.object({
//     format: z.enum(["json", "csv", "markdown"]),
//     includeMetadata: z.boolean(),
//     includeComments: z.boolean(),
//     includeSubtasks: z.boolean(),
//   }),
//   storage: z.object({
//     maxCacheSizeMB: z.number().min(10).max(1000),
//     clearCacheOnStartup: z.boolean(),
//     retentionDays: z.number().min(1).max(365),
//   }),
//   sync: z.object({
//     autoSync: z.boolean(),
//     syncInterval: z.number().min(60000).max(3600000), // 1 minute to 1 hour in ms
//     syncOnFocus: z.boolean(),
//     syncOnReconnect: z.boolean(),
//     maxRetries: z.number().min(1).max(10),
//     retryDelay: z.number().min(100).max(10000),
//   }),
// })

// Removed duplicate DataSettingsSchema and UserSettingsSchema definitions - now defined earlier in file

/**
 * Schema for partial user settings updates - Only integrations for now
 */
export const PartialUserSettingsSchema = z.object({
  data: DataSettingsSchema.partial().optional(),
  notifications: NotificationSettingsSchema.partial().optional(),
  general: GeneralSettingsSchema.partial().optional(),
  // Optional future settings (not stored yet):
  // appearance: AppearanceSettingsSchema.partial().optional(),
  // productivity: ProductivitySettingsSchema.partial().optional(),
});

// Settings API request/response schemas
export const UpdateSettingsRequestSchema = z.object({
  settings: PartialUserSettingsSchema,
});

export const UpdateSettingsResponseSchema = ApiResponseSchema.extend({
  settings: UserSettingsSchema,
});

/**
 * Schema for user update response
 */
export const UpdateUserResponseSchema = ApiResponseSchema.extend({
  user: UserSchema,
});

// Generated types for settings
export type UpdateSettingsRequest = z.infer<typeof UpdateSettingsRequestSchema>;
export type UpdateSettingsResponse = z.infer<
  typeof UpdateSettingsResponseSchema
>;
export type DataSettings = z.infer<typeof DataSettingsSchema>;
export type UserSettings = z.infer<typeof UserSettingsSchema>;
export type PartialUserSettings = z.infer<typeof PartialUserSettingsSchema>;

// =============================================================================

export function isValidPriority(value: unknown): value is 1 | 2 | 3 | 4 {
  return typeof value === "number" && value >= 1 && value <= 4;
}

/**
 * Type guard to check if a value is a valid view mode
 */
export function isValidViewMode(
  value: unknown,
): value is "list" | "kanban" | "calendar" {
  return (
    typeof value === "string" && ["list", "kanban", "calendar"].includes(value)
  );
}

/**
 * Type guard to check if a value is a valid sort direction
 */
export function isValidSortDirection(value: unknown): value is "asc" | "desc" {
  return typeof value === "string" && ["asc", "desc"].includes(value);
}

/**
 * Type guard to check if a value is a valid team role
 */
export function isValidTeamRole(value: unknown): value is TeamMember["role"] {
  return (
    typeof value === "string" &&
    ["owner", "admin", "member", "viewer"].includes(value)
  );
}
