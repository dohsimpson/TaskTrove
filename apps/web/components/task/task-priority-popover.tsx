"use client"

import React from "react"
import { ContentPopover } from "@/components/ui/content-popover"
import { Button } from "@/components/ui/button"
import { Flag } from "lucide-react"
import { cn } from "@/lib/utils"
import { updateTaskAtom } from "@tasktrove/atoms/core/tasks"
import type { TaskId, TaskPriority } from "@/lib/types"
import { useSetAtom } from "jotai"
import { createTaskId, isValidPriority } from "@/lib/types"

interface TaskPriorityPopoverProps {
  taskId?: TaskId
  onUpdate?: (priority: TaskPriority) => void
  children: React.ReactNode
  className?: string
  align?: "start" | "center" | "end"
  contentClassName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  triggerMode?: "click" | "hover"
}

export function TaskPriorityPopover({
  taskId,
  onUpdate,
  children,
  className,
  align = "start",
  contentClassName = "w-48 p-1",
  open,
  onOpenChange,
  triggerMode,
}: TaskPriorityPopoverProps) {
  const updateTask = useSetAtom(updateTaskAtom)

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return "text-red-500"
      case 2:
        return "text-orange-500"
      case 3:
        return "text-blue-500"
      default:
        return "text-muted-foreground"
    }
  }

  const getPriorityLabel = (priority: number) => {
    if (priority === 4) return "No priority"
    return `Priority ${priority}`
  }

  const handlePriorityUpdate = (priority: number) => {
    if (isValidPriority(priority)) {
      if (onUpdate) {
        onUpdate(priority)
      } else if (taskId) {
        updateTask({ updateRequest: { id: createTaskId(taskId), priority } })
      }
      onOpenChange?.(false)
    }
  }

  // Create the priority content directly
  const priorityContent = (
    <div className="space-y-1">
      {/* High priorities: P1, P2, P3 */}
      <div className="space-y-0.5">
        {[1, 2, 3].map((priority) => (
          <Button
            key={priority}
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8"
            onClick={() => handlePriorityUpdate(priority)}
          >
            <Flag className={cn("h-3 w-3 mr-2", getPriorityColor(priority))} />
            <span>{getPriorityLabel(priority)}</span>
          </Button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

      {/* No priority */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start h-8"
        onClick={() => handlePriorityUpdate(4)}
      >
        <Flag className={cn("h-3 w-3 mr-2", getPriorityColor(4))} />
        <span>{getPriorityLabel(4)}</span>
      </Button>
    </div>
  )

  return (
    <ContentPopover
      content={priorityContent}
      className={contentClassName}
      align={align}
      open={open}
      onOpenChange={onOpenChange}
      triggerMode={triggerMode}
      mobileAsDrawer
      drawerTitle="Priority"
      drawerDirection="bottom"
    >
      <div className={className}>{children}</div>
    </ContentPopover>
  )
}

// Helper functions that can be used by consumers
export const getPriorityColor = (priority: number) => {
  switch (priority) {
    case 1:
      return "text-red-500"
    case 2:
      return "text-orange-500"
    case 3:
      return "text-blue-500"
    default:
      return "text-muted-foreground"
  }
}

export const getPriorityLabel = (priority: number) => {
  if (priority === 4) return "No priority"
  return `Priority ${priority}`
}
