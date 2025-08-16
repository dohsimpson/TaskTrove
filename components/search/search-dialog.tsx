"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContentWithoutOverlay, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Search, Flag, Calendar, FolderOpen, Hash, ArrowRight, Loader2, X } from "lucide-react"
import { useAtomValue, useSetAtom } from "jotai"
import { taskAtoms, projectAtoms, labelAtoms } from "@/lib/atoms"
import { showSearchDialogAtom, toggleTaskPanelAtom } from "@/lib/atoms/ui/dialogs"
import { closeSearchAtom } from "@/lib/atoms/ui/navigation"
import { TaskCheckbox } from "@/components/ui/custom/task-checkbox"
import { Task, Project } from "@/lib/types"

export function SearchDialog() {
  // Dialog state atoms
  const open = useAtomValue(showSearchDialogAtom)
  const closeDialog = useSetAtom(closeSearchAtom)
  const toggleTaskPanel = useSetAtom(toggleTaskPanelAtom)
  const tasks = useAtomValue(taskAtoms.tasks)
  const projects = useAtomValue(projectAtoms.projects)
  const labels = useAtomValue(labelAtoms.labels)
  const [searchValue, setSearchValue] = useState("")
  const [searchResults, setSearchResults] = useState<Task[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Perform search with debounce
  const performSearch = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setSearchResults([])
        setIsSearching(false)
        return
      }

      // Only show loading if we don't have existing results
      if (searchResults.length === 0) {
        setIsSearching(true)
      }

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      searchTimeoutRef.current = setTimeout(() => {
        const allTasks = tasks || []
        const searchLower = query.toLowerCase()

        const filteredTasks = allTasks
          .filter(
            (task: Task) =>
              task.title?.toLowerCase().includes(searchLower) ||
              task.description?.toLowerCase().includes(searchLower) ||
              task.labels?.some((labelId) => {
                const label = labels?.find((l) => l.id === labelId)
                return label?.name.toLowerCase().includes(searchLower)
              }) ||
              // Search by project name
              (task.projectId &&
                projects
                  ?.find((p: Project) => p.id === task.projectId)
                  ?.name?.toLowerCase()
                  .includes(searchLower)),
          )
          .slice(0, 10) // Limit to 10 results for performance

        setSearchResults(filteredTasks)
        setIsSearching(false)
      }, 200) // 200ms debounce
    },
    [searchResults.length, tasks, projects, labels],
  )

  // Update search when searchValue changes
  useEffect(() => {
    performSearch(searchValue)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchValue, performSearch])

  // Clear search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchValue("")
      setSearchResults([])
      setIsSearching(false)
    }
  }, [open])

  const getPriorityIcon = (priority: number) => {
    switch (priority) {
      case 1:
        return <Flag className="h-4 w-4 text-red-500" />
      case 2:
        return <Flag className="h-4 w-4 text-orange-500" />
      case 3:
        return <Flag className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  const formatDate = (date: Date) => {
    const today = new Date()
    const taskDate = new Date(date)
    const diffTime = taskDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Tomorrow"
    if (diffDays === -1) return "Yesterday"
    if (diffDays > 0) return `In ${diffDays} days`
    return `${Math.abs(diffDays)} days ago`
  }

  // Helper function to highlight search terms
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
    const parts = text.split(regex)

    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <span key={index} className="bg-primary/20 text-primary font-medium">
            {part}
          </span>
        )
      }
      return part
    })
  }

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContentWithoutOverlay
        className="max-w-2xl max-h-[80vh] p-0 bg-card border shadow-2xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Search Tasks</DialogTitle>

        {/* Search Input */}
        <div className="flex items-center border-b px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground mr-3" />
          <Input
            placeholder="Search tasks..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent dark:bg-transparent text-lg md:text-lg"
            autoFocus
          />
          <button
            onClick={closeDialog}
            className="ml-3 p-1 rounded-sm hover:bg-accent transition-colors"
            aria-label="Close search"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Results Area */}
        {(isSearching || searchResults.length > 0 || searchValue.trim()) && (
          <div className="max-h-96 overflow-y-auto">
            {isSearching ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              <div>
                <div className="text-sm text-muted-foreground px-3 py-2 border-b">
                  Found {searchResults.length} task{searchResults.length !== 1 ? "s" : ""}
                </div>
                <div className="space-y-1 mt-2">
                  {searchResults.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => {
                        closeDialog()
                        toggleTaskPanel(task)
                      }}
                    >
                      <TaskCheckbox checked={task.completed} className="pointer-events-none" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}
                          >
                            {highlightText(task.title, searchValue)}
                          </span>
                          {task.priority < 4 && getPriorityIcon(task.priority)}
                        </div>
                        {task.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {highlightText(task.description, searchValue)}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {/* Project */}
                          {task.projectId && (
                            <div className="flex items-center gap-1">
                              <FolderOpen className="h-3 w-3" />
                              <span>
                                {highlightText(
                                  projects?.find((p: Project) => p.id === task.projectId)?.name ||
                                    "Unknown",
                                  searchValue,
                                )}
                              </span>
                            </div>
                          )}
                          {/* Due Date */}
                          {task.dueDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(task.dueDate)}</span>
                            </div>
                          )}
                          {/* Labels */}
                          {task.labels?.slice(0, 2).map((labelId) => {
                            const label = labels?.find((l) => l.id === labelId)
                            return label ? (
                              <div key={labelId} className="flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                <span>{highlightText(label.name, searchValue)}</span>
                              </div>
                            ) : null
                          })}
                          {task.labels?.length > 2 && <span>+{task.labels.length - 2} more</span>}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No tasks found</p>
                <p className="text-sm text-muted-foreground/70">Try adjusting your search terms</p>
              </div>
            )}
          </div>
        )}
      </DialogContentWithoutOverlay>
    </Dialog>
  )
}
