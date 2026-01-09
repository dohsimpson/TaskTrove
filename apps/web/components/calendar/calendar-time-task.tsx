"use client"

import { useCallback, useMemo } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { format } from "date-fns"
import type { Task } from "@tasktrove/types/core"
import { taskAtoms } from "@tasktrove/atoms/core/tasks"
import {
  hoveredTaskIdAtom,
  selectedTaskIdAtom,
  selectedTasksAtom,
} from "@tasktrove/atoms/ui/selection"
import type { TaskId } from "@tasktrove/types/id"
import { settingsAtom } from "@tasktrove/atoms/data/base/atoms"
import { toggleTaskPanelWithViewStateAtom } from "@tasktrove/atoms/ui/views"
import {
  resizingTaskIdAtom,
  isAnyDragActiveAtom,
  isAnyResizeActiveAtom,
} from "@tasktrove/atoms/ui/drag"
import { DraggableTaskElement } from "@/components/task/draggable-task-element"
import { MaterialCard } from "@/components/ui/custom/material-card"
import { cn } from "@/lib/utils"
import { getPriorityColor } from "@/lib/color-utils"
import { useTaskMultiSelectClick } from "@/hooks/use-task-multi-select"
import {
  DEFAULT_TASK_DURATION,
  MINUTES_PER_DAY,
  MINUTES_PER_SUBSLOT,
  PIXELS_PER_MINUTE,
  toMinutesFromMidnight,
} from "@/lib/calendar/time-grid"
import { useTimeBlockResize, type TimeRangeMinutes } from "@/lib/calendar/use-time-block-resize"

interface CalendarTimeTaskProps {
  task: Task
  date: Date
  dayKey: string
  top: number
  height: number
  columnIndex?: number
  columnCount?: number
  zIndex: number
  className?: string
  sortedTaskIds?: TaskId[]
  getRangeTaskIds?: (startTaskId: TaskId, endTaskId: TaskId) => TaskId[] | null
}

export function CalendarTimeTask({
  task,
  date,
  dayKey,
  top,
  height,
  columnIndex = 0,
  columnCount = 1,
  zIndex,
  className,
  sortedTaskIds,
  getRangeTaskIds,
}: CalendarTimeTaskProps) {
  const updateTask = useSetAtom(taskAtoms.actions.updateTask)
  const toggleTaskPanel = useSetAtom(toggleTaskPanelWithViewStateAtom)
  const settings = useAtomValue(settingsAtom)
  const selectedTaskId = useAtomValue(selectedTaskIdAtom)
  const selectedTasks = useAtomValue(selectedTasksAtom)
  const hoveredTaskId = useAtomValue(hoveredTaskIdAtom)
  const setHoveredTaskId = useSetAtom(hoveredTaskIdAtom)
  const setResizingTaskId = useSetAtom(resizingTaskIdAtom)
  const isAnyDragActive = useAtomValue(isAnyDragActiveAtom)
  const isAnyResizeActive = useAtomValue(isAnyResizeActiveAtom)
  const handleMultiSelectClick = useTaskMultiSelectClick()
  const use24HourTime = Boolean(settings.uiSettings.use24HourTime)

  const startMinutes = useMemo(() => toMinutesFromMidnight(task.dueTime) ?? 0, [task.dueTime])

  const durationMinutes = useMemo(() => {
    const baseMinutes = task.estimation
      ? Math.max(0, task.estimation / 60)
      : DEFAULT_TASK_DURATION / 60
    return baseMinutes
  }, [task.estimation])
  const baseRange = useMemo<TimeRangeMinutes>(
    () => ({
      startMinutes: top / PIXELS_PER_MINUTE,
      endMinutes: (top + height) / PIXELS_PER_MINUTE,
    }),
    [height, top],
  )

  const resizeState = useTimeBlockResize({
    range: baseRange,
    pixelsPerMinute: PIXELS_PER_MINUTE,
    minMinutes: MINUTES_PER_SUBSLOT,
    maxMinutes: MINUTES_PER_DAY,
    onResizeStart: () => {
      setResizingTaskId(task.id)
    },
    onResizeEnd: () => {
      setResizingTaskId(null)
    },
    onCommit: (finalRange) => {
      const finalStart = finalRange.startMinutes
      const finalDuration = finalRange.endMinutes - finalRange.startMinutes
      if (finalStart === startMinutes && finalDuration === durationMinutes) return

      const hours = Math.floor(finalStart / 60)
      const minutes = finalStart % 60
      const dueTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes)

      updateTask({
        updateRequest: {
          id: task.id,
          dueDate: date,
          dueTime,
          estimation: Math.round(finalDuration * 60),
        },
      })
    },
  })
  const displayRange: TimeRangeMinutes = resizeState.displayRange
  const { isResizing, startResize } = resizeState

  const handleTaskClick = useCallback(
    (event: React.MouseEvent) => {
      if (isResizing) return
      if (
        handleMultiSelectClick({
          taskId: task.id,
          sortedTaskIds,
          getRangeTaskIds,
          event,
        })
      ) {
        return
      }

      toggleTaskPanel(task)
    },
    [getRangeTaskIds, handleMultiSelectClick, isResizing, sortedTaskIds, task, toggleTaskPanel],
  )

  const displayTop = displayRange.startMinutes * PIXELS_PER_MINUTE
  const displayHeight =
    Math.max(0, displayRange.endMinutes - displayRange.startMinutes) * PIXELS_PER_MINUTE

  const durationLabel = useMemo(() => {
    const displayMinutes = Math.round(displayHeight / PIXELS_PER_MINUTE)
    if (displayMinutes <= 0) return null
    return `${displayMinutes}m`
  }, [displayHeight])

  const resizeHandleSize = "h-1"
  const isCompactTask = displayHeight <= 22

  const startLabel = useMemo(() => {
    const minutesFromMidnight = Math.round(displayTop / PIXELS_PER_MINUTE)
    const startDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      Math.floor(minutesFromMidnight / 60),
      minutesFromMidnight % 60,
    )
    return format(startDate, use24HourTime ? "HH:mm" : "h:mm a")
  }, [date, displayTop, use24HourTime])

  const safeColumnCount = Math.max(1, columnCount)
  const safeColumnIndex = Math.min(Math.max(0, columnIndex), safeColumnCount - 1)
  const columnWidth = 100 / safeColumnCount
  const columnLeft = safeColumnIndex * columnWidth

  const isSelected = selectedTaskId === task.id
  const isInSelection = selectedTasks.includes(task.id)
  const shouldShowHoverHighlight = hoveredTaskId === task.id && !(isSelected || isInSelection)

  const handleTaskMouseEnter = () => {
    setHoveredTaskId(task.id)
  }

  const handleTaskMouseLeave = () => {
    setHoveredTaskId(null)
  }

  return (
    <div
      className={cn(
        "absolute pointer-events-auto",
        (isAnyDragActive || isAnyResizeActive) && "opacity-60",
        isAnyDragActive && "pointer-events-none",
        isResizing && "z-30",
        className,
      )}
      style={{
        top: `${displayTop}px`,
        height: `${displayHeight}px`,
        left: `${columnLeft}%`,
        width: `${columnWidth}%`,
        zIndex,
      }}
    >
      <div className="relative h-full group/calendar-task">
        <div
          className={cn(
            "absolute inset-x-0 top-0 cursor-ns-resize opacity-0 group-hover/calendar-task:opacity-100 z-20 pointer-events-auto",
            resizeHandleSize,
          )}
          onPointerDown={startResize("start")}
        />
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 cursor-ns-resize opacity-0 group-hover/calendar-task:opacity-100 z-20 pointer-events-auto",
            resizeHandleSize,
          )}
          onPointerDown={startResize("end")}
        />
        <DraggableTaskElement
          taskId={task.id}
          className="h-full"
          draggableClassName="h-full"
          getDragData={() => ({
            sourceType: "calendar",
            fromTimeSlot: {
              date: dayKey,
              time: startMinutes,
            },
          })}
        >
          <MaterialCard
            variant="calendar"
            selected={isSelected || isInSelection}
            completed={task.completed}
            archived={task.archived}
            leftBorderColor={getPriorityColor(task.priority, "calendar")}
            onClick={handleTaskClick}
            onMouseEnter={handleTaskMouseEnter}
            onMouseLeave={handleTaskMouseLeave}
            className={cn(
              "h-full flex",
              isCompactTask
                ? "items-center px-1 py-0 text-[10px] leading-3"
                : "px-1 py-0.5 text-xs flex-col justify-between",
              shouldShowHoverHighlight && "bg-accent/50",
              "ring-[0.5px] ring-primary/20",
              isResizing && "ring-1 ring-primary/40",
            )}
            data-task-id={task.id}
            title={isCompactTask ? `${task.title} · ${startLabel}` : undefined}
          >
            {isCompactTask ? (
              <div className="flex items-center gap-1 min-w-0">
                <span className="font-medium truncate">{task.title}</span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {startLabel}
                  {durationLabel ? ` · ${durationLabel}` : ""}
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5 min-h-0">
                <span className="font-medium truncate">{task.title}</span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {startLabel}
                  {durationLabel ? ` · ${durationLabel}` : ""}
                </span>
              </div>
            )}
          </MaterialCard>
        </DraggableTaskElement>
      </div>
    </div>
  )
}
