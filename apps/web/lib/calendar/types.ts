/**
 * Calendar-specific type definitions
 * Extends base types from @tasktrove/types for calendar functionality
 */

import type { Task } from "@tasktrove/types/core"
import { TaskIdSchema, type TaskId } from "@tasktrove/types/id"

// Re-export DueDate as Date for now
export type DueDate = Date
import type { ElementDropTargetEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"

// Re-export drag-drop event type for consistency
export type CalendarDropEventData = ElementDropTargetEventBasePayload

/**
 * Time slot in calendar grid
 */
export interface CalendarTimeSlot {
  hour: number
  date: Date
  label: string
  isAvailable: boolean
  tasks: Task[]
}

/**
 * Task position and layout information in calendar
 */
export interface CalendarTaskPosition {
  top: number
  height: number
  startMinutes: number
  endMinutes: number
  task: Task
  columnIndex: number
  columnCount: number
  overlaps: number
  zIndex: number
}

/**
 * Calendar drop target data
 */
export interface CalendarDropTarget {
  type: "calendar-time-slot" | "calendar-all-day" | "calendar-month-day"
  date: DueDate
  time?: number // Minutes from midnight, -1 for all-day
  dayIndex?: number // Index of day in week view (0-6)
}

/**
 * Draggable calendar item data
 */
export interface CalendarDragData {
  type: "draggable-item" | "list-item"
  dragId?: TaskId
  taskId: TaskId
  sourceType?: "calendar" | "sidebar" | "label"
  sourceData?: {
    date?: string
    fromAllDay?: boolean
    originalTime?: number
  }
}

/**
 * Calendar drop handler parameters
 */
export interface CalendarDropParams {
  source: { data: CalendarDragData }
  location: { current: { dropTargets: { data: CalendarDropTarget }[] } }
  targetDate: DueDate
  targetTime?: number
}

/**
 * Calendar view modes
 */
export type CalendarViewMode = "month" | "week" | "day"

/**
 * Calendar state interface
 */
export interface CalendarState {
  currentDate: Date
  selectedDate: Date | undefined
  viewMode: CalendarViewMode
}

/**
 * Calendar task operations hook result
 */
export interface CalendarTaskOperationsHookResult {
  createTaskAtDateTime: (date: Date, hour?: number) => void
  createAllDayTask: (date: Date) => void
}

/**
 * Calendar drag-drop hook result
 */
export interface CalendarDragDropHookResult {
  handleTimeSlotDrop: (params: CalendarDropParams) => Promise<void>
  handleAllDayDrop: (params: Omit<CalendarDropParams, "targetTime">) => Promise<void>
}

/**
 * Type guard for CalendarDragData
 */
export function isCalendarDragData(data: unknown): data is CalendarDragData {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    (data.type === "draggable-item" || data.type === "list-item") &&
    "taskId" in data &&
    typeof data.taskId === "string"
  )
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

/**
 * Extracts valid task IDs from drag data, supporting both single and multi-select drags.
 */
export function extractTaskIdsFromDragData(data: unknown): TaskId[] {
  if (!isRecord(data)) return []
  const payload = data

  const idsFromArray = Array.isArray(payload.ids)
    ? payload.ids.filter((id): id is string => typeof id === "string")
    : []

  const rawIds: string[] = []

  if (idsFromArray.length > 0) {
    rawIds.push(...idsFromArray)
  } else {
    if (typeof payload.taskId === "string") {
      rawIds.push(payload.taskId)
    }

    if (typeof payload.dragId === "string") {
      rawIds.push(payload.dragId)
    }
  }

  if (rawIds.length === 0) return []

  const unique = Array.from(new Set(rawIds))
  return unique.flatMap((id) => {
    const parsed = TaskIdSchema.safeParse(id)
    return parsed.success ? [parsed.data] : []
  })
}

/**
 * Type guard for CalendarDropTarget
 */
export function isCalendarDropTarget(data: unknown): data is CalendarDropTarget {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    (data.type === "calendar-time-slot" ||
      data.type === "calendar-all-day" ||
      data.type === "calendar-month-day") &&
    "date" in data &&
    data.date instanceof Date
  )
}

/**
 * Type guard for TaskId validation
 */
export function isValidTaskId(id: unknown): id is TaskId {
  return typeof id === "string" && id.length > 0
}

/**
 * Type guard for DueDate validation
 */
export function isValidDueDate(date: unknown): date is DueDate {
  return date instanceof Date && !isNaN(date.getTime())
}
