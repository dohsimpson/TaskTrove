"use client"

import React, { useState } from "react"
import { ContentPopover } from "@/components/ui/content-popover"
import { SubtaskContent } from "./subtask-content"
import type { Task } from "@/lib/types"

interface SubtaskPopoverProps {
  task: Task
  children: React.ReactNode
  className?: string
  onOpenChange?: (open: boolean) => void
}

export function SubtaskPopover({ task, children, className, onOpenChange }: SubtaskPopoverProps) {
  const [open, setOpen] = useState(false)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  const handleAddingChange = (adding: boolean) => {
    // Close popover if canceling add and no subtasks exist
    if (!adding && task.subtasks.length === 0) {
      setOpen(false)
    }
  }

  return (
    <ContentPopover
      open={open}
      onOpenChange={handleOpenChange}
      content={<SubtaskContent task={task} mode="popover" onAddingChange={handleAddingChange} />}
      className="w-80 p-0"
      triggerClassName={className}
      align="start"
    >
      {children}
    </ContentPopover>
  )
}
