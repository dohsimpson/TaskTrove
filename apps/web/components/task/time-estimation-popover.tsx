"use client"

import React, { useState } from "react"
import { TimeEstimationPicker } from "@/components/ui/custom/time-estimation-picker"
import type { TaskId } from "@tasktrove/types/id"

interface TimeEstimationPopoverProps {
  taskId?: TaskId // For existing tasks
  value?: number // For new items (backward compatibility)
  onChange?: (seconds: number | null) => void // For new items (backward compatibility)
  children: React.ReactNode
  className?: string
  onOpenChange?: (open: boolean) => void
}

export function TimeEstimationPopover({
  taskId,
  value,
  onChange,
  children,
  className,
  onOpenChange,
}: TimeEstimationPopoverProps) {
  const [open, setOpen] = useState(false)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  return (
    <TimeEstimationPicker
      taskId={taskId}
      value={value}
      onChange={onChange}
      trigger={<div className={className}>{children}</div>}
      open={open}
      setOpen={handleOpenChange}
    />
  )
}
