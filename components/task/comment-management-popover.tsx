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

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  return (
    <ContentPopover
      open={open}
      onOpenChange={handleOpenChange}
      content={
        <CommentContent taskId={taskId} task={task} onAddComment={onAddComment} mode="popover" />
      }
      side="bottom"
      align="start"
      className={className}
    >
      {children}
    </ContentPopover>
  )
}
