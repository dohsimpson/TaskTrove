"use client"

import React, { useState } from "react"
import { ContentPopover } from "@/components/ui/content-popover"
import { CommentContent } from "./comment-content"
import type { Task } from "@/lib/types"

interface CommentManagementPopoverProps {
  task: Task
  onAddComment: (content: string) => void
  children: React.ReactNode
  className?: string
  onOpenChange?: (open: boolean) => void
}

export function CommentManagementPopover({
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

    // Auto-start adding if no comments exist when opening
    if (newOpen && task.comments.length === 0) {
      setIsAdding(true)
    }

    // Reset adding state when closing
    if (!newOpen) {
      setIsAdding(false)
    }
  }

  const handleAddingChange = (adding: boolean) => {
    setIsAdding(adding)

    // Close popover if canceling add and no comments exist
    if (!adding && task.comments.length === 0) {
      setOpen(false)
    }
  }

  return (
    <ContentPopover
      open={open}
      onOpenChange={handleOpenChange}
      content={
        <CommentContent
          task={task}
          onAddComment={onAddComment}
          mode="popover"
          onAddingChange={handleAddingChange}
        />
      }
      className="w-96 p-0 max-h-[500px] overflow-hidden"
      align="start"
    >
      <div className={className}>{children}</div>
    </ContentPopover>
  )
}
