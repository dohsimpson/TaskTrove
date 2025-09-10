/**
 * Color utilities for task-related UI elements
 */

/**
 * Get priority color class for flags and text
 * @param priority - Priority level (1-4, where 4 is no priority)
 * @param variant - UI variant type
 * @returns Tailwind CSS class string
 */
export function getPriorityColor(
  priority: number,
  variant?: "default" | "compact" | "kanban" | "calendar",
): string {
  if (variant === "compact" || variant === "kanban" || variant === "default") {
    switch (priority) {
      case 1:
        return "border-l-red-500"
      case 2:
        return "border-l-orange-500"
      case 3:
        return "border-l-blue-500"
      default:
        return "border-l-muted-foreground"
    }
  } else if (variant === "calendar") {
    // For calendar variant, return border-left colors that override the base border
    switch (priority) {
      case 1:
        return "border-l-red-500"
      case 2:
        return "border-l-orange-500"
      case 3:
        return "border-l-blue-500"
      default:
        return "border-l-border" // Use default border color when no priority
    }
  } else {
    // Fallback for no variant specified - maintain backward compatibility
    switch (priority) {
      case 1:
        return "text-red-500"
      case 2:
        return "text-orange-500"
      case 3:
        return "text-blue-500"
      default:
        return "text-muted-foreground"
    }
  }
}

/**
 * Get priority text color class (always text colors, regardless of variant)
 * @param priority - Priority level (1-4, where 4 is no priority)
 * @returns Tailwind CSS class string
 */
export function getPriorityTextColor(priority: number): string {
  switch (priority) {
    case 1:
      return "text-red-500"
    case 2:
      return "text-orange-500"
    case 3:
      return "text-blue-500"
    default:
      return "text-muted-foreground"
  }
}

/**
 * Get priority label for display
 * @param priority - Priority level (1-4, where 4 is no priority)
 * @returns Human-readable priority label
 */
export function getPriorityLabel(priority: number): string {
  if (priority === 4) return "No priority"
  return `Priority ${priority}`
}

/**
 * Get due date text color based on date, completion status, and variant
 * @param date - Due date
 * @param completed - Whether the task is completed
 * @param variant - UI variant type
 * @returns Tailwind CSS class string
 */
export function getDueDateTextColor(
  date: Date | undefined,
  completed?: boolean,
  variant?: "default" | "compact",
): string {
  if (!date) return "text-muted-foreground"

  // Check if the Date is valid
  if (isNaN(date.getTime())) {
    return "text-muted-foreground"
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isTomorrow = (date: Date) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return date.toDateString() === tomorrow.toDateString()
  }

  const isPast = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    return checkDate < today
  }

  // If task is completed, always use muted color regardless of due date
  if (completed) {
    return "text-muted-foreground"
  }

  if (variant === "compact") {
    if (isPast(date) && !isToday(date)) return "text-red-600 dark:text-red-400"
    if (isToday(date)) return "text-orange-600 dark:text-orange-400"
    if (isTomorrow(date)) return "text-blue-600 dark:text-blue-400"
    return "text-muted-foreground"
  } else {
    if (isPast(date) && !isToday(date)) return "text-red-600 dark:text-red-400"
    if (isToday(date)) return "text-orange-600 dark:text-orange-400"
    if (isTomorrow(date)) return "text-foreground"
    return "text-foreground"
  }
}

/**
 * Get schedule icons for a task - returns information about which icons to show
 * @param dueDate - Task due date
 * @param recurring - Task recurring pattern
 * @param completed - Whether the task is completed
 * @param isOverdue - Whether the due date is overdue (optional, will be calculated if not provided)
 * @returns Object with icon information
 */
export function getScheduleIcons(
  dueDate: Date | undefined,
  recurring: string | undefined,
  completed?: boolean,
  isOverdue?: boolean,
) {
  const hasRecurring = Boolean(recurring)
  const hasDueDate = Boolean(dueDate)

  // Use provided isOverdue or calculate it if not provided
  const overdue =
    isOverdue ??
    (dueDate && !completed
      ? (() => {
          // Fallback calculation when isOverdue is not provided
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const checkDate = new Date(dueDate)
          checkDate.setHours(0, 0, 0, 0)
          const isToday = dueDate.toDateString() === new Date().toDateString()
          return checkDate < today && !isToday
        })()
      : false)

  return {
    hasRecurring,
    hasDueDate,
    isOverdue: overdue,
    // Primary icon (leftmost) - overdue takes precedence, then repeat if recurring, then calendar
    primaryIcon: overdue ? "overdue" : hasRecurring ? "repeat" : hasDueDate ? "calendar" : null,
    // Secondary icon - repeat icon when task is overdue AND recurring
    secondaryIcon: overdue && hasRecurring ? "repeat" : null,
    // Show recurring only when there's no due date
    showRecurringOnly: hasRecurring && !hasDueDate,
  }
}
