"use client"

import { useCallback } from "react"
import { DraggableWrapper } from "@/components/ui/draggable-wrapper"
import { DropTargetWrapper } from "@/components/ui/drop-target-wrapper"
import { TaskItem } from "@/components/task/task-item"
import { format } from "date-fns"
import type { Task } from "@/lib/types"
import { CalendarAddButton } from "./calendar-add-button"

interface TaskPosition {
  top: number
  height: number
  task: Task
}

interface DropEventData {
  source: { data: Record<string, unknown> }
  location: { current: { dropTargets: { data: Record<string, unknown> }[] } }
}

interface TimeSlotProps {
  hour: number
  label: string
  tasks: TaskPosition[]
  date: Date
  onAddTask: (date: Date, hour: number) => void
  onTaskDrop: (params: {
    source: { data: Record<string, unknown> }
    location: { current: { dropTargets: { data: Record<string, unknown> }[] } }
    targetDate: Date
    targetTime: number
  }) => void
}

export function TimeSlot({ hour, label, tasks, date, onAddTask, onTaskDrop }: TimeSlotProps) {
  const handleDrop = useCallback(
    ({ source, location }: DropEventData) => {
      onTaskDrop({
        source,
        location,
        targetDate: date,
        targetTime: hour * 60, // Convert hour to minutes
      })
    },
    [date, hour, onTaskDrop],
  )

  const handleAddTask = useCallback(() => {
    onAddTask(date, hour)
  }, [date, hour, onAddTask])

  return (
    <div className="flex border-b border-border/50 min-h-[50px]">
      {/* Time Label */}
      <div className="w-12 flex-shrink-0 p-1 text-right border-r border-border bg-muted/20">
        <div className="text-xs text-muted-foreground font-medium leading-tight">{label}</div>
      </div>

      {/* Task Area */}
      <div className="flex-1 p-1 hover:bg-muted/20 transition-colors relative group">
        <CalendarAddButton
          onClick={handleAddTask}
          title="Add task to this time slot"
          placement="top-right"
        />

        <DropTargetWrapper
          dropTargetId={`time-slot-${format(date, "yyyy-MM-dd")}-${hour}`}
          dropClassName="ring-2 ring-primary/50 bg-primary/5"
          onDrop={handleDrop}
          canDrop={({ source }) => source.data.type === "draggable-item"}
          getData={() => ({
            type: "calendar-time-slot",
            date: format(date, "yyyy-MM-dd"),
            time: hour * 60,
          })}
          className="h-full w-full"
        >
          <div className="space-y-1">
            {tasks.map((taskPos, index) => (
              <DraggableWrapper
                key={`${taskPos.task.id}-${index}`}
                dragId={taskPos.task.id}
                index={0}
                getData={() => ({
                  type: "draggable-item",
                  dragId: taskPos.task.id,
                  taskId: taskPos.task.id,
                  fromTimeSlot: {
                    date: format(date, "yyyy-MM-dd"),
                    time: taskPos.top,
                  },
                })}
              >
                <TaskItem taskId={taskPos.task.id} variant="calendar" showProjectBadge={false} />
              </DraggableWrapper>
            ))}
          </div>
        </DropTargetWrapper>
      </div>
    </div>
  )
}
