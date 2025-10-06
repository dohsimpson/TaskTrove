"use client"

import React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { CheckSquare, Trash2, Calendar, Flag, Move, MoreHorizontal, X } from "lucide-react"
import {
  selectionModeAtom,
  selectedTasksAtom,
  exitSelectionModeAtom,
  clearSelectionAtom,
  selectAllVisibleTasksAtom,
  allVisibleTasksSelectedAtom,
  bulkCompleteTasksAtom,
  bulkDeleteTasksAtom,
  bulkMoveTasksAtom,
  bulkSetPriorityAtom,
  bulkScheduleTasksAtom,
  filteredTasksAtom,
} from "@/lib/atoms"
import { projectsAtom } from "@/lib/atoms"
import { DeleteConfirmDialog } from "@/components/dialogs/delete-confirm-dialog"
import { cn } from "@/lib/utils"
import type { ProjectId } from "@/lib/types"

interface SelectionToolbarProps {
  className?: string
}

export function SelectionToolbar({ className }: SelectionToolbarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)

  // Selection state
  const selectionMode = useAtomValue(selectionModeAtom)
  const selectedTasks = useAtomValue(selectedTasksAtom)
  const allVisibleSelected = useAtomValue(allVisibleTasksSelectedAtom)
  const filteredTasks = useAtomValue(filteredTasksAtom)

  // Projects for move operation
  const projects = useAtomValue(projectsAtom)

  // Selection actions
  const exitSelectionMode = useSetAtom(exitSelectionModeAtom)
  const clearSelection = useSetAtom(clearSelectionAtom)
  const selectAllVisible = useSetAtom(selectAllVisibleTasksAtom)

  // Bulk actions
  const bulkComplete = useSetAtom(bulkCompleteTasksAtom)
  const bulkDelete = useSetAtom(bulkDeleteTasksAtom)
  const bulkMove = useSetAtom(bulkMoveTasksAtom)
  const bulkSetPriority = useSetAtom(bulkSetPriorityAtom)
  const bulkSchedule = useSetAtom(bulkScheduleTasksAtom)

  // Handle Escape key to exit selection mode
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectionMode) {
        exitSelectionMode()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectionMode, exitSelectionMode])

  // Don't render if not in selection mode
  if (!selectionMode) {
    return null
  }

  const handleSelectAll = () => {
    if (allVisibleSelected) {
      clearSelection()
    } else {
      selectAllVisible()
    }
  }

  const handleBulkDelete = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = (deleteContainedResources?: boolean) => {
    // For bulk task deletion, we don't currently use deleteContainedResources
    // but we need to match the new DeleteConfirmDialog signature
    bulkDelete()
    setShowDeleteConfirm(false)
  }

  const handleMoveTo = (projectId: ProjectId | null) => {
    bulkMove(projectId)
  }

  const handleSetPriority = (priority: 1 | 2 | 3 | 4) => {
    bulkSetPriority(priority)
  }

  const handleSchedule = (type: "today" | "tomorrow" | "next-week" | "clear") => {
    const now = new Date()
    let dueDate: Date | null = null

    switch (type) {
      case "today":
        dueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        break
      case "tomorrow":
        dueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59)
        break
      case "next-week":
        dueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59)
        break
      case "clear":
        dueDate = null
        break
    }

    bulkSchedule(dueDate)
  }

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 border-b border-blue-200 dark:border-blue-800",
          className,
        )}
      >
        <div className="flex items-center gap-4">
          {/* Selection count and select all toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="text-blue-900 dark:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-900/30"
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              {allVisibleSelected ? "Deselect All" : "Select All"}
            </Button>
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {selectedTasks.length} selected
            </span>
          </div>

          {/* Quick actions */}
          {selectedTasks.length > 0 && (
            <div className="flex items-center gap-2">
              {/* Complete tasks */}
              <Button
                size="sm"
                variant="outline"
                onClick={bulkComplete}
                className="text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-600 dark:hover:bg-green-950/20"
              >
                <CheckSquare className="h-4 w-4 mr-1" />
                Complete
              </Button>

              {/* Schedule dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-600 dark:hover:bg-blue-950/20"
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Schedule
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleSchedule("today")}>Today</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSchedule("tomorrow")}>
                    Tomorrow
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSchedule("next-week")}>
                    Next week
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleSchedule("clear")}>
                    Clear due date
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Priority dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-orange-700 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-600 dark:hover:bg-orange-950/20"
                  >
                    <Flag className="h-4 w-4 mr-1" />
                    Priority
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleSetPriority(1)}>
                    <Flag className="h-4 w-4 mr-2 text-red-500" />
                    Priority 1
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSetPriority(2)}>
                    <Flag className="h-4 w-4 mr-2 text-orange-500" />
                    Priority 2
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSetPriority(3)}>
                    <Flag className="h-4 w-4 mr-2 text-blue-500" />
                    Priority 3
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSetPriority(4)}>
                    <Flag className="h-4 w-4 mr-2 text-gray-400" />
                    Priority 4 (None)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Move to project dropdown */}
              {projects.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-purple-700 border-purple-300 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-600 dark:hover:bg-purple-950/20"
                    >
                      <Move className="h-4 w-4 mr-1" />
                      Move
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {projects.map((project) => (
                      <DropdownMenuItem key={project.id} onClick={() => handleMoveTo(project.id)}>
                        <div
                          className="w-3 h-3 rounded-sm mr-2"
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleMoveTo(null)}>
                      <div className="w-3 h-3 rounded-sm bg-muted mr-2" />
                      No project (Inbox)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* More actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-gray-700 border-gray-300 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-950/20"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={handleBulkDelete}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Cancel button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={exitSelectionMode}
          className="text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
      </div>

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleConfirmDelete}
        entityType="bulk"
        entityCount={selectedTasks.length}
      />
    </>
  )
}
