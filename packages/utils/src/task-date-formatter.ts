/**
 * Task date and time formatting utilities
 *
 * Provides consistent formatting for task due dates and times across the application
 */

import { format, isToday, isTomorrow, isPast } from "date-fns";
import type { Locale } from "date-fns";

export type TaskDateFormat =
  | "full" // "1/15/2024 9:00 AM" or "Today 9:00 AM"
  | "compact" // "1/15" or "Today"
  | "badge" // "8/24 9AM" or "Today 9AM"
  | "short" // "9:00 AM" (time only) or "1/15" (date only)
  | "relative"; // "Today", "Tomorrow", "1/15/2024"

export interface TaskDateFormatOptions {
  format: TaskDateFormat;
  showTimeOnly?: boolean; // Show only time when no date is set
  includeYear?: boolean; // Include year in date formatting (defaults to current year only)
  use12Hour?: boolean; // Use 12-hour time format (defaults to true)
  /**
   * Prefer 24-hour clock. When true, overrides use12Hour to false.
   * When false/undefined, falls back to use12Hour (default true).
   */
  use24HourTime?: boolean;
  /**
   * Prefer day/month ordering for numeric dates (e.g., 11/12 -> 11 Dec).
   * When false/undefined, defaults to month/day ordering.
   */
  preferDayMonthFormat?: boolean;
  locale?: Locale; // Reserved for future localization support.
}

export interface DateDisplayOptions {
  includeYear?: boolean;
  preferDayMonthFormat?: boolean;
  pad?: boolean;
  locale?: Locale; // Reserved for future localization support.
}

export function formatDateDisplay(
  date: Date,
  options: DateDisplayOptions = {},
): string {
  const includeYear = options.includeYear ?? false;
  const preferDayMonthFormat = Boolean(options.preferDayMonthFormat);
  const pad = Boolean(options.pad);

  const monthToken = pad ? "MM" : "M";
  const dayToken = pad ? "dd" : "d";
  const base = preferDayMonthFormat
    ? `${dayToken}/${monthToken}`
    : `${monthToken}/${dayToken}`;
  const pattern = includeYear ? `${base}/yyyy` : base;

  return format(date, pattern);
}

export function formatDateTimeDisplay(
  date: Date,
  options: DateDisplayOptions & { use24HourTime?: boolean } = {},
): string {
  const dateText = formatDateDisplay(date, options);
  const timeText = formatTime(date, !options.use24HourTime, options.locale);
  return `${dateText} ${timeText}`;
}

export function formatMonthLabel(
  date: Date,
  options?: { variant?: "short" | "long"; locale?: Locale },
): string {
  const variant = options?.variant ?? "short";
  const formatOptions = options?.locale
    ? { locale: options.locale }
    : undefined;
  return format(date, variant === "long" ? "MMMM" : "MMM", formatOptions);
}

export function formatMonthYearLabel(
  date: Date,
  options?: { variant?: "short" | "long"; locale?: Locale },
): string {
  const variant = options?.variant ?? "short";
  const formatOptions = options?.locale
    ? { locale: options.locale }
    : undefined;
  return format(
    date,
    variant === "long" ? "MMMM yyyy" : "MMM yyyy",
    formatOptions,
  );
}

export function formatWeekdayLabel(
  date: Date,
  options?: {
    short?: boolean;
    variant?: "short" | "long" | "compact";
    locale?: Locale;
  },
): string {
  const formatOptions = options?.locale
    ? { locale: options.locale }
    : undefined;
  const variant = options?.variant ?? (options?.short ? "short" : "long");
  const token =
    variant === "compact" ? "EE" : variant === "short" ? "EEE" : "EEEE";
  return format(date, token, formatOptions);
}

export function formatDayOfMonthLabel(
  date: Date,
  options?: { pad?: boolean },
): string {
  const day = date.getDate();
  return options?.pad ? String(day).padStart(2, "0") : String(day);
}

/**
 * Format a task's due date and time for display
 *
 * @param task - Task object with dueDate and dueTime
 * @param options - Formatting options including locale for internationalization
 * @returns Formatted date/time string or null if no date/time to display
 *
 * @example
 * ```typescript
 * import { es } from 'date-fns/locale'
 *
 * // English (default): "1/15 9AM"
 * formatTaskDateTime(task, { format: "badge" })
 *
 * // Spanish: "15/1 9AM"
 * formatTaskDateTime(task, { format: "badge", locale: es })
 * ```
 */
export function formatTaskDateTime<
  T extends { dueDate?: Date | null; dueTime?: Date | null },
>(task: T, options: TaskDateFormatOptions = { format: "full" }): string | null {
  const { dueDate, dueTime } = task;
  const {
    format: formatType,
    showTimeOnly = true,
    includeYear,
    use12Hour = true,
    use24HourTime,
    preferDayMonthFormat,
    locale,
  } = options;
  const prefers24Hour = use24HourTime === true;
  const effectiveUse12Hour = prefers24Hour ? false : use12Hour;

  // Handle case where only time is set (no date)
  if (!dueDate && dueTime && showTimeOnly) {
    return formatTime(dueTime, effectiveUse12Hour, locale);
  }

  // Handle case where no date is set
  if (!dueDate) {
    return null;
  }

  // Format the date part
  const dateText = formatDatePart(
    dueDate,
    formatType,
    includeYear,
    preferDayMonthFormat,
  );

  // Add time if available
  if (dueTime) {
    const timeText = formatTime(dueTime, effectiveUse12Hour, locale);
    // For "Today", just show the time. For other dates, show concise format without "at"
    if (isToday(dueDate)) {
      return timeText;
    }
    return `${dateText} ${timeText}`;
  }

  return dateText;
}

/**
 * Get localized relative date labels (Today/Tomorrow)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getRelativeDateLabel(date: Date, locale?: Locale): string | null {
  if (isToday(date)) {
    // For now, return "Today" in English. In the future, this could be localized
    // using locale-specific translations or Intl.RelativeTimeFormat
    return "Today";
  }
  if (isTomorrow(date)) {
    return "Tomorrow";
  }
  return null;
}

/**
 * Format the date portion of a task's due date
 */
function formatDatePart(
  date: Date,
  formatType: TaskDateFormat,
  includeYear?: boolean,
  preferDayMonthFormat?: boolean,
): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const dateYear = date.getFullYear();
  const shouldIncludeYear = includeYear ?? dateYear !== currentYear;
  const relativeLabel = getRelativeDateLabel(date);

  switch (formatType) {
    case "full":
      if (relativeLabel) return relativeLabel;
      return formatDateDisplay(date, {
        includeYear: shouldIncludeYear,
        preferDayMonthFormat,
      });

    case "compact":
      if (relativeLabel) return relativeLabel;
      return formatDateDisplay(date, {
        includeYear: shouldIncludeYear,
        preferDayMonthFormat,
      });

    case "badge":
      if (relativeLabel) return relativeLabel;
      return formatDateDisplay(date, {
        includeYear: shouldIncludeYear,
        preferDayMonthFormat,
      });

    case "short":
      return formatDateDisplay(date, {
        includeYear: shouldIncludeYear,
        preferDayMonthFormat,
      });

    case "relative":
      if (relativeLabel) return relativeLabel;
      return formatDateDisplay(date, {
        includeYear: shouldIncludeYear,
        preferDayMonthFormat,
      });

    default:
      return formatDateDisplay(date, {
        includeYear: shouldIncludeYear,
        preferDayMonthFormat,
      });
  }
}

/**
 * Format time portion
 */
function formatTime(
  time: Date,
  use12Hour: boolean = true,
  locale?: Locale,
): string {
  const formatOptions = locale ? { locale } : undefined;

  if (use12Hour) {
    return format(time, "h:mm a", formatOptions);
  } else {
    return format(time, "HH:mm", formatOptions);
  }
}

/**
 * Get a short time format for badges and compact displays
 */
export function formatTimeShort(
  time: Date,
  options?: { use24HourTime?: boolean },
): string {
  const prefer24 = options?.use24HourTime === true;
  if (prefer24) {
    return format(time, "HH:mm");
  }

  // 12-hour short style (e.g., 9AM)
  const hours = time.getHours();
  const minutes = time.getMinutes();

  if (hours === 0) {
    return minutes === 0
      ? "12AM"
      : `12:${minutes.toString().padStart(2, "0")}AM`;
  } else if (hours < 12) {
    return minutes === 0
      ? `${hours}AM`
      : `${hours}:${minutes.toString().padStart(2, "0")}AM`;
  } else if (hours === 12) {
    return minutes === 0
      ? "12PM"
      : `12:${minutes.toString().padStart(2, "0")}PM`;
  } else {
    const hour12 = hours - 12;
    return minutes === 0
      ? `${hour12}PM`
      : `${hour12}:${minutes.toString().padStart(2, "0")}PM`;
  }
}

/**
 * Format task date for schedule popover badge (compact with short time)
 *
 * @param task - Task object with dueDate and dueTime
 * @param locale - Optional locale for date formatting
 * @returns Formatted badge text or null if no date/time to display
 */
export function formatTaskDateTimeBadge<
  T extends { dueDate?: Date | null; dueTime?: Date | null },
>(
  task: T,
  locale?: Locale,
  options?: { use24HourTime?: boolean; preferDayMonthFormat?: boolean },
): string {
  const { dueDate, dueTime } = task;

  if (!dueDate && dueTime) {
    return (
      formatTimeShort(dueTime, { use24HourTime: options?.use24HourTime }) || ""
    );
  }

  if (!dueDate) {
    return "";
  }

  const dateText = formatDatePart(
    dueDate,
    "badge",
    undefined,
    options?.preferDayMonthFormat,
  );

  if (dueTime) {
    const timeText = formatTimeShort(dueTime, {
      use24HourTime: options?.use24HourTime,
    });
    // For "Today", just show the time. For other dates, show "Tomorrow 9AM" format
    if (isToday(dueDate)) {
      return timeText;
    }
    return `${dateText} ${timeText}`;
  }

  return dateText;
}

/**
 * Standalone helper to format a time of day according to preference.
 * @param time Date object representing the time
 * @param options.use24HourTime when true uses 24h, otherwise 12h with AM/PM
 * @param options.short when true, uses compact style (e.g., 9AM or 09:00)
 */
export function formatTimeOfDay(
  time: Date,
  options?: { use24HourTime?: boolean; short?: boolean; locale?: Locale },
): string {
  if (options?.short) {
    return formatTimeShort(time, { use24HourTime: options.use24HourTime });
  }
  const use12 = options?.use24HourTime ? false : true;
  return formatTime(time, use12, options?.locale);
}

/**
 * Check if a task is overdue (considering completion status)
 */
export function isTaskOverdue(task: {
  dueDate?: Date | null;
  completed?: boolean;
}): boolean {
  if (!task.dueDate || task.completed) return false;
  return isPast(task.dueDate) && !isToday(task.dueDate);
}

/**
 * Get appropriate status text for a task's due date
 */
export function getTaskDueDateStatus(task: {
  dueDate?: Date | null;
  dueTime?: Date | null;
  completed?: boolean;
}): {
  text: string | null;
  status: "overdue" | "today" | "upcoming" | "none";
} {
  const { dueDate } = task;

  if (!dueDate) {
    return { text: null, status: "none" };
  }

  if (isTaskOverdue(task)) {
    return {
      text: formatTaskDateTime(task, { format: "relative" }),
      status: "overdue",
    };
  }

  if (isToday(dueDate)) {
    return {
      text: formatTaskDateTime(task, { format: "relative" }),
      status: "today",
    };
  }

  return {
    text: formatTaskDateTime(task, { format: "relative" }),
    status: "upcoming",
  };
}
