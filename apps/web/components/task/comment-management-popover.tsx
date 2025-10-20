"use client"

import React, { useState, useEffect } from "react"
import { ContentPopover } from "@/components/ui/content-popover"
import { CommentContent } from "./comment-content"
import type { Task } from "@/lib/types"

interface CommentManagementPopoverProps {
  taskId?: string
  task?: Task // Deprecated - use taskId instead
  onAddComment?: (content: string) => void // Optional - if not provided, CommentContent will handle updates directly
  children: React.ReactNode
  className?: string
  onOpenChange?: (open: boolean) => void
}

export function CommentManagementPopover({
  taskId,
  task,
  onAddComment,
  children,
  className = "w-96",
  onOpenChange,
}: CommentManagementPopoverProps) {
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
        <CommentContent
          taskId={taskId}
          task={task}
          onAddComment={onAddComment}
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
