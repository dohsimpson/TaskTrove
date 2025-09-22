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

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <ContentPopover
      open={open}
      onOpenChange={handleOpenChange}
      content={<TaskScheduleContent taskId={taskId} onClose={handleClose} />}
      className="w-72 p-0 overflow-y-auto"
      triggerClassName={className}
      align="start"
    >
      <span data-action="schedule">{children}</span>
    </ContentPopover>
  )
}
