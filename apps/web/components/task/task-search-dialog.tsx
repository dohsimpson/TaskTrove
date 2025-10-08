"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TaskSearchContent } from "./task-search-content"
import type { TaskId } from "@/lib/types"

interface TaskSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  onTaskSelect: (taskId: TaskId) => void
  excludeTaskIds?: TaskId[]
  placeholder?: string
}

export function TaskSearchDialog({
  open,
  onOpenChange,
  title,
  onTaskSelect,
  excludeTaskIds = [],
  placeholder,
}: TaskSearchDialogProps) {
  const handleTaskSelect = (taskId: TaskId) => {
    onTaskSelect(taskId)
    onOpenChange(false) // Close dialog after selection
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <TaskSearchContent
          onTaskSelect={handleTaskSelect}
          mode="single"
          excludeTaskIds={excludeTaskIds}
          placeholder={placeholder}
          focusInput={true}
        />
      </DialogContent>
    </Dialog>
  )
}
