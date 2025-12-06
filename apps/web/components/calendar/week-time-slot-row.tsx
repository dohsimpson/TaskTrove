"use client"

import { useCallback } from "react"
import { DraggableWrapper } from "@/components/ui/draggable-wrapper"
import { DropTargetWrapper } from "@/components/ui/drop-target-wrapper"
import { TaskItem } from "@/components/task/task-item"
import { format, isToday, isSameDay } from "date-fns"
import type { Task } from "@tasktrove/types/core"
import { CalendarAddButton } from "./calendar-add-button"

interface TaskPosition {
  top: number
  height: number
  task: Task
}

interface WeekTimeSlotRowProps {
  hour: number
  label: string
  weekDays: Date[]
  weekTasks: Array<{ date: Date; positionedTasks: TaskPosition[] }>
  onAddTask: (date: Date, hour: number) => void
  onTaskDrop: (params: {
    source: { data: Record<string, unknown> }
    location: { current: { dropTargets: { data: Record<string, unknown> }[] } }
    targetDate: Date
    targetTime: number
  }) => void
  getSlotRef: (hour: number) => (el: HTMLDivElement | null) => void
}

export function WeekTimeSlotRow({
  hour,
  label,
  weekDays,
  weekTasks,
  onAddTask,
  onTaskDrop,
  getSlotRef,
}: WeekTimeSlotRowProps) {
  const handleDrop = useCallback(
    (day: Date, targetTime: number) =>
      ({
        source,
        location,
      }: {
        source: { data: Record<string, unknown> }
        location: { current: { dropTargets: { data: Record<string, unknown> }[] } }
      }) => {
        onTaskDrop({
          source,
          location,
          targetDate: day,
          targetTime,
        })
      },
    [onTaskDrop],
  )

  return (
    <div
      ref={getSlotRef(hour)}
      data-slot-index={hour}
      className="flex border-b border-border/50 min-h-[50px]"
    >
      {/* Time Label */}
      <div className="w-12 flex-shrink-0 p-1 text-right border-r border-border bg-muted/20">
        <div className="text-xs text-muted-foreground font-medium leading-tight">{label}</div>
      </div>

      {/* Day columns with simplified time slot cells */}
      <div className="flex-1 grid grid-cols-7 gap-0.5 lg:gap-1">
        {weekDays.map((day) => {
          const dayData = weekTasks.find((wd) => isSameDay(wd.date, day))
          const isTodayDate = isToday(day)
          const hourTasks =
            dayData?.positionedTasks.filter((task) => {
              const taskHour = Math.floor(task.top / 60)
              return taskHour === hour
            }) || []

          return (
            <div
              key={day.toISOString()}
              className={`
                p-1 hover:bg-muted/20 transition-colors border-r border-border last:border-r-0 relative group
                ${isTodayDate ? "bg-primary/5" : ""}
              `}
            >
              <CalendarAddButton
                onClick={() => onAddTask(day, hour)}
                title="Add task to this time slot"
                placement="top-right"
              />

              <DropTargetWrapper
                dropTargetId={`time-slot-${format(day, "yyyy-MM-dd")}-${hour}`}
                dropClassName="ring-2 ring-primary/50 bg-primary/5"
                onDrop={handleDrop(day, hour * 60)}
                canDrop={({ source }) => source.data.type === "draggable-item"}
                getData={() => ({
                  type: "calendar-time-slot",
                  date: format(day, "yyyy-MM-dd"),
                  time: hour * 60,
                })}
                className="h-full w-full"
              >
                <div className="space-y-1">
                  {hourTasks.map((taskPos, taskIndex) => (
                    <DraggableWrapper
                      key={`${taskPos.task.id}-${taskIndex}`}
                      dragId={taskPos.task.id}
                      index={taskIndex}
                      getData={() => ({
                        type: "draggable-item",
                        dragId: taskPos.task.id,
                        taskId: taskPos.task.id,
                        fromTimeSlot: {
                          date: format(day, "yyyy-MM-dd"),
                          time: hour * 60,
                        },
                      })}
                    >
                      <TaskItem
                        taskId={taskPos.task.id}
                        variant="calendar"
                        showProjectBadge={false}
                      />
                    </DraggableWrapper>
                  ))}
                </div>
              </DropTargetWrapper>
            </div>
          )
        })}
      </div>
    </div>
  )
}
