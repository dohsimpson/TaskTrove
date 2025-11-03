"use client"

import React from "react"
import { useSetAtom } from "jotai"
import { Flag } from "lucide-react"
import { cn } from "@/lib/utils"
import { tasksAtom } from "@tasktrove/atoms/data/base/atoms"
import { isValidPriority } from "@/lib/types"
import { getPriorityTextColor } from "@/lib/color-utils"
import { useTranslation } from "@tasktrove/i18n"
import type { Task } from "@/lib/types"

interface PriorityContentProps {
  task: Task | Task[]
  className?: string
  onPrioritySelect?: () => void
}

export function PriorityContent({ task, className, onPrioritySelect }: PriorityContentProps) {
  // Translation setup
  const { t } = useTranslation("task")

  const updateTasks = useSetAtom(tasksAtom)

  const isMultipleTasks = Array.isArray(task)

  const handlePriorityUpdate = (priority: number) => {
    if (isValidPriority(priority)) {
      if (isMultipleTasks) {
        // For multiple tasks, update all at once
        updateTasks(task.map((t) => ({ id: t.id, priority })))
      } else {
        // For single task
        updateTasks([{ id: task.id, priority }])
      }
      onPrioritySelect?.()
    }
  }

  const priorityLabels: Record<number, string> = {
    1: t("priority.priority1", "Priority 1"),
    2: t("priority.priority2", "Priority 2"),
    3: t("priority.priority3", "Priority 3"),
    4: t("priority.noPriority", "No priority"),
  }

  const getPriorityLabel = (priority: number): string => {
    return priorityLabels[priority] ?? t("priority.noPriority", "No priority")
  }

  const priorities = [
    { value: 1, label: getPriorityLabel(1), color: "text-red-500" },
    { value: 2, label: getPriorityLabel(2), color: "text-orange-500" },
    { value: 3, label: getPriorityLabel(3), color: "text-blue-500" },
    { value: 4, label: getPriorityLabel(4), color: "text-muted-foreground" },
  ]

  return (
    <div className={cn("space-y-1", className)}>
      {/* Priority Options */}
      <div className="space-y-1">
        {priorities.map((priority) => (
          <div
            key={priority.value}
            className={cn(
              "flex items-center gap-3 rounded-md cursor-pointer hover:bg-accent/50 transition-all duration-200 p-2",
              !isMultipleTasks && task.priority === priority.value && "bg-accent",
            )}
            onClick={() => handlePriorityUpdate(priority.value)}
          >
            <Flag className={cn("h-4 w-4", getPriorityTextColor(priority.value))} />
            <span className="text-sm font-medium flex-1">{priority.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
