"use client"

import React, { useState } from "react"
import { ContentPopover } from "@/components/ui/content-popover"
import { LabelContent } from "./label-content"
import type { Task, LabelId } from "@/lib/types"

interface LabelManagementPopoverProps {
  taskId?: string
  task?: Task // Deprecated - use taskId instead
  onAddLabel: (labelName?: string) => void
  onRemoveLabel: (labelId: LabelId) => void
  children: React.ReactNode
  className?: string
  onOpenChange?: (open: boolean) => void
}

export function LabelManagementPopover({
  taskId,
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

    // Auto-start adding if no labels exist when opening (for existing tasks only)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (newOpen && task && (!task.labels || task.labels.length === 0)) {
      setIsAdding(true)
    }

    // Reset adding state when closing
    if (!newOpen) {
      setIsAdding(false)
    }
  }

  const handleAddingChange = (adding: boolean) => {
    setIsAdding(adding)

    // Close popover if canceling add and no labels exist (for existing tasks only)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!adding && task && (!task.labels || task.labels.length === 0)) {
      setOpen(false)
    }
  }

  return (
    <ContentPopover
      open={open}
      onOpenChange={handleOpenChange}
      content={
        <LabelContent
          taskId={taskId}
          task={task}
          onAddLabel={onAddLabel}
          onRemoveLabel={onRemoveLabel}
          mode="popover"
          onAddingChange={handleAddingChange}
          initialIsAdding={isAdding}
        />
      }
      side="bottom"
      align="start"
      className="w-80 p-0 max-h-[400px] overflow-hidden"
    >
      <div className={className}>{children}</div>
    </ContentPopover>
  )
}
