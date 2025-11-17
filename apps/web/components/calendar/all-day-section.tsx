"use client"

import { useCallback, useState } from "react"
import { cn } from "@/lib/utils"
import { DraggableWrapper } from "@/components/ui/draggable-wrapper"
import { DropTargetWrapper } from "@/components/ui/drop-target-wrapper"
import { TaskItem } from "@/components/task/task-item"
import { format, isToday } from "date-fns"
import type { Task } from "@/lib/types"
import { isCalendarDragData } from "@/lib/calendar/types"
import { CalendarAddButton } from "./calendar-add-button"

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
  onAllDayClick: (date: Date) => void
  maxTasks?: number
}

export function AllDaySection({
  weekDays,
  allDayTasks,
  onTaskDrop,
  onAllDayClick,
  maxTasks = 3,
}: AllDaySectionProps) {
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({})

  const handleAllDayDrop = useCallback(
    (date: Date) =>
      ({ source, location }: DropEventData) => {
        // Validate drag data before calling onTaskDrop
        if (!isCalendarDragData(source.data)) {
          console.warn("Invalid drag data in all-day drop")
          return
        }

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
    <div className="flex border-b border-border bg-card/30 min-h-[50px]">
      {/* Time column spacer */}
      <div className="w-10 sm:w-12 p-2 border-r border-border bg-muted/30">
        <div className="text-xs text-muted-foreground font-medium text-center">All Day</div>
      </div>

      {/* All-day tasks container - width driven by parent scroller */}
      <div className="flex-1">
        <div className="grid grid-cols-7 gap-0.5 lg:gap-1 h-full">
          {weekDays.map((date, index) => {
            const isTodayDate = isToday(date)
            const tasks = allDayTasks[index] || []
            const dayKey = format(date, "yyyy-MM-dd")
            const isExpanded = expandedDays[dayKey]
            const visibleTasks = isExpanded ? tasks : tasks.slice(0, maxTasks)

            const taskContainerClasses = cn(
              "space-y-1",
              isExpanded ? "max-h-none overflow-visible" : "max-h-[100px] overflow-y-auto",
            )

            return (
              <DropTargetWrapper
                key={date.toISOString()}
                dropTargetId={`all-day-area-${dayKey}`}
                dropClassName="ring-2 ring-primary/50 bg-primary/10"
                onDrop={handleAllDayDrop(date)}
                canDrop={({ source }) => source.data.type === "draggable-item"}
                getData={() => ({
                  type: "calendar-all-day-area",
                  date: dayKey,
                  isAllDay: true,
                })}
                className={`
                p-1 border-r border-border last:border-r-0 relative group
                ${isTodayDate ? "bg-primary/5" : ""}
              `}
              >
                <CalendarAddButton
                  onClick={() => onAllDayClick(date)}
                  title="Add all-day task"
                  placement="top-right"
                />

                <div className={taskContainerClasses}>
                  {visibleTasks.map((task, taskIndex) => (
                    <DropTargetWrapper
                      key={task.id}
                      dropTargetId={`all-day-${dayKey}-${task.id}`}
                      dropClassName="ring-2 ring-primary/50 bg-primary/5"
                      onDrop={handleAllDayDrop(date)}
                      canDrop={({ source }) => source.data.type === "draggable-item"}
                      getData={() => ({
                        type: "calendar-all-day",
                        date: format(date, "yyyy-MM-dd"),
                      })}
                      className="cursor-pointer"
                    >
                      <DraggableWrapper
                        dragId={task.id}
                        index={taskIndex}
                        getData={() => ({
                          type: "draggable-item",
                          dragId: task.id,
                          taskId: task.id,
                          fromAllDay: {
                            date: dayKey,
                          },
                        })}
                      >
                        <TaskItem taskId={task.id} variant="calendar" showProjectBadge={false} />
                      </DraggableWrapper>
                    </DropTargetWrapper>
                  ))}
                </div>

                {!isExpanded && tasks.length > maxTasks && (
                  <button
                    type="button"
                    onClick={() => handleExpand(dayKey)}
                    className="text-xs text-primary pt-1 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                  >
                    +{tasks.length - maxTasks} more
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
