"use client"

import { useAtomValue, useSetAtom } from "jotai"
import { CheckCircle, Calendar } from "lucide-react"
import { toggleTaskAtom, completedTasksTodayAtom } from "@tasktrove/atoms/core/tasks"
import { taskCountsAtom } from "@tasktrove/atoms/ui/task-counts"
import { todayTasksAtom } from "@tasktrove/atoms/data/tasks/filters"
import { sortTasksByViewState } from "@tasktrove/atoms/utils/view-sorting"
import type { ViewState } from "@tasktrove/types/core"
import { toggleTaskPanelWithViewStateAtom } from "@tasktrove/atoms/ui/views"
import { selectedTaskRouteContextOverrideAtom } from "@tasktrove/atoms/ui/selection"
import type { RouteContext } from "@tasktrove/atoms/ui/navigation"
import { ContentPopover } from "@/components/ui/content-popover"
import { Button } from "@/components/ui/button"
import { TaskCheckbox } from "@/components/ui/custom/task-checkbox"
import { TaskScheduleTrigger } from "@/components/task/task-schedule-trigger"
import type { Task } from "@/lib/types"
import { cn } from "@/lib/utils"
import { FocusTimerDisplay } from "@/components/task/focus-timer-display"
import { useTranslation } from "@tasktrove/i18n"
interface PageFooterProps {
  className?: string
}

function TaskListContent({
  tasks,
  title,
  icon,
  routeContextOverride,
}: {
  tasks: Task[]
  title: string
  icon: React.ReactNode
  routeContextOverride?: RouteContext
}) {
  const toggleTask = useSetAtom(toggleTaskAtom)
  const toggleTaskPanel = useSetAtom(toggleTaskPanelWithViewStateAtom)
  const setRouteContextOverride = useSetAtom(selectedTaskRouteContextOverrideAtom)

  // Translation setup
  const { t } = useTranslation("layout")

  const handleTaskClick = (e: React.MouseEvent, task: Task) => {
    // Don't trigger if clicking on buttons or interactive elements
    const target = e.target
    if (
      !(target instanceof HTMLElement) ||
      target.closest("button") ||
      target.closest("[data-action]") ||
      target.closest('[role="button"]') ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest("textarea")
    ) {
      return
    }
    // Set an override for the route context if provided so focus actions work correctly
    setRouteContextOverride(routeContextOverride ?? null)
    // Use atom action to open task panel
    toggleTaskPanel(task)
  }

  return (
    <div className="space-y-3 p-4">
      {/* Header - Similar to subtask popover */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {tasks.length}{" "}
          {tasks.length === 1 ? t("footer.task", "task") : t("footer.tasks", "tasks")}
        </span>
      </div>

      {/* Tasks List */}
      {tasks.length > 0 ? (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded hover:bg-accent/50 text-sm transition-all duration-200 cursor-pointer",
                task.completed && "opacity-60",
              )}
              onClick={(e) => handleTaskClick(e, task)}
            >
              <TaskCheckbox
                checked={task.completed}
                onCheckedChange={() => toggleTask(task.id)}
                priority={task.priority}
              />
              <span className={`truncate flex-1 ${task.completed ? "line-through" : ""}`}>
                {task.title}
              </span>
              {(task.dueDate || task.recurring) && (
                <TaskScheduleTrigger
                  dueDate={task.dueDate}
                  dueTime={task.dueTime}
                  recurring={task.recurring}
                  recurringMode={task.recurringMode}
                  completed={task.completed}
                  variant="compact"
                  className="ml-auto flex-shrink-0"
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-4">
          <p className="text-sm">
            {t("footer.no", "No {{title}}", { title: title.toLowerCase() })}
          </p>
        </div>
      )}
    </div>
  )
}

export function PageFooter({ className }: PageFooterProps) {
  // Task counts - using the same atoms as the sidebar for consistency
  const completedTasksToday = useAtomValue(completedTasksTodayAtom)
  const taskCounts = useAtomValue(taskCountsAtom)
  const rawTodayTasks = useAtomValue(todayTasksAtom) // Base today tasks (same as sidebar)
  const dueTodayCount = taskCounts.today // Use sidebar count (without UI filters)

  // Apply default sorting (completed tasks at bottom) to match today view
  const defaultViewState: ViewState = {
    sortBy: "default",
    sortDirection: "asc",
    showCompleted: true,
    showOverdue: true,
    searchQuery: "",
    viewMode: "list",
    showSidePanel: false,
    compactView: false,
  }
  const todayTasks = sortTasksByViewState([...rawTodayTasks], defaultViewState)

  // Translation setup
  const { t } = useTranslation("layout")

  const todayRouteContext: RouteContext = {
    pathname: "/today",
    viewId: "today",
    routeType: "standard",
  }

  const completedRouteContext: RouteContext = {
    pathname: "/completed",
    viewId: "completed",
    routeType: "standard",
  }

  return (
    <div
      className={`bg-background border-t border-muted-foreground/60 px-4 py-2 flex items-center justify-between text-sm ${className}`}
    >
      {/* Left: Task counts */}
      <div className="flex items-center gap-4 text-muted-foreground">
        <ContentPopover
          content={
            <TaskListContent
              tasks={Array.isArray(completedTasksToday) ? completedTasksToday : []}
              title={t("footer.completedToday", "Completed Today")}
              icon={<CheckCircle className="h-4 w-4" />}
              routeContextOverride={completedRouteContext}
            />
          }
          className="w-80 p-0"
          align="start"
          side="top"
        >
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 h-auto px-0 py-0 hover:bg-transparent hover:text-foreground cursor-pointer"
          >
            <CheckCircle className="size-4" />
            <span className="font-medium text-foreground">
              {Array.isArray(completedTasksToday) ? completedTasksToday.length : 0}
            </span>{" "}
            {t("footer.completedTodayLabel", "completed today")}
          </Button>
        </ContentPopover>

        <ContentPopover
          content={
            <TaskListContent
              tasks={todayTasks}
              title={t("footer.dueToday", "Due Today")}
              icon={<Calendar className="h-4 w-4" />}
              routeContextOverride={todayRouteContext}
            />
          }
          className="w-80 p-0"
          align="start"
          side="top"
        >
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 h-auto px-0 py-0 hover:bg-transparent hover:text-foreground cursor-pointer"
          >
            <Calendar className="size-4" />
            <span className="font-medium text-foreground">{dueTodayCount}</span>{" "}
            {t("footer.dueTodayLabel", "due today")}
          </Button>
        </ContentPopover>
      </div>

      {/* Right: Focus timer */}
      <FocusTimerDisplay />
    </div>
  )
}
