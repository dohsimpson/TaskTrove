"use client"

import React, { useState } from "react"
import { ContentPopover } from "@/components/ui/content-popover"
import { ProjectContent } from "./project-content"
import type { Task, ProjectId } from "@/lib/types"

interface ProjectPopoverProps {
  // Mode 1: Task-based (for TaskItem)
  task?: Task
  // Mode 2: Callback-based (for QuickAdd)
  selectedProjectId?: ProjectId
  onUpdate?: (projectId: ProjectId) => void
  // Common props
  children: React.ReactNode
  className?: string
  onOpenChange?: (open: boolean) => void
  align?: "start" | "center" | "end"
  contentClassName?: string
}

export function ProjectPopover({
  task,
  selectedProjectId,
  onUpdate,
  children,
  className,
  onOpenChange,
  align = "start",
  contentClassName = "w-64 p-0",
}: ProjectPopoverProps) {
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
        <ProjectContent task={task} selectedProjectId={selectedProjectId} onUpdate={onUpdate} />
      }
      className={contentClassName}
      align={align}
    >
      <div className={className}>{children}</div>
    </ContentPopover>
  )
}
