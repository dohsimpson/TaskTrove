"use client"

import React, { useState } from "react"
import { ContentPopover } from "@/components/ui/content-popover"
import { TaskScheduleContent } from "./task-schedule-content"
import type { TaskId } from "@/lib/types"

interface TaskSchedulePopoverProps {
  taskId?: TaskId
  children: React.ReactNode
  className?: string
  onOpenChange?: (open: boolean) => void
}

export function TaskSchedulePopover({
  taskId,
  children,
  className,
  onOpenChange,
}: TaskSchedulePopoverProps) {
  const [open, setOpen] = useState(false)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  const handleModeChange = () => {
    // Mode changes handled internally by TaskScheduleContent
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <ContentPopover
      open={open}
      onOpenChange={handleOpenChange}
      content={
        <TaskScheduleContent
          taskId={taskId}
          onModeChange={handleModeChange}
          onClose={handleClose}
        />
      }
      className="w-72 p-0"
      triggerClassName={className}
      align="start"
    >
      {children}
    </ContentPopover>
  )
}
