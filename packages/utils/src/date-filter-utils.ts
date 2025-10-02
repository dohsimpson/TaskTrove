/**
 * Date calculation utilities for task filtering
 */

import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  isBefore,
} from "date-fns";

export type DueDatePreset =
  | "overdue"
  | "today"
  | "tomorrow"
  | "thisWeek"
  | "nextWeek"
  | "noDueDate";

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Calculate date range for preset filters
 */
export function getDateRangeForPreset(preset: DueDatePreset): DateRange | null {
  const now = new Date();
  const today = startOfDay(now);

  switch (preset) {
    case "overdue":
      // From beginning of time to yesterday (end of yesterday)
      return {
        start: new Date(0), // Very old date
        end: endOfDay(addDays(today, -1)),
      };

    case "today":
      // Start and end of today
      return {
        start: startOfDay(today),
        end: endOfDay(today),
      };

    case "tomorrow":
      // Start and end of tomorrow
      const tomorrow = addDays(today, 1);
      return {
        start: startOfDay(tomorrow),
        end: endOfDay(tomorrow),
      };

    case "thisWeek":
      // Monday to Sunday of current week
      return {
        start: startOfWeek(today, { weekStartsOn: 1 }), // Monday
        end: endOfWeek(today, { weekStartsOn: 1 }), // Sunday
      };

    case "nextWeek":
      // Monday to Sunday of next week
      const nextWeekStart = addWeeks(
        startOfWeek(today, { weekStartsOn: 1 }),
        1,
      );
      return {
        start: nextWeekStart,
        end: endOfWeek(nextWeekStart, { weekStartsOn: 1 }),
      };

    case "noDueDate":
      // Special case - this will be handled differently in filtering logic
      return null;

    default:
      return null;
  }
}

/**
 * Check if a task matches the due date filter
 */
export function matchesDueDateFilter(
  taskDueDate: Date | null | undefined,
  taskCompleted: boolean,
  preset?: DueDatePreset,
  customRange?: { start?: Date; end?: Date },
): boolean {
  // Handle preset filters
  if (preset) {
    switch (preset) {
      case "noDueDate":
        return !taskDueDate;

      case "overdue":
        // Only incomplete tasks can be overdue
        if (taskCompleted || !taskDueDate) return false;
        return isBefore(taskDueDate, startOfDay(new Date()));

      default:
        // For other presets, get the date range and check if task due date falls within it
        if (!taskDueDate) return false;
        const range = getDateRangeForPreset(preset);
        if (!range) return false;
        return taskDueDate >= range.start && taskDueDate <= range.end;
    }
  }

  // Handle custom range
  if (customRange && (customRange.start || customRange.end)) {
    if (!taskDueDate) return false;

    const { start, end } = customRange;
    const afterStart = !start || taskDueDate >= startOfDay(start);
    const beforeEnd = !end || taskDueDate <= endOfDay(end);

    return afterStart && beforeEnd;
  }

  // No filter applied
  return true;
}

/**
 * Get human-readable label for preset
 */
export function getPresetLabel(
  preset: DueDatePreset,
  t?: (key: string, fallback: string) => string,
): string {
  if (!t) {
    // Fallback to English if no translation function provided
    switch (preset) {
      case "overdue":
        return "Overdue";
      case "today":
        return "Today";
      case "tomorrow":
        return "Tomorrow";
      case "thisWeek":
        return "This Week";
      case "nextWeek":
        return "Next Week";
      case "noDueDate":
        return "No Due Date";
      default:
        return preset;
    }
  }

  switch (preset) {
    case "overdue":
      return t("filters.presets.overdue", "Overdue");
    case "today":
      return t("filters.presets.today", "Today");
    case "tomorrow":
      return t("filters.presets.tomorrow", "Tomorrow");
    case "thisWeek":
      return t("filters.presets.thisWeek", "This Week");
    case "nextWeek":
      return t("filters.presets.nextWeek", "Next Week");
    case "noDueDate":
      return t("filters.presets.noDueDate", "No Due Date");
    default:
      return preset;
  }
}

/**
 * Get human-readable label for custom date range
 */
export function getCustomRangeLabel(
  range: { start?: Date; end?: Date },
  t?: (key: string, fallback: string) => string,
): string {
  const { start, end } = range;

  if (start && end) {
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  }
  if (start) {
    const fromLabel = t ? t("filters.dateRange.from", "From") : "From";
    return `${fromLabel} ${start.toLocaleDateString()}`;
  }
  if (end) {
    const untilLabel = t ? t("filters.dateRange.until", "Until") : "Until";
    return `${untilLabel} ${end.toLocaleDateString()}`;
  }

  return t ? t("filters.dateRange.label", "Custom Range") : "Custom Range";
}

/**
 * Count tasks matching each preset (for badge counts)
 */
export function getPresetTaskCounts(
  tasks: Array<{ dueDate?: Date | null; completed: boolean }>,
): Record<DueDatePreset, number> {
  const counts: Record<DueDatePreset, number> = {
    overdue: 0,
    today: 0,
    tomorrow: 0,
    thisWeek: 0,
    nextWeek: 0,
    noDueDate: 0,
  };

  for (const task of tasks) {
    // Type-safe iteration over preset keys
    const presets: DueDatePreset[] = [
      "overdue",
      "today",
      "tomorrow",
      "thisWeek",
      "nextWeek",
      "noDueDate",
    ];
    for (const preset of presets) {
      if (matchesDueDateFilter(task.dueDate, task.completed, preset)) {
        counts[preset]++;
      }
    }
  }

  return counts;
}
