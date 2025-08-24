"use client"

import React, { useState } from "react"
import { ContentPopover } from "@/components/ui/content-popover"
import { SubtaskContent } from "./subtask-content"
import type { Task } from "@/lib/types"

interface SubtaskPopoverProps {
  taskId?: string
  task?: Task // Deprecated - use taskId instead
  children: React.ReactNode
  className?: string
  onOpenChange?: (open: boolean) => void
}

export function SubtaskPopover({
  taskId,
  task,
  children,
  className,
  onOpenChange,
}: SubtaskPopoverProps) {
  const [open, setOpen] = useState(false)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  const handleAddingChange = (adding: boolean) => {
    // Close popover if canceling add and no subtasks exist
    // Note: For quick-add mode, we'll check the quickAddTaskAtom inside SubtaskContent
    if (!adding) {
      setOpen(false)
    }
  }

  return (
    <ContentPopover
      open={open}
      onOpenChange={handleOpenChange}
      content={
        <SubtaskContent
          taskId={taskId}
          task={task}
          mode="popover"
          onAddingChange={handleAddingChange}
        />
      }
      side="bottom"
      align="start"
      className={className}
    >
      {children}
    </ContentPopover>
  )
}
