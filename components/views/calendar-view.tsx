"use client"

import { useState } from "react"
import { useAtomValue } from "jotai"
import { DraggableWrapper } from "@/components/ui/draggable-wrapper"
import { DropTargetWrapper } from "@/components/ui/drop-target-wrapper"
import { useDragAndDrop } from "@/hooks/use-drag-and-drop"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  addDays,
} from "date-fns"
import { TaskItem } from "@/components/task/task-item"
import { SelectionToolbar } from "@/components/task/selection-toolbar"
import { TaskSidePanel } from "@/components/task/task-side-panel"
import { showTaskPanelAtom, closeTaskPanelAtom, selectedTaskAtom } from "@/lib/atoms/ui/dialogs"
import { currentViewStateAtom } from "@/lib/atoms"
import { useSetAtom } from "jotai"
import { useIsMobile } from "@/hooks/use-mobile"
import type { Task } from "@/lib/types"

// Constants
const SIDE_PANEL_WIDTH = 320 // 320px = w-80 in Tailwind

interface CalendarViewProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onDateClick: (date: Date) => void
  droppableId: string // Required ID for the droppable sidebar
}

export function CalendarView({ tasks, onTaskClick, onDateClick, droppableId }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [alwaysShow6Rows] = useState(true) // TODO: Extract to view settings when needed
  const { handleDrop } = useDragAndDrop()

  // Task panel state
  const showTaskPanel = useAtomValue(showTaskPanelAtom)
  const closeTaskPanel = useSetAtom(closeTaskPanelAtom)
  const selectedTask = useAtomValue(selectedTaskAtom)
  const currentViewState = useAtomValue(currentViewStateAtom)
  const isMobile = useIsMobile()

  // Calculate side panel margin (same logic as project-sections-view)
  const isPanelOpen = (showTaskPanel || currentViewState.showSidePanel) && Boolean(selectedTask)
  const shouldApplyMargin = isPanelOpen && !isMobile

  // Generate calendar grid with proper week alignment
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }) // Start on Sunday

  // Choose calendar end based on layout preference
  const calendarEnd = alwaysShow6Rows
    ? addDays(calendarStart, 41) // Always show exactly 42 days (6 weeks)
    : endOfWeek(monthEnd, { weekStartsOn: 0 }) // Dynamic layout based on month

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => task.dueDate && isSameDay(task.dueDate, date))
  }

  const getSelectedDateTasks = () => {
    if (!selectedDate) return []
    return getTasksForDate(selectedDate)
  }

  // Generate month and year options (locale-aware)
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(2000, i, 1), "MMMM"),
  }))

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 21 }, (_, i) => {
    const year = currentYear - 10 + i
    return { value: year.toString(), label: year.toString() }
  })

  // Handle month/year selection
  const handleMonthChange = (monthValue: string) => {
    const month = parseInt(monthValue)
    setCurrentDate(new Date(currentDate.getFullYear(), month, 1))
  }

  const handleYearChange = (yearValue: string) => {
    const year = parseInt(yearValue)
    setCurrentDate(new Date(year, currentDate.getMonth(), 1))
  }

  return (
    <div className="flex flex-col h-full min-h-0 relative bg-background">
      {/* Selection Toolbar */}
      <SelectionToolbar />

      {/* Main Calendar Container */}
      <div
        className="flex-1 flex flex-col min-h-0 transition-all duration-300 px-2"
        style={{
          marginRight: shouldApplyMargin ? `${SIDE_PANEL_WIDTH}px` : "0px",
        }}
      >
        <div className="flex-1 flex flex-col min-h-0">
          {/* Calendar Header */}
          <div className="flex items-center justify-between px-3 pt-4">
            {/* Current Month/Year with Dropdowns */}
            <div className="flex items-center gap-2">
              <Select value={currentDate.getMonth().toString()} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-auto h-auto border border-input bg-background px-3 py-2 text-lg lg:text-xl font-semibold hover:bg-accent/50 focus:ring-2 focus:ring-ring rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={currentDate.getFullYear().toString()} onValueChange={handleYearChange}>
                <SelectTrigger className="w-auto h-auto border border-input bg-background px-3 py-2 text-lg lg:text-xl font-semibold hover:bg-accent/50 focus:ring-2 focus:ring-ring rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center gap-1 lg:gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 lg:w-10"
                onClick={() =>
                  setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
                }
              >
                <ChevronLeft className="h-3 w-3 lg:h-4 lg:w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs lg:text-sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 lg:w-10"
                onClick={() =>
                  setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
                }
              >
                <ChevronRight className="h-3 w-3 lg:h-4 lg:w-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 flex flex-col px-3 py-2 min-h-0">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-0.5 lg:gap-1 mb-2 flex-shrink-0">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="p-1 lg:p-2 text-center text-xs lg:text-sm font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-0.5 lg:gap-1 flex-1 min-h-0">
              {calendarDays.map((day) => {
                const dayTasks = getTasksForDate(day)
                const isSelected = selectedDate && isSameDay(day, selectedDate)
                const isTodayDate = isToday(day)
                const isCurrentMonth = isSameMonth(day, currentDate)
                const dayId = format(day, "yyyy-MM-dd")

                return (
                  <DropTargetWrapper
                    key={day.toISOString()}
                    dropTargetId={`calendar-day-${dayId}`}
                    onDrop={({ source }) => {
                      if (
                        source.data &&
                        (source.data.type === "task" || source.data.type === "draggable-item")
                      ) {
                        const taskId =
                          (typeof source.data.taskId === "string" ? source.data.taskId : null) ||
                          (typeof source.data.dragId === "string" ? source.data.dragId : null)
                        if (taskId) {
                          handleDrop({
                            source: {
                              data: {
                                type: source.data.type,
                                dragId:
                                  (typeof source.data.taskId === "string"
                                    ? source.data.taskId
                                    : null) ||
                                  (typeof source.data.dragId === "string"
                                    ? source.data.dragId
                                    : null) ||
                                  "",
                                index: 0,
                                taskId: source.data.taskId,
                                ...source.data,
                              },
                            },
                            location: {
                              current: {
                                dropTargets: [
                                  {
                                    data: {
                                      type: "calendar-day",
                                      date: dayId,
                                    },
                                  },
                                ],
                              },
                            },
                          })
                        }
                      }
                    }}
                    canDrop={({ source }) =>
                      source.data &&
                      (source.data.type === "task" || source.data.type === "draggable-item")
                    }
                    getData={() => ({
                      type: "calendar-day",
                      date: dayId,
                    })}
                  >
                    <div
                      className={`min-h-16 lg:min-h-24 h-full p-0.5 lg:p-1 border border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                        isSelected ? "bg-accent border-accent-foreground/20" : ""
                      } ${isTodayDate ? "bg-accent/60" : ""} ${
                        !isCurrentMonth ? "opacity-40" : ""
                      }`}
                      onClick={() => {
                        setSelectedDate(day)
                        onDateClick(day)
                      }}
                    >
                      <div
                        className={`text-xs lg:text-sm font-medium mb-0.5 lg:mb-1 ${
                          isTodayDate
                            ? "text-primary"
                            : isCurrentMonth
                              ? "text-foreground"
                              : "text-muted-foreground"
                        }`}
                      >
                        {format(day, "d")}
                      </div>
                      <div className="space-y-0.5 lg:space-y-1 overflow-hidden">
                        {isCurrentMonth &&
                          dayTasks.slice(0, 3).map((task, index) => (
                            <DraggableWrapper
                              key={task.id}
                              dragId={`calendar-day-task-${task.id}`}
                              index={index}
                              getData={() => ({
                                type: "task",
                                taskId: task.id,
                                fromCalendarDay: dayId,
                              })}
                            >
                              <div
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onTaskClick(task)
                                }}
                              >
                                <TaskItem
                                  taskId={task.id}
                                  variant="calendar"
                                  showProjectBadge={false}
                                />
                              </div>
                            </DraggableWrapper>
                          ))}
                        {isCurrentMonth && dayTasks.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{dayTasks.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </DropTargetWrapper>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Panel */}
      <div
        className="flex-shrink-0 border-t border-border bg-card transition-all duration-300"
        style={{
          marginRight: shouldApplyMargin ? `${SIDE_PANEL_WIDTH}px` : "0px",
        }}
      >
        {/* Selected Date Tasks */}
        {selectedDate && (
          <div className="border-b border-border">
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">{format(selectedDate, "EEEE, MMMM d")}</h2>
                <Button size="sm" onClick={() => onDateClick(selectedDate)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add task
                </Button>
              </div>
              {getSelectedDateTasks().length > 0 && (
                <DropTargetWrapper
                  dropTargetId={droppableId}
                  onDrop={({ source }) => {
                    // Handle task drops on selected date area
                    console.log("Selected date area drop:", { source, droppableId })
                  }}
                  getData={() => ({
                    type: "task-list",
                    sidebarContext: "calendar-bottom",
                  })}
                  className="space-y-2"
                >
                  {getSelectedDateTasks().map((task, index) => (
                    <DraggableWrapper
                      key={task.id}
                      dragId={`bottom-task-${task.id}`}
                      index={index}
                      getData={() => ({
                        type: "task",
                        taskId: task.id,
                        fromBottom: true,
                      })}
                    >
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          onTaskClick(task)
                        }}
                      >
                        <TaskItem taskId={task.id} variant="compact" showProjectBadge={false} />
                      </div>
                    </DraggableWrapper>
                  ))}
                </DropTargetWrapper>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Task Side Panel */}
      <TaskSidePanel isOpen={isPanelOpen} onClose={closeTaskPanel} />
    </div>
  )
}
