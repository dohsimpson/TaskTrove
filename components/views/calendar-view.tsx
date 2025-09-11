"use client"

import { useState, useCallback } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { DraggableWrapper } from "@/components/ui/draggable-wrapper"
import { DropTargetWrapper } from "@/components/ui/drop-target-wrapper"
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
import {
  showTaskPanelAtom,
  closeTaskPanelAtom,
  selectedTaskAtom,
  updateQuickAddTaskAtom,
} from "@/lib/atoms/ui/dialogs"
import { currentViewStateAtom, taskActions } from "@/lib/atoms"
import { useIsMobile } from "@/hooks/use-mobile"
import { useAddTaskToSection } from "@/hooks/use-add-task-to-section"
import type { Task, Project } from "@/lib/types"
import { TaskIdSchema } from "@/lib/types"
import { DEFAULT_UUID } from "@/lib/constants/defaults"
import { log } from "@/lib/utils/logger"

// Constants
const SIDE_PANEL_WIDTH = 320 // 320px = w-80 in Tailwind

interface CalendarViewProps {
  tasks: Task[]
  onDateClick: (date: Date) => void
  droppableId: string // Required ID for the droppable sidebar
  project?: Project // Optional project context for adding tasks
}

export function CalendarView({ tasks, onDateClick, droppableId, project }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [alwaysShow6Rows] = useState(true) // TODO: Extract to view settings when needed

  // Task update action
  const updateTask = useSetAtom(taskActions.updateTask)

  // Add task functionality
  const addTaskToSection = useAddTaskToSection()
  const updateQuickAddTask = useSetAtom(updateQuickAddTaskAtom)

  // Handle adding task with prefilled date and project
  const handleAddTask = useCallback(() => {
    if (!selectedDate) return

    // Use the project's default section (first section) or undefined
    const defaultSectionId = project?.sections?.[0]?.id

    // Open quick add with project/section prefilled
    addTaskToSection(project?.id, defaultSectionId ?? DEFAULT_UUID)

    // Immediately update with the selected date as due date
    updateQuickAddTask({
      updateRequest: {
        dueDate: selectedDate,
      },
    })
  }, [selectedDate, project, addTaskToSection, updateQuickAddTask])

  // Handle task drops on calendar days
  const handleCalendarDrop = useCallback(
    ({
      source,
      location,
    }: {
      source: { data: Record<string, unknown> }
      location: { current: { dropTargets: { data: Record<string, unknown> }[] } }
    }) => {
      try {
        const sourceData = source.data
        const destinationData = location.current.dropTargets[0]?.data

        if (!sourceData || !destinationData) {
          log.warn(
            { sourceData, destinationData },
            "Missing source or destination data in calendar drop",
          )
          return
        }

        // Check if this is a draggable item (task)
        if (sourceData.type !== "draggable-item") {
          log.warn({ sourceType: sourceData.type }, "Invalid source type for calendar drop")
          return
        }

        // Check if dropping on calendar day
        if (destinationData.type !== "calendar-day") {
          log.warn(
            { destinationType: destinationData.type },
            "Invalid destination type for calendar drop",
          )
          return
        }

        // Extract task ID and target date
        const taskId =
          typeof (sourceData.dragId || sourceData.taskId) === "string"
            ? sourceData.dragId || sourceData.taskId
            : null
        const targetDate = typeof destinationData.date === "string" ? destinationData.date : null

        if (!taskId || !targetDate) {
          log.warn({ taskId, targetDate }, "Missing task ID or target date in calendar drop")
          return
        }

        // Validate task ID
        const taskIdResult = TaskIdSchema.safeParse(taskId)
        if (!taskIdResult.success) {
          log.warn({ taskId }, "Invalid task ID in calendar drop")
          return
        }

        // Convert date string to Date object in local timezone
        // Parse the date components to avoid UTC conversion issues
        const [year, month, day] = targetDate.split("-").map(Number)
        const dueDate = new Date(year, month - 1, day) // month is 0-indexed
        if (isNaN(dueDate.getTime())) {
          log.warn({ targetDate }, "Invalid date format in calendar drop")
          return
        }

        // Update task due date
        updateTask({
          updateRequest: {
            id: taskIdResult.data,
            dueDate: dueDate,
          },
        })

        log.info(
          { taskId: taskIdResult.data, dueDate: targetDate },
          "Task due date updated via calendar drop",
        )
      } catch (error) {
        log.error(
          { error: error instanceof Error ? error.message : String(error) },
          "Failed to handle calendar drop",
        )
      }
    },
    [updateTask],
  )

  // Task panel state
  const showTaskPanel = useAtomValue(showTaskPanelAtom)
  const closeTaskPanel = useSetAtom(closeTaskPanelAtom)
  const selectedTask = useAtomValue(selectedTaskAtom)
  const currentViewState = useAtomValue(currentViewStateAtom)
  const { compactView } = currentViewState
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

  const getUnscheduledTasks = () => {
    return tasks.filter((task) => !task.dueDate && !task.completed)
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
                    onDrop={({ source, location }) => {
                      handleCalendarDrop({ source, location })
                    }}
                    canDrop={({ source }) => source.data && source.data.type === "draggable-item"}
                    getData={() => ({
                      type: "calendar-day",
                      date: dayId,
                    })}
                  >
                    <div
                      className={`min-h-16 lg:min-h-24 h-full p-0.5 lg:p-1 border border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                        isSelected ? "ring-2 ring-foreground" : ""
                      } ${isTodayDate ? "bg-muted" : ""} ${!isCurrentMonth ? "opacity-40" : ""}`}
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
                              dragId={task.id}
                              index={index}
                              getData={() => ({
                                type: "draggable-item",
                                dragId: task.id,
                                taskId: task.id,
                                fromCalendarDay: dayId,
                              })}
                            >
                              <TaskItem
                                taskId={task.id}
                                variant="calendar"
                                showProjectBadge={false}
                              />
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
                <Button size="sm" onClick={handleAddTask}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add task
                </Button>
              </div>
              <DropTargetWrapper
                dropTargetId={droppableId}
                onDrop={({ source }) => {
                  if (source.data && source.data.type === "draggable-item" && selectedDate) {
                    // Transform to calendar-day drop for selected date
                    const calendarDayDrop = {
                      source,
                      location: {
                        current: {
                          dropTargets: [
                            {
                              data: {
                                type: "calendar-day",
                                date: format(selectedDate, "yyyy-MM-dd"),
                              },
                            },
                          ],
                        },
                      },
                    }
                    handleCalendarDrop(calendarDayDrop)
                  }
                }}
                getData={() => ({
                  type: "task-list",
                  sidebarContext: "calendar-bottom",
                })}
                className="space-y-2 min-h-[120px]"
              >
                {/* Tasks scheduled for selected date */}
                {getSelectedDateTasks().length > 0 ? (
                  getSelectedDateTasks().map((task, index) => (
                    <DraggableWrapper
                      key={task.id}
                      dragId={task.id}
                      index={index}
                      getData={() => ({
                        type: "draggable-item",
                        dragId: task.id,
                        taskId: task.id,
                        fromBottom: true,
                      })}
                    >
                      <TaskItem
                        taskId={task.id}
                        variant={compactView ? "compact" : "default"}
                        showProjectBadge={false}
                      />
                    </DraggableWrapper>
                  ))
                ) : (
                  <div className="flex items-center justify-center text-muted-foreground text-sm py-2">
                    No tasks scheduled for this date
                  </div>
                )}

                {/* Separator and unscheduled tasks */}
                {getUnscheduledTasks().length > 0 && (
                  <>
                    <div className="flex items-center gap-2 py-2">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground font-medium px-2">
                        Unscheduled
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    {getUnscheduledTasks().map((task, index) => (
                      <DraggableWrapper
                        key={task.id}
                        dragId={task.id}
                        index={getSelectedDateTasks().length + index}
                        getData={() => ({
                          type: "draggable-item",
                          dragId: task.id,
                          taskId: task.id,
                          fromUnscheduled: true,
                        })}
                      >
                        <TaskItem
                          taskId={task.id}
                          variant={compactView ? "compact" : "default"}
                          showProjectBadge={true}
                        />
                      </DraggableWrapper>
                    ))}
                  </>
                )}
              </DropTargetWrapper>
            </div>
          </div>
        )}
      </div>

      {/* Task Side Panel */}
      <TaskSidePanel isOpen={isPanelOpen} onClose={closeTaskPanel} />
    </div>
  )
}
