"use client"

import React, { useState } from "react"
import { ContentPopover } from "@/components/ui/content-popover"
import { LabelContent } from "./label-content"
import type { Task, LabelId } from "@/lib/types"

interface LabelManagementPopoverProps {
  task: Task
  onAddLabel: (labelName?: string) => void
  onRemoveLabel: (labelId: LabelId) => void
  children: React.ReactNode
  className?: string
  onOpenChange?: (open: boolean) => void
}

export function LabelManagementPopover({
  task,
  onAddLabel,
  onRemoveLabel,
  children,
  className,
  onOpenChange,
}: LabelManagementPopoverProps) {
  const [open, setOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)

    // Auto-start adding if no labels exist when opening
    if (newOpen && task.labels.length === 0) {
      setIsAdding(true)
    }

    // Reset adding state when closing
    if (!newOpen) {
      setIsAdding(false)
    }
  }

  const handleAddingChange = (adding: boolean) => {
    setIsAdding(adding)

    // Close popover if canceling add and no labels exist
    if (!adding && task.labels.length === 0) {
      setOpen(false)
    }
  }

  return (
    <ContentPopover
      open={open}
      onOpenChange={handleOpenChange}
      content={
        <LabelContent
          task={task}
          onAddLabel={onAddLabel}
          onRemoveLabel={onRemoveLabel}
          mode="popover"
          onAddingChange={handleAddingChange}
          initialIsAdding={isAdding}
        />
      }
      className="w-64 p-0"
      align="end"
    >
      <div className={className}>{children}</div>
    </ContentPopover>
  )
}
