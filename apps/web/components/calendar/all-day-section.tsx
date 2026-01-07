"use client"

import { useCallback, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { DraggableTaskElement } from "@/components/task/draggable-task-element"
import { DropTargetWrapper } from "@/components/ui/drop-target-wrapper"
import { TaskItem } from "@/components/task/task-item"
import { format, isToday } from "date-fns"
import type { Task } from "@tasktrove/types/core"
import type { TaskId } from "@tasktrove/types/id"
import { isCalendarDragData } from "@/lib/calendar/types"
import { CalendarAddButton } from "./calendar-add-button"
import { isMobileApp } from "@/lib/utils/env"

// Local drop event data type for DropTargetWrapper compatibility
interface DropEventData {
  source: { data: Record<string, unknown> }
  location: { current: { dropTargets: { data: Record<string, unknown> }[] } }
}

interface AllDaySectionProps {
  weekDays: Date[]
  allDayTasks: Task[][]
  onTaskDrop: (params: {
    source: { data: Record<string, unknown> }
    location: { current: { dropTargets: { data: Record<string, unknown> }[] } }
    targetDate: Date
    targetTime: number
  }) => void
  canDrop?: (params: {
    source: { data: Record<string, unknown> }
    targetDate: Date
    targetTime?: number
  }) => boolean
  onAllDayClick: (date: Date) => void
  maxTasks?: number
  extraItems?: unknown[][]
  renderExtras?: (params: {
    date: Date
    dayKey: string
    isToday: boolean
    events?: unknown[]
    isExpanded: boolean
    maxVisibleEvents?: number
    onExpand: () => void
  }) => ReactNode
  maxExtras?: number
  sortedTaskIds?: TaskId[]
  className?: string
  showAddButton?: boolean
}

export function AllDaySection({
  weekDays,
  allDayTasks,
  onTaskDrop,
  canDrop,
  onAllDayClick,
  maxTasks = 3,
  extraItems = [],
  renderExtras,
  maxExtras,
  sortedTaskIds,
  className,
  showAddButton = true,
}: AllDaySectionProps) {
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({})
  const columnCount = Math.max(weekDays.length, 1)
  const gridColumnClass = columnCount === 7 ? "grid-cols-7" : columnCount === 1 ? "grid-cols-1" : ""

  const handleAllDayDrop = useCallback(
    (date: Date) =>
      ({ source, location }: DropEventData) => {
        onTaskDrop({
          source: { data: source.data },
          location,
          targetDate: date,
          targetTime: -1, // Special value for all-day (clear dueTime)
        })
      },
    [onTaskDrop],
  )

  const handleExpand = useCallback((dayKey: string) => {
    setExpandedDays((prev) => ({ ...prev, [dayKey]: true }))
  }, [])

  return (
    <div className={cn("flex border-b border-border bg-card/95 min-h-[50px]", className)}>
      {/* Time column spacer */}
      <div className="w-10 sm:w-12 p-2 border-r border-border bg-muted/30">
        <div className="text-xs font-medium text-center text-foreground/80">All Day</div>
      </div>

      {/* All-day tasks container - width driven by parent scroller */}
      <div className="flex-1">
        <div
          className={`grid h-full ${gridColumnClass}`}
          style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0,1fr))` }}
        >
          {weekDays.map((date, index) => {
            const isTodayDate = isToday(date)
            const tasks = allDayTasks[index] || []
            const extras = extraItems[index] || []
            const dayKey = format(date, "yyyy-MM-dd")
            const isExpanded = expandedDays[dayKey] ?? false
            const visibleTasks = isExpanded ? tasks : tasks.slice(0, maxTasks)
            const maxVisibleExtras =
              isExpanded || maxExtras === undefined ? extras.length : maxExtras
            const visibleExtras =
              isExpanded || maxExtras === undefined ? extras : extras.slice(0, maxVisibleExtras)
            const hiddenExtras =
              isExpanded || maxExtras === undefined
                ? 0
                : Math.max(0, extras.length - visibleExtras.length)
            const hiddenTasks = Math.max(0, tasks.length - visibleTasks.length)
            const hiddenCount = hiddenTasks + hiddenExtras

            const itemContainerClasses = cn(
              "space-y-1",
              isExpanded ? "max-h-none overflow-visible" : "max-h-[100px] overflow-y-auto",
            )

            return (
              <DropTargetWrapper
                key={date.toISOString()}
                dropTargetId={`all-day-area-${dayKey}`}
                dropClassName="ring-2 ring-primary/50 bg-primary/10"
                onDrop={handleAllDayDrop(date)}
                canDrop={({ source }) =>
                  canDrop
                    ? canDrop({ source, targetDate: date, targetTime: -1 })
                    : isCalendarDragData(source.data)
                }
                getData={() => ({
                  type: "calendar-all-day-area",
                  date: dayKey,
                  isAllDay: true,
                })}
                className={cn(
                  "border-r border-border last:border-r-0 relative group",
                  !isMobileApp() && "p-1",
                )}
              >
                {showAddButton && (
                  <CalendarAddButton
                    onClick={() => onAllDayClick(date)}
                    title="Add all-day task"
                    placement="top-right"
                  />
                )}

                <div className={itemContainerClasses}>
                  {renderExtras &&
                    renderExtras({
                      date,
                      dayKey,
                      isToday: isTodayDate,
                      events: visibleExtras,
                      isExpanded,
                      maxVisibleEvents: maxVisibleExtras,
                      onExpand: () => handleExpand(dayKey),
                    })}
                  {visibleTasks.map((task) => (
                    <DropTargetWrapper
                      key={task.id}
                      dropTargetId={`all-day-${dayKey}-${task.id}`}
                      dropClassName="ring-2 ring-primary/50 bg-primary/5"
                      onDrop={handleAllDayDrop(date)}
                      canDrop={({ source }) =>
                        canDrop
                          ? canDrop({ source, targetDate: date, targetTime: -1 })
                          : isCalendarDragData(source.data)
                      }
                      getData={() => ({
                        type: "calendar-all-day",
                        date: format(date, "yyyy-MM-dd"),
                      })}
                      className="cursor-pointer"
                    >
                      <DraggableTaskElement
                        taskId={task.id}
                        getDragData={() => ({
                          sourceType: "calendar",
                          fromAllDay: {
                            date: dayKey,
                          },
                        })}
                      >
                        <TaskItem
                          taskId={task.id}
                          variant="calendar"
                          showProjectBadge={false}
                          sortedTaskIds={sortedTaskIds}
                        />
                      </DraggableTaskElement>
                    </DropTargetWrapper>
                  ))}
                </div>

                {!isExpanded && hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleExpand(dayKey)}
                    className="text-xs text-primary pt-1 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                  >
                    +{hiddenCount} more
                  </button>
                )}
              </DropTargetWrapper>
            )
          })}
        </div>
      </div>
    </div>
  )
}
