"use client"

import React, { useState } from "react"
import { ContentPopover } from "@/components/ui/content-popover"
import { PriorityContent } from "./priority-content"
import type { Task } from "@/lib/types"

interface PriorityPopoverProps {
  task: Task
  children: React.ReactNode
  className?: string
  onOpenChange?: (open: boolean) => void
}

export function PriorityPopover({ task, children, className, onOpenChange }: PriorityPopoverProps) {
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
        <PriorityContent task={task} mode="popover" onPrioritySelect={() => setOpen(false)} />
      }
      className="w-full p-0"
      align="start"
    >
      <div className={className}>{children}</div>
    </ContentPopover>
  )
}
