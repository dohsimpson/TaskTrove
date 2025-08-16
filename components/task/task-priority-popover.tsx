"use client"

import { CustomizablePopover, PopoverSection } from "@/components/ui/customizable-popover"
import { Flag } from "lucide-react"
import { cn } from "@/lib/utils"
import { updateTaskAtom } from "@/lib/atoms/core/tasks"
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

  const getPrioritySections = (): PopoverSection[] => {
    return [
      {
        options: [1, 2, 3].map((p) => ({
          id: p,
          label: getPriorityLabel(p),
          icon: <Flag className={cn("h-3 w-3", getPriorityColor(p))} />,
          onClick: () => handlePriorityUpdate(p),
        })),
      },
      {
        options: [
          {
            id: 4,
            label: getPriorityLabel(4),
            icon: <Flag className={cn("h-3 w-3", getPriorityColor(4))} />,
            onClick: () => handlePriorityUpdate(4),
          },
        ],
      },
    ]
  }

  return (
    <CustomizablePopover
      sections={getPrioritySections()}
      contentClassName={contentClassName}
      align={align}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className={className}>{children}</div>
    </CustomizablePopover>
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
