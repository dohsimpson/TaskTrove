/**
 * Validators and Type Guards
 *
 * Runtime validation functions and type guards for TaskTrove types.
 */

import { z } from "zod";

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

/**
 * Type guard to check if a value is a valid priority
 */
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
export function isValidTeamRole(
  value: unknown,
): value is "owner" | "admin" | "member" | "viewer" {
  return (
    typeof value === "string" &&
    ["owner", "admin", "member", "viewer"].includes(value)
  );
}
