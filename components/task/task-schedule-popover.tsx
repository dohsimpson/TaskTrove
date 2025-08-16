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
  const [mode, setMode] = useState<"quick" | "calendar" | "recurring">("quick")

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)

    // Reset to quick mode when closing
    if (!newOpen) {
      setMode("quick")
    }
  }

  const handleModeChange = (newMode: "quick" | "calendar" | "recurring") => {
    setMode(newMode)
  }

  const handleClose = () => {
    setOpen(false)
    setMode("quick")
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
      className={mode === "calendar" ? "w-72 p-0" : mode === "recurring" ? "w-80 p-0" : "w-64 p-0"}
      triggerClassName={className}
      align="start"
    >
      {children}
    </ContentPopover>
  )
}
