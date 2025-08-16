"use client"

import React, { useState } from "react"
import { ContentPopover } from "@/components/ui/content-popover"
import { ProjectContent } from "./project-content"
import type { Task } from "@/lib/types"

interface ProjectPopoverProps {
  task: Task
  children: React.ReactNode
  className?: string
  onOpenChange?: (open: boolean) => void
}

export function ProjectPopover({ task, children, className, onOpenChange }: ProjectPopoverProps) {
  const [open, setOpen] = useState(false)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  return (
    <ContentPopover
      open={open}
      onOpenChange={handleOpenChange}
      content={<ProjectContent task={task} mode="popover" />}
      className="w-64 p-0"
      align="start"
    >
      <div className={className}>{children}</div>
    </ContentPopover>
  )
}
