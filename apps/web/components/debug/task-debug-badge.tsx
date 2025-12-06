import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Task } from "@tasktrove/types/core"
import { isPro } from "@/lib/utils/env"

interface TaskDebugBadgeProps {
  task: Task
}

/**
 * Debug badge to show task metadata and relationships (development only)
 *
 * Displays task ID (truncated), priority, completion status, and counts for
 * subtasks, comments, and labels. In Pro builds, also shows owner and assignee
 * information. Only visible in development mode.
 */
export function TaskDebugBadge({ task }: TaskDebugBadgeProps) {
  // Only show in development
  if (typeof window === "undefined" || process.env.NODE_ENV !== "development") {
    return null
  }

  // Task ID (first 8 characters)
  const taskIdShort = task.id.slice(0, 8)

  // Priority
  const priority = `P${task.priority}`

  // Status
  const status = task.completed ? "Completed" : "Active"

  // Counts
  const subtaskCount = task.subtasks.length
  const commentCount = task.comments.length
  const labelCount = task.labels.length

  // Pro-specific fields
  const hasOwner = Boolean(isPro() && "ownerId" in task && task.ownerId)
  const assigneeCount =
    isPro() && "assignees" in task && Array.isArray(task.assignees) ? task.assignees.length : 0

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className="text-xs px-2 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 w-fit max-w-full break-words cursor-help"
          >
            🐛 {taskIdShort} • {priority} • {status} • {subtaskCount}s • {commentCount}c •{" "}
            {labelCount}l{hasOwner && " • 👤"}
            {assigneeCount > 0 && ` • ${assigneeCount}a`}
          </Badge>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="start"
          className="max-w-[280px] max-h-80 overflow-auto"
        >
          <pre className="text-[10px] font-mono whitespace-pre-wrap break-all">
            {JSON.stringify(task, null, 2)}
          </pre>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
