"use client"

import React, { useState } from "react"
import { ContentPopover } from "@/components/ui/content-popover"
import { TaskScheduleContent } from "./task-schedule-content"
import type { TaskId } from "@tasktrove/types/id"

interface TaskSchedulePopoverProps {
  taskId?: TaskId | TaskId[]
  children: React.ReactNode
  className?: string
  onOpenChange?: (open: boolean) => void
  open?: boolean
}

export function TaskSchedulePopover({
  taskId,
  children,
  className,
  onOpenChange,
  open,
}: TaskSchedulePopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false)

  const handleOpenChange = (newOpen: boolean) => {
    if (open === undefined) {
      setInternalOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }

  const handleClose = () => {
    handleOpenChange(false)
  }

  return (
    <ContentPopover
      open={open ?? internalOpen}
      onOpenChange={handleOpenChange}
      content={<TaskScheduleContent taskId={taskId} onClose={handleClose} />}
      className="w-80 p-0 overflow-y-auto"
      triggerClassName={className}
      align="start"
      mobileAsDrawer
      drawerTitle="Schedule"
      drawerDirection="bottom"
    >
      <span data-action="schedule">{children}</span>
    </ContentPopover>
  )
}
