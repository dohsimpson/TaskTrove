"use client"

import React, { useState } from "react"
import { ContentPopover } from "@/components/ui/content-popover"
import { ProjectContent } from "./project-content"
import type { Task } from "@tasktrove/types/core"
import type { ProjectId, GroupId } from "@tasktrove/types/id"

interface ProjectPopoverProps {
  // Mode 1: Task-based (for TaskItem)
  task?: Task | Task[]
  onUpdate?: (projectId: ProjectId, sectionId?: GroupId) => void
  // Common props
  children: React.ReactNode
  className?: string
  onOpenChange?: (open: boolean) => void
  align?: "start" | "center" | "end"
  contentClassName?: string
}

export function ProjectPopover({
  task,
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
      content={<ProjectContent task={task} onUpdate={onUpdate} />}
      className={contentClassName}
      align={align}
      mobileAsDrawer
      drawerTitle="Project"
      drawerDirection="bottom"
    >
      <div className={className}>{children}</div>
    </ContentPopover>
  )
}
