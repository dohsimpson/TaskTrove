"use client"

import React, { useState } from "react"
import { ContentPopover } from "@/components/ui/content-popover"
import { LabelContent } from "./label-content"
import type { Task, LabelId } from "@/lib/types"

interface LabelManagementPopoverProps {
  task?: Task
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

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  const handleAddingChange = (adding: boolean) => {
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
          task={task}
          onAddLabel={onAddLabel}
          onRemoveLabel={onRemoveLabel}
          mode="popover"
          onAddingChange={handleAddingChange}
          focusInput={true}
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
