"use client"

import { useState } from "react"
import { DraggableWrapper } from "@/components/ui/draggable-wrapper"
import { DropTargetWrapper } from "@/components/ui/drop-target-wrapper"
import { useDragAndDrop } from "@/hooks/use-drag-and-drop"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns"
import { TaskItem } from "@/components/task/task-item"
import { SelectionToolbar } from "@/components/task/selection-toolbar"
import type { Task } from "@/lib/types"

interface CalendarViewProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onDateClick: (date: Date) => void
  droppableId: string // Required ID for the droppable sidebar
}

export function CalendarView({ tasks, onTaskClick, onDateClick, droppableId }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const { handleDrop } = useDragAndDrop()

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => task.dueDate && isSameDay(task.dueDate, date))
  }

  const getSelectedDateTasks = () => {
    if (!selectedDate) return []
    return getTasksForDate(selectedDate)
  }

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0">
      {/* Selection Toolbar */}
      <SelectionToolbar />

      {/* Calendar */}
      <div className="flex-1 p-3 lg:p-6 min-h-0">
        <Card className="h-full flex flex-col">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg lg:text-xl">
                {format(currentDate, "MMMM yyyy")}
              </CardTitle>
              <div className="flex items-center gap-1 lg:gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 lg:h-10 lg:w-10"
                  onClick={() =>
                    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
                  }
                >
                  <ChevronLeft className="h-3 w-3 lg:h-4 lg:w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs lg:text-sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 lg:h-10 lg:w-10"
                  onClick={() =>
                    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
                  }
                >
                  <ChevronRight className="h-3 w-3 lg:h-4 lg:w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <div className="grid grid-cols-7 gap-0.5 lg:gap-1 mb-2 lg:mb-4 flex-shrink-0">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="p-1 lg:p-2 text-center text-xs lg:text-sm font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5 lg:gap-1 flex-1 min-h-0">
              {monthDays.map((day) => {
                const dayTasks = getTasksForDate(day)
                const isSelected = selectedDate && isSameDay(day, selectedDate)
                const isTodayDate = isToday(day)
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
                      className={`min-h-16 lg:min-h-24 h-full p-0.5 lg:p-1 border border-border cursor-pointer hover:bg-muted/50 ${
                        isSelected ? "bg-accent border-accent-foreground/20" : ""
                      } ${isTodayDate ? "bg-accent/60" : ""}`}
                      onClick={() => {
                        setSelectedDate(day)
                        onDateClick(day)
                      }}
                    >
                      <div
                        className={`text-xs lg:text-sm font-medium mb-0.5 lg:mb-1 ${isTodayDate ? "text-primary" : "text-foreground"}`}
                      >
                        {format(day, "d")}
                      </div>
                      <div className="space-y-0.5 lg:space-y-1 overflow-hidden">
                        {dayTasks.slice(0, 3).map((task, index) => (
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
                        {dayTasks.length > 3 && (
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
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border bg-card flex-shrink-0 max-h-80 lg:max-h-none">
        <div className="p-3 lg:p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-3 lg:mb-4 flex-shrink-0">
            <h3 className="font-semibold text-sm lg:text-base">
              {selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Select a date"}
            </h3>
            {selectedDate && (
              <Button size="sm" onClick={() => onDateClick(selectedDate)}>
                <Plus className="h-3 w-3 lg:h-4 lg:w-4 mr-1" />
                <span className="hidden sm:inline">Add task</span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}
          </div>

          <DropTargetWrapper
            dropTargetId={droppableId}
            onDrop={({ source }) => {
              // Handle task drops on sidebar
              console.log("Sidebar drop:", { source, droppableId })
            }}
            getData={() => ({
              type: "task-list",
              sidebarContext: "calendar-sidebar",
            })}
            className="space-y-2 flex-1 min-h-32 lg:min-h-48 overflow-y-auto"
          >
            <div>
              {getSelectedDateTasks().map((task, index) => (
                <DraggableWrapper
                  key={task.id}
                  dragId={`sidebar-task-${task.id}`}
                  index={index}
                  getData={() => ({
                    type: "task",
                    taskId: task.id,
                    fromSidebar: true,
                  })}
                >
                  <TaskItem
                    taskId={task.id}
                    variant="default"
                    showProjectBadge={false}
                    className="p-2 lg:p-3"
                  />
                </DraggableWrapper>
              ))}

              {/* Empty state inside droppable */}
              {selectedDate && getSelectedDateTasks().length === 0 && (
                <div className="text-center py-6 lg:py-8 text-muted-foreground">
                  <p className="text-xs lg:text-sm">No tasks for this date</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => onDateClick(selectedDate)}
                  >
                    <Plus className="h-3 w-3 lg:h-4 lg:w-4 mr-1" />
                    Add your first task
                  </Button>
                </div>
              )}
            </div>
          </DropTargetWrapper>
        </div>
      </div>
    </div>
  )
}
