"use client"

import React, { useState, useEffect } from "react"
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
  className = "w-96",
  onOpenChange,
}: SubtaskPopoverProps) {
  const [open, setOpen] = useState(false)
  const [scrollToBottomKey, setScrollToBottomKey] = useState(0)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  // Trigger scroll to bottom when popover opens
  useEffect(() => {
    if (open) {
      setScrollToBottomKey((prev) => prev + 1)
    }
  }, [open])

  return (
    <ContentPopover
      open={open}
      onOpenChange={handleOpenChange}
      content={
        <SubtaskContent
          taskId={taskId}
          task={task}
          onClose={() => handleOpenChange(false)}
          mode="popover"
          scrollToBottomKey={scrollToBottomKey}
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
