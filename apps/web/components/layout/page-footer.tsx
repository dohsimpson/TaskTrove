"use client"

import { useMemo } from "react"
import { useAtomValue } from "jotai"
import { useRouter } from "next/navigation"
import { CheckCircle, Calendar } from "lucide-react"
import { taskListForViewAtom } from "@tasktrove/atoms/ui/task-counts"
import { completedTasksTodayAtom } from "@tasktrove/atoms/core/tasks"
import { getViewStateAtom } from "@tasktrove/atoms/ui/views"
import type { ViewId } from "@tasktrove/types/id"
import { ContentPopover } from "@/components/ui/content-popover"
import { Button } from "@/components/ui/button"
import { TaskItem } from "@/components/task/task-item"
import type { Task } from "@tasktrove/types/core"
import { sortTasksByViewState } from "@tasktrove/atoms/utils/view-sorting"
import { FocusTimerDisplay } from "@/components/task/focus-timer-display"
import { useTranslation } from "@tasktrove/i18n"
import { TaskSortControls } from "@/components/task/task-sort-controls"
interface PageFooterProps {
  className?: string
}

function TaskListContent({
  tasks,
  title,
  icon,
  titleRoutePath,
  sortViewId,
}: {
  tasks: Task[]
  title: string
  icon: React.ReactNode
  titleRoutePath?: string
  sortViewId?: ViewId
}) {
  const router = useRouter()

  // Translation setup
  const { t } = useTranslation("layout")

  return (
    <div className="space-y-3 p-4">
      {/* Header - Similar to subtask popover */}
      <div className="flex items-center justify-between">
        {titleRoutePath ? (
          <button
            type="button"
            onClick={() => router.push(titleRoutePath)}
            aria-label={`${title} view`}
            className="inline-flex items-center gap-2 font-medium text-sm text-left underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
          >
            {icon}
            <span>{title}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium text-sm">{title}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {tasks.length}{" "}
            {tasks.length === 1 ? t("footer.task", "task") : t("footer.tasks", "tasks")}
          </span>
          {sortViewId ? <TaskSortControls viewId={sortViewId} className="h-7 w-7" /> : null}
        </div>
      </div>

      {/* Tasks List */}
      {tasks.length > 0 ? (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {tasks.map((task) => (
            <TaskItem key={task.id} taskId={task.id} variant="minimal" />
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
  // Task counts - using the same filtered atom as the "today" view for consistency
  const completedTasksToday = useAtomValue(completedTasksTodayAtom)
  const todayTasks = useAtomValue(taskListForViewAtom("today"))
  const todayViewStateAtom = useMemo(() => getViewStateAtom("today"), [])
  const todayViewState = useAtomValue(todayViewStateAtom)
  const dueTodayCount = todayTasks.length
  const sortedTodayTasks = sortTasksByViewState([...todayTasks], todayViewState)

  // Translation setup
  const { t } = useTranslation("layout")

  const todayRouteContext = {
    pathname: "/today",
    viewId: "today",
    routeType: "standard",
  } as const

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
            />
          }
          className="w-80 p-0"
          align="start"
          side="top"
          exclusive={false}
        >
          <Button
            variant="ghost"
            size="sm"
            aria-label={t("footer.completedToday", "Completed Today")}
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
              tasks={sortedTodayTasks}
              title={t("footer.dueToday", "Due Today")}
              icon={<Calendar className="h-4 w-4" />}
              titleRoutePath={todayRouteContext.pathname}
              sortViewId={todayRouteContext.viewId}
            />
          }
          className="w-80 p-0"
          align="start"
          side="top"
          exclusive={false}
        >
          <Button
            variant="ghost"
            size="sm"
            aria-label={t("footer.dueToday", "Due Today")}
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
