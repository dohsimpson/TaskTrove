"use client"

import { useCallback } from "react"
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

  return (
    <div className="flex border-b border-border bg-card/30 min-h-[60px]">
      {/* Time column spacer */}
      <div className="w-12 p-2 border-r border-border bg-muted/30">
        <div className="text-xs text-muted-foreground font-medium text-center">All Day</div>
      </div>

      {/* All-day tasks container */}
      <div className="flex-1 grid grid-cols-7 gap-0.5 lg:gap-1">
        {weekDays.map((date, index) => {
          const isTodayDate = isToday(date)
          const tasks = allDayTasks[index] || []

          return (
            <DropTargetWrapper
              key={date.toISOString()}
              dropTargetId={`all-day-area-${format(date, "yyyy-MM-dd")}`}
              dropClassName="ring-2 ring-primary/50 bg-primary/10"
              onDrop={handleAllDayDrop(date)}
              canDrop={({ source }) => source.data.type === "draggable-item"}
              getData={() => ({
                type: "calendar-all-day-area",
                date: format(date, "yyyy-MM-dd"),
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
                variant="all-day"
              />

              <div className="space-y-1 max-h-[80px] overflow-y-auto">
                {tasks.slice(0, maxTasks).map((task, taskIndex) => (
                  <DropTargetWrapper
                    key={task.id}
                    dropTargetId={`all-day-${format(date, "yyyy-MM-dd")}-${task.id}`}
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
                          date: format(date, "yyyy-MM-dd"),
                        },
                      })}
                    >
                      <TaskItem taskId={task.id} variant="calendar" showProjectBadge={false} />
                    </DraggableWrapper>
                  </DropTargetWrapper>
                ))}
              </div>

              {tasks.length > maxTasks && (
                <div className="text-xs text-muted-foreground pt-1">
                  +{tasks.length - maxTasks} more
                </div>
              )}
            </DropTargetWrapper>
          )
        })}
      </div>
    </div>
  )
}
