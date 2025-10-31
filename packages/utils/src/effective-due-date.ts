/**
 * Effective Due Date Calculation for Auto-Rollover Tasks
 *
 * Simple implementation that calculates the "effective" due date for auto-rollover tasks.
 * For auto-rollover tasks, we find the next occurrence that is today or in the future.
 */

import { startOfDay, isToday, isFuture } from "date-fns";
import type { Task } from "@tasktrove/types/core";
import { calculateNextDueDate } from "./recurring-task-processor";

/**
 * Get the effective due date for a task.
 *
 * For auto-rollover tasks, this finds the next occurrence that is today or in the future.
 * For other tasks, this returns the original due date.
 *
 * @param task - The task to calculate effective due date for
 * @returns The effective due date or null if no due date
 */
export function getEffectiveDueDate(task: Task): Date | null {
  // For non-auto-rollover tasks, return original due date
  if (task.recurringMode !== "autoRollover") {
    return task.dueDate ? new Date(task.dueDate) : null;
  }

  // For auto-rollover tasks without due date or recurring pattern, return null
  if (!task.dueDate || !task.recurring) {
    return task.dueDate ? new Date(task.dueDate) : null;
  }

  const today = startOfDay(new Date());
  const originalDate = new Date(task.dueDate);

  // If original date is today or future, return it
  if (isToday(originalDate) || isFuture(originalDate)) {
    return originalDate;
  }

  // If original date is past, find next occurrence
  let nextDate = originalDate;

  // Keep calculating forward until we find today or a future date
  while (startOfDay(nextDate) < startOfDay(today)) {
    // For daily recurring, just add one day at a time
    if (task.recurring === "RRULE:FREQ=DAILY;INTERVAL=1") {
      const newDate = new Date(nextDate);
      newDate.setDate(newDate.getDate() + 1);
      nextDate = newDate;
    } else {
      const calculated = calculateNextDueDate(task.recurring, nextDate, false);

      // If calculation fails, return original
      if (!calculated) {
        return originalDate;
      }

      // If calculation returns same date, move forward one more time
      if (calculated <= nextDate) {
        // Try with includeFromDate=false to get next date
        const nextCalculated = calculateNextDueDate(
          task.recurring,
          nextDate,
          false,
        );
        if (!nextCalculated || nextCalculated <= nextDate) {
          return originalDate;
        }
        nextDate = nextCalculated;
      } else {
        nextDate = calculated;
      }
    }

    // Prevent infinite loops - return original if we've gone too far
    if (nextDate.getFullYear() > today.getFullYear() + 10) {
      return originalDate;
    }
  }

  return nextDate;
}
