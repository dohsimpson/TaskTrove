import type { ReactNode } from "react"
import type { CalendarViewMode } from "@/lib/calendar/types"
import type { Task } from "@tasktrove/types/core"

export type CalendarViewExtensionEventsByDate = Record<string, unknown[]>
export type CalendarViewTimeGridItem = {
  id: string
  startMinutes: number
  endMinutes: number
  data: unknown
}

export type CalendarViewExtensionTimeGridItemsByDate = Record<string, CalendarViewTimeGridItem[]>

export type CalendarViewExtensionState = {
  allDayEventsByDate?: CalendarViewExtensionEventsByDate
  timeGridItemsByDate?: CalendarViewExtensionTimeGridItemsByDate
  monthEventsByDate?: CalendarViewExtensionEventsByDate
  /** Optional per-day cap for month cells */
  monthMaxVisibleEventsPerDay?: number
  /** Optional per-day cap for all-day strip rendering */
  allDayMaxVisibleEventsPerDay?: number
}

export type CalendarViewExtensions = {
  /**
   * Optional hook to derive external events. Return pre-grouped data keyed by day string (yyyy-MM-dd)
   * and per-hour buckets for time-grid rendering.
   */
  useExternalEvents?: (params: {
    tasks: Task[]
    calendarDays: Date[]
    calendarWeeks: Date[][]
    currentDate: Date
    viewMode: CalendarViewMode
    externalEvents?: unknown[]
  }) => CalendarViewExtensionState
  /** Render content inside each all-day column */
  renderAllDayExtras?: (params: {
    date: Date
    dayKey: string
    isToday: boolean
    events?: unknown[]
    isExpanded: boolean
    onExpand: () => void
    maxVisibleEvents?: number
  }) => ReactNode
  /** Render a positioned item inside the time grid */
  renderTimeGridItem?: (params: {
    date: Date
    dayKey: string
    item: CalendarViewTimeGridItem
    top: number
    height: number
    columnIndex: number
    columnCount: number
    zIndex: number
  }) => ReactNode
  /** Render content near the bottom of each month cell */
  renderMonthCellExtras?: (params: {
    date: Date
    events?: unknown[]
    isCurrentMonth: boolean
    hiddenEventsCount: number
    maxVisibleEvents?: number
  }) => ReactNode
  /** Render a single month cell event item */
  renderMonthCellEvent?: (params: {
    date: Date
    event: unknown
    isCurrentMonth: boolean
  }) => ReactNode
}

export type CalendarViewExtensionRuntime = CalendarViewExtensionState & {
  renderAllDayExtras?: CalendarViewExtensions["renderAllDayExtras"]
  renderTimeGridItem?: CalendarViewExtensions["renderTimeGridItem"]
  renderMonthCellExtras?: CalendarViewExtensions["renderMonthCellExtras"]
  renderMonthCellEvent?: CalendarViewExtensions["renderMonthCellEvent"]
}

export function useCalendarViewExtensionRuntime(params: {
  tasks: Task[]
  calendarDays: Date[]
  calendarWeeks: Date[][]
  currentDate: Date
  viewMode: CalendarViewMode
  externalEvents?: unknown[]
  extensions?: CalendarViewExtensions
}): CalendarViewExtensionRuntime {
  const extensions = params.extensions
  const state = extensions?.useExternalEvents?.(params) ?? {}
  return {
    allDayEventsByDate: state.allDayEventsByDate ?? {},
    timeGridItemsByDate: state.timeGridItemsByDate ?? {},
    monthEventsByDate: state.monthEventsByDate ?? {},
    monthMaxVisibleEventsPerDay: state.monthMaxVisibleEventsPerDay,
    allDayMaxVisibleEventsPerDay: state.allDayMaxVisibleEventsPerDay,
    renderAllDayExtras: extensions?.renderAllDayExtras,
    renderTimeGridItem: extensions?.renderTimeGridItem,
    renderMonthCellExtras: extensions?.renderMonthCellExtras,
    renderMonthCellEvent: extensions?.renderMonthCellEvent,
  }
}
