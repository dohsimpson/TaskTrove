"use client"

import React, { useState } from "react"
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
  className,
  onOpenChange,
}: CommentManagementPopoverProps) {
  const [open, setOpen] = useState(false)
  const [, setIsAdding] = useState(false)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)

    // Auto-start adding if no comments exist when opening (for existing tasks only)
    if (newOpen && task && task.comments.length === 0) {
      setIsAdding(true)
    }

    // Reset adding state when closing
    if (!newOpen) {
      setIsAdding(false)
    }
  }

  const handleAddingChange = (adding: boolean) => {
    setIsAdding(adding)

    // Close popover if canceling add and no comments exist (for existing tasks only)
    if (!adding && task && task.comments.length === 0) {
      setOpen(false)
    }
  }

  return (
    <ContentPopover
      open={open}
      onOpenChange={handleOpenChange}
      content={
        <CommentContent
          taskId={taskId}
          task={task}
          onAddComment={onAddComment}
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
