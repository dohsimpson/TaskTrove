"use client"

import { useAtomValue, useSetAtom } from "jotai"
import { CheckCircle, Calendar } from "lucide-react"
import { completedTasksTodayAtom, todayTasksAtom, toggleTaskAtom } from "@/lib/atoms"
import { ContentPopover } from "@/components/ui/content-popover"
import { Button } from "@/components/ui/button"
import { TaskCheckbox } from "@/components/ui/custom/task-checkbox"
import type { Task } from "@/lib/types"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface PageFooterProps {
  className?: string
}

function TaskListContent({
  tasks,
  title,
  icon,
}: {
  tasks: Task[]
  title: string
  icon: React.ReactNode
}) {
  const toggleTask = useSetAtom(toggleTaskAtom)

  return (
    <div className="space-y-3 p-4">
      {/* Header - Similar to subtask popover */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
        </span>
      </div>

      {/* Tasks List */}
      {tasks.length > 0 ? (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded hover:bg-accent/50 text-sm transition-all duration-200",
                task.completed && "opacity-60",
              )}
            >
              <TaskCheckbox checked={task.completed} onCheckedChange={() => toggleTask(task.id)} />
              <span className={`truncate flex-1 ${task.completed ? "line-through" : ""}`}>
                {task.title}
              </span>
              {task.dueDate && (
                <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                  {format(new Date(task.dueDate), "MMM d")}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-4">
          <p className="text-sm">No {title.toLowerCase()}</p>
        </div>
      )}
    </div>
  )
}

export function PageFooter({ className }: PageFooterProps) {
  // Task counts
  const completedTasksToday = useAtomValue(completedTasksTodayAtom)
  const todayTasks = useAtomValue(todayTasksAtom)
  const dueTodayCount = todayTasks.length

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
              title="Completed Today"
              icon={<CheckCircle className="h-4 w-4" />}
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
            <CheckCircle className="w-4 h-4" />
            <span className="font-medium text-foreground">
              {Array.isArray(completedTasksToday) ? completedTasksToday.length : 0}
            </span>{" "}
            completed today
          </Button>
        </ContentPopover>

        <ContentPopover
          content={
            <TaskListContent
              tasks={todayTasks}
              title="Due Today"
              icon={<Calendar className="h-4 w-4" />}
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
            <Calendar className="w-4 h-4" />
            <span className="font-medium text-foreground">{dueTodayCount}</span> due today
          </Button>
        </ContentPopover>
      </div>

      {/* Right: Pomodoro timer */}
      {/* <div className="flex items-center gap-2">
        {isTimerRunning ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Timer className="w-4 h-4 text-orange-500" />
              <span className="font-mono font-medium text-foreground">{timerDisplay}</span>
            </div>
            <span className="text-xs max-w-32 truncate">{currentTaskTitle}</span>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePomodoroClick}
            className="flex items-center gap-1 h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <Timer className="w-4 h-4" />
            <span className="text-xs">Pomodoro</span>
          </Button>
        )}
      </div> */}
    </div>
  )
}
