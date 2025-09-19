"use client"

import { Badge } from "@/components/ui/badge"
import { Flag, Tag, Folder, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { TaskDueDate } from "@/components/ui/custom/task-due-date"

interface ParsedTask {
  title: string
  dueDate?: Date | null
  dueTime?: Date | null
  priority?: 1 | 2 | 3 | 4
  labels: string[]
  project?: string
  recurring?: string
  completed?: boolean
}

interface MetadataPillsProps {
  parsedTask: ParsedTask | null
  onRemoveDate: () => void
  onRemoveProject: () => void
  onRemovePriority: () => void
  onRemoveLabel: (label: string) => void
}

export function MetadataPills({
  parsedTask,
  onRemoveDate,
  onRemoveProject,
  onRemovePriority,
  onRemoveLabel,
}: MetadataPillsProps) {
  if (!parsedTask) return null

  const hasMetadata =
    parsedTask.dueDate ||
    parsedTask.recurring ||
    parsedTask.project ||
    parsedTask.priority ||
    parsedTask.labels.length > 0

  if (!hasMetadata) return null

  const getPriorityColor = (priority?: number) => {
    switch (priority) {
      case 4:
        return "text-red-600 border-red-300 bg-red-50"
      case 3:
        return "text-orange-600 border-orange-300 bg-orange-50"
      case 2:
        return "text-yellow-600 border-yellow-300 bg-yellow-50"
      case 1:
        return "text-green-600 border-green-300 bg-green-50"
      default:
        return "text-gray-600 border-gray-300 bg-gray-50"
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-gray-100">
      {/* Date/Recurring pill */}
      {(parsedTask.dueDate || parsedTask.recurring) && (
        <Badge
          variant="secondary"
          className="inline-flex items-center gap-1 h-6 px-2 text-xs hover:bg-gray-200 transition-colors group"
        >
          <TaskDueDate
            dueDate={parsedTask.dueDate}
            dueTime={parsedTask.dueTime}
            recurring={parsedTask.recurring}
            completed={parsedTask.completed}
            className="text-xs"
          />
          <button
            type="button"
            onClick={onRemoveDate}
            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-300 rounded-full p-0.5"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </Badge>
      )}

      {/* Priority pill */}
      {parsedTask.priority && (
        <Badge
          variant="outline"
          className={cn(
            "inline-flex items-center gap-1 h-6 px-2 text-xs transition-colors group",
            getPriorityColor(parsedTask.priority),
          )}
        >
          <Flag className="w-3 h-3" />
          <span>P{parsedTask.priority}</span>
          <button
            type="button"
            onClick={onRemovePriority}
            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-current/20 rounded-full p-0.5"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </Badge>
      )}

      {/* Label pills */}
      {parsedTask.labels.map((label) => (
        <Badge
          key={label}
          variant="outline"
          className="inline-flex items-center gap-1 h-6 px-2 text-xs text-blue-600 border-blue-300 bg-blue-50 transition-colors group hover:bg-blue-100"
        >
          <Tag className="w-3 h-3" />
          <span>{label}</span>
          <button
            type="button"
            onClick={() => onRemoveLabel(label)}
            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-200 rounded-full p-0.5"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </Badge>
      ))}

      {/* Project pill */}
      {parsedTask.project && (
        <Badge
          variant="outline"
          className="inline-flex items-center gap-1 h-6 px-2 text-xs text-purple-600 border-purple-300 bg-purple-50 transition-colors group hover:bg-purple-100"
        >
          <Folder className="w-3 h-3" />
          <span>{parsedTask.project}</span>
          <button
            type="button"
            onClick={onRemoveProject}
            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-200 rounded-full p-0.5"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </Badge>
      )}
    </div>
  )
}
